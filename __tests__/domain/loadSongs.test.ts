import { loadSongs } from "../../src/features/songs/loadSongs";

describe("loadSongs", () => {
  it("sorts by order then title", async () => {
    const repo = {
      getManifest: jest.fn().mockResolvedValue({
        version: "1",
        songs: [
          {
            id: "b",
            title: "B",
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
            id: "a",
            title: "A",
            updatedAt: "2026-01-01",
            order: 1,
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
    expect(result.songs.map((song) => song.id)).toEqual(["a", "b"]);
  });
});
