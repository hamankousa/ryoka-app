# Cloudflare Pages 公開手順（最小費用）

最終更新: 2026-02-17

対象:
- `ryoka-app`（Webアプリ本体）
- `ryoka-content`（manifest/audio/lyrics/score/soundfont 配信）

方針:
- Cloudflare Pages 無料枠で 2プロジェクト運用
- `ryoka-content` を先に公開し、`ryoka-app` に `EXPO_PUBLIC_MANIFEST_BASE_URL` を設定

## 1. 事前準備

1. GitHub に2リポジトリがあること
- `hamankousa/ryoka-app`
- `hamankousa/ryoka-content`
2. Cloudflare にログイン

## 2. `ryoka-content` 公開

1. `Workers & Pages` -> `Create application` -> `Pages` -> `Connect to Git`
2. `hamankousa/ryoka-content` を選択
3. Build設定
- Framework preset: `None`
- Build command: 空欄
- Build output directory: `.`
4. `Save and Deploy`

確認URL:

- `https://<content-project>.pages.dev/manifest.json`
- `https://<content-project>.pages.dev/audio/vocal/m45.mp3`
- `https://<content-project>.pages.dev/lyrics/m45.html`
- `https://<content-project>.pages.dev/score/m45.pdf`

## 3. `ryoka-app` 公開

1. `Workers & Pages` -> `Create application` -> `Pages` -> `Connect to Git`
2. `hamankousa/ryoka-app` を選択
3. Build設定
- Framework preset: `None`
- Build command: `npm ci && npx expo export --platform web`
- Build output directory: `dist`
4. Environment variable 追加
- `EXPO_PUBLIC_MANIFEST_BASE_URL=https://<content-project>.pages.dev/`
5. `Save and Deploy`

## 4. 動作確認

公開URL（`https://<app-project>.pages.dev`）で:

1. 曲一覧が表示される
2. Vocal/Piano 再生が動く（Web MIDI含む）
3. 歌詞画面が開く
4. 楽譜画面が開く

## 5. 運用

1. `ryoka-content` 更新時
- pushで自動再デプロイ
2. `ryoka-app` 更新時
- pushで自動再デプロイ

## 6. トラブルシュート

1. 曲一覧が空
- `EXPO_PUBLIC_MANIFEST_BASE_URL` 末尾 `/` を確認
- `manifest.json` がブラウザで直接開けるか確認

2. 音声だけ再生できない
- `audio/...` のURLが200を返すか確認

3. ビルド失敗
- Build command が `npm ci && npx expo export --platform web`
- Output directory が `dist`
