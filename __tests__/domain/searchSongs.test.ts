import { SongManifestItem } from "../../src/domain/manifest";
import { filterSongsByQuery } from "../../src/features/songs/searchSongs";

function song(partial: Partial<SongManifestItem> & { id: string; title: string }): SongManifestItem {
  return {
    id: partial.id,
    title: partial.title,
    yearLabel: partial.yearLabel,
    credits: partial.credits,
    updatedAt: "2026-02-06T00:00:00Z",
    audio: {
      vocalMp3Url: "https://example.com/vocal.mp3",
      pianoMp3Url: "https://example.com/piano.midi",
      defaultSource: "vocal",
    },
    lyrics: { htmlUrl: "https://example.com/lyrics.html" },
    score: { pdfUrl: "https://example.com/score.pdf" },
    tags: partial.tags,
    description: partial.description,
    order: partial.order,
  };
}

describe("filterSongsByQuery", () => {
  const songs: SongManifestItem[] = [
    song({
      id: "m45",
      title: "都ぞ弥生",
      yearLabel: "明治四十五年寮歌",
      credits: ["横山芳介君 作歌", "赤木顕次君 作曲"],
    }),
    song({
      id: "a000",
      title: "永遠の幸",
      yearLabel: "札幌農学校校歌",
      credits: ["有島武朗君 作歌"],
    }),
    song({
      id: "r06",
      title: "浪の旅路の",
      yearLabel: "令和6年度寮歌",
      credits: ["島圭次郎君 作歌"],
    }),
  ];

  it("returns all songs when query is blank", () => {
    expect(filterSongsByQuery(songs, "").map((item) => item.id)).toEqual(["m45", "a000", "r06"]);
  });

  it("matches by title", () => {
    expect(filterSongsByQuery(songs, "都ぞ").map((item) => item.id)).toEqual(["m45"]);
  });

  it("matches by year label and credits", () => {
    expect(filterSongsByQuery(songs, "校歌").map((item) => item.id)).toEqual(["a000"]);
    expect(filterSongsByQuery(songs, "島圭次郎").map((item) => item.id)).toEqual(["r06"]);
  });

  it("matches by id case-insensitively", () => {
    expect(filterSongsByQuery(songs, "M45").map((item) => item.id)).toEqual(["m45"]);
  });
});

