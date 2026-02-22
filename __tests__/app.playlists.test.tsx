import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

const mockPush = jest.fn();
const mockPlayPlaylistFromIndex = jest.fn(async () => {});
const mockListPlaylists = jest.fn();
const mockGetPlaylist = jest.fn();
const mockCreatePlaylist = jest.fn();
const mockRenamePlaylist = jest.fn();
const mockDeletePlaylist = jest.fn(async () => {});
const mockAddSongToPlaylist = jest.fn(async () => {});
const mockRemoveSongAt = jest.fn();
const mockMoveSong = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({ playlistId: "pl-1" }),
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

jest.mock("../src/features/playlists/playlistRepository", () => ({
  playlistRepository: {
    listPlaylists: mockListPlaylists,
    getPlaylist: mockGetPlaylist,
    createPlaylist: mockCreatePlaylist,
    renamePlaylist: mockRenamePlaylist,
    deletePlaylist: mockDeletePlaylist,
    addSongToPlaylist: mockAddSongToPlaylist,
    removeSongAt: mockRemoveSongAt,
    moveSong: mockMoveSong,
  },
}));

jest.mock("../src/features/playlists/playlistPlayback", () => ({
  playPlaylistFromIndex: mockPlayPlaylistFromIndex,
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

describe("playlist screens", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPlayPlaylistFromIndex.mockReset();
    mockListPlaylists.mockReset();
    mockGetPlaylist.mockReset();
    mockCreatePlaylist.mockReset();
    mockRenamePlaylist.mockReset();
    mockDeletePlaylist.mockReset();
    mockAddSongToPlaylist.mockReset();
    mockRemoveSongAt.mockReset();
    mockMoveSong.mockReset();
  });

  it("creates/imports/deletes playlists on list screen", async () => {
    mockListPlaylists.mockResolvedValue([
      {
        id: "pl-1",
        name: "通学",
        items: [{ songId: "m45", addedAt: "2026-02-20T00:00:00Z" }],
        createdAt: "2026-02-20T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
    ]);
    mockCreatePlaylist.mockResolvedValue({
      id: "pl-2",
      name: "通学 (2)",
      items: [],
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:00Z",
    });

    const PlaylistsScreen = require("../app/(tabs)/playlists").default;
    render(<PlaylistsScreen />);

    await waitFor(() => {
      expect(screen.getByText("通学")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("playlist-create-name-input"), "練習");
    fireEvent.press(screen.getByTestId("playlist-create-submit"));
    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith("練習");
    });

    fireEvent.press(screen.getByTestId("playlist-import-open"));
    fireEvent.changeText(
      screen.getByTestId("playlist-import-input"),
      "schema: ryoka-playlist/v1\nname: 通学\nsongIds:\n  - m45\n  - x99\nexportedAt: 2026-02-20T00:00:00Z\n"
    );
    fireEvent.press(screen.getByTestId("playlist-import-submit"));
    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenNthCalledWith(2, "通学 (2)");
      expect(mockAddSongToPlaylist).toHaveBeenCalledWith("pl-2", "x99");
    });

    fireEvent.press(screen.getByTestId("playlist-delete-pl-1"));
    await waitFor(() => {
      expect(mockDeletePlaylist).toHaveBeenCalledWith("pl-1");
    });
  });

  it("shows unknown items and plays selected row on detail screen", async () => {
    mockGetPlaylist.mockResolvedValue({
      id: "pl-1",
      name: "通学",
      items: [
        { songId: "m45", addedAt: "2026-02-20T00:00:00Z" },
        { songId: "x99", addedAt: "2026-02-20T00:00:01Z" },
      ],
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:00Z",
    });
    mockRenamePlaylist.mockResolvedValue({
      id: "pl-1",
      name: "改名",
      items: [{ songId: "m45", addedAt: "2026-02-20T00:00:00Z" }],
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:02Z",
    });
    mockRemoveSongAt.mockResolvedValue({
      id: "pl-1",
      name: "通学",
      items: [{ songId: "m45", addedAt: "2026-02-20T00:00:00Z" }],
      createdAt: "2026-02-20T00:00:00Z",
      updatedAt: "2026-02-20T00:00:02Z",
    });

    const PlaylistDetailScreen = require("../app/(tabs)/playlist/[playlistId]").default;
    render(<PlaylistDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("不明曲: x99")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("playlist-play-row-0"));
    expect(mockPlayPlaylistFromIndex).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("playlist-remove-row-1"));
    await waitFor(() => {
      expect(mockRemoveSongAt).toHaveBeenCalledWith("pl-1", 1);
    });
  });
});
