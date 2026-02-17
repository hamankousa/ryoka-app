jest.mock("../../src/features/player/audioEngine", () => ({
  audioEngine: {
    play: jest.fn(async () => {}),
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
    getOfflineEntry: jest.fn(),
    getSnapshot: () => ({ activeCount: 0, jobs: [] }),
    subscribe: () => () => {},
    getJobBySongId: () => null,
    listOfflineEntries: jest.fn(async () => []),
    listDownloadMetas: jest.fn(async () => []),
    getSongDownloadMeta: jest.fn(async () => null),
    downloadSong: jest.fn(async () => "m45-1"),
    retrySongDownload: jest.fn(async () => "m45-2"),
    cancelSongDownload: jest.fn(),
    deleteSong: jest.fn(async () => {}),
  },
}));

import { downloadService } from "../../src/features/download/downloadService";
import { audioEngine } from "../../src/features/player/audioEngine";
import { playSongWithQueue } from "../../src/features/player/globalPlayer";

describe("globalPlayer offline priority", () => {
  beforeEach(() => {
    (audioEngine.play as jest.Mock).mockClear();
    (downloadService.getOfflineEntry as jest.Mock).mockReset();
  });

  it("prefers offline path when available", async () => {
    const song = {
      id: "m45",
      title: "都ぞ弥生",
      updatedAt: "2026-02-17T00:00:00Z",
      audio: {
        vocalMp3Url: "https://example.com/vocal.mp3",
        pianoMp3Url: "https://example.com/piano.midi",
        defaultSource: "piano" as const,
      },
      lyrics: { htmlUrl: "https://example.com/lyrics.html" },
      score: { pdfUrl: "https://example.com/score.pdf" },
    };
    (downloadService.getOfflineEntry as jest.Mock).mockResolvedValue({
      songId: "m45",
      updatedAt: "2026-02-17T00:00:00Z",
      downloadedAt: "2026-02-17T00:00:00Z",
      files: {
        vocalAudioPath: "file:///offline/audio/vocal/m45.mp3",
        pianoAudioPath: "file:///offline/audio/piano/m45.midi",
        lyricsPath: "file:///offline/lyrics/m45.html",
        scorePath: "file:///offline/score/m45.pdf",
      },
    });

    await playSongWithQueue([song], song, "piano", false);
    expect(audioEngine.play).toHaveBeenCalledWith("file:///offline/audio/piano/m45.midi");
  });
});
