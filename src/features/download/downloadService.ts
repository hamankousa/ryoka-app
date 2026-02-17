import { SongManifestItem } from "../../domain/manifest";
import {
  createOfflineRepo,
  OfflineEntry,
  OfflineSongPaths,
} from "../offline/offlineRepo";
import {
  createDownloadManager,
  DownloadAdapter,
  DownloadFile,
  DownloadSnapshot,
  DownloadJobStatus,
} from "./DownloadManager";

const DOWNLOAD_HISTORY_KEY = "download_job_history_v1";
const INTERRUPTED_ERROR_MESSAGE = "ダウンロードが中断されました。再試行してください。";

type TrackedDownload = {
  song: SongManifestItem;
  files: OfflineSongPaths;
};

export type SongDownloadMeta = {
  songId: string;
  jobId: string;
  status: DownloadJobStatus;
  progress: number;
  attempts: number;
  updatedAt: string;
  error?: string;
  interrupted?: boolean;
};

type DownloadHistoryData = {
  songs: Record<string, SongDownloadMeta>;
};

interface DownloadHistoryStorage {
  get(): Promise<unknown | null>;
  set(data: DownloadHistoryData): Promise<void>;
}

interface OfflineRepoPort {
  prepareSongPaths(songId: string, extensions?: {
    vocalExt?: string;
    pianoExt?: string;
    vocalAlternateExtById?: Record<string, string | undefined>;
  }): Promise<OfflineSongPaths>;
  upsertEntry(entry: OfflineEntry): Promise<void>;
  listEntries(): Promise<OfflineEntry[]>;
  getEntry(songId: string): Promise<OfflineEntry | null>;
  deleteEntry(songId: string, options?: { deleteFiles?: boolean }): Promise<void>;
}

class AsyncStorageDownloadHistoryStorage implements DownloadHistoryStorage {
  private fallbackStorage = new Map<string, string>();

  private getStorage() {
    try {
      return require("@react-native-async-storage/async-storage")
        .default as {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<void>;
      };
    } catch {
      return {
        getItem: async (key: string) => this.fallbackStorage.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          this.fallbackStorage.set(key, value);
        },
      };
    }
  }

  async get(): Promise<unknown | null> {
    const raw = await this.getStorage().getItem(DOWNLOAD_HISTORY_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async set(data: DownloadHistoryData): Promise<void> {
    await this.getStorage().setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(data));
  }
}

class ExpoDownloadAdapter implements DownloadAdapter {
  private fs = require("expo-file-system/legacy") as {
    createDownloadResumable: (
      src: string,
      dest: string,
      options: Record<string, unknown>,
      callback?: (event: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
    ) => { downloadAsync: () => Promise<unknown>; pauseAsync?: () => Promise<unknown> };
    getInfoAsync: (
      path: string,
      options?: { size?: boolean }
    ) => Promise<{ exists: boolean; size?: number }>;
    makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
  };

  private activeResumables = new Map<string, { pauseAsync?: () => Promise<unknown> }>();

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
    onProgress: (value0to1: number) => void,
    context?: { jobId: string }
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
    if (context?.jobId) {
      this.activeResumables.set(context.jobId, resumable);
    }

    try {
      await resumable.downloadAsync();
      const info = await this.fs.getInfoAsync(destinationPath, { size: true });
      return {
        sizeBytes: info.size,
      };
    } finally {
      if (context?.jobId) {
        this.activeResumables.delete(context.jobId);
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const info = await this.fs.getInfoAsync(path);
    return Boolean(info.exists);
  }

  async cancel(jobId: string) {
    const resumable = this.activeResumables.get(jobId);
    if (!resumable?.pauseAsync) {
      return;
    }
    try {
      await resumable.pauseAsync();
    } catch {
      // ignore cancel errors
    } finally {
      this.activeResumables.delete(jobId);
    }
  }
}

function getFileExtension(urlLike: string, fallback: string) {
  try {
    const parsed = new URL(urlLike);
    const pathname = parsed.pathname;
    const index = pathname.lastIndexOf(".");
    if (index < 0 || index === pathname.length - 1) {
      return fallback;
    }
    return pathname.slice(index);
  } catch {
    const pathOnly = urlLike.split("?")[0].split("#")[0];
    const index = pathOnly.lastIndexOf(".");
    if (index < 0 || index === pathOnly.length - 1) {
      return fallback;
    }
    return pathOnly.slice(index);
  }
}

function normalizeProgress(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function isDownloadJobStatus(value: unknown): value is DownloadJobStatus {
  return (
    value === "queued" ||
    value === "downloading" ||
    value === "retrying" ||
    value === "cancelled" ||
    value === "completed" ||
    value === "failed"
  );
}

function isTransientStatus(status: DownloadJobStatus) {
  return status === "queued" || status === "downloading" || status === "retrying";
}

function compactRecord<T extends string | number>(record: Record<string, T | undefined>) {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined) as Array<[string, T]>;
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries) as Record<string, T>;
}

function normalizeHistoryData(raw: unknown, now: string): DownloadHistoryData {
  const sourceSongs =
    raw && typeof raw === "object" && "songs" in raw && raw.songs && typeof raw.songs === "object"
      ? (raw.songs as Record<string, unknown>)
      : {};
  const songs: Record<string, SongDownloadMeta> = {};

  for (const [songId, value] of Object.entries(sourceSongs)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const record = value as Record<string, unknown>;
    const status = isDownloadJobStatus(record.status) ? record.status : "failed";
    const normalizedStatus = isTransientStatus(status) ? "failed" : status;
    const interrupted = isTransientStatus(status) ? true : Boolean(record.interrupted);
    const fallbackError = interrupted ? INTERRUPTED_ERROR_MESSAGE : undefined;

    songs[songId] = {
      songId,
      jobId: typeof record.jobId === "string" ? record.jobId : `${songId}-restored`,
      status: normalizedStatus,
      progress: normalizeProgress(record.progress),
      attempts: typeof record.attempts === "number" && Number.isFinite(record.attempts) ? record.attempts : 0,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
      error: typeof record.error === "string" ? record.error : fallbackError,
      interrupted,
    };
  }

  return { songs };
}

function createDefaultDownloadManager() {
  return createDownloadManager({
    adapter: new ExpoDownloadAdapter(),
    concurrency: 2,
    retryLimit: 3,
  });
}

async function defaultMeasureFileSize(path: string) {
  const fs = require("expo-file-system/legacy") as {
    getInfoAsync: (target: string, options?: { size?: boolean }) => Promise<{ exists: boolean; size?: number }>;
  };
  const info = await fs.getInfoAsync(path, { size: true });
  return info.size;
}

function buildDownloadFiles(song: SongManifestItem, files: OfflineSongPaths): DownloadFile[] {
  const downloadFiles: DownloadFile[] = [
    {
      kind: "vocal",
      sourceUrl: song.audio.vocalMp3Url,
      destinationPath: files.vocalAudioPath,
      sizeBytes: song.audio.sizeBytes,
      sha256: song.audio.sha256,
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
      sizeBytes: song.lyrics.sizeBytes,
      sha256: song.lyrics.sha256,
    },
    {
      kind: "score",
      sourceUrl: song.score.pdfUrl,
      destinationPath: files.scorePath,
      sizeBytes: song.score.sizeBytes,
      sha256: song.score.sha256,
    },
  ];

  for (const alternate of song.audio.vocalAlternates ?? []) {
    const destinationPath = files.vocalAlternatePaths?.[alternate.id];
    if (!destinationPath) {
      continue;
    }
    downloadFiles.push({
      kind: "vocal",
      sourceUrl: alternate.mp3Url,
      destinationPath,
    });
  }

  return downloadFiles;
}

async function buildCompletedEntry({
  song,
  files,
  now,
  measureFileSize,
}: {
  song: SongManifestItem;
  files: OfflineSongPaths;
  now: () => string;
  measureFileSize: (path: string) => Promise<number | undefined>;
}): Promise<OfflineEntry> {
  const measured = {
    vocal: await measureFileSize(files.vocalAudioPath),
    piano: await measureFileSize(files.pianoAudioPath),
    lyrics: await measureFileSize(files.lyricsPath),
    score: await measureFileSize(files.scorePath),
  };

  const sizes = compactRecord<number>({
    vocal: song.audio.sizeBytes ?? measured.vocal,
    piano: measured.piano,
    lyrics: song.lyrics.sizeBytes ?? measured.lyrics,
    score: song.score.sizeBytes ?? measured.score,
  }) as OfflineEntry["sizes"];
  const hashes = compactRecord<string>({
    vocal: song.audio.sha256,
    piano: song.audio.sha256,
    lyrics: song.lyrics.sha256,
    score: song.score.sha256,
  }) as OfflineEntry["hashes"];

  return {
    songId: song.id,
    updatedAt: song.updatedAt,
    downloadedAt: now(),
    files,
    sizes,
    hashes,
  };
}

export function createDownloadService({
  offlineRepo = createOfflineRepo({}),
  manager = createDefaultDownloadManager(),
  historyStorage = new AsyncStorageDownloadHistoryStorage(),
  now = () => new Date().toISOString(),
  measureFileSize = defaultMeasureFileSize,
}: {
  offlineRepo?: OfflineRepoPort;
  manager?: ReturnType<typeof createDownloadManager>;
  historyStorage?: DownloadHistoryStorage;
  now?: () => string;
  measureFileSize?: (path: string) => Promise<number | undefined>;
} = {}) {
  const tracked = new Map<string, TrackedDownload>();
  const lastSnapshotByJob = new Map<string, string>();
  let historyData: DownloadHistoryData = { songs: {} };
  let historyLoaded = false;

  const historyReady = (async () => {
    const loaded = await historyStorage.get();
    historyData = normalizeHistoryData(loaded, now());
    historyLoaded = true;
    await historyStorage.set(historyData);
  })();

  async function persistHistory() {
    if (!historyLoaded) {
      await historyReady;
    }
    await historyStorage.set(historyData);
  }

  function getJobBySongId(snapshot: DownloadSnapshot, songId: string) {
    const jobs = [...snapshot.jobs]
      .filter((job) => job.songId === songId)
      .sort((left, right) => left.jobId.localeCompare(right.jobId));
    return jobs.at(-1) ?? null;
  }

  function updateSongMetaFromJob(item: DownloadSnapshot["jobs"][number]) {
    const interrupted = item.status === "failed" ? historyData.songs[item.songId]?.interrupted : false;
    historyData.songs[item.songId] = {
      songId: item.songId,
      jobId: item.jobId,
      status: item.status,
      progress: normalizeProgress(item.progress),
      attempts: item.attempts,
      updatedAt: now(),
      error: item.error,
      interrupted,
    };
  }

  manager.subscribe((snapshot) => {
    void (async () => {
      await historyReady;
      let changed = false;
      for (const item of snapshot.jobs) {
        const fingerprint = `${item.status}:${item.progress}:${item.attempts}:${item.error ?? ""}`;
        if (lastSnapshotByJob.get(item.jobId) === fingerprint) {
          continue;
        }
        lastSnapshotByJob.set(item.jobId, fingerprint);
        updateSongMetaFromJob(item);
        changed = true;

        if (item.status === "completed") {
          const target = tracked.get(item.jobId);
          if (target) {
            const entry = await buildCompletedEntry({
              song: target.song,
              files: target.files,
              now,
              measureFileSize,
            });
            await offlineRepo.upsertEntry(entry);
          }
        }

        if (item.status === "completed" || item.status === "failed" || item.status === "cancelled") {
          tracked.delete(item.jobId);
        }
      }

      if (changed) {
        await persistHistory();
      }
    })();
  });

  const downloadSong = async (song: SongManifestItem) => {
    await historyReady;
    const files = await offlineRepo.prepareSongPaths(song.id, {
      vocalExt: getFileExtension(song.audio.vocalMp3Url, ".mp3"),
      pianoExt: getFileExtension(song.audio.pianoMp3Url, ".mp3"),
      vocalAlternateExtById: Object.fromEntries(
        (song.audio.vocalAlternates ?? []).map((alternate) => [
          alternate.id,
          getFileExtension(alternate.mp3Url, ".mp3"),
        ])
      ),
    });
    const jobId = manager.enqueue({
      songId: song.id,
      files: buildDownloadFiles(song, files),
    });

    tracked.set(jobId, { song, files });
    return jobId;
  };

  return {
    subscribe: manager.subscribe,
    getSnapshot: manager.getSnapshot,
    getJobBySongId,
    listOfflineEntries: () => offlineRepo.listEntries(),
    getOfflineEntry: (songId: string) => offlineRepo.getEntry(songId),
    getSongDownloadMeta: async (songId: string) => {
      await historyReady;
      return historyData.songs[songId] ?? null;
    },
    listDownloadMetas: async () => {
      await historyReady;
      return Object.values(historyData.songs);
    },
    clearSongDownloadMeta: async (songId: string) => {
      await historyReady;
      if (!historyData.songs[songId]) {
        return;
      }
      delete historyData.songs[songId];
      await persistHistory();
    },
    deleteSong: async (songId: string) => {
      await offlineRepo.deleteEntry(songId, { deleteFiles: true });
      await historyReady;
      if (historyData.songs[songId]) {
        delete historyData.songs[songId];
        await persistHistory();
      }
    },
    cancelSongDownload: (songId: string) => {
      const job = getJobBySongId(manager.getSnapshot(), songId);
      if (!job) {
        return;
      }
      if (job.status === "queued" || job.status === "downloading" || job.status === "retrying") {
        manager.cancel(job.jobId);
      }
    },
    retrySongDownload: async (song: SongManifestItem) => {
      return downloadSong(song);
    },
    downloadSong,
  };
}

export const downloadService = createDownloadService();

export type DownloadService = ReturnType<typeof createDownloadService>;
