import { createPlaylistRepository, InMemoryPlaylistStorage } from "../../src/features/playlists/playlistRepository";

describe("playlistRepository", () => {
  it("creates, renames, and deletes playlists", async () => {
    const storage = new InMemoryPlaylistStorage();
    let tick = 0;
    const repo = createPlaylistRepository({
      storage,
      now: () => `2026-02-20T00:00:0${tick++}Z`,
      idFactory: (() => {
        let seq = 0;
        return () => `pl-${++seq}`;
      })(),
    });

    const created = await repo.createPlaylist(" 通学 ");
    expect(created.id).toBe("pl-1");
    expect(created.name).toBe("通学");
    expect(created.items).toEqual([]);

    const renamed = await repo.renamePlaylist(created.id, " 練習 ");
    expect(renamed.name).toBe("練習");
    expect((await repo.getPlaylist(created.id))?.name).toBe("練習");

    await repo.deletePlaylist(created.id);
    expect(await repo.getPlaylist(created.id)).toBeNull();
    expect(await repo.listPlaylists()).toEqual([]);
  });

  it("adds songs, removes item, and moves item", async () => {
    const storage = new InMemoryPlaylistStorage();
    let tick = 0;
    const repo = createPlaylistRepository({
      storage,
      now: () => `2026-02-20T00:00:1${tick++}Z`,
      idFactory: () => "pl-1",
    });

    await repo.createPlaylist("A");
    await repo.addSongToPlaylist("pl-1", "m45");
    await repo.addSongToPlaylist("pl-1", "m46");
    await repo.addSongToPlaylist("pl-1", "m47");
    await repo.moveSong("pl-1", 2, 0);
    await repo.removeSongAt("pl-1", 1);

    const playlist = await repo.getPlaylist("pl-1");
    expect(playlist?.items.map((item) => item.songId)).toEqual(["m47", "m46"]);
  });

  it("restores from storage", async () => {
    const storage = new InMemoryPlaylistStorage();
    await storage.setItem(
      "playlist_collection_v1",
      JSON.stringify({
        version: 1,
        playlists: [
          {
            id: "pl-1",
            name: "A",
            items: [{ songId: "m45", addedAt: "2026-02-20T00:00:00Z" }],
            createdAt: "2026-02-20T00:00:00Z",
            updatedAt: "2026-02-20T00:00:00Z",
          },
        ],
      })
    );

    const repo = createPlaylistRepository({
      storage,
      now: () => "2026-02-20T00:00:00Z",
      idFactory: () => "pl-2",
    });

    const list = await repo.listPlaylists();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("pl-1");
    expect(list[0].items[0].songId).toBe("m45");
  });

  it("rejects invalid input and out-of-range moves", async () => {
    const repo = createPlaylistRepository({
      storage: new InMemoryPlaylistStorage(),
      now: () => "2026-02-20T00:00:00Z",
      idFactory: () => "pl-1",
    });

    await expect(repo.createPlaylist("")).rejects.toThrow("playlist name");
    await repo.createPlaylist("A");
    await expect(repo.renamePlaylist("pl-1", " ")).rejects.toThrow("playlist name");
    await expect(repo.addSongToPlaylist("pl-1", "")).rejects.toThrow("songId");
    await expect(repo.moveSong("pl-1", 0, 1)).rejects.toThrow("out of range");
    await expect(repo.removeSongAt("pl-1", 0)).rejects.toThrow("out of range");
  });
});
