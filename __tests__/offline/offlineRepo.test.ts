import {
  createOfflineRepo,
  InMemoryOfflineStorage,
  OfflineEntry,
  type OfflineFileSystem,
} from "../../src/features/offline/offlineRepo";

class FakeOfflineFileSystem implements OfflineFileSystem {
  private existing = new Set<string>();
  public createdDirs: string[] = [];
  public deletedFiles: string[] = [];

  constructor(paths: string[] = []) {
    paths.forEach((path) => this.existing.add(path));
  }

  async ensureDir(path: string): Promise<void> {
    this.createdDirs.push(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.existing.has(path);
  }

  async delete(path: string): Promise<void> {
    this.existing.delete(path);
    this.deletedFiles.push(path);
  }

  seed(path: string) {
    this.existing.add(path);
  }
}

function buildEntry(songId: string, root: string): OfflineEntry {
  return {
    songId,
    updatedAt: "2026-02-06T00:00:00Z",
    downloadedAt: "2026-02-06T01:00:00Z",
    files: {
      vocalAudioPath: `${root}/audio/vocal/${songId}.mp3`,
      pianoAudioPath: `${root}/audio/piano/${songId}.mp3`,
      lyricsPath: `${root}/lyrics/${songId}.html`,
      scorePath: `${root}/score/${songId}.pdf`,
    },
  };
}

describe("offlineRepo", () => {
  it("builds song paths and ensures directories", async () => {
    const storage = new InMemoryOfflineStorage();
    const fileSystem = new FakeOfflineFileSystem();
    const repo = createOfflineRepo({
      rootDir: "file:///doc/offline",
      storage,
      fileSystem,
    });

    const paths = await repo.prepareSongPaths("m45");

    expect(paths.vocalAudioPath).toBe("file:///doc/offline/audio/vocal/m45.mp3");
    expect(paths.pianoAudioPath).toBe("file:///doc/offline/audio/piano/m45.mp3");
    expect(paths.lyricsPath).toBe("file:///doc/offline/lyrics/m45.html");
    expect(paths.scorePath).toBe("file:///doc/offline/score/m45.pdf");
    expect(fileSystem.createdDirs).toEqual([
      "file:///doc/offline",
      "file:///doc/offline/audio",
      "file:///doc/offline/audio/vocal",
      "file:///doc/offline/audio/piano",
      "file:///doc/offline/lyrics",
      "file:///doc/offline/score",
    ]);
  });

  it("stores and retrieves entries", async () => {
    const root = "file:///doc/offline";
    const storage = new InMemoryOfflineStorage();
    const repo = createOfflineRepo({
      rootDir: root,
      storage,
      fileSystem: new FakeOfflineFileSystem(),
    });

    await repo.upsertEntry(buildEntry("m45", root));
    await repo.upsertEntry(buildEntry("m46", root));

    const m45 = await repo.getEntry("m45");
    const list = await repo.listEntries();

    expect(m45?.songId).toBe("m45");
    expect(list.map((entry) => entry.songId)).toEqual(["m45", "m46"]);
  });

  it("deletes files and metadata", async () => {
    const root = "file:///doc/offline";
    const storage = new InMemoryOfflineStorage();
    const fileSystem = new FakeOfflineFileSystem();
    const repo = createOfflineRepo({ rootDir: root, storage, fileSystem });

    const entry = buildEntry("m45", root);
    fileSystem.seed(entry.files.vocalAudioPath);
    fileSystem.seed(entry.files.pianoAudioPath);
    fileSystem.seed(entry.files.lyricsPath);
    fileSystem.seed(entry.files.scorePath);
    await repo.upsertEntry(entry);

    await repo.deleteEntry("m45", { deleteFiles: true });

    expect(await repo.getEntry("m45")).toBeNull();
    expect(fileSystem.deletedFiles.sort()).toEqual([
      entry.files.lyricsPath,
      entry.files.pianoAudioPath,
      entry.files.scorePath,
      entry.files.vocalAudioPath,
    ].sort());
  });
});
