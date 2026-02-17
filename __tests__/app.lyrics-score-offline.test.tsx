import { render, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: () => ({ songId: "m45" }),
}));

jest.mock("react-native-webview", () => ({
  WebView: () => null,
}));

jest.mock("../src/features/settings/SettingsContext", () => ({
  useAppSettings: () => ({
    resolvedTheme: "dark",
    palette: {
      screenBackground: "#0B1220",
      surfaceBackground: "#111827",
      surfaceStrong: "#1F2937",
      border: "#334155",
      textPrimary: "#E2E8F0",
      textSecondary: "#94A3B8",
      accent: "#38BDF8",
      tabBackground: "#0F172A",
      tabBorder: "#334155",
      tabActive: "#38BDF8",
      tabInactive: "#64748B",
      danger: "#F87171",
    },
  }),
}));

jest.mock("../src/features/songs/loadSongs", () => ({
  loadSongs: jest.fn(async () => ({
    version: "1",
    songs: [
      {
        id: "m45",
        title: "都ぞ弥生",
        updatedAt: "2026-02-17T00:00:00Z",
        audio: {
          vocalMp3Url: "https://example.com/vocal.mp3",
          pianoMp3Url: "https://example.com/piano.midi",
          defaultSource: "vocal",
        },
        lyrics: { htmlUrl: "https://example.com/lyrics.html" },
        score: { pdfUrl: "https://example.com/score.pdf" },
      },
    ],
  })),
}));

jest.mock("../src/features/download/downloadService", () => ({
  downloadService: {
    getOfflineEntry: jest.fn(async () => ({
      songId: "m45",
      updatedAt: "2026-02-17T00:00:00Z",
      downloadedAt: "2026-02-17T00:00:00Z",
      files: {
        vocalAudioPath: "file:///offline/audio/vocal/m45.mp3",
        pianoAudioPath: "file:///offline/audio/piano/m45.midi",
        lyricsPath: "file:///offline/lyrics/m45.html",
        scorePath: "file:///offline/score/m45.pdf",
      },
    })),
    getSnapshot: jest.fn(() => ({ activeCount: 0, jobs: [] })),
    subscribe: jest.fn(() => () => {}),
    getJobBySongId: jest.fn(() => null),
    listOfflineEntries: jest.fn(async () => []),
    listDownloadMetas: jest.fn(async () => []),
    getSongDownloadMeta: jest.fn(async () => null),
    downloadSong: jest.fn(async () => "m45-1"),
    retrySongDownload: jest.fn(async () => "m45-2"),
    cancelSongDownload: jest.fn(),
    deleteSong: jest.fn(async () => {}),
  },
}));

describe("lyrics/score offline source", () => {
  it("loads offline entry for lyrics/score screens", async () => {
    const LyricsScreen = require("../app/(tabs)/lyrics/[songId]").default;
    const ScoreScreen = require("../app/(tabs)/score/[songId]").default;
    const { downloadService } = require("../src/features/download/downloadService");

    render(<LyricsScreen />);
    render(<ScoreScreen />);

    await waitFor(() => {
      expect(downloadService.getOfflineEntry).toHaveBeenCalledWith("m45");
    });
  });
});
