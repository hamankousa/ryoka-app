import { Manifest, SongManifestItem } from "../../domain/manifest";

export type ManifestRepositoryPort = {
  getManifest: () => Promise<Manifest>;
  cacheKey?: string;
};

type LoadSongsResult = {
  version: Manifest["version"];
  songs: SongManifestItem[];
};

type LoadSongsOptions = {
  forceRefresh?: boolean;
  cacheTtlMs?: number;
};

type CachedLoadSongs = {
  expiresAt: number;
  value: LoadSongsResult;
};

type CacheBucketKey = ManifestRepositoryPort | string;

const DEFAULT_SONGS_CACHE_TTL_MS = 45 * 1000;
const loadSongsCache = new Map<CacheBucketKey, CachedLoadSongs>();
const loadSongsInFlight = new Map<CacheBucketKey, Promise<LoadSongsResult>>();

const ERA_ORDER = ["m", "t", "s", "h", "r", "a"] as const;

function getEraRank(id: string) {
  const prefix = id.charAt(0).toLowerCase();
  const index = ERA_ORDER.indexOf(prefix as (typeof ERA_ORDER)[number]);
  return index === -1 ? ERA_ORDER.length : index;
}

function splitId(id: string) {
  const match = id.match(/^([a-zA-Z]+)(\d+)([a-zA-Z]*)$/);
  if (!match) {
    return {
      num: Number.MAX_SAFE_INTEGER,
      suffix: id,
    };
  }
  return {
    num: Number(match[2]),
    suffix: match[3] ?? "",
  };
}

function byCustomIdOrder(left: SongManifestItem, right: SongManifestItem) {
  const eraDiff = getEraRank(left.id) - getEraRank(right.id);
  if (eraDiff !== 0) {
    return eraDiff;
  }

  const leftId = splitId(left.id);
  const rightId = splitId(right.id);

  if (leftId.num !== rightId.num) {
    return leftId.num - rightId.num;
  }

  const suffixDiff = leftId.suffix.localeCompare(rightId.suffix, "ja");
  if (suffixDiff !== 0) {
    return suffixDiff;
  }

  return left.id.localeCompare(right.id, "ja");
}

function resolveCacheBucketKey(repo: ManifestRepositoryPort): CacheBucketKey {
  const key = repo.cacheKey?.trim();
  if (key && key.length > 0) {
    return key;
  }
  return repo;
}

async function fetchAndSortSongs(repo: ManifestRepositoryPort): Promise<LoadSongsResult> {
  const manifest = await repo.getManifest();
  return {
    version: manifest.version,
    songs: [...manifest.songs].sort(byCustomIdOrder),
  };
}

export function clearLoadSongsCache(repo?: ManifestRepositoryPort) {
  if (!repo) {
    loadSongsCache.clear();
    loadSongsInFlight.clear();
    return;
  }
  const cacheBucketKey = resolveCacheBucketKey(repo);
  loadSongsCache.delete(cacheBucketKey);
  loadSongsInFlight.delete(cacheBucketKey);
}

export async function loadSongs(repo: ManifestRepositoryPort, options?: LoadSongsOptions) {
  const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_SONGS_CACHE_TTL_MS;
  const forceRefresh = options?.forceRefresh ?? false;
  const cacheBucketKey = resolveCacheBucketKey(repo);
  const now = Date.now();

  if (!forceRefresh) {
    const cached = loadSongsCache.get(cacheBucketKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const inFlight = loadSongsInFlight.get(cacheBucketKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const task = fetchAndSortSongs(repo).then((result) => {
    const normalizedTtlMs = Math.max(0, cacheTtlMs);
    loadSongsCache.set(cacheBucketKey, {
      value: result,
      expiresAt: Date.now() + normalizedTtlMs,
    });
    return result;
  });

  loadSongsInFlight.set(cacheBucketKey, task);

  try {
    return await task;
  } finally {
    loadSongsInFlight.delete(cacheBucketKey);
  }
}
