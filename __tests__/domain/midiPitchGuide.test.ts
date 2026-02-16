import { buildMidiPitchGuideFrame } from "../../src/domain/midiPitchGuide";

describe("buildMidiPitchGuideFrame", () => {
  it("builds visible bars from notes around playhead", () => {
    const frame = buildMidiPitchGuideFrame(
      [
        { noteNumber: 60, startSec: 0, endSec: 2 },
        { noteNumber: 64, startSec: 1.5, endSec: 3 },
        { noteNumber: 67, startSec: 8, endSec: 9 },
      ],
      2,
      { lookBehindSec: 1, lookAheadSec: 3 }
    );

    expect(frame.windowStartSec).toBeCloseTo(1, 5);
    expect(frame.windowEndSec).toBeCloseTo(5, 5);
    expect(frame.playheadRatio).toBeCloseTo(0.25, 5);
    expect(frame.bars).toHaveLength(2);

    const first = frame.bars[0];
    expect(first.noteNumber).toBe(60);
    expect(first.leftRatio).toBeCloseTo(0, 5);
    expect(first.widthRatio).toBeCloseTo(0.25, 5);
    expect(first.isActive).toBe(false);

    const second = frame.bars[1];
    expect(second.noteNumber).toBe(64);
    expect(second.leftRatio).toBeCloseTo(0.125, 5);
    expect(second.widthRatio).toBeCloseTo(0.375, 5);
    expect(second.isActive).toBe(true);
    expect(second.topRatio).toBeLessThan(first.topRatio);
  });

  it("returns empty bars when notes are empty", () => {
    const frame = buildMidiPitchGuideFrame([], 4);

    expect(frame.bars).toEqual([]);
    expect(frame.minNote).toBe(60);
    expect(frame.maxNote).toBe(60);
    expect(frame.playheadRatio).toBeCloseTo(1 / 6, 5);
  });

  it("clamps guide window near song end to avoid end-of-track acceleration", () => {
    const frame = buildMidiPitchGuideFrame(
      [
        { noteNumber: 62, startSec: 9.5, endSec: 11.5 },
        { noteNumber: 65, startSec: 11.2, endSec: 12 },
      ],
      11.5,
      { durationSec: 12 }
    );

    expect(frame.windowStartSec).toBeCloseTo(6, 5);
    expect(frame.windowEndSec).toBeCloseTo(12, 5);
    expect(frame.playheadRatio).toBeCloseTo(11 / 12, 5);
  });
});
