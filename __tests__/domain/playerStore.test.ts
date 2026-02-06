import { SongManifestItem } from "../../src/domain/manifest";
import {
  createPlayerStore,
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
