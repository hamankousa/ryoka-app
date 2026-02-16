import {
  FILTER_PANEL_ANIMATION_DURATION_MS,
  resolveFilterPanelCollapsedOnScroll,
} from "../../src/domain/filterPanelBehavior";

describe("resolveFilterPanelCollapsedOnScroll", () => {
  it("collapses when user scrolls down fast enough past threshold", () => {
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: false,
      previousOffsetY: 20,
      nextOffsetY: 70,
    });
    expect(next).toBe(true);
  });

  it("keeps expanded when scroll movement is small", () => {
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: false,
      previousOffsetY: 30,
      nextOffsetY: 36,
    });
    expect(next).toBe(false);
  });

  it("expands when user scrolls up", () => {
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: true,
      previousOffsetY: 120,
      nextOffsetY: 80,
    });
    expect(next).toBe(false);
  });

  it("stays collapsed while continuing to scroll down", () => {
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: true,
      previousOffsetY: 120,
      nextOffsetY: 168,
    });
    expect(next).toBe(true);
  });

  it("expands when list returns near top", () => {
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: true,
      previousOffsetY: 40,
      nextOffsetY: 2,
    });
    expect(next).toBe(false);
  });
});

describe("filter panel animation", () => {
  it("uses slower animation duration", () => {
    expect(FILTER_PANEL_ANIMATION_DURATION_MS).toBe(360);
  });
});
