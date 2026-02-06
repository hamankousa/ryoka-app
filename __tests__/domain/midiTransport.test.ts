import {
  clampPosition,
  computePositionFromContext,
  ratioToTempoRate,
  tempoRateToRatio,
  toContextTime,
} from "../../src/features/player/midiTransport";

describe("midiTransport", () => {
  it("clamps seek position into song duration", () => {
    expect(clampPosition(-2, 10)).toBe(0);
    expect(clampPosition(4, 10)).toBe(4);
    expect(clampPosition(12, 10)).toBe(10);
  });

  it("maps score time to context time with tempo", () => {
    expect(toContextTime(5, 2, 100, 1)).toBeCloseTo(103, 5);
    expect(toContextTime(5, 2, 100, 2)).toBeCloseTo(101.5, 5);
  });

  it("computes playback position from context clock", () => {
    const p1 = computePositionFromContext(3, 10, 12, 1, 30);
    const p2 = computePositionFromContext(3, 10, 12, 1.5, 30);
    const p3 = computePositionFromContext(28, 10, 20, 1, 30);

    expect(p1).toBeCloseTo(5, 5);
    expect(p2).toBeCloseTo(6, 5);
    expect(p3).toBe(30);
  });

  it("converts tempo rate and ratio", () => {
    expect(tempoRateToRatio(0.5)).toBeCloseTo(0, 5);
    expect(tempoRateToRatio(3)).toBeCloseTo(1, 5);
    expect(ratioToTempoRate(0)).toBeCloseTo(0.5, 5);
    expect(ratioToTempoRate(1)).toBeCloseTo(3, 5);
  });
});
