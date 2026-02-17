# Androidビルド手順（EAS）

最終更新: 2026-02-17

対象: `ryoka-app` を Android 向けにビルドして配布する。

## 1. 前提

1. `ryoka-app` が最新であること
2. `ryoka-content` が公開済みであること（`https://ryoka-content.pages.dev/`）
3. Expo アカウントを用意していること

## 2. 初回セットアップ

```bash
npm install
npx eas login
npx eas build:configure
```

## 3. APK（配布テスト用）

```bash
npm run build:android:preview
```

- `eas.json` の `preview` プロファイルを利用
- 出力形式は `apk`

## 4. AAB（ストア提出用）

```bash
npm run build:android:production
```

- `eas.json` の `production` プロファイルを利用
- 出力形式は `aab`

## 5. Google Play 提出

```bash
npm run submit:android:production
```

## 6. GitHub Actions で APK を自動生成

ワークフロー: `.github/workflows/build-android-apk.yml`

- `master` への push で自動実行
- `workflow_dispatch` で手動実行も可能

必要シークレット:

- `EXPO_TOKEN`
- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

`ANDROID_UPLOAD_KEYSTORE_BASE64` 作成例（PowerShell）:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\credentials\android-upload-key.jks"))
```

## 7. このプロジェクトの設定値

- Android package: `com.hamankousa.ryokaapp`
- manifest配信先（ビルド時）:
  - `EXPO_PUBLIC_MANIFEST_BASE_URL=https://ryoka-content.pages.dev/`

## 8. よくある詰まり

1. EASログインエラー
- `npx eas login` を再実行

2. 曲一覧が空
- `https://ryoka-content.pages.dev/manifest.json` が開けるか確認
- `eas.json` / 環境変数の `EXPO_PUBLIC_MANIFEST_BASE_URL` を確認

3. MIDI(Piano)が端末で不安定
- Dev Clientなしだと native-midi 非対応の環境あり
- その場合は Vocal フォールバック挙動になる
