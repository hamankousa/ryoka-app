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

function isHttpUrl(uri: string) {
  return /^https?:\/\//i.test(uri);
}

export function buildNativeScoreViewerUrl(uri: string): string {
  const [base] = uri.split("#");
  if (!isHttpUrl(base)) {
    return base;
  }
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(base)}`;
}

function escapeHtmlAttribute(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildScoreViewerHtml(uri: string, zoomPercent: number): string {
  const clamped = clampScoreZoom(zoomPercent);
  const scale = clamped / 100;
  const inverseScalePercent = 100 / scale;
  const safeUri = escapeHtmlAttribute(uri);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #0f172a;
    }
    .viewer-root {
      width: 100%;
      min-height: 100%;
      overflow: auto;
      padding: 0;
      box-sizing: border-box;
      background: #0f172a;
    }
    .viewer-scale {
      width: ${inverseScalePercent}%;
      min-height: ${inverseScalePercent}%;
      transform: scale(${scale});
      transform-origin: top left;
    }
    .pdf-frame {
      border: 0;
      width: 100%;
      min-height: 100vh;
      display: block;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="viewer-root">
    <div class="viewer-scale">
      <iframe class="pdf-frame" src="${safeUri}" title="score-pdf"></iframe>
    </div>
  </div>
</body>
</html>`;
}
