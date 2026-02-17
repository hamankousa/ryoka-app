import { sanitizeLyricsInlineHtml } from "../../src/features/lyrics/sanitizeLyricsInlineHtml";

describe("sanitizeLyricsInlineHtml", () => {
  it("extracts body content from full html and strips global tags", () => {
    const source = `
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <style>body { margin: 0; background: #fff; }</style>
  <script>window.hack = true;</script>
</head>
<body>
  <article class="song-lyrics">本文</article>
</body>
</html>`;

    const result = sanitizeLyricsInlineHtml(source);

    expect(result).toContain('<article class="song-lyrics">本文</article>');
    expect(result).not.toMatch(/<style/i);
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toMatch(/<html/i);
    expect(result).not.toMatch(/<head/i);
    expect(result).not.toMatch(/<body/i);
    expect(result).not.toMatch(/<meta/i);
  });

  it("returns fallback when html is empty", () => {
    expect(sanitizeLyricsInlineHtml("")).toBe("<p>歌詞を読み込み中...</p>");
  });
});
