import { clearLoadSongsCache, loadSongs } from "../../src/features/songs/loadSongs";

describe("loadSongs", () => {
  beforeEach(() => {
    clearLoadSongsCache();
  });

  it("sorts by id with era order m->t->s->h->r->a", async () => {
    const repo = {
      getManifest: jest.fn().mockResolvedValue({
        version: "1",
        songs: [
          {
            id: "a001",
            title: "A",
            updatedAt: "2026-01-01",
            audio: {
              vocalMp3Url: "v",
              pianoMp3Url: "p",
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "l" },
            score: { pdfUrl: "s" },
          },
          {
            id: "h04",
            title: "H",
            updatedAt: "2026-01-01",
            audio: {
              vocalMp3Url: "v",
              pianoMp3Url: "p",
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "l" },
            score: { pdfUrl: "s" },
          },
          {
            id: "m45",
            title: "M",
            updatedAt: "2026-01-01",
            audio: {
              vocalMp3Url: "v",
              pianoMp3Url: "p",
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "l" },
            score: { pdfUrl: "s" },
          },
          {
            id: "r01",
            title: "R",
            updatedAt: "2026-01-01",
            audio: {
              vocalMp3Url: "v",
              pianoMp3Url: "p",
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "l" },
            score: { pdfUrl: "s" },
          },
          {
            id: "t03",
            title: "T",
            updatedAt: "2026-01-01",
            audio: {
              vocalMp3Url: "v",
              pianoMp3Url: "p",
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "l" },
            score: { pdfUrl: "s" },
          },
        ],
      }),
    };

    const result = await loadSongs(repo);
    expect(result.songs.map((song) => song.id)).toEqual([
      "m45",
      "t03",
      "h04",
      "r01",
      "a001",
    ]);
  });

  it("shares in-memory cache across repos with the same cacheKey", async () => {
    const manifest = {
      version: "1",
      songs: [
        {
          id: "m45",
          title: "M",
          updatedAt: "2026-01-01",
          audio: {
            vocalMp3Url: "v",
            pianoMp3Url: "p",
            defaultSource: "vocal",
          },
          lyrics: { htmlUrl: "l" },
          score: { pdfUrl: "s" },
        },
      ],
    };

    const primaryGetManifest = jest.fn().mockResolvedValue(manifest);
    const secondaryGetManifest = jest.fn().mockResolvedValue({
      ...manifest,
      version: "2",
    });

    const primaryRepo = {
      cacheKey: "manifest:https://ryoka-content.pages.dev/",
      getManifest: primaryGetManifest,
    };
    const secondaryRepo = {
      cacheKey: "manifest:https://ryoka-content.pages.dev/",
      getManifest: secondaryGetManifest,
    };

    const first = await loadSongs(primaryRepo);
    const second = await loadSongs(secondaryRepo);

    expect(first.version).toBe("1");
    expect(second.version).toBe("1");
    expect(primaryGetManifest).toHaveBeenCalledTimes(1);
    expect(secondaryGetManifest).not.toHaveBeenCalled();
  });

  it("shares the same in-flight request for identical cacheKey", async () => {
    let resolveManifest: ((value: {
      version: string;
      songs: Array<{
        id: string;
        title: string;
        updatedAt: string;
        audio: {
          vocalMp3Url: string;
          pianoMp3Url: string;
          defaultSource: "vocal" | "piano";
        };
        lyrics: { htmlUrl: string };
        score: { pdfUrl: string };
      }>;
    }) => void) | null = null;
    const getManifest = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveManifest = resolve;
        })
    );

    const repoA = { cacheKey: "manifest:shared", getManifest };
    const repoB = { cacheKey: "manifest:shared", getManifest: jest.fn() };

    const firstPromise = loadSongs(repoA);
    const secondPromise = loadSongs(repoB);

    const resolver = resolveManifest as
      | ((value: {
          version: string;
          songs: Array<{
            id: string;
            title: string;
            updatedAt: string;
            audio: {
              vocalMp3Url: string;
              pianoMp3Url: string;
              defaultSource: "vocal" | "piano";
            };
            lyrics: { htmlUrl: string };
            score: { pdfUrl: string };
          }>;
        }) => void)
      | null;
    if (!resolver) {
      throw new Error("manifest resolver is not ready");
    }
    resolver({
      version: "1",
      songs: [
        {
          id: "m45",
          title: "M",
          updatedAt: "2026-01-01",
          audio: {
            vocalMp3Url: "v",
            pianoMp3Url: "p",
            defaultSource: "vocal",
          },
          lyrics: { htmlUrl: "l" },
          score: { pdfUrl: "s" },
        },
      ],
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first.version).toBe("1");
    expect(second.version).toBe("1");
    expect(getManifest).toHaveBeenCalledTimes(1);
    expect(repoB.getManifest).not.toHaveBeenCalled();
  });

  it("can force refresh even inside cache ttl", async () => {
    const repo = {
      cacheKey: "manifest:refresh",
      getManifest: jest
        .fn()
        .mockResolvedValueOnce({
          version: "1",
          songs: [
            {
              id: "m45",
              title: "M",
              updatedAt: "2026-01-01",
              audio: {
                vocalMp3Url: "v",
                pianoMp3Url: "p",
                defaultSource: "vocal",
              },
              lyrics: { htmlUrl: "l" },
              score: { pdfUrl: "s" },
            },
          ],
        })
        .mockResolvedValueOnce({
          version: "2",
          songs: [
            {
              id: "m45",
              title: "M",
              updatedAt: "2026-01-01",
              audio: {
                vocalMp3Url: "v",
                pianoMp3Url: "p",
                defaultSource: "vocal",
              },
              lyrics: { htmlUrl: "l" },
              score: { pdfUrl: "s" },
            },
          ],
        }),
    };

    const first = await loadSongs(repo);
    const refreshed = await loadSongs(repo, { forceRefresh: true });

    expect(first.version).toBe("1");
    expect(refreshed.version).toBe("2");
    expect(repo.getManifest).toHaveBeenCalledTimes(2);
  });
});
