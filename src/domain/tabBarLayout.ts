export function resolveBottomInsetPadding(bottomInset: number) {
  if (!Number.isFinite(bottomInset) || bottomInset <= 0) {
    return 0;
  }
  return bottomInset;
}

const BASE_TAB_BAR_HEIGHT = 62;
const BASE_TAB_BAR_PADDING_TOP = 8;
const BASE_TAB_BAR_PADDING_BOTTOM = 8;
const BASE_LABEL_LINE_HEIGHT = 14;
const FONT_SCALE_VERTICAL_FACTOR = 10;
const FLOATING_FALLBACK_INSET = 8;
const FLOATING_OUTER_GAP = 4;
const FLOATING_TAB_HEIGHT = 58;
const FLOATING_ITEM_PADDING_BOTTOM = 1;
const FLOATING_LABEL_LINE_HEIGHT = 13;

function resolveFontScale(fontScale: number | undefined) {
  if (!Number.isFinite(fontScale) || (fontScale ?? 0) <= 0) {
    return 1;
  }
  return fontScale as number;
}

export function resolveTabBarMetrics(bottomInset: number, fontScale?: number) {
  const safeInset = resolveBottomInsetPadding(bottomInset);
  const safeFontScale = resolveFontScale(fontScale);
  const extraVertical = safeFontScale > 1 ? Math.ceil((safeFontScale - 1) * FONT_SCALE_VERTICAL_FACTOR) : 0;
  return {
    height: BASE_TAB_BAR_HEIGHT + safeInset + extraVertical,
    paddingTop: BASE_TAB_BAR_PADDING_TOP,
    paddingBottom: BASE_TAB_BAR_PADDING_BOTTOM + safeInset + Math.ceil(extraVertical / 2),
    labelLineHeight: BASE_LABEL_LINE_HEIGHT + extraVertical,
  };
}

export function resolveFloatingTabBarLayout(bottomInset: number) {
  const safeInset = resolveBottomInsetPadding(bottomInset);
  const inset = safeInset > 0 ? safeInset : FLOATING_FALLBACK_INSET;
  return {
    blockPaddingBottom: inset + FLOATING_OUTER_GAP,
    tabHeight: FLOATING_TAB_HEIGHT,
    itemPaddingBottom: FLOATING_ITEM_PADDING_BOTTOM,
    labelLineHeight: FLOATING_LABEL_LINE_HEIGHT,
  };
}
