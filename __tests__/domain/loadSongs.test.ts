import { loadSongs } from "../../src/features/songs/loadSongs";

describe("loadSongs", () => {
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
});
