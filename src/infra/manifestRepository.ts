import { Manifest, parseManifest } from "../domain/manifest";

const MANIFEST_CACHE_KEY = "manifest_cache_v1";
const MANIFEST_URL_PATH = "manifest.json";
const LOCAL_MANIFEST_BASE_URL = "http://localhost:8787/ryoka-content/";
const PUBLIC_MANIFEST_BASE_URL = "https://ryoka-content.pages.dev/";
const WEB_CORS_HELP =
  "Web fetch failed. Check EXPO_PUBLIC_MANIFEST_BASE_URL, or for local dev start `npx serve . -l 8787 --cors`.";

type FetchLike = typeof fetch;

type ManifestCacheData = {
  manifest: Manifest;
  etag?: string;
  lastModified?: string;
};

export interface ManifestCache {
  get(): Promise<ManifestCacheData | null>;
  set(data: ManifestCacheData): Promise<void>;
}

class AsyncStorageManifestCache implements ManifestCache {
  private getStorage() {
    return require("@react-native-async-storage/async-storage")
      .default as {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  }

  async get(): Promise<ManifestCacheData | null> {
    const raw = await this.getStorage().getItem(MANIFEST_CACHE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ManifestCacheData;
  }

  async set(data: ManifestCacheData): Promise<void> {
    await this.getStorage().setItem(MANIFEST_CACHE_KEY, JSON.stringify(data));
  }
}

export class MemoryManifestCache implements ManifestCache {
  private data: ManifestCacheData | null;

  constructor(manifest?: Manifest, etag?: string, lastModified?: string) {
    this.data = manifest ? { manifest, etag, lastModified } : null;
  }

  async get(): Promise<ManifestCacheData | null> {
    return this.data;
  }

  async set(data: ManifestCacheData): Promise<void> {
    this.data = data;
  }
}

export function getManifestBaseUrl() {
  const withProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const fromEnv =
    withProcess.process?.env?.EXPO_PUBLIC_MANIFEST_BASE_URL ??
    withProcess.process?.env?.MANIFEST_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim().endsWith("/") ? fromEnv.trim() : `${fromEnv.trim()}/`;
  }

  const withLocation = globalThis as typeof globalThis & {
    location?: { hostname?: string };
  };
  const hostname = withLocation.location?.hostname?.toLowerCase();
  if (hostname) {
    const isLocalWebHost =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    return isLocalWebHost ? LOCAL_MANIFEST_BASE_URL : PUBLIC_MANIFEST_BASE_URL;
  }

  if (withProcess.process?.env?.NODE_ENV === "production") {
    return PUBLIC_MANIFEST_BASE_URL;
  }

  return PUBLIC_MANIFEST_BASE_URL;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function getManifestBaseUrlCandidates(baseUrl: string) {
  const primary = normalizeBaseUrl(baseUrl);
  if (primary === PUBLIC_MANIFEST_BASE_URL) {
    return [primary];
  }
  return [primary, PUBLIC_MANIFEST_BASE_URL];
}

function isLikelyFetchFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("failed to fetch") || message.includes("network request failed");
}

export function createManifestRepository({
  baseUrl = getManifestBaseUrl(),
  cache = new AsyncStorageManifestCache(),
  fetchImpl = fetch,
}: {
  baseUrl?: string;
  cache?: ManifestCache;
  fetchImpl?: FetchLike;
}) {
  const baseUrlCandidates = getManifestBaseUrlCandidates(baseUrl);
  const cacheKey = `manifest:${baseUrlCandidates.join("|")}`;

  async function getManifest(): Promise<Manifest> {
    const cached = await cache.get();
    const headers: Record<string, string> = {};

    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }
    if (cached?.lastModified) {
      headers["If-Modified-Since"] = cached.lastModified;
    }

    let lastError: unknown = null;

    for (const candidateBaseUrl of baseUrlCandidates) {
      const manifestUrl = `${candidateBaseUrl}${MANIFEST_URL_PATH}`;

      try {
        const response = await fetchImpl(manifestUrl, { headers });

        if (response.status === 304 && cached) {
          return cached.manifest;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.status}`);
        }

        const payload = await response.json();
        const manifest = parseManifest(payload, candidateBaseUrl);

        await cache.set({
          manifest,
          etag: response.headers.get("etag") ?? cached?.etag,
          lastModified: response.headers.get("last-modified") ?? cached?.lastModified,
        });

        return manifest;
      } catch (error) {
        lastError = error;
      }
    }

    if (cached) {
      return cached.manifest;
    }
    if (isLikelyFetchFailure(lastError)) {
      throw new Error(WEB_CORS_HELP);
    }
    throw lastError instanceof Error ? lastError : new Error("Failed to fetch manifest");
  }

  return {
    cacheKey,
    getManifest,
  };
}
