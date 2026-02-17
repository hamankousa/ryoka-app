import {
  createManifestRepository,
  getManifestBaseUrl,
  MemoryManifestCache,
} from "../../src/infra/manifestRepository";

describe("manifestRepository", () => {
  const baseUrl = "https://example.com/content/";

  it("fetches manifest and stores cache metadata", async () => {
    const cache = new MemoryManifestCache();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === "etag") return "abc";
          if (name.toLowerCase() === "last-modified") return "yesterday";
          return null;
        },
      },
      json: async () => ({
        version: "2026-02-06",
        songs: [],
      }),
    });

    const repo = createManifestRepository({ baseUrl, cache, fetchImpl: fetchMock });
    const result = await repo.getManifest();

    expect(result.version).toBe("2026-02-06");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cached = await cache.get();
    expect(cached?.etag).toBe("abc");
    expect(cached?.lastModified).toBe("yesterday");
  });

  it("returns cached manifest when network fails", async () => {
    const cache = new MemoryManifestCache({
      version: "2026-02-05",
      songs: [],
    });

    const repo = createManifestRepository({
      baseUrl,
      cache,
      fetchImpl: jest.fn().mockRejectedValue(new Error("offline")),
    });

    const result = await repo.getManifest();
    expect(result.version).toBe("2026-02-05");
  });

  it("uses conditional headers and keeps cache when 304", async () => {
    const cache = new MemoryManifestCache(
      { version: "2026-02-04", songs: [] },
      "etag-v1",
      "last-v1"
    );

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 304,
      headers: { get: () => null },
    });

    const repo = createManifestRepository({ baseUrl, cache, fetchImpl: fetchMock });
    const result = await repo.getManifest();

    expect(result.version).toBe("2026-02-04");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/content/manifest.json",
      expect.objectContaining({
        headers: expect.objectContaining({
          "If-None-Match": "etag-v1",
          "If-Modified-Since": "last-v1",
        }),
      })
    );
  });

  it("throws helpful message for web fetch failure without cache", async () => {
    const cache = new MemoryManifestCache();
    const repo = createManifestRepository({
      baseUrl,
      cache,
      fetchImpl: jest.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    });

    await expect(repo.getManifest()).rejects.toThrow(
      "npx serve . -l 8787 --cors"
    );
  });
});

describe("getManifestBaseUrl", () => {
  const originalLocation = (globalThis as typeof globalThis & { location?: { hostname?: string } }).location;
  const originalExpoBase = process.env.EXPO_PUBLIC_MANIFEST_BASE_URL;
  const originalManifestBase = process.env.MANIFEST_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  const setLocationHost = (hostname: string) => {
    Object.defineProperty(globalThis, "location", {
      value: { hostname },
      configurable: true,
    });
  };

  afterEach(() => {
    if (originalLocation) {
      Object.defineProperty(globalThis, "location", {
        value: originalLocation,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, "location");
    }

    if (originalExpoBase === undefined) {
      delete process.env.EXPO_PUBLIC_MANIFEST_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_MANIFEST_BASE_URL = originalExpoBase;
    }

    if (originalManifestBase === undefined) {
      delete process.env.MANIFEST_BASE_URL;
    } else {
      process.env.MANIFEST_BASE_URL = originalManifestBase;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("prefers EXPO_PUBLIC_MANIFEST_BASE_URL from env", () => {
    process.env.EXPO_PUBLIC_MANIFEST_BASE_URL = "https://example.com/content";
    expect(getManifestBaseUrl()).toBe("https://example.com/content/");
  });

  it("uses public content host on non-local web host", () => {
    delete process.env.EXPO_PUBLIC_MANIFEST_BASE_URL;
    delete process.env.MANIFEST_BASE_URL;
    process.env.NODE_ENV = "test";
    setLocationHost("ryoka-app.pages.dev");

    expect(getManifestBaseUrl()).toBe("https://ryoka-content.pages.dev/");
  });

  it("uses localhost in local development", () => {
    delete process.env.EXPO_PUBLIC_MANIFEST_BASE_URL;
    delete process.env.MANIFEST_BASE_URL;
    process.env.NODE_ENV = "test";
    setLocationHost("localhost");

    expect(getManifestBaseUrl()).toBe("http://localhost:8787/ryoka-content/");
  });
});
