import { Audio, AVPlaybackStatus } from "expo-av";
import { Platform } from "react-native";

import { MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { isMidiUrl } from "./audioSource";
import { MidiTimbre, WebMidiEngine } from "./webMidiEngine";

type BackendType = "expo" | "web-midi";

export type PlaybackSnapshot = {
  backend: BackendType;
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
  canSeek: boolean;
  canLoop: boolean;
  canControlTempo: boolean;
  canControlTimbre: boolean;
  canControlOctave: boolean;
};

class AudioEngine {
  private sound: Audio.Sound | null = null;
  private snapshot: PlaybackSnapshot = {
    backend: "expo",
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    midiNotes: undefined,
    tempoRate: 1,
    timbre: "triangle",
    octaveShift: 0,
    loopEnabled: false,
    canSeek: true,
    canLoop: true,
    canControlTempo: false,
    canControlTimbre: false,
    canControlOctave: false,
  };
  private listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private webMidi = new WebMidiEngine();
  private activeBackend: BackendType = "expo";

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private onStatusUpdate = (status: AVPlaybackStatus) => {
    if (this.activeBackend !== "expo") {
      return;
    }
    if (!status.isLoaded) {
      if (status.error) {
        this.snapshot = { ...this.snapshot, error: status.error, isPlaying: false };
        this.emit();
      }
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      backend: "expo",
      isPlaying: status.isPlaying,
      positionSec: status.positionMillis / 1000,
      durationSec: (status.durationMillis ?? 0) / 1000,
      midiNotes: undefined,
      canSeek: true,
      canLoop: true,
      canControlTempo: false,
      canControlTimbre: false,
      canControlOctave: false,
    };
    this.emit();
  };

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
    });
  }

  private async stopExpoSound() {
    if (!this.sound) {
      return;
    }
    try {
      await this.sound.stopAsync();
    } catch {
      // ignore stop errors when unloading
    }
    await this.sound.unloadAsync();
    this.sound = null;
  }

  private async useWebMidiIfNeeded(uri: string) {
    const shouldUseWebMidi = Platform.OS === "web" && isMidiUrl(uri);
    if (!shouldUseWebMidi) {
      return false;
    }

    this.activeBackend = "web-midi";
    await this.stopExpoSound();
    await this.webMidi.setLoopEnabled(this.snapshot.loopEnabled);
    await this.webMidi.setTempo(this.snapshot.tempoRate);
    await this.webMidi.setTimbre(this.snapshot.timbre);
    await this.webMidi.setOctaveShift(this.snapshot.octaveShift);
    await this.webMidi.play(uri);
    return true;
  }

  async play(uri: string) {
    if (await this.useWebMidiIfNeeded(uri)) {
      return;
    }

    await this.ensureAudioMode();

    try {
      this.activeBackend = "expo";
      await this.webMidi.stop();
      await this.stopExpoSound();

      const created = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isLooping: this.snapshot.loopEnabled,
          progressUpdateIntervalMillis: 250,
        },
        this.onStatusUpdate
      );
      this.sound = created.sound;
      this.snapshot = {
        ...this.snapshot,
        backend: "expo",
        isPlaying: true,
        uri,
        error: undefined,
        positionSec: 0,
        durationSec: 0,
        midiNotes: undefined,
        canSeek: true,
        canLoop: true,
        canControlTempo: false,
        canControlTimbre: false,
        canControlOctave: false,
      };
      this.emit();
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        backend: "expo",
        isPlaying: false,
        midiNotes: undefined,
        error: error instanceof Error ? error.message : "playback failed",
      };
      this.emit();
      throw error;
    }
  }

  async pause() {
    if (this.activeBackend === "web-midi") {
      await this.webMidi.pause();
      return;
    }

    if (!this.sound) {
      return;
    }

    await this.sound.pauseAsync();
  }

  async resume() {
    if (this.activeBackend === "web-midi") {
      await this.webMidi.resume();
      return;
    }

    if (!this.sound) {
      return;
    }

    await this.sound.playAsync();
  }

  async stop() {
    if (this.activeBackend === "web-midi") {
      await this.webMidi.stop();
      return;
    }

    if (!this.sound) {
      return;
    }

    await this.sound.stopAsync();
  }

  async seek(positionSec: number) {
    if (!Number.isFinite(positionSec)) {
      return;
    }
    if (this.activeBackend === "web-midi") {
      await this.webMidi.seek(positionSec);
      return;
    }
    if (!this.sound) {
      return;
    }
    await this.sound.setPositionAsync(Math.max(0, positionSec) * 1000);
  }

  async setTempo(rate: number) {
    if (this.activeBackend !== "web-midi") {
      return;
    }
    await this.webMidi.setTempo(rate);
  }

  async setTimbre(timbre: MidiTimbre) {
    if (this.activeBackend !== "web-midi") {
      return;
    }
    await this.webMidi.setTimbre(timbre);
  }

  async setOctaveShift(shift: number) {
    if (this.activeBackend !== "web-midi") {
      return;
    }
    await this.webMidi.setOctaveShift(shift);
  }

  async setLoopEnabled(enabled: boolean) {
    this.snapshot = { ...this.snapshot, loopEnabled: enabled };
    if (this.activeBackend === "web-midi") {
      await this.webMidi.setLoopEnabled(enabled);
      return;
    }
    if (this.sound) {
      await this.sound.setIsLoopingAsync(enabled);
    }
    this.emit();
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void) {
    const stopWebMidi = this.webMidi.subscribe((snapshot) => {
      if (this.activeBackend !== "web-midi") {
        return;
      }
      this.snapshot = {
        ...this.snapshot,
        backend: "web-midi",
        isPlaying: snapshot.isPlaying,
        uri: snapshot.uri,
        error: snapshot.error,
        positionSec: snapshot.positionSec,
        durationSec: snapshot.durationSec,
        midiNotes: snapshot.midiNotes,
        tempoRate: snapshot.tempoRate,
        timbre: snapshot.timbre,
        octaveShift: snapshot.octaveShift,
        loopEnabled: snapshot.loopEnabled,
        canSeek: true,
        canLoop: true,
        canControlTempo: true,
        canControlTimbre: true,
        canControlOctave: true,
      };
      this.emit();
    });

    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      stopWebMidi();
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.snapshot;
  }
}

export const audioEngine = new AudioEngine();
