import { SongManifestItem } from "../../src/domain/manifest";
import { resolveLyricsSource } from "../../src/features/lyrics/resolveLyricsSource";

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

describe("resolveLyricsSource", () => {
  it("prefers offline html path", () => {
    const result = resolveLyricsSource(song("m45"), {
      songId: "m45",
      lyricsPath: "file:///offline/lyrics/m45.html",
    });

    expect(result.type).toBe("uri");
    if (result.type === "uri") {
      expect(result.uri).toBe("file:///offline/lyrics/m45.html");
    }
  });

  it("uses remote lyrics URL when offline missing", () => {
    const result = resolveLyricsSource(song("m46"));
    expect(result.type).toBe("uri");
    if (result.type === "uri") {
      expect(result.uri).toBe("https://example.com/lyrics/m46.html");
    }
  });

  it("uses inline html when provided", () => {
    const result = resolveLyricsSource(song("m46"), undefined, "<h1>inline</h1>");
    expect(result).toEqual({ type: "html", html: "<h1>inline</h1>" });
  });
});
