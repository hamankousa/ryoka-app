# iOS（Expo Go）起動手順

対象: iPhone の Expo Go で QR を読み取り、まず動作確認する。

## 1. 事前準備

1. iPhone に `Expo Go` をインストール
2. PC で `ryoka-app` を開く

## 2. 最短起動（公開コンテンツを利用）

`ryoka-app` で実行:

```bash
npm install
npm run start:go
```

- ターミナルに出た QR を Expo Go で読み取る
- 既定で `https://ryoka-content.pages.dev/` を参照するため、追加の環境変数は不要
- `start:go` は `LAN` モードで起動（iOS実機向けの安定動作を優先）
- `EXPO_PUBLIC_MANIFEST_BASE_URL` がローカルURLで失敗した場合も、Cloudflare Pagesへ自動フォールバック

## 2.5 LANで接続できない場合（トンネル）

```bash
npm run start:go:tunnel
```

- `tunnel` 起動時の Android ADB reverse 失敗を回避するラッパー経由で起動
- iOS Expo Go でのQR読み取り用途に絞って使う

## 3. ローカルコンテンツで確認したい場合

1. 親ディレクトリでコンテンツ配信

```bash
npx serve . -l 8787 --cors
```

2. `ryoka-app` 側で `localhost` ではなく PC のIPを指定して起動

```bash
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://<PCのIP>:8787/ryoka-content/"
npm run start:go
```

## 4. よくある詰まり

1. `manifest` が読めない  
- URL末尾の `/` を確認
- iPhone 側の「ローカルネットワーク」許可をON

2. QRを読んでも接続できない  
- まず `npm run start:go`（LAN）を使う
- LANで失敗する場合は `npm run start:go:tunnel`
- 会社/学内ネットワークで制限がある場合は別回線で確認
