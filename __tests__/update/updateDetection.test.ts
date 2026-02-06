import { SongManifestItem } from "../../src/domain/manifest";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import { hasSongUpdate } from "../../src/features/download/updateDetection";

function song(overrides?: Partial<SongManifestItem>): SongManifestItem {
  return {
    id: "m45",
    title: "都ぞ弥生",
    updatedAt: "2026-02-06T00:00:00Z",
    audio: {
      vocalMp3Url: "v",
      pianoMp3Url: "p",
      defaultSource: "vocal",
      sizeBytes: 100,
      sha256: "audio-hash",
    },
    lyrics: {
      htmlUrl: "l",
      sizeBytes: 10,
      sha256: "lyrics-hash",
    },
    score: {
      pdfUrl: "s",
      sizeBytes: 20,
      sha256: "score-hash",
    },
    ...overrides,
  };
}

function entry(overrides?: Partial<OfflineEntry>): OfflineEntry {
  return {
    songId: "m45",
    updatedAt: "2026-02-06T00:00:00Z",
    downloadedAt: "2026-02-06T01:00:00Z",
    files: {
      vocalAudioPath: "v",
      pianoAudioPath: "p",
      lyricsPath: "l",
      scorePath: "s",
    },
    sizes: {
      vocal: 100,
      lyrics: 10,
      score: 20,
    },
    hashes: {
      vocal: "audio-hash",
      lyrics: "lyrics-hash",
      score: "score-hash",
    },
    ...overrides,
  };
}

describe("hasSongUpdate", () => {
  it("detects update by newer updatedAt", () => {
    const target = song({ updatedAt: "2026-02-07T00:00:00Z" });
    expect(hasSongUpdate(target, entry())).toBe(true);
  });

  it("detects update by hash mismatch", () => {
    const target = song({
      lyrics: { htmlUrl: "l", sha256: "new-lyrics-hash" },
    });
    expect(hasSongUpdate(target, entry())).toBe(true);
  });

  it("detects update by size mismatch", () => {
    const target = song({
      score: { pdfUrl: "s", sizeBytes: 99 },
    });
    expect(hasSongUpdate(target, entry())).toBe(true);
  });

  it("returns false when metadata and updatedAt match", () => {
    expect(hasSongUpdate(song(), entry())).toBe(false);
  });

  it("returns false when metadata missing", () => {
    const target = song({
      lyrics: { htmlUrl: "l" },
      score: { pdfUrl: "s" },
      audio: {
        vocalMp3Url: "v",
        pianoMp3Url: "p",
        defaultSource: "vocal",
      },
    });
    const base = entry({ sizes: undefined, hashes: undefined });
    expect(hasSongUpdate(target, base)).toBe(false);
  });
});
