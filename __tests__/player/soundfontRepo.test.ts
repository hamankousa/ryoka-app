import { createSoundfontRepo } from "../../src/features/player/soundfontRepo";

function createFsStub() {
  const existing = new Set<string>();
  const downloads: Array<{ uri: string; fileUri: string }> = [];
  return {
    existing,
    downloads,
    fs: {
      cacheDirectory: "file:///cache/",
      getInfoAsync: jest.fn(async (fileUri: string) => ({ exists: existing.has(fileUri) })),
      makeDirectoryAsync: jest.fn(async () => {}),
      createDownloadResumable: jest.fn((uri: string, fileUri: string) => ({
        downloadAsync: async () => {
          downloads.push({ uri, fileUri });
          existing.add(fileUri);
        },
      })),
    },
  };
}

function createStorageStub(initial: string | null = null) {
  let value = initial;
  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("soundfontRepo", () => {
  it("downloads soundfont on first use", async () => {
    const { fs, downloads } = createFsStub();
    const storage = createStorageStub();
    const repo = createSoundfontRepo({
      fs,
      storage,
      resolveUrl: () => "https://example.com/soundfonts/ryoka.sf3",
      now: () => "2026-02-17T12:00:00Z",
    });

    const path = await repo.ensureReady();

    expect(path).toBe("file:///cache/ryoka/soundfonts/ryoka.sf3");
    expect(downloads).toHaveLength(1);
    expect(downloads[0].uri).toBe("https://example.com/soundfonts/ryoka.sf3");
  });

  it("reuses cached file when source URL is unchanged", async () => {
    const { fs, downloads, existing } = createFsStub();
    const filePath = "file:///cache/ryoka/soundfonts/ryoka.sf3";
    existing.add(filePath);
    const storage = createStorageStub(
      JSON.stringify({
        sourceUrl: "https://example.com/soundfonts/ryoka.sf3",
        downloadedAt: "2026-02-17T12:00:00Z",
      })
    );
    const repo = createSoundfontRepo({
      fs,
      storage,
      resolveUrl: () => "https://example.com/soundfonts/ryoka.sf3",
    });

    const path = await repo.ensureReady();

    expect(path).toBe(filePath);
    expect(downloads).toHaveLength(0);
  });

  it("re-downloads when source URL changes", async () => {
    const { fs, downloads, existing } = createFsStub();
    const filePath = "file:///cache/ryoka/soundfonts/ryoka.sf3";
    existing.add(filePath);
    const storage = createStorageStub(
      JSON.stringify({
        sourceUrl: "https://example.com/soundfonts/old.sf3",
        downloadedAt: "2026-02-17T12:00:00Z",
      })
    );
    const repo = createSoundfontRepo({
      fs,
      storage,
      resolveUrl: () => "https://example.com/soundfonts/new.sf3",
      now: () => "2026-02-17T13:00:00Z",
    });

    const path = await repo.ensureReady();

    expect(path).toBe(filePath);
    expect(downloads).toHaveLength(1);
    expect(downloads[0].uri).toBe("https://example.com/soundfonts/new.sf3");
  });
});
