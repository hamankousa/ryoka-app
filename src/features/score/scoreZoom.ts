export const SCORE_ZOOM_MIN = 50;
export const SCORE_ZOOM_MAX = 300;
export const SCORE_ZOOM_STEP = 25;
export const SCORE_ZOOM_DEFAULT = 100;

export function clampScoreZoom(zoomPercent: number): number {
  if (!Number.isFinite(zoomPercent)) {
    return SCORE_ZOOM_DEFAULT;
  }
  return Math.min(SCORE_ZOOM_MAX, Math.max(SCORE_ZOOM_MIN, Math.round(zoomPercent)));
}

export function buildScoreZoomUrl(uri: string, zoomPercent: number): string {
  const [base] = uri.split("#");
  const clamped = clampScoreZoom(zoomPercent);
  return `${base}#zoom=${clamped}`;
}

