# Cloudflare Pages 公開手順（最小費用）

対象:
- `ryoka-app`（Webアプリ本体）
- `ryoka-content`（manifest/audio/lyrics/score 配信）

方針:
- Cloudflare Pages の無料枠で 2プロジェクト運用
- `ryoka-content` を先に公開し、そのURLを `ryoka-app` の環境変数に設定

## 1. 事前準備

1. GitHub に以下2リポジトリがあることを確認
- `https://github.com/hamankousa/ryoka-app`
- `https://github.com/hamankousa/ryoka-content`

2. Cloudflare アカウントを作成/ログイン
- https://dash.cloudflare.com/

## 2. `ryoka-content` を Pages で公開

1. Cloudflare Dashboard で `Workers & Pages` を開く
2. `Create application` -> `Pages` -> `Connect to Git`
3. GitHub の `hamankousa/ryoka-content` を選択
4. Build 設定
- Framework preset: `None`
- Build command: 空欄
- Build output directory: `.`
5. `Save and Deploy`

デプロイ後の確認:
- `https://<content-project>.pages.dev/manifest.json`
- `https://<content-project>.pages.dev/audio/vocal/m45.mp3`
- `https://<content-project>.pages.dev/lyrics/m45.html`
- `https://<content-project>.pages.dev/score/m45.pdf`

## 3. `ryoka-app` を Pages で公開

1. `Workers & Pages` -> `Create application` -> `Pages` -> `Connect to Git`
2. GitHub の `hamankousa/ryoka-app` を選択
3. Build 設定
- Framework preset: `None`
- Build command: `npm ci && npx expo export --platform web`
- Build output directory: `dist`
4. Environment variables に以下を追加
- Key: `EXPO_PUBLIC_MANIFEST_BASE_URL`
- Value: `https://<content-project>.pages.dev/`
5. `Save and Deploy`

## 4. 動作確認

公開URL（`https://<app-project>.pages.dev`）で以下を確認:
1. 曲一覧が表示される（manifest取得成功）
2. Vocal/Piano 再生ができる
3. 歌詞画面が開ける
4. 楽譜画面が開ける

## 5. 更新運用

1. 曲データ更新時（`ryoka-content`）
- `ryoka-content` に push
- Pages が自動再デプロイ

2. アプリ更新時（`ryoka-app`）
- `ryoka-app` に push
- Pages が自動再デプロイ

## 6. トラブルシュート

1. 曲一覧が空
- `ryoka-app` の環境変数 `EXPO_PUBLIC_MANIFEST_BASE_URL` の末尾 `/` を確認
- `ryoka-content` の `manifest.json` URL がブラウザで直接開けるか確認

2. 音声だけ再生できない
- `ryoka-content/audio/...` の実URLに直接アクセスして 200 が返るか確認

3. デプロイが失敗
- Build command が `npm ci && npx expo export --platform web` になっているか確認
- Output directory が `dist` になっているか確認
