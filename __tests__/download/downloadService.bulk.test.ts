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

function songFixture(songId: string): SongManifestItem {
  return {
    id: songId,
    title: songId,
    updatedAt: "2026-02-17T00:00:00Z",
    audio: {
      vocalMp3Url: `https://example.com/${songId}-vocal.mp3`,
      pianoMp3Url: `https://example.com/${songId}-piano.midi`,
      defaultSource: "vocal",
    },
    lyrics: {
      htmlUrl: `https://example.com/${songId}.html`,
    },
    score: {
      pdfUrl: `https://example.com/${songId}.pdf`,
    },
  };
}

function pathsFixture(songId: string): OfflineSongPaths {
  return {
    vocalAudioPath: `file:///offline/audio/vocal/${songId}.mp3`,
    pianoAudioPath: `file:///offline/audio/piano/${songId}.midi`,
    lyricsPath: `file:///offline/lyrics/${songId}.html`,
    scorePath: `file:///offline/score/${songId}.pdf`,
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

describe("downloadService bulk operations", () => {
  it("deduplicates bulk enqueue and skips songs already active", async () => {
    const slot = deferred<void>();
    let callCount = 0;
    const adapter: DownloadAdapter = {
      download: async () => {
        callCount += 1;
        if (callCount === 1) {
          await slot.promise;
        }
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
    const service = createDownloadService({
      manager,
      offlineRepo: createOfflineRepoStub(),
      historyStorage: createHistoryStorageStub(),
      measureFileSize: async () => 1,
    });

    const songA = songFixture("m45");
    const songB = songFixture("m46");

    await service.downloadSong(songA);
    await waitForSongStatus(service, songA.id, ["downloading"]);

    const jobIds = await service.downloadSongsBulk([songA, songA, songB]);
    expect(jobIds).toHaveLength(1);

    slot.resolve();
    await waitForSongStatus(service, songA.id, ["completed", "failed", "cancelled"]);
    await waitForSongStatus(service, songB.id, ["completed", "failed", "cancelled"]);
  });

  it("cancels all active and queued jobs in bulk", async () => {
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
    const service = createDownloadService({
      manager,
      offlineRepo: createOfflineRepoStub(),
      historyStorage: createHistoryStorageStub(),
      measureFileSize: async () => 1,
    });

    const songA = songFixture("m45");
    const songB = songFixture("m46");

    await service.downloadSongsBulk([songA, songB]);
    await waitForSongStatus(service, songA.id, ["downloading"]);

    const cancelledCount = service.cancelBulkDownloads();
    expect(cancelledCount).toBeGreaterThanOrEqual(1);

    slot.resolve();
    await waitForSongStatus(service, songA.id, ["cancelled", "completed", "failed"]);
    await waitForSongStatus(service, songB.id, ["cancelled", "completed", "failed"]);

    const statuses = service
      .getSnapshot()
      .jobs.filter((job) => job.songId === songA.id || job.songId === songB.id)
      .map((job) => job.status);
    expect(statuses).toContain("cancelled");
  });

  it("retries only failed or cancelled songs", async () => {
    const failedSong = songFixture("m45");
    const completedSong = songFixture("m46");
    const failOnce = new Set([failedSong.id]);

    const adapter: DownloadAdapter = {
      download: async (_sourceUrl, destinationPath) => {
        if (destinationPath.includes("m45") && failOnce.has("m45")) {
          failOnce.delete("m45");
          throw new Error("network");
        }
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

    const service = createDownloadService({
      manager,
      offlineRepo: createOfflineRepoStub(),
      historyStorage: createHistoryStorageStub(),
      measureFileSize: async () => 1,
    });

    await service.downloadSong(failedSong);
    await service.downloadSong(completedSong);
    await waitForSongStatus(service, failedSong.id, ["failed"]);
    await waitForSongStatus(service, completedSong.id, ["completed"]);

    const retried = await service.retryFailedBulkDownloads([failedSong, completedSong]);

    expect(retried).toHaveLength(1);
    await waitForSongStatus(service, failedSong.id, ["completed"]);
  });
});
