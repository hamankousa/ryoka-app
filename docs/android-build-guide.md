# Androidビルド手順（EAS）

対象: `ryoka-app` を Android 向けにビルドして配布する。

## 前提

1. `ryoka-app` リポジトリが最新であること
2. `ryoka-content` が公開済みであること（`https://ryoka-content.pages.dev/`）
3. Expo アカウントを用意していること

## 初回セットアップ

`ryoka-app` で実行:

```bash
npm install
npx eas login
```

初回ビルド時に必要なら:

```bash
npx eas build:configure
```

## APK（配布テスト用）を作る

```bash
npm run build:android:preview
```

- `eas.json` の `preview` プロファイルを使う
- 出力形式は `apk`（端末に直接インストールしやすい）

## GitHub Actions から APK を作る

ワークフロー: `.github/workflows/build-android-apk.yml`

実行方法:

1. GitHub の `Settings` > `Secrets and variables` > `Actions` で以下を登録
- `EXPO_TOKEN`
- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
2. GitHub の `Actions` > `Build Android APK (EAS)` > `Run workflow`
3. `profile` は `ci-apk` のまま実行（`eas.json` の `ci-apk` を使用）
4. ログに出る `Build ID` と Expo URL から APK を取得

`ANDROID_UPLOAD_KEYSTORE_BASE64` の作成例（PowerShell）:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\credentials\android-upload-key.jks"))
```

## AAB（Google Play提出用）を作る

```bash
npm run build:android:production
```

- `eas.json` の `production` プロファイルを使う
- 出力形式は `aab`（ストア提出向け）

## Google Play へ提出

```bash
npm run submit:android:production
```

## このプロジェクトでの設定値

- Android package: `com.hamankousa.ryokaapp`
- Androidビルド時のmanifest配信先:
  - `EXPO_PUBLIC_MANIFEST_BASE_URL=https://ryoka-content.pages.dev/`

## よくある詰まり

1. ビルド時にログインエラー
- `npx eas login` を再実行

2. 曲一覧が空
- `ryoka-content` 側 `manifest.json` URLが開けるか確認
- `eas.json` の `EXPO_PUBLIC_MANIFEST_BASE_URL` を確認

3. package名を変更したい
- `app.json` の `expo.android.package` を変更してから再ビルド
