import {
  prepareWebPlaybackSession,
  resetWebPlaybackSessionForTests,
  setPlaybackAudioSessionType,
} from "../../src/features/player/webPlaybackSession";

type MutableGlobal = typeof globalThis & {
  navigator?: { audioSession?: { type?: string } };
  AudioContext?: new () => AudioContext;
  webkitAudioContext?: new () => AudioContext;
};

describe("webPlaybackSession", () => {
  const mutableGlobal = globalThis as MutableGlobal;
  const originalNavigator = mutableGlobal.navigator;
  const originalAudioContext = mutableGlobal.AudioContext;
  const originalWebkitAudioContext = mutableGlobal.webkitAudioContext;

  afterEach(() => {
    resetWebPlaybackSessionForTests();

    if (originalNavigator === undefined) {
      Reflect.deleteProperty(mutableGlobal, "navigator");
    } else {
      Object.defineProperty(mutableGlobal, "navigator", {
        value: originalNavigator,
        configurable: true,
      });
    }

    if (originalAudioContext === undefined) {
      Reflect.deleteProperty(mutableGlobal, "AudioContext");
    } else {
      Object.defineProperty(mutableGlobal, "AudioContext", {
        value: originalAudioContext,
        configurable: true,
      });
    }

    if (originalWebkitAudioContext === undefined) {
      Reflect.deleteProperty(mutableGlobal, "webkitAudioContext");
    } else {
      Object.defineProperty(mutableGlobal, "webkitAudioContext", {
        value: originalWebkitAudioContext,
        configurable: true,
      });
    }
  });

  it("sets navigator.audioSession.type to playback when available", () => {
    const navigatorLike = { audioSession: { type: "auto" } };
    const updated = setPlaybackAudioSessionType(navigatorLike);

    expect(updated).toBe(true);
    expect(navigatorLike.audioSession.type).toBe("playback");
  });

  it("does nothing on non-web platform", async () => {
    const navigatorLike = { audioSession: { type: "auto" } };

    await prepareWebPlaybackSession("ios", navigatorLike);

    expect(navigatorLike.audioSession.type).toBe("auto");
  });

  it("applies playback audio session on web", async () => {
    const navigatorLike = { audioSession: { type: "auto" } };
    await prepareWebPlaybackSession("web", navigatorLike);

    expect(navigatorLike.audioSession.type).toBe("playback");
  });

  it("unlocks web audio only once", async () => {
    let createCount = 0;

    class FakeAudioContext {
      state: AudioContextState = "running";
      currentTime = 0;
      destination = {} as AudioNode;

      constructor() {
        createCount += 1;
      }

      createGain() {
        return {
          gain: { value: 1 },
          connect: jest.fn(),
        } as unknown as GainNode;
      }

      createOscillator() {
        return {
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        } as unknown as OscillatorNode;
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(mutableGlobal, "AudioContext", {
      value: FakeAudioContext,
      configurable: true,
    });
    Reflect.deleteProperty(mutableGlobal, "webkitAudioContext");

    await prepareWebPlaybackSession("web", { audioSession: { type: "auto" } });
    await prepareWebPlaybackSession("web", { audioSession: { type: "auto" } });

    expect(createCount).toBe(1);
  });
});

