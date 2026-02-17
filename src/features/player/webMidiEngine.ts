import { MidiSchedule, buildMidiSchedule } from "./midiParser";
import {
  clampTempoRate,
  clampPosition,
  computePositionFromContext,
  toContextTime,
} from "./midiTransport";
import { MIDI_GUIDE_MAX_FPS, shouldAdvanceFrame } from "../../domain/frameSync";
import { MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { prepareWebPlaybackSession } from "./webPlaybackSession";

export type MidiTimbre = "sine" | "triangle" | "square" | "sawtooth" | "piano";
export const MIN_OCTAVE_SHIFT = -2;
export const MAX_OCTAVE_SHIFT = 2;

export type MidiPlaybackSnapshot = {
  isPlaying: boolean;
  uri?: string;
  error?: string;
  positionSec: number;
  durationSec: number;
  midiNotes?: MidiPitchGuideNote[];
  tempoRate: number;
  timbre: MidiTimbre;
  octaveShift: number;
  loopEnabled: boolean;
};

type ActiveOscillator = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

function midiToFrequency(noteNumber: number) {
  return 440 * 2 ** ((noteNumber - 69) / 12);
}

function clampOctaveShift(shift: number) {
  const rounded = Math.round(shift);
  return Math.min(MAX_OCTAVE_SHIFT, Math.max(MIN_OCTAVE_SHIFT, rounded));
}

function resolveOscillatorType(timbre: MidiTimbre): OscillatorType {
  if (timbre === "piano") {
    return "triangle";
  }
  return timbre;
}

export class WebMidiEngine {
  private context: AudioContext | null = null;
  private timers: number[] = [];
  private active = new Set<ActiveOscillator>();
  private snapshot: MidiPlaybackSnapshot = {
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    midiNotes: undefined,
    tempoRate: 1,
    timbre: "triangle",
    octaveShift: 0,
    loopEnabled: false,
  };
  private listeners = new Set<(snapshot: MidiPlaybackSnapshot) => void>();
  private schedule: MidiSchedule | null = null;
  private ticker: number | null = null;
  private tickerLastTimestampMs: number | null = null;
  private playStartContextSec = 0;
  private playStartScoreSec = 0;

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private clearTimers() {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];
    if (this.ticker !== null) {
      window.cancelAnimationFrame(this.ticker);
      this.ticker = null;
    }
    this.tickerLastTimestampMs = null;
  }

  private stopAllVoices() {
    for (const node of this.active) {
      try {
        node.gain.gain.cancelScheduledValues(0);
        node.gain.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
        node.oscillator.stop();
      } catch {
        // ignore individual voice errors on shutdown
      }
    }
    this.active.clear();
  }

  private ensureContext() {
    if (!this.context) {
      const browserGlobal = globalThis as typeof globalThis & {
        AudioContext?: new () => AudioContext;
        webkitAudioContext?: new () => AudioContext;
      };
      const AudioContextConstructor =
        browserGlobal.AudioContext ?? browserGlobal.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error("Web Audio API is not supported on this browser");
      }
      this.context = new AudioContextConstructor();
    }
    return this.context;
  }

  private runTickerFrame = (timestampMs: number) => {
    this.ticker = null;
    if (!this.snapshot.isPlaying || !this.context) {
      this.tickerLastTimestampMs = null;
      return;
    }

    if (shouldAdvanceFrame(this.tickerLastTimestampMs, timestampMs, MIDI_GUIDE_MAX_FPS)) {
      const positionSec = computePositionFromContext(
        this.playStartScoreSec,
        this.playStartContextSec,
        this.context.currentTime,
        this.snapshot.tempoRate,
        this.snapshot.durationSec
      );
      this.snapshot = { ...this.snapshot, positionSec };
      this.emit();
      this.tickerLastTimestampMs = timestampMs;
    }

    this.ticker = window.requestAnimationFrame(this.runTickerFrame);
  };

  private startTicker() {
    if (this.ticker !== null || !this.context) {
      return;
    }
    this.tickerLastTimestampMs = null;
    this.ticker = window.requestAnimationFrame(this.runTickerFrame);
  }

  private applyEnvelope(gain: GainNode, noteStart: number, noteEnd: number, velocity: number) {
    const gainValue = Math.max(0.02, (velocity / 127) * 0.16);

    if (this.snapshot.timbre === "piano") {
      const decayAt = Math.min(noteStart + 0.18, noteEnd);
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(gainValue, noteStart + 0.005);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue * 0.12), decayAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      return;
    }

    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(gainValue, noteStart + 0.01);
    gain.gain.linearRampToValueAtTime(0.0001, noteEnd);
  }

  private scheduleFromPosition(positionSec: number) {
    if (!this.schedule || !this.context) {
      return;
    }

    const startScoreSec = clampPosition(positionSec, this.schedule.durationSec);
    const startContextSec = this.context.currentTime + 0.02;
    const tempoRate = this.snapshot.tempoRate;
    const oscillatorType = resolveOscillatorType(this.snapshot.timbre);
    this.playStartScoreSec = startScoreSec;
    this.playStartContextSec = startContextSec;

    for (const note of this.schedule.notes) {
      if (note.endSec <= startScoreSec) {
        continue;
      }

      const noteStartScore = Math.max(note.startSec, startScoreSec);
      const noteEndScore = note.endSec;
      const noteStart = toContextTime(noteStartScore, startScoreSec, startContextSec, tempoRate);
      const noteEnd = toContextTime(noteEndScore, startScoreSec, startContextSec, tempoRate);
      const shiftedNote = note.noteNumber + this.snapshot.octaveShift * 12;

      const oscillator = this.context.createOscillator();
      oscillator.type = oscillatorType;
      oscillator.frequency.setValueAtTime(midiToFrequency(shiftedNote), noteStart);

      const gain = this.context.createGain();
      this.applyEnvelope(gain, noteStart, noteEnd, note.velocity);

      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);

      const active = { oscillator, gain };
      this.active.add(active);
      oscillator.onended = () => {
        this.active.delete(active);
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch {
          // ignore disconnect race
        }
      };
    }

    const remainingSec = Math.max(0, (this.schedule.durationSec - startScoreSec) / tempoRate);
    const finishDelayMs = remainingSec * 1000 + 30;
    const timer = window.setTimeout(() => {
      this.stopAllVoices();
      if (this.snapshot.loopEnabled) {
        this.clearTimers();
        this.snapshot = {
          ...this.snapshot,
          isPlaying: true,
          positionSec: 0,
        };
        this.scheduleFromPosition(0);
        this.startTicker();
        this.emit();
        return;
      }
      this.snapshot = {
        ...this.snapshot,
        isPlaying: false,
        positionSec: this.snapshot.durationSec,
      };
      this.emit();
    }, finishDelayMs);
    this.timers.push(timer);
  }

  async play(uri: string) {
    await this.stop();
    await prepareWebPlaybackSession("web");
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const schedule = buildMidiSchedule(bytes);
      this.schedule = schedule;
      this.snapshot = {
        ...this.snapshot,
        uri,
        error: undefined,
        isPlaying: true,
        positionSec: 0,
        durationSec: schedule.durationSec,
        midiNotes: schedule.notes.map((note) => ({
          noteNumber: note.noteNumber,
          startSec: note.startSec,
          endSec: note.endSec,
        })),
      };
      this.scheduleFromPosition(0);
      this.startTicker();
      this.emit();
    } catch (error) {
      this.schedule = null;
      this.snapshot = {
        ...this.snapshot,
        isPlaying: false,
        uri,
        midiNotes: undefined,
        error: error instanceof Error ? error.message : "midi playback failed",
      };
      this.emit();
      throw error;
    }
  }

  async pause() {
    if (!this.context || !this.snapshot.isPlaying) {
      return;
    }
    const positionSec = computePositionFromContext(
      this.playStartScoreSec,
      this.playStartContextSec,
      this.context.currentTime,
      this.snapshot.tempoRate,
      this.snapshot.durationSec
    );
    this.clearTimers();
    this.stopAllVoices();
    this.snapshot = { ...this.snapshot, isPlaying: false, positionSec };
    this.emit();
  }

  async resume() {
    if (!this.context || this.snapshot.isPlaying || !this.schedule) {
      return;
    }
    await prepareWebPlaybackSession("web");
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.snapshot = { ...this.snapshot, isPlaying: true };
    this.scheduleFromPosition(this.snapshot.positionSec);
    this.startTicker();
    this.emit();
  }

  async stop() {
    this.clearTimers();
    this.stopAllVoices();
    this.snapshot = {
      ...this.snapshot,
      isPlaying: false,
      positionSec: 0,
    };
    this.emit();
  }

  async seek(positionSec: number) {
    const nextPosition = clampPosition(positionSec, this.snapshot.durationSec);
    if (!this.schedule) {
      this.snapshot = { ...this.snapshot, positionSec: nextPosition };
      this.emit();
      return;
    }

    if (!this.snapshot.isPlaying) {
      this.snapshot = { ...this.snapshot, positionSec: nextPosition };
      this.emit();
      return;
    }

    this.clearTimers();
    this.stopAllVoices();
    this.snapshot = { ...this.snapshot, positionSec: nextPosition };
    this.scheduleFromPosition(nextPosition);
    this.startTicker();
    this.emit();
  }

  async setTempo(rate: number) {
    const nextRate = clampTempoRate(rate);
    if (Math.abs(nextRate - this.snapshot.tempoRate) < 0.001) {
      return;
    }

    const wasPlaying = this.snapshot.isPlaying;
    if (this.context && wasPlaying) {
      await this.pause();
    }
    this.snapshot = { ...this.snapshot, tempoRate: nextRate };
    if (wasPlaying) {
      await this.resume();
      return;
    }
    this.emit();
  }

  async setTimbre(timbre: MidiTimbre) {
    if (this.snapshot.timbre === timbre) {
      return;
    }
    const wasPlaying = this.snapshot.isPlaying;
    if (this.context && wasPlaying) {
      await this.pause();
    }
    this.snapshot = { ...this.snapshot, timbre };
    if (wasPlaying) {
      await this.resume();
      return;
    }
    this.emit();
  }

  async setOctaveShift(shift: number) {
    const nextShift = clampOctaveShift(shift);
    if (nextShift === this.snapshot.octaveShift) {
      return;
    }
    const wasPlaying = this.snapshot.isPlaying;
    if (this.context && wasPlaying) {
      await this.pause();
    }
    this.snapshot = { ...this.snapshot, octaveShift: nextShift };
    if (wasPlaying) {
      await this.resume();
      return;
    }
    this.emit();
  }

  async setLoopEnabled(enabled: boolean) {
    if (this.snapshot.loopEnabled === enabled) {
      return;
    }
    this.snapshot = { ...this.snapshot, loopEnabled: enabled };
    this.emit();
  }

  subscribe(listener: (snapshot: MidiPlaybackSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.snapshot;
  }
}
