# ローカル実行マニュアル

最終更新: 2026-02-17

前提: `260206寮歌アプリ` 直下に `ryoka-app` と `ryoka-content` がある。

## 1. ターミナル1: コンテンツ配信

場所: `c:\Users\kohtt\OneDrive\ドキュメント\260206寮歌アプリ`

```bash
npx serve . -l 8787 --cors
```

確認URL:

- `http://localhost:8787/ryoka-content/manifest.json`
- `http://localhost:8787/ryoka-content/audio/vocal/m45.mp3`
- `http://localhost:8787/ryoka-content/audio/piano/m45.midi`
- `http://localhost:8787/ryoka-content/lyrics/m45.html`

## 2. ターミナル2: アプリ起動（Web）

場所: `c:\Users\kohtt\OneDrive\ドキュメント\260206寮歌アプリ\ryoka-app`

```bash
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

## 3. iOS Expo Go 起動

```bash
# LAN
npm run start:go

# LANで不安定なら tunnel
npm run start:go:tunnel
```

## 4. 毎回の開発フロー

1. ターミナル1を起動（配信）
2. ターミナル2を起動（web か go）
3. コード変更して保存
4. 画面反映とログを確認

## 5. よくある詰まり

- manifestが読めない:
  - `manifest.json` のURLを直接開いて確認
- 曲一覧が空:
  - `EXPO_PUBLIC_MANIFEST_BASE_URL` を確認
- iOS tunnel起動でADB 5554エラー:
  - `npx expo start --go --tunnel` ではなく `npm run start:go:tunnel` を使う
- ポート競合:
  - `8787` / `8081` / `19006` の占有プロセスを停止

## 6. 最低確認

1. タブ `ホーム / 検索 / 一覧 / ライブラリ` が表示される
2. 下部ミニプレイヤーが表示される
3. 検索か一覧から `Vocal/Piano` 再生できる
4. タブを切り替えても再生状態が維持される
