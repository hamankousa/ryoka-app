import { parseManifest } from "../../src/domain/manifest";

describe("parseManifest", () => {
  it("resolves relative URLs with base URL", () => {
    const manifest = parseManifest(
      {
        version: "2026-02-06",
        songs: [
          {
            id: "m45",
            title: "都ぞ弥生",
            updatedAt: "2026-02-06T00:00:00Z",
            audio: {
              vocalMp3Url: "audio/vocal/m45.mp3",
              pianoMp3Url: "audio/piano/m45.mp3",
              vocalAlternates: [
                {
                  id: "guitar",
                  label: "ギター",
                  mp3Url: "audio/vocal/m45__alt_guitar.mp3",
                },
              ],
              defaultSource: "vocal",
            },
            lyrics: { htmlUrl: "lyrics/m45.html" },
            score: { pdfUrl: "score/m45.pdf" },
          },
        ],
      },
      "https://example.com/content/"
    );

    expect(manifest.songs[0].audio.vocalMp3Url).toBe(
      "https://example.com/content/audio/vocal/m45.mp3"
    );
    expect(manifest.songs[0].lyrics.htmlUrl).toBe(
      "https://example.com/content/lyrics/m45.html"
    );
    expect(manifest.songs[0].audio.vocalAlternates?.[0].mp3Url).toBe(
      "https://example.com/content/audio/vocal/m45__alt_guitar.mp3"
    );
  });

  it("supports legacy mp3Url schema", () => {
    const manifest = parseManifest(
      {
        version: "2026-02-06",
        songs: [
          {
            id: "legacy",
            title: "Legacy",
            updatedAt: "2026-02-06T00:00:00Z",
            audio: {
              mp3Url: "audio/legacy.mp3",
            },
            lyrics: { htmlUrl: "lyrics/legacy.html" },
            score: { pdfUrl: "score/legacy.pdf" },
          },
        ],
      },
      "https://example.com/"
    );

    expect(manifest.songs[0].audio.vocalMp3Url).toBe(
      "https://example.com/audio/legacy.mp3"
    );
    expect(manifest.songs[0].audio.defaultSource).toBe("vocal");
  });
});
