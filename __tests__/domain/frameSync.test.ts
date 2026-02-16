import { MIDI_GUIDE_MAX_FPS, shouldAdvanceFrame } from "../../src/domain/frameSync";

describe("frameSync", () => {
  it("uses 100fps cap for midi guide updates", () => {
    expect(MIDI_GUIDE_MAX_FPS).toBe(100);
  });

  it("advances frame when elapsed time passes 100fps interval", () => {
    expect(shouldAdvanceFrame(0, 9, 100)).toBe(false);
    expect(shouldAdvanceFrame(0, 10, 100)).toBe(true);
    expect(shouldAdvanceFrame(0, 14, 100)).toBe(true);
  });

  it("always advances first frame", () => {
    expect(shouldAdvanceFrame(null, 5, 100)).toBe(true);
  });

  it("falls back to 60fps when fps is invalid", () => {
    expect(shouldAdvanceFrame(0, 10, Number.NaN)).toBe(false);
    expect(shouldAdvanceFrame(0, 17, Number.NaN)).toBe(true);
  });
});
