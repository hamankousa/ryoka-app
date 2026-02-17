jest.mock("../../src/features/player/audioEngine", () => ({
  audioEngine: {
    play: jest.fn(async (uri: string) => {
      if (uri.endsWith(".midi")) {
        throw new Error("Piano(MIDI)はExpo Goでは非対応です。Dev Clientで有効化するかVocalを選択してください。");
      }
    }),
    pause: jest.fn(async () => {}),
    resume: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    seek: jest.fn(async () => {}),
    setLoopEnabled: jest.fn(async () => {}),
    subscribe: jest.fn(() => () => {}),
    getSnapshot: jest.fn(() => ({
      isPlaying: false,
      uri: undefined,
      durationSec: 0,
      positionSec: 0,
      backend: "expo",
      tempoRate: 1,
      timbre: "triangle",
      octaveShift: 0,
      loopEnabled: false,
      canSeek: true,
      canLoop: true,
      canControlTempo: false,
      canControlTimbre: false,
      canControlOctave: false,
    })),
  },
}));

jest.mock("../../src/features/download/downloadService", () => ({
  downloadService: {
    getOfflineEntry: jest.fn(async () => null),
  },
}));

import { playSongWithQueue } from "../../src/features/player/globalPlayer";
import { audioEngine } from "../../src/features/player/audioEngine";

describe("audioEngine expo-go fallback", () => {
  beforeEach(() => {
    (audioEngine.play as jest.Mock).mockClear();
  });

  it("falls back to vocal candidate when midi candidate fails", async () => {
    const song = {
      id: "m45",
      title: "都ぞ弥生",
      updatedAt: "2026-02-17T00:00:00Z",
      audio: {
        vocalMp3Url: "https://example.com/m45-vocal.mp3",
        pianoMp3Url: "https://example.com/m45-piano.midi",
        defaultSource: "vocal" as const,
      },
      lyrics: { htmlUrl: "https://example.com/lyrics/m45.html" },
      score: { pdfUrl: "https://example.com/score/m45.pdf" },
    };

    await playSongWithQueue([song], song, "piano", false);

    expect(audioEngine.play).toHaveBeenNthCalledWith(1, "https://example.com/m45-piano.midi");
    expect(audioEngine.play).toHaveBeenNthCalledWith(2, "https://example.com/m45-vocal.mp3");
  });
});
