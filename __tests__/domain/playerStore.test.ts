import { SongManifestItem } from "../../src/domain/manifest";
import {
  createPlayerStore,
  getPlayableAudioCandidates,
  getPlayableAudioUrl,
  getPreferredAudioUrl,
} from "../../src/features/player/playerStore";

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
    lyrics: { htmlUrl: "https://example.com/l.html" },
    score: { pdfUrl: "https://example.com/s.pdf" },
  };
}

describe("getPreferredAudioUrl", () => {
  it("prefers local file when exists", () => {
    const current = song("m45");
    const result = getPreferredAudioUrl(current, {
      songId: "m45",
      vocalPath: "file:///offline/audio/vocal/m45.mp3",
    });
    expect(result).toBe("file:///offline/audio/vocal/m45.mp3");
  });

  it("falls back to remote source", () => {
    const current = song("m46");
    const result = getPreferredAudioUrl(current, undefined, "piano");
    expect(result).toBe("https://example.com/piano/m46.mp3");
  });
});

describe("getPlayableAudioUrl", () => {
  it("keeps midi source on android to allow native midi playback", () => {
    const current: SongManifestItem = {
      ...song("m60"),
      audio: {
        vocalMp3Url: "https://example.com/vocal/m60.mp3",
        pianoMp3Url: "https://example.com/piano/m60.midi",
        defaultSource: "vocal",
      },
    };

    const result = getPlayableAudioUrl(current, undefined, "piano", { platformOs: "android" });
    expect(result).toBe("https://example.com/piano/m60.midi");
  });

  it("keeps midi source on web", () => {
    const current: SongManifestItem = {
      ...song("m61"),
      audio: {
        vocalMp3Url: "https://example.com/vocal/m61.mp3",
        pianoMp3Url: "https://example.com/piano/m61.mid",
        defaultSource: "vocal",
      },
    };

    const result = getPlayableAudioUrl(current, undefined, "piano", { platformOs: "web" });
    expect(result).toBe("https://example.com/piano/m61.mid");
  });
});

describe("getPlayableAudioCandidates", () => {
  it("returns midi and vocal fallback on native when piano source is midi", () => {
    const current: SongManifestItem = {
      ...song("m62"),
      audio: {
        vocalMp3Url: "https://example.com/vocal/m62.mp3",
        pianoMp3Url: "https://example.com/piano/m62.midi",
        defaultSource: "vocal",
      },
    };

    const result = getPlayableAudioCandidates(current, undefined, "piano", { platformOs: "android" });
    expect(result).toEqual([
      "https://example.com/piano/m62.midi",
      "https://example.com/vocal/m62.mp3",
    ]);
  });

  it("returns only midi on web", () => {
    const current: SongManifestItem = {
      ...song("m63"),
      audio: {
        vocalMp3Url: "https://example.com/vocal/m63.mp3",
        pianoMp3Url: "https://example.com/piano/m63.mid",
        defaultSource: "vocal",
      },
    };

    const result = getPlayableAudioCandidates(current, undefined, "piano", { platformOs: "web" });
    expect(result).toEqual(["https://example.com/piano/m63.mid"]);
  });
});

describe("playerStore", () => {
  it("handles play/pause/seek", () => {
    const store = createPlayerStore();
    store.setQueue([song("m1"), song("m2")], 0);

    store.play();
    expect(store.getState().isPlaying).toBe(true);

    store.seek(42);
    expect(store.getState().positionSec).toBe(42);

    store.pause();
    expect(store.getState().isPlaying).toBe(false);
  });

  it("moves next/prev in queue", () => {
    const store = createPlayerStore();
    store.setQueue([song("m1"), song("m2"), song("m3")], 1);

    store.next();
    expect(store.getState().currentSong?.id).toBe("m3");

    store.prev();
    expect(store.getState().currentSong?.id).toBe("m2");
  });
});
