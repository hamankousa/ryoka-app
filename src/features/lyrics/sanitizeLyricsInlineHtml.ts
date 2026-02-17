const LOADING_FALLBACK_HTML = "<p>歌詞を読み込み中...</p>";

function readBodyHtml(source: string): string {
  const match = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(source);
  return match?.[1] ?? source;
}

export function sanitizeLyricsInlineHtml(rawHtml: string | null | undefined): string {
  const source = (rawHtml ?? "").trim();
  if (!source) {
    return LOADING_FALLBACK_HTML;
  }

  const bodyHtml = readBodyHtml(source)
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
    .trim();

  return bodyHtml || LOADING_FALLBACK_HTML;
}

type StyledLyricsOptions = {
  textColor?: string;
  subTextColor?: string;
  borderColor?: string;
  lineHeight?: number;
  fontSizePx?: number;
};

function clampLineHeight(lineHeight: number | undefined) {
  if (typeof lineHeight !== "number" || !Number.isFinite(lineHeight)) {
    return 1.42;
  }
  return Math.min(1.8, Math.max(1.2, lineHeight));
}

export function buildStyledLyricsHtml(
  rawHtml: string | null | undefined,
  options?: StyledLyricsOptions
): string {
  const bodyHtml = sanitizeLyricsInlineHtml(rawHtml);
  const textColor = options?.textColor ?? "#1E293B";
  const subTextColor = options?.subTextColor ?? "#64748B";
  const borderColor = options?.borderColor ?? "#E2E8F0";
  const lineHeight = clampLineHeight(options?.lineHeight);
  const fontSizePx = options?.fontSizePx ?? 14;

  const style = `
.lyrics-root { color: ${textColor}; font-size: ${fontSizePx}px; line-height: ${lineHeight}; }
.lyrics-root .song-header { margin: 0 0 10px; }
.lyrics-root .song-year { margin: 0 0 2px; color: ${subTextColor}; font-size: 0.88em; }
.lyrics-root .song-title { margin: 0 0 6px; line-height: 1.26; }
.lyrics-root .song-credits { margin: 0; }
.lyrics-root .song-note { margin: 4px 0 0; color: ${subTextColor}; font-size: 0.88em; }
.lyrics-root .verse { margin-top: 0.7em; padding-top: 0.4em; border-top: 1px solid ${borderColor}; }
.lyrics-root .verse:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.lyrics-root .verse-label { margin: 0 0 0.18em; font-size: 0.82em; }
.lyrics-root p, .lyrics-root .lyric-line { margin: 0 0 0.16em; line-height: ${lineHeight}; }
.lyrics-root dl, .lyrics-root dt, .lyrics-root dd { margin: 0; }
`.trim();

  return `<style>${style}</style><article class="lyrics-root">${bodyHtml}</article>`;
}
