import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("../src/features/settings/SettingsContext", () => ({
  useAppSettings: () => ({
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
    listDownloadMetas: jest.fn(async () => [
      {
        songId: "m45",
        jobId: "m45-1",
        status: "failed",
        progress: 10,
        attempts: 1,
        updatedAt: "2026-02-17T00:00:00Z",
      },
    ]),
    getSongDownloadMeta: jest.fn(async () => null),
    getOfflineEntry: jest.fn(async () => null),
    downloadSong: jest.fn(async () => "m45-1"),
    downloadSongsBulk: jest.fn(async () => ["m45-1"]),
    cancelBulkDownloads: jest.fn(() => 0),
    retryFailedBulkDownloads: jest.fn(async () => ["m45-2"]),
    getBulkDownloadProgress: jest.fn(() => ({
      total: 1,
      queued: 0,
      downloading: 0,
      completed: 0,
      failed: 1,
      cancelled: 0,
      progress: 0,
    })),
    retrySongDownload: jest.fn(async () => "m45-2"),
    cancelSongDownload: jest.fn(),
    deleteSong: jest.fn(async () => {}),
  },
}));

describe("LibraryTabScreen download management", () => {
  it("shows retry action for failed songs", async () => {
    const LibraryTabScreen = require("../app/(tabs)/library").default;
    const { downloadService } = require("../src/features/download/downloadService");
    render(<LibraryTabScreen />);

    await waitFor(() => {
      expect(screen.getByText("都ぞ弥生")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("再試行"));
    expect(downloadService.retrySongDownload).toHaveBeenCalledTimes(1);
  });
});
