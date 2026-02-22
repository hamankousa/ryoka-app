import { Playlist } from "../../src/domain/playlist";
import { SongManifestItem } from "../../src/domain/manifest";
import { playPlaylistFromIndex } from "../../src/features/playlists/playlistPlayback";

const mockPlaySongWithQueue: jest.MockedFunction<
  (
    queue: SongManifestItem[],
    song: SongManifestItem,
    source: "vocal" | "piano",
    toggleIfSame?: boolean
  ) => Promise<void>
> = (jest.fn(async (..._args: unknown[]) => {}) as unknown) as jest.MockedFunction<
  (
    queue: SongManifestItem[],
    song: SongManifestItem,
    source: "vocal" | "piano",
    toggleIfSame?: boolean
  ) => Promise<void>
>;

jest.mock("../../src/features/player/globalPlayer", () => ({
  playSongWithQueue: (
    ...args: Parameters<typeof mockPlaySongWithQueue>
  ) => mockPlaySongWithQueue(...args),
}));

function song(id: string): SongManifestItem {
  return {
    id,
    title: id,
    updatedAt: "2026-02-20T00:00:00Z",
    audio: {
      vocalMp3Url: `https://example.com/${id}-vocal.mp3`,
      pianoMp3Url: `https://example.com/${id}-piano.midi`,
      defaultSource: "vocal",
    },
    lyrics: {
      htmlUrl: `https://example.com/${id}.html`,
    },
    score: {
      pdfUrl: `https://example.com/${id}.pdf`,
    },
  };
}

function playlist(items: string[]): Playlist {
  return {
    id: "pl-1",
    name: "A",
    items: items.map((songId, index) => ({
      songId,
      addedAt: `2026-02-20T00:00:0${index}Z`,
    })),
    createdAt: "2026-02-20T00:00:00Z",
    updatedAt: "2026-02-20T00:00:00Z",
  };
}

describe("playlistPlayback", () => {
  beforeEach(() => {
    mockPlaySongWithQueue.mockClear();
  });

  it("skips unknown songs when building queue", async () => {
    await playPlaylistFromIndex(playlist(["m45", "unknown", "m46"]), 0, [song("m45"), song("m46")]);
    expect(mockPlaySongWithQueue).toHaveBeenCalledTimes(1);
    const firstCall = mockPlaySongWithQueue.mock.calls[0]!;
    const queueArg = firstCall[0];
    expect(queueArg.map((item) => item.id)).toEqual(["m45", "m46"]);
  });

  it("starts from selected known song index", async () => {
    await playPlaylistFromIndex(playlist(["m45", "unknown", "m46"]), 2, [song("m45"), song("m46")]);
    expect(mockPlaySongWithQueue).toHaveBeenCalledTimes(1);
    const firstCall = mockPlaySongWithQueue.mock.calls[0]!;
    const selectedSongArg = firstCall[1];
    expect(selectedSongArg.id).toBe("m46");
  });

  it("throws when selected row is unknown", async () => {
    await expect(
      playPlaylistFromIndex(playlist(["m45", "unknown", "m46"]), 1, [song("m45"), song("m46")])
    ).rejects.toThrow("Unknown song");
  });

  it("throws when all songs are unknown", async () => {
    await expect(playPlaylistFromIndex(playlist(["unknown"]), 0, [song("m45")])).rejects.toThrow(
      "No playable songs"
    );
  });
});
