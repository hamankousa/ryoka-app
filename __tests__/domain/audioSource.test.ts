import { isMidiUrl } from "../../src/features/player/audioSource";

describe("isMidiUrl", () => {
  it("returns true for .mid and .midi", () => {
    expect(isMidiUrl("https://example.com/audio/piano/m45.mid")).toBe(true);
    expect(isMidiUrl("https://example.com/audio/piano/m45.midi")).toBe(true);
  });

  it("ignores query and hash suffix", () => {
    expect(isMidiUrl("https://example.com/audio/piano/m45.midi?token=abc#p")).toBe(true);
  });

  it("returns false for non-midi sources", () => {
    expect(isMidiUrl("https://example.com/audio/vocal/m45.mp3")).toBe(false);
  });
});

