# iOS（Expo Go）起動手順

最終更新: 2026-02-17

対象: iPhone の Expo Go で QR を読み取り、動作確認する。

## 1. 事前準備

1. iPhone に `Expo Go` をインストール
2. PC で `ryoka-app` を開く
3. `npm install` を実行

## 2. 最短起動（公開コンテンツを利用）

```bash
npm run start:go
```

- 既定で `LAN` モード
- 既定の manifest 参照先は `https://ryoka-content.pages.dev/`

## 3. LANでつながらない場合

```bash
npm run start:go:tunnel
```

- `tunnel` 起動時に ADB reverse 起因で失敗しやすいため、専用スクリプト経由で起動

## 4. ローカルコンテンツで確認する場合

1. 親ディレクトリでコンテンツ配信

```bash
npx serve . -l 8787 --cors
```

2. `ryoka-app` 側で PC のIPを指定して起動

```bash
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://<PCのIP>:8787/ryoka-content/"
npm run start:go
```

## 5. よくある詰まり

### 5.1 `could not connect to TCP port 5554` が出る

- これは Android ADB 検出で落ちている
- 直接 `npx expo start --go --tunnel` ではなく、`npm run start:go:tunnel` を使う

### 5.2 `Network request failed`

- `EXPO_PUBLIC_MANIFEST_BASE_URL` が誤っている可能性
- iPhone 側の「ローカルネットワーク」許可をON
- 一度 `EXPO_PUBLIC_MANIFEST_BASE_URL` を外して公開URL経由で切り分ける

### 5.3 MIDI(Piano)が鳴らない

- Expo Go では native-midi が使えない環境がある
- この場合は Vocal へフォールバック
- Native MIDIの完全動作確認は Dev Client で実施

### 5.4 Worklets mismatch エラー

- `npm install` をやり直し後、`npx expo start -c --go --tunnel` ではなく `npm run start:go:tunnel`
- Expo Goアプリを最新版へ更新

## 6. 最低確認項目

1. 曲一覧が表示される
2. Vocal再生ができる
3. 歌詞/楽譜画面が開ける
4. 下部ミニプレイヤーがタブ間で状態保持する
