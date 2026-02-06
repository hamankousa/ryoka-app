# ローカル実行マニュアル（あなた用）

前提: `260206寮歌アプリ` 直下に `ryoka-app` と `ryoka-content` がある。

## ターミナル1: コンテンツ配信

場所: `c:\Users\kohtt\OneDrive\ドキュメント\260206寮歌アプリ`

```bash
npx serve . -l 8787 --cors
```

確認URL:

- `http://localhost:8787/ryoka-content/manifest.json`
- `http://localhost:8787/ryoka-content/audio/vocal/m45.mp3`
- `http://localhost:8787/ryoka-content/audio/piano/m45.midi`
- `http://localhost:8787/ryoka-content/lyrics/m45.html`

## ターミナル2: アプリ起動（Web）

場所: `c:\Users\kohtt\OneDrive\ドキュメント\260206寮歌アプリ\ryoka-app`

```bash
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

ブラウザ:

- Expo が表示するURLを開く（通常 `http://localhost:19006`）

## 毎回の開発フロー

1. ターミナル1を起動（配信）
2. ターミナル2を起動（web）
3. コード変更して保存
4. ブラウザで反映確認

## よくある詰まり

- manifestが読めない:
  `http://localhost:8787/ryoka-content/manifest.json` を直接開いて確認
- mp3/html/pdfが読めない:
  `ryoka-content` 内に `audio/lyrics/score` があるか確認
- 曲一覧が空:
  `EXPO_PUBLIC_MANIFEST_BASE_URL` が正しいか確認
- ポート競合:
  `8787` or `19006` を他プロセスが使っていないか確認
