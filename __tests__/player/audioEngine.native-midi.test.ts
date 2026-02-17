jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: jest.fn(async () => {}),
    Sound: {
      createAsync: jest.fn(async () => ({
        sound: {
          stopAsync: jest.fn(async () => {}),
          unloadAsync: jest.fn(async () => {}),
          pauseAsync: jest.fn(async () => {}),
          playAsync: jest.fn(async () => {}),
          setPositionAsync: jest.fn(async () => {}),
          setIsLoopingAsync: jest.fn(async () => {}),
        },
      })),
    },
  },
}));

import { AudioEngine } from "../../src/features/player/audioEngine";
import { NATIVE_MIDI_UNSUPPORTED_MESSAGE } from "../../src/features/player/nativeMidiEngine";
import { MidiPlaybackSnapshot } from "../../src/features/player/webMidiEngine";

function createWebMidiStub() {
  const snapshot: MidiPlaybackSnapshot = {
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    midiNotes: undefined,
    tempoRate: 1,
    timbre: "triangle",
    octaveShift: 0,
    loopEnabled: false,
  };
  return {
    play: jest.fn(async () => {}),
    pause: jest.fn(async () => {}),
    resume: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    seek: jest.fn(async () => {}),
    setTempo: jest.fn(async () => {}),
    setTimbre: jest.fn(async () => {}),
    setOctaveShift: jest.fn(async () => {}),
    setLoopEnabled: jest.fn(async () => {}),
    subscribe: jest.fn((listener: (next: MidiPlaybackSnapshot) => void) => {
      listener(snapshot);
      return () => {};
    }),
  };
}

function createNativeMidiStub({ supported }: { supported: boolean }) {
  let listener: ((snapshot: {
    isPlaying: boolean;
    uri?: string;
    error?: string;
    positionSec: number;
    durationSec: number;
    midiNotes?: Array<{ noteNumber: number; startSec: number; endSec: number }>;
    tempoRate: number;
    timbre: "triangle" | "sine" | "square" | "sawtooth" | "piano";
    octaveShift: number;
    loopEnabled: boolean;
  }) => void) | null = null;
  const emit = (patch: Record<string, unknown>) => {
    if (!listener) {
      return;
    }
    listener({
      isPlaying: false,
      positionSec: 0,
      durationSec: 12,
      tempoRate: 1,
      timbre: "triangle",
      octaveShift: 0,
      loopEnabled: false,
      ...(patch as any),
    });
  };

  return {
    isSupported: jest.fn(() => supported),
    play: jest.fn(async (uri: string) => {
      emit({ isPlaying: true, uri, positionSec: 0 });
    }),
    pause: jest.fn(async () => {
      emit({ isPlaying: false });
    }),
    resume: jest.fn(async () => {
      emit({ isPlaying: true });
    }),
    stop: jest.fn(async () => {
      emit({ isPlaying: false, positionSec: 0 });
    }),
    seek: jest.fn(async (positionSec: number) => {
      emit({ positionSec });
    }),
    setTempo: jest.fn(async (tempoRate: number) => {
      emit({ tempoRate });
    }),
    setTimbre: jest.fn(async (timbre: string) => {
      emit({ timbre });
    }),
    setOctaveShift: jest.fn(async (octaveShift: number) => {
      emit({ octaveShift });
    }),
    setLoopEnabled: jest.fn(async (loopEnabled: boolean) => {
      emit({ loopEnabled });
    }),
    subscribe: jest.fn(
      (
        next: (snapshot: {
          isPlaying: boolean;
          uri?: string;
          error?: string;
          positionSec: number;
          durationSec: number;
          midiNotes?: Array<{ noteNumber: number; startSec: number; endSec: number }>;
          tempoRate: number;
          timbre: "triangle" | "sine" | "square" | "sawtooth" | "piano";
          octaveShift: number;
          loopEnabled: boolean;
        }) => void
      ) => {
        listener = next;
        next({
          isPlaying: false,
          positionSec: 0,
          durationSec: 0,
          tempoRate: 1,
          timbre: "triangle",
          octaveShift: 0,
          loopEnabled: false,
        });
        return () => {
          listener = null;
        };
      }
    ),
  };
}

describe("AudioEngine native-midi backend", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses native-midi backend for midi on native platforms", async () => {
    const webMidi = createWebMidiStub();
    const nativeMidi = createNativeMidiStub({ supported: true });
    const engine = new AudioEngine({
      webMidi: webMidi as any,
      nativeMidi: nativeMidi as any,
    });

    await engine.play("https://example.com/m45.midi");

    expect(nativeMidi.play).toHaveBeenCalledWith("https://example.com/m45.midi");
    expect(engine.getSnapshot().backend).toBe("native-midi");
    expect(engine.getSnapshot().isPlaying).toBe(true);
  });

  it("applies tempo/timbre/loop/seek controls to native engine", async () => {
    const webMidi = createWebMidiStub();
    const nativeMidi = createNativeMidiStub({ supported: true });
    const engine = new AudioEngine({
      webMidi: webMidi as any,
      nativeMidi: nativeMidi as any,
    });
    await engine.play("https://example.com/m45.midi");

    await engine.setTempo(1.5);
    await engine.setTimbre("piano");
    await engine.setLoopEnabled(true);
    await engine.seek(8);

    expect(nativeMidi.setTempo).toHaveBeenCalledWith(1.5);
    expect(nativeMidi.setTimbre).toHaveBeenCalledWith("piano");
    expect(nativeMidi.setLoopEnabled).toHaveBeenCalledWith(true);
    expect(nativeMidi.seek).toHaveBeenCalledWith(8);
  });

  it("throws user-facing fallback error when native midi is unavailable", async () => {
    const webMidi = createWebMidiStub();
    const nativeMidi = createNativeMidiStub({ supported: false });
    const engine = new AudioEngine({
      webMidi: webMidi as any,
      nativeMidi: nativeMidi as any,
    });

    await expect(engine.play("https://example.com/m45.midi")).rejects.toThrow(
      NATIVE_MIDI_UNSUPPORTED_MESSAGE
    );
  });
});
