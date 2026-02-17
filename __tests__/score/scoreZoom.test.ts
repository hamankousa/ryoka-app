import {
  buildScoreZoomUrl,
  clampScoreZoom,
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
} from "../../src/features/score/scoreZoom";

describe("scoreZoom", () => {
  it("clamps zoom percent between min and max", () => {
    expect(clampScoreZoom(20)).toBe(SCORE_ZOOM_MIN);
    expect(clampScoreZoom(120)).toBe(120);
    expect(clampScoreZoom(999)).toBe(SCORE_ZOOM_MAX);
  });

  it("falls back to default when zoom is invalid", () => {
    expect(clampScoreZoom(Number.NaN)).toBe(SCORE_ZOOM_DEFAULT);
  });

  it("builds url with zoom hash parameter", () => {
    expect(buildScoreZoomUrl("https://example.com/score/m45.pdf", 150)).toBe(
      "https://example.com/score/m45.pdf#zoom=150"
    );
  });

  it("replaces existing hash fragment", () => {
    expect(buildScoreZoomUrl("https://example.com/score/m45.pdf#page=3", 75)).toBe(
      "https://example.com/score/m45.pdf#zoom=75"
    );
  });
});

