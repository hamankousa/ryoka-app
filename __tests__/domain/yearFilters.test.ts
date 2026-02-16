import { SongManifestItem } from "../../src/domain/manifest";
import {
  buildYearKeyOptions,
  filterSongsByYearDecade,
  formatYearChipLabel,
  getEraKey,
  getEraLabel,
  getSongYearKey,
} from "../../src/features/songs/yearFilters";

function song(id: string): SongManifestItem {
  return {
    id,
    title: id,
    updatedAt: "2026-02-06T00:00:00Z",
    audio: {
      vocalMp3Url: "https://example.com/vocal.mp3",
      pianoMp3Url: "https://example.com/piano.mp3",
      defaultSource: "vocal",
    },
    lyrics: { htmlUrl: "https://example.com/lyrics.html" },
    score: { pdfUrl: "https://example.com/score.pdf" },
  };
}

describe("yearFilters", () => {
  it("resolves era key and label from id prefix", () => {
    expect(getEraKey("m45")).toBe("m");
    expect(getEraKey("x01")).toBe("other");
    expect(getEraLabel("r")).toBe("令和");
  });

  it("extracts year key from ids and rejects non-era ids", () => {
    expect(getSongYearKey("m45")).toBe("m45");
    expect(getSongYearKey("R6")).toBe("r6");
    expect(getSongYearKey("a001")).toBeNull();
  });

  it("builds sorted unique year options for selected era", () => {
    const songs = [song("m9"), song("m10"), song("m2"), song("m10"), song("a001")];
    expect(buildYearKeyOptions(songs, "m")).toEqual(["m2", "m9", "m10"]);
  });

  it("returns empty year options for non-era filters", () => {
    const songs = [song("m45"), song("r6")];
    expect(buildYearKeyOptions(songs, "all")).toEqual([]);
    expect(buildYearKeyOptions(songs, "a")).toEqual([]);
  });

  it("formats year chip labels for compact display", () => {
    expect(formatYearChipLabel("m45")).toBe("明45");
    expect(formatYearChipLabel("r6")).toBe("令6");
    expect(formatYearChipLabel("unknown")).toBe("unknown");
  });

  it("filters songs by selected decade start", () => {
    const songs = [song("s1"), song("s9"), song("s10"), song("s11"), song("a001")];
    const result = filterSongsByYearDecade(songs, 1);

    expect(result.map((item) => item.id)).toEqual(["s1", "s9", "s10"]);
  });

  it("returns original songs when decade filter is null", () => {
    const songs = [song("h1"), song("h11")];
    const result = filterSongsByYearDecade(songs, null);

    expect(result).toEqual(songs);
  });
});
