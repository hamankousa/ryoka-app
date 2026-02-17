import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("../src/features/settings/SettingsContext", () => ({
  useAppSettings: () => ({
    settings: { filterAutoCollapseEnabled: false },
    palette: {
      screenBackground: "#F8FAFC",
      surfaceBackground: "#FFFFFF",
      surfaceStrong: "#EEF2FF",
      border: "#CBD5E1",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      accent: "#2563EB",
      tabBackground: "#FFFFFF",
      tabBorder: "#CBD5E1",
      tabActive: "#0284C7",
      tabInactive: "#64748B",
      danger: "#B91C1C",
    },
  }),
}));

jest.mock("../src/features/player/audioEngine", () => ({
  audioEngine: {
    getSnapshot: () => ({
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
    }),
    subscribe: () => () => {},
  },
}));

jest.mock("../src/features/player/globalPlayer", () => ({
  playSongWithQueue: jest.fn(async () => {}),
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
    getSnapshot: jest.fn(() => ({ activeCount: 0, jobs: [] })),
    subscribe: jest.fn(() => () => {}),
    getJobBySongId: jest.fn(() => null),
    listOfflineEntries: jest.fn(async () => []),
    listDownloadMetas: jest.fn(async () => []),
    getSongDownloadMeta: jest.fn(async () => null),
    getOfflineEntry: jest.fn(async () => null),
    downloadSong: jest.fn(async () => "m45-1"),
    retrySongDownload: jest.fn(async () => "m45-2"),
    cancelSongDownload: jest.fn(),
    deleteSong: jest.fn(async () => {}),
    downloadSongsBulk: jest.fn(async () => ["m45-1"]),
    cancelBulkDownloads: jest.fn(() => 1),
    retryFailedBulkDownloads: jest.fn(async () => []),
    getBulkDownloadProgress: jest.fn(() => ({
      total: 1,
      queued: 0,
      downloading: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      progress: 0,
    })),
  },
}));

describe("SearchTabScreen bulk download", () => {
  it("starts bulk download from filtered result songs", async () => {
    const SearchTabScreen = require("../app/(tabs)/search").default;
    const { downloadService } = require("../src/features/download/downloadService");
    render(<SearchTabScreen />);

    await waitFor(() => {
      expect(screen.getByText("都ぞ弥生")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("search-bulk-download"));
    expect(downloadService.downloadSongsBulk).toHaveBeenCalledTimes(1);
  });
});
