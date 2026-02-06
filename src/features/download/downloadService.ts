import { SongManifestItem } from "../../domain/manifest";
import {
  createOfflineRepo,
  OfflineEntry,
  OfflineSongPaths,
} from "../offline/offlineRepo";
import {
  createDownloadManager,
  DownloadAdapter,
  DownloadSnapshot,
} from "./DownloadManager";

class ExpoDownloadAdapter implements DownloadAdapter {
  private fs = require("expo-file-system/legacy") as {
    createDownloadResumable: (
      src: string,
      dest: string,
      options: Record<string, unknown>,
      callback?: (event: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
    ) => { downloadAsync: () => Promise<unknown> };
    getInfoAsync: (
      path: string,
      options?: { size?: boolean }
    ) => Promise<{ exists: boolean; size?: number }>;
    makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
  };

  private dirname(path: string) {
    const index = path.lastIndexOf("/");
    if (index <= 0) {
      return null;
    }
    return path.slice(0, index);
  }

  async download(
    sourceUrl: string,
    destinationPath: string,
    onProgress: (value0to1: number) => void
  ) {
    const dir = this.dirname(destinationPath);
    if (dir) {
      await this.fs.makeDirectoryAsync(dir, { intermediates: true });
    }

    const resumable = this.fs.createDownloadResumable(
      sourceUrl,
      destinationPath,
      {},
      (event) => {
        const expected = event.totalBytesExpectedToWrite || 1;
        onProgress(event.totalBytesWritten / expected);
      }
    );

    await resumable.downloadAsync();
    const info = await this.fs.getInfoAsync(destinationPath, { size: true });
    return {
      sizeBytes: info.size,
    };
  }

  async exists(path: string): Promise<boolean> {
    const info = await this.fs.getInfoAsync(path);
    return Boolean(info.exists);
  }
}

type TrackedDownload = {
  song: SongManifestItem;
  files: OfflineSongPaths;
};

export function createDownloadService() {
  const offlineRepo = createOfflineRepo({});
  const manager = createDownloadManager({
    adapter: new ExpoDownloadAdapter(),
    concurrency: 2,
    retryLimit: 3,
  });
  const tracked = new Map<string, TrackedDownload>();
  const lastStatus = new Map<string, string>();

  manager.subscribe((snapshot) => {
    for (const item of snapshot.jobs) {
      const previous = lastStatus.get(item.jobId);
      if (previous === item.status) {
        continue;
      }
      lastStatus.set(item.jobId, item.status);

      if (item.status === "completed") {
        const target = tracked.get(item.jobId);
        if (target) {
          void offlineRepo.upsertEntry({
            songId: target.song.id,
            updatedAt: target.song.updatedAt,
            downloadedAt: new Date().toISOString(),
            files: target.files,
          });
        }
      }

      if (item.status === "completed" || item.status === "failed") {
        tracked.delete(item.jobId);
      }
    }
  });

  function getJobBySongId(snapshot: DownloadSnapshot, songId: string) {
    const jobs = [...snapshot.jobs]
      .filter((job) => job.songId === songId)
      .sort((left, right) => left.jobId.localeCompare(right.jobId));
    return jobs.at(-1) ?? null;
  }

  return {
    subscribe: manager.subscribe,
    getSnapshot: manager.getSnapshot,
    getJobBySongId,
    listOfflineEntries: () => offlineRepo.listEntries(),
    getOfflineEntry: (songId: string) => offlineRepo.getEntry(songId),
    deleteSong: (songId: string) => offlineRepo.deleteEntry(songId, { deleteFiles: true }),
    downloadSong: async (song: SongManifestItem) => {
      const files = await offlineRepo.prepareSongPaths(song.id);
      const jobId = manager.enqueue({
        songId: song.id,
        files: [
          {
            kind: "vocal",
            sourceUrl: song.audio.vocalMp3Url,
            destinationPath: files.vocalAudioPath,
          },
          {
            kind: "piano",
            sourceUrl: song.audio.pianoMp3Url,
            destinationPath: files.pianoAudioPath,
          },
          {
            kind: "lyrics",
            sourceUrl: song.lyrics.htmlUrl,
            destinationPath: files.lyricsPath,
          },
          {
            kind: "score",
            sourceUrl: song.score.pdfUrl,
            destinationPath: files.scorePath,
          },
        ],
      });

      tracked.set(jobId, { song, files });
      return jobId;
    },
  };
}

export const downloadService = createDownloadService();

export type DownloadService = ReturnType<typeof createDownloadService>;
