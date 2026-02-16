import {
  resolveBottomInsetPadding,
  resolveFloatingTabBarLayout,
  resolveTabBarMetrics,
} from "../../src/domain/tabBarLayout";

describe("resolveBottomInsetPadding", () => {
  it("uses positive inset value", () => {
    expect(resolveBottomInsetPadding(24)).toBe(24);
  });

  it("falls back to 0 for invalid values", () => {
    expect(resolveBottomInsetPadding(0)).toBe(0);
    expect(resolveBottomInsetPadding(-5)).toBe(0);
    expect(resolveBottomInsetPadding(Number.NaN)).toBe(0);
  });
});

describe("resolveTabBarMetrics", () => {
  it("adds bottom inset into tab bar height and bottom padding", () => {
    const metrics = resolveTabBarMetrics(24, 1);

    expect(metrics.height).toBe(86);
    expect(metrics.paddingTop).toBe(8);
    expect(metrics.paddingBottom).toBe(32);
    expect(metrics.labelLineHeight).toBe(14);
  });

  it("keeps base metrics when inset is invalid", () => {
    const metrics = resolveTabBarMetrics(Number.NaN);

    expect(metrics.height).toBe(62);
    expect(metrics.paddingTop).toBe(8);
    expect(metrics.paddingBottom).toBe(8);
    expect(metrics.labelLineHeight).toBe(14);
  });

  it("adds extra vertical space when font scale is larger than 1", () => {
    const metrics = resolveTabBarMetrics(0, 1.5);

    expect(metrics.height).toBe(67);
    expect(metrics.paddingTop).toBe(8);
    expect(metrics.paddingBottom).toBe(11);
    expect(metrics.labelLineHeight).toBe(19);
  });
});

describe("resolveFloatingTabBarLayout", () => {
  it("returns floating block metrics with safe inset", () => {
    const layout = resolveFloatingTabBarLayout(34);

    expect(layout.blockPaddingBottom).toBe(38);
    expect(layout.tabHeight).toBe(58);
    expect(layout.itemPaddingBottom).toBe(1);
    expect(layout.labelLineHeight).toBe(13);
  });

  it("uses fallback inset when bottom inset is invalid", () => {
    const layout = resolveFloatingTabBarLayout(Number.NaN);

    expect(layout.blockPaddingBottom).toBe(12);
    expect(layout.tabHeight).toBe(58);
    expect(layout.itemPaddingBottom).toBe(1);
    expect(layout.labelLineHeight).toBe(13);
  });
});
