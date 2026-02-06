import { SongManifestItem } from "../../src/domain/manifest";
import { resolveScoreSource } from "../../src/features/score/resolveScoreSource";

function song(id: string): SongManifestItem {
  return {
    id,
    title: id,
    updatedAt: "2026-02-06T00:00:00Z",
    audio: {
      vocalMp3Url: `https://example.com/vocal/${id}.mp3`,
      pianoMp3Url: `https://example.com/piano/${id}.mp3`,
      defaultSource: "vocal",
    },
    lyrics: { htmlUrl: `https://example.com/lyrics/${id}.html` },
    score: { pdfUrl: `https://example.com/score/${id}.pdf` },
  };
}

describe("resolveScoreSource", () => {
  it("prefers offline pdf path", () => {
    const result = resolveScoreSource(song("m45"), {
      songId: "m45",
      scorePath: "file:///offline/score/m45.pdf",
    });
    expect(result).toBe("file:///offline/score/m45.pdf");
  });

  it("falls back to remote pdf url", () => {
    const result = resolveScoreSource(song("m46"));
    expect(result).toBe("https://example.com/score/m46.pdf");
  });
});
