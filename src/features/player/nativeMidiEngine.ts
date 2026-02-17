import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

import { MIDI_GUIDE_MAX_FPS, shouldAdvanceFrame } from "../../domain/frameSync";
import { MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { buildMidiSchedule } from "./midiParser";
import { clampTempoRate, clampPosition } from "./midiTransport";
import { SoundfontRepo, soundfontRepo } from "./soundfontRepo";
import { MAX_OCTAVE_SHIFT, MIN_OCTAVE_SHIFT, MidiTimbre } from "./webMidiEngine";

export const NATIVE_MIDI_UNSUPPORTED_MESSAGE =
  "Piano(MIDI)はExpo Goでは非対応です。Dev Clientで有効化するかVocalを選択してください。";

const TIMBRE_TO_PROGRAM: Record<MidiTimbre, number> = {
  piano: 0,
  triangle: 80,
  sine: 81,
  square: 82,
  sawtooth: 83,
};

type NativeMidiBridge = {
  play: (args: {
    midiUri: string;
    soundfontPath: string;
    tempoRate: number;
    loopEnabled: boolean;
    program: number;
    octaveShift: number;
  }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (positionSec: number) => Promise<void>;
  setTempo: (tempoRate: number) => Promise<void>;
  setLoopEnabled: (enabled: boolean) => Promise<void>;
  setProgram: (program: number) => Promise<void>;
  setOctaveShift: (octaveShift: number) => Promise<void>;
  getStatus?: () => Promise<{
    isPlaying?: boolean;
    positionSec?: number;
    durationSec?: number;
    error?: string;
  }>;
};

export type NativeMidiSnapshot = {
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

function getNativeBridge(moduleName = "RyokaMidi"): NativeMidiBridge | null {
  const module = (NativeModules as Record<string, unknown>)[moduleName] as
    | NativeMidiBridge
    | undefined;
  if (!module?.play || !module.pause || !module.resume || !module.stop || !module.seek) {
    return null;
  }
  return module;
}

function isExpoGoRuntime() {
  const executionEnvironment = (Constants as { executionEnvironment?: string }).executionEnvironment;
  return executionEnvironment === "storeClient";
}

function clampOctaveShift(shift: number) {
  const rounded = Math.round(shift);
  return Math.min(MAX_OCTAVE_SHIFT, Math.max(MIN_OCTAVE_SHIFT, rounded));
}

export function createNativeMidiEngine({
  bridge = getNativeBridge(),
  soundfont = soundfontRepo,
  fetchImpl = fetch,
  nowMs = () => Date.now(),
}: {
  bridge?: NativeMidiBridge | null;
  soundfont?: SoundfontRepo;
  fetchImpl?: typeof fetch;
  nowMs?: () => number;
} = {}) {
  let snapshot: NativeMidiSnapshot = {
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    midiNotes: undefined,
    tempoRate: 1,
    timbre: "triangle",
    octaveShift: 0,
    loopEnabled: false,
  };
  const listeners = new Set<(next: NativeMidiSnapshot) => void>();
  const noteCache = new Map<string, MidiPitchGuideNote[]>();
  let tickerHandle: ReturnType<typeof setTimeout> | null = null;
  let tickerLastTimestampMs: number | null = null;
  let playStartMs = 0;
  let playStartSec = 0;
  let statusSyncCounter = 0;

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const stopTicker = () => {
    if (tickerHandle) {
      clearTimeout(tickerHandle);
      tickerHandle = null;
    }
    tickerLastTimestampMs = null;
    statusSyncCounter = 0;
  };

  const startTicker = () => {
    if (tickerHandle) {
      return;
    }

    const step = () => {
      tickerHandle = null;
      if (!snapshot.isPlaying) {
        tickerLastTimestampMs = null;
        return;
      }

      const now = nowMs();
      if (shouldAdvanceFrame(tickerLastTimestampMs, now, MIDI_GUIDE_MAX_FPS)) {
        const elapsedSec = ((now - playStartMs) / 1000) * snapshot.tempoRate;
        const nextPosition = clampPosition(playStartSec + elapsedSec, snapshot.durationSec || Number.MAX_SAFE_INTEGER);
        snapshot = {
          ...snapshot,
          positionSec: snapshot.durationSec > 0 ? Math.min(nextPosition, snapshot.durationSec) : nextPosition,
        };

        if (!snapshot.loopEnabled && snapshot.durationSec > 0 && snapshot.positionSec >= snapshot.durationSec) {
          snapshot = { ...snapshot, isPlaying: false, positionSec: snapshot.durationSec };
        }

        emit();
        tickerLastTimestampMs = now;
      }

      if (snapshot.isPlaying && bridge?.getStatus) {
        statusSyncCounter += 1;
        if (statusSyncCounter % 25 === 0) {
          void bridge
            .getStatus()
            .then((status) => {
              snapshot = {
                ...snapshot,
                isPlaying: status.isPlaying ?? snapshot.isPlaying,
                positionSec:
                  typeof status.positionSec === "number"
                    ? clampPosition(status.positionSec, snapshot.durationSec || Number.MAX_SAFE_INTEGER)
                    : snapshot.positionSec,
                durationSec: typeof status.durationSec === "number" ? Math.max(0, status.durationSec) : snapshot.durationSec,
                error: status.error ?? snapshot.error,
              };
              emit();
            })
            .catch(() => {
              // ignore status sync errors
            });
        }
      }

      if (snapshot.isPlaying) {
        tickerHandle = setTimeout(step, 8);
      } else {
        tickerLastTimestampMs = null;
      }
    };

    tickerHandle = setTimeout(step, 8);
  };

  const isSupported = () => {
    return Platform.OS !== "web" && !isExpoGoRuntime() && Boolean(bridge);
  };

  const loadMidiNotes = async (uri: string) => {
    const cached = noteCache.get(uri);
    if (cached) {
      return cached;
    }
    const response = await fetchImpl(uri);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const schedule = buildMidiSchedule(bytes);
    const notes = schedule.notes.map((note) => ({
      noteNumber: note.noteNumber,
      startSec: note.startSec,
      endSec: note.endSec,
    }));
    noteCache.set(uri, notes);
    return notes;
  };

  const getDurationFromNotes = (notes?: MidiPitchGuideNote[]) => {
    if (!notes || notes.length === 0) {
      return snapshot.durationSec;
    }
    return notes.reduce((max, note) => Math.max(max, note.endSec), 0);
  };

  return {
    isSupported,
    getSnapshot: () => snapshot,
    subscribe(listener: (next: NativeMidiSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    async play(uri: string) {
      if (!isSupported() || !bridge) {
        throw new Error(NATIVE_MIDI_UNSUPPORTED_MESSAGE);
      }
      const soundfontPath = await soundfont.ensureReady();
      const notes = await loadMidiNotes(uri).catch(() => undefined);
      await bridge.play({
        midiUri: uri,
        soundfontPath,
        tempoRate: snapshot.tempoRate,
        loopEnabled: snapshot.loopEnabled,
        program: TIMBRE_TO_PROGRAM[snapshot.timbre],
        octaveShift: snapshot.octaveShift,
      });

      const durationSec = getDurationFromNotes(notes);
      playStartMs = nowMs();
      playStartSec = 0;
      snapshot = {
        ...snapshot,
        isPlaying: true,
        uri,
        error: undefined,
        positionSec: 0,
        durationSec,
        midiNotes: notes,
      };
      emit();
      startTicker();
    },
    async pause() {
      if (!bridge) {
        return;
      }
      await bridge.pause();
      stopTicker();
      snapshot = {
        ...snapshot,
        isPlaying: false,
      };
      emit();
    },
    async resume() {
      if (!bridge) {
        return;
      }
      await bridge.resume();
      playStartMs = nowMs();
      playStartSec = snapshot.positionSec;
      snapshot = { ...snapshot, isPlaying: true };
      emit();
      startTicker();
    },
    async stop() {
      if (bridge) {
        await bridge.stop();
      }
      stopTicker();
      snapshot = {
        ...snapshot,
        isPlaying: false,
        positionSec: 0,
      };
      emit();
    },
    async seek(positionSec: number) {
      if (!Number.isFinite(positionSec)) {
        return;
      }
      const next = clampPosition(positionSec, snapshot.durationSec || Number.MAX_SAFE_INTEGER);
      if (bridge) {
        await bridge.seek(next);
      }
      playStartMs = nowMs();
      playStartSec = next;
      snapshot = {
        ...snapshot,
        positionSec: next,
      };
      emit();
    },
    async setTempo(rate: number) {
      const next = clampTempoRate(rate);
      if (bridge) {
        await bridge.setTempo(next);
      }
      playStartMs = nowMs();
      playStartSec = snapshot.positionSec;
      snapshot = {
        ...snapshot,
        tempoRate: next,
      };
      emit();
    },
    async setTimbre(timbre: MidiTimbre) {
      if (bridge) {
        await bridge.setProgram(TIMBRE_TO_PROGRAM[timbre]);
      }
      snapshot = {
        ...snapshot,
        timbre,
      };
      emit();
    },
    async setOctaveShift(shift: number) {
      const next = clampOctaveShift(shift);
      if (bridge) {
        await bridge.setOctaveShift(next);
      }
      snapshot = {
        ...snapshot,
        octaveShift: next,
      };
      emit();
    },
    async setLoopEnabled(enabled: boolean) {
      if (bridge) {
        await bridge.setLoopEnabled(enabled);
      }
      snapshot = {
        ...snapshot,
        loopEnabled: enabled,
      };
      emit();
    },
  };
}

export const nativeMidiEngine = createNativeMidiEngine();

export type NativeMidiEngine = ReturnType<typeof createNativeMidiEngine>;
