type ResolveFilterPanelCollapsedInput = {
  isCollapsed: boolean;
  previousOffsetY: number;
  nextOffsetY: number;
};

export const FILTER_PANEL_ANIMATION_DURATION_MS = 360;

const COLLAPSE_TRIGGER_OFFSET_Y = 56;
const SCROLL_DELTA_THRESHOLD = 14;
const EXPAND_NEAR_TOP_OFFSET_Y = 6;

function sanitizeOffset(offsetY: number) {
  if (!Number.isFinite(offsetY)) {
    return 0;
  }
  return Math.max(0, offsetY);
}

export function resolveFilterPanelCollapsedOnScroll(input: ResolveFilterPanelCollapsedInput) {
  const previousOffsetY = sanitizeOffset(input.previousOffsetY);
  const nextOffsetY = sanitizeOffset(input.nextOffsetY);
  const deltaY = nextOffsetY - previousOffsetY;

  if (!input.isCollapsed) {
    if (nextOffsetY >= COLLAPSE_TRIGGER_OFFSET_Y && deltaY >= SCROLL_DELTA_THRESHOLD) {
      return true;
    }
    return false;
  }

  if (nextOffsetY <= EXPAND_NEAR_TOP_OFFSET_Y || deltaY <= -SCROLL_DELTA_THRESHOLD) {
    return false;
  }
  return true;
}
