import { SongManifestItem } from "../../src/domain/manifest";
import { createDownloadManager, DownloadAdapter } from "../../src/features/download/DownloadManager";
import { createDownloadService } from "../../src/features/download/downloadService";
import { OfflineEntry, OfflineSongPaths } from "../../src/features/offline/offlineRepo";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function songFixture(): SongManifestItem {
  return {
    id: "m45",
    title: "都ぞ弥生",
    updatedAt: "2026-02-17T00:00:00Z",
    audio: {
      vocalMp3Url: "https://example.com/audio/m45-vocal.mp3",
      pianoMp3Url: "https://example.com/audio/m45-piano.midi",
      vocalAlternates: [
        {
          id: "ch1",
          label: "合唱",
          mp3Url: "https://example.com/audio/m45-vocal-ch1.mp3",
        },
      ],
      defaultSource: "vocal",
      sizeBytes: 120,
      sha256: "audio-sha",
    },
    lyrics: {
      htmlUrl: "https://example.com/lyrics/m45.html",
      sizeBytes: 12,
      sha256: "lyrics-sha",
    },
    score: {
      pdfUrl: "https://example.com/score/m45.pdf",
      sizeBytes: 44,
      sha256: "score-sha",
    },
  };
}

function pathsFixture(songId: string): OfflineSongPaths {
  return {
    vocalAudioPath: `file:///offline/audio/vocal/${songId}.mp3`,
    pianoAudioPath: `file:///offline/audio/piano/${songId}.midi`,
    lyricsPath: `file:///offline/lyrics/${songId}.html`,
    scorePath: `file:///offline/score/${songId}.pdf`,
    vocalAlternatePaths: {
      ch1: `file:///offline/audio/vocal/${songId}__alt-ch1.mp3`,
    },
  };
}

function createOfflineRepoStub() {
  const entries = new Map<string, OfflineEntry>();
  return {
    prepareSongPaths: jest.fn(async (songId: string) => pathsFixture(songId)),
    upsertEntry: jest.fn(async (entry: OfflineEntry) => {
      entries.set(entry.songId, entry);
    }),
    listEntries: jest.fn(async () => [...entries.values()]),
    getEntry: jest.fn(async (songId: string) => entries.get(songId) ?? null),
    deleteEntry: jest.fn(async (songId: string) => {
      entries.delete(songId);
    }),
  };
}

function createHistoryStorageStub(initial: unknown = null) {
  let value = initial;
  return {
    get: jest.fn(async () => value),
    set: jest.fn(async (next: unknown) => {
      value = next;
    }),
  };
}

async function waitForSongStatus(
  service: ReturnType<typeof createDownloadService>,
  songId: string,
  statuses: string[]
) {
  const timeoutAt = Date.now() + 3000;
  while (Date.now() < timeoutAt) {
    const target = service.getJobBySongId(service.getSnapshot(), songId);
    if (target && statuses.includes(target.status)) {
      return target.status;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`status timeout for ${songId}`);
}

describe("downloadService", () => {
  it("stores offline entry sizes/hashes on completion and includes alternate vocals", async () => {
    const downloadedUrls: string[] = [];
    const adapter: DownloadAdapter = {
      download: async (sourceUrl) => {
        downloadedUrls.push(sourceUrl);
        if (sourceUrl === "https://example.com/audio/m45-vocal.mp3") {
          return { sizeBytes: 120 };
        }
        if (sourceUrl === "https://example.com/lyrics/m45.html") {
          return { sizeBytes: 12 };
        }
        if (sourceUrl === "https://example.com/score/m45.pdf") {
          return { sizeBytes: 44 };
        }
        return { sizeBytes: 77 };
      },
      exists: async () => true,
    };
    const manager = createDownloadManager({
      adapter,
      concurrency: 1,
      retryLimit: 0,
      sleep: async () => {},
    });
    const offlineRepo = createOfflineRepoStub();
    const historyStorage = createHistoryStorageStub();

    const service = createDownloadService({
      manager,
      offlineRepo,
      historyStorage,
      now: () => "2026-02-17T01:00:00Z",
      measureFileSize: async () => 77,
    });

    const song = songFixture();
    await service.downloadSong(song);
    await waitForSongStatus(service, song.id, ["completed"]);

    const entry = await service.getOfflineEntry(song.id);
    expect(entry).toBeTruthy();
    expect(entry?.sizes).toEqual({
      vocal: 120,
      piano: 77,
      lyrics: 12,
      score: 44,
    });
    expect(entry?.hashes).toEqual({
      vocal: "audio-sha",
      piano: "audio-sha",
      lyrics: "lyrics-sha",
      score: "score-sha",
    });
    expect(downloadedUrls).toEqual([
      song.audio.vocalMp3Url,
      song.audio.pianoMp3Url,
      song.lyrics.htmlUrl,
      song.score.pdfUrl,
      song.audio.vocalAlternates?.[0].mp3Url,
    ]);
  });

  it("normalizes unfinished history into interrupted failed status", async () => {
    const offlineRepo = createOfflineRepoStub();
    const historyStorage = createHistoryStorageStub({
      songs: {
        m50: {
          songId: "m50",
          status: "downloading",
          progress: 30,
          updatedAt: "2026-02-17T01:00:00Z",
          attempts: 1,
        },
      },
    });
    const manager = createDownloadManager({
      adapter: {
        download: async () => ({}),
        exists: async () => true,
      },
      concurrency: 1,
      retryLimit: 0,
      sleep: async () => {},
    });

    const service = createDownloadService({
      manager,
      offlineRepo,
      historyStorage,
      now: () => "2026-02-17T02:00:00Z",
    });

    const meta = await service.getSongDownloadMeta("m50");
    expect(meta?.status).toBe("failed");
    expect(meta?.interrupted).toBe(true);
    expect(meta?.error).toContain("中断");
  });

  it("retries failed songs as a new job", async () => {
    let calls = 0;
    const adapter: DownloadAdapter = {
      download: async (sourceUrl) => {
        calls += 1;
        if (calls === 1) {
          throw new Error("network");
        }
        if (sourceUrl === "https://example.com/audio/m45-vocal.mp3") {
          return { sizeBytes: 120 };
        }
        if (sourceUrl === "https://example.com/lyrics/m45.html") {
          return { sizeBytes: 12 };
        }
        if (sourceUrl === "https://example.com/score/m45.pdf") {
          return { sizeBytes: 44 };
        }
        return { sizeBytes: 20 };
      },
      exists: async () => true,
    };
    const manager = createDownloadManager({
      adapter,
      concurrency: 1,
      retryLimit: 0,
      sleep: async () => {},
    });
    const offlineRepo = createOfflineRepoStub();
    const historyStorage = createHistoryStorageStub();

    const service = createDownloadService({
      manager,
      offlineRepo,
      historyStorage,
      measureFileSize: async () => 20,
    });
    const song = songFixture();

    const firstJobId = await service.downloadSong(song);
    await waitForSongStatus(service, song.id, ["failed"]);
    const secondJobId = await service.retrySongDownload(song);
    await waitForSongStatus(service, song.id, ["completed"]);

    expect(secondJobId).not.toBe(firstJobId);
  });

  it("cancels active song download by songId", async () => {
    const slot = deferred<void>();
    const adapter: DownloadAdapter = {
      download: async () => {
        await slot.promise;
        return {};
      },
      exists: async () => true,
    };
    const manager = createDownloadManager({
      adapter,
      concurrency: 1,
      retryLimit: 0,
      sleep: async () => {},
    });
    const offlineRepo = createOfflineRepoStub();
    const historyStorage = createHistoryStorageStub();

    const service = createDownloadService({
      manager,
      offlineRepo,
      historyStorage,
    });

    const song = songFixture();
    await service.downloadSong(song);
    await Promise.resolve();
    service.cancelSongDownload(song.id);
    slot.resolve();
    await Promise.resolve();

    const meta = await service.getSongDownloadMeta(song.id);
    expect(meta?.status).toBe("cancelled");
  });
});
