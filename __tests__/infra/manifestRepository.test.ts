import {
  createManifestRepository,
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
});
