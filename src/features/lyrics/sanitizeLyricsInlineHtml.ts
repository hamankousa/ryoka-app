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
