import { SongManifestItem } from "../../domain/manifest";

const OFFLINE_STORAGE_KEY = "offline_entries_v1";

export type OfflineSongPaths = {
  vocalAudioPath: string;
  pianoAudioPath: string;
  lyricsPath: string;
  scorePath: string;
};
type AudioExtensions = {
  vocalExt?: string;
  pianoExt?: string;
};

export type OfflineEntry = {
  songId: string;
  updatedAt: string;
  version?: string;
  files: OfflineSongPaths;
  downloadedAt: string;
  sizes?: Partial<Record<"vocal" | "piano" | "lyrics" | "score", number>>;
  hashes?: Partial<Record<"vocal" | "piano" | "lyrics" | "score", string>>;
};

type OfflineStorageData = {
  entries: Record<string, OfflineEntry>;
};

export interface OfflineStorage {
  get(): Promise<OfflineStorageData | null>;
  set(data: OfflineStorageData): Promise<void>;
}

export interface OfflineFileSystem {
  ensureDir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}

class AsyncStorageOfflineStorage implements OfflineStorage {
  private getStorage() {
    return require("@react-native-async-storage/async-storage")
      .default as {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  }

  async get(): Promise<OfflineStorageData | null> {
    const raw = await this.getStorage().getItem(OFFLINE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as OfflineStorageData;
  }

  async set(data: OfflineStorageData): Promise<void> {
    await this.getStorage().setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data));
  }
}

class ExpoOfflineFileSystem implements OfflineFileSystem {
  private fs = require("expo-file-system/legacy") as {
    getInfoAsync: (path: string) => Promise<{ exists: boolean }>;
    makeDirectoryAsync: (path: string, options?: { intermediates?: boolean }) => Promise<void>;
    deleteAsync: (path: string, options?: { idempotent?: boolean }) => Promise<void>;
  };

  async ensureDir(path: string): Promise<void> {
    await this.fs.makeDirectoryAsync(path, { intermediates: true });
  }

  async exists(path: string): Promise<boolean> {
    const info = await this.fs.getInfoAsync(path);
    return Boolean(info.exists);
  }

  async delete(path: string): Promise<void> {
    await this.fs.deleteAsync(path, { idempotent: true });
  }
}

export class InMemoryOfflineStorage implements OfflineStorage {
  private data: OfflineStorageData | null = null;

  async get(): Promise<OfflineStorageData | null> {
    return this.data;
  }

  async set(data: OfflineStorageData): Promise<void> {
    this.data = data;
  }
}

function normalizeDir(path: string) {
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function normalizeExtension(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }
  return value.startsWith(".") ? value : `.${value}`;
}

function createPathBuilder(rootDir: string) {
  const root = normalizeDir(rootDir);
  const audio = `${root}/audio`;
  return {
    root,
    dirs: {
      root,
      audio,
      vocal: `${audio}/vocal`,
      piano: `${audio}/piano`,
      lyrics: `${root}/lyrics`,
      score: `${root}/score`,
    },
    songPaths: (songId: string, extensions: AudioExtensions = {}): OfflineSongPaths => ({
      vocalAudioPath: `${audio}/vocal/${songId}${normalizeExtension(extensions.vocalExt, ".mp3")}`,
      pianoAudioPath: `${audio}/piano/${songId}${normalizeExtension(extensions.pianoExt, ".mp3")}`,
      lyricsPath: `${root}/lyrics/${songId}.html`,
      scorePath: `${root}/score/${songId}.pdf`,
    }),
  };
}

export function getDefaultOfflineRootDir() {
  const legacyFs = require("expo-file-system/legacy") as {
    documentDirectory?: string;
  };
  const documentDirectory = legacyFs.documentDirectory ?? "file:///";
  return `${normalizeDir(documentDirectory)}/offline`;
}

export function createOfflineRepo({
  rootDir = getDefaultOfflineRootDir(),
  storage = new AsyncStorageOfflineStorage(),
  fileSystem = new ExpoOfflineFileSystem(),
}: {
  rootDir?: string;
  storage?: OfflineStorage;
  fileSystem?: OfflineFileSystem;
}) {
  const pathBuilder = createPathBuilder(rootDir);

  async function readAll() {
    const data = await storage.get();
    return data?.entries ?? {};
  }

  async function writeAll(entries: Record<string, OfflineEntry>) {
    await storage.set({ entries });
  }

  return {
    rootDir: pathBuilder.root,
    prepareSongPaths: async (songId: string, extensions: AudioExtensions = {}) => {
      await fileSystem.ensureDir(pathBuilder.dirs.root);
      await fileSystem.ensureDir(pathBuilder.dirs.audio);
      await fileSystem.ensureDir(pathBuilder.dirs.vocal);
      await fileSystem.ensureDir(pathBuilder.dirs.piano);
      await fileSystem.ensureDir(pathBuilder.dirs.lyrics);
      await fileSystem.ensureDir(pathBuilder.dirs.score);
      return pathBuilder.songPaths(songId, extensions);
    },
    buildEntryFromSong: async (song: SongManifestItem): Promise<OfflineEntry> => ({
      songId: song.id,
      updatedAt: song.updatedAt,
      downloadedAt: new Date().toISOString(),
      files: pathBuilder.songPaths(song.id),
    }),
    upsertEntry: async (entry: OfflineEntry) => {
      const entries = await readAll();
      entries[entry.songId] = entry;
      await writeAll(entries);
    },
    getEntry: async (songId: string) => {
      const entries = await readAll();
      return entries[songId] ?? null;
    },
    listEntries: async () => {
      const entries = await readAll();
      return Object.values(entries).sort((left, right) =>
        left.songId.localeCompare(right.songId, "ja")
      );
    },
    deleteEntry: async (
      songId: string,
      options: { deleteFiles?: boolean } = { deleteFiles: true }
    ) => {
      const entries = await readAll();
      const current = entries[songId];
      if (!current) {
        return;
      }

      if (options.deleteFiles !== false) {
        const files = [
          current.files.vocalAudioPath,
          current.files.pianoAudioPath,
          current.files.lyricsPath,
          current.files.scorePath,
        ];

        for (const path of files) {
          if (await fileSystem.exists(path)) {
            await fileSystem.delete(path);
          }
        }
      }

      delete entries[songId];
      await writeAll(entries);
    },
  };
}
