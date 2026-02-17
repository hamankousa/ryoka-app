import { getManifestBaseUrl } from "../../infra/manifestRepository";

const SOUND_FONT_META_KEY = "soundfont_cache_v1";
const DEFAULT_FILE_NAME = "ryoka.sf3";
const DEFAULT_REMOTE_PATH = "soundfonts/ryoka.sf3";

type SoundfontCacheMeta = {
  sourceUrl: string;
  downloadedAt: string;
};

type StoragePort = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type FileSystemPort = {
  cacheDirectory?: string | null;
  getInfoAsync: (fileUri: string) => Promise<{ exists: boolean }>;
  makeDirectoryAsync: (dirUri: string, options?: { intermediates?: boolean }) => Promise<void>;
  createDownloadResumable: (
    uri: string,
    fileUri: string,
    options: Record<string, unknown>
  ) => {
    downloadAsync: () => Promise<unknown>;
  };
};

function getStorage(): StoragePort {
  try {
    return require("@react-native-async-storage/async-storage").default as StoragePort;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => {
        memory.set(key, value);
      },
    };
  }
}

function getFileSystem(): FileSystemPort {
  return require("expo-file-system/legacy") as FileSystemPort;
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function resolveSoundfontUrl() {
  const withProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const fromEnv = withProcess.process?.env?.EXPO_PUBLIC_SOUNDFONT_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return `${trimTrailingSlash(getManifestBaseUrl())}/${DEFAULT_REMOTE_PATH}`;
}

function safeParseMeta(raw: string | null): SoundfontCacheMeta | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SoundfontCacheMeta;
    if (!parsed?.sourceUrl) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createSoundfontRepo({
  fs = getFileSystem(),
  storage = getStorage(),
  resolveUrl = resolveSoundfontUrl,
  now = () => new Date().toISOString(),
  fileName = DEFAULT_FILE_NAME,
}: {
  fs?: FileSystemPort;
  storage?: StoragePort;
  resolveUrl?: () => string;
  now?: () => string;
  fileName?: string;
} = {}) {
  async function getSoundfontPath() {
    const cacheDir = fs.cacheDirectory;
    if (!cacheDir) {
      throw new Error("soundfont cache directory is unavailable");
    }
    const baseDir = `${cacheDir}ryoka/soundfonts`;
    return {
      baseDir,
      filePath: `${baseDir}/${fileName}`,
    };
  }

  async function ensureReady(options?: { forceRefresh?: boolean }) {
    const sourceUrl = resolveUrl();
    const { baseDir, filePath } = await getSoundfontPath();
    const forceRefresh = Boolean(options?.forceRefresh);
    const currentMeta = safeParseMeta(await storage.getItem(SOUND_FONT_META_KEY));

    const fileInfo = await fs.getInfoAsync(filePath);
    const hasFreshCache =
      !forceRefresh &&
      fileInfo.exists &&
      currentMeta?.sourceUrl === sourceUrl;

    if (hasFreshCache) {
      return filePath;
    }

    await fs.makeDirectoryAsync(baseDir, { intermediates: true });
    await fs.createDownloadResumable(sourceUrl, filePath, {}).downloadAsync();

    const nextMeta: SoundfontCacheMeta = {
      sourceUrl,
      downloadedAt: now(),
    };
    await storage.setItem(SOUND_FONT_META_KEY, JSON.stringify(nextMeta));
    return filePath;
  }

  async function getCachedMeta() {
    return safeParseMeta(await storage.getItem(SOUND_FONT_META_KEY));
  }

  return {
    ensureReady,
    getCachedMeta,
  };
}

export const soundfontRepo = createSoundfontRepo();

export type SoundfontRepo = ReturnType<typeof createSoundfontRepo>;
