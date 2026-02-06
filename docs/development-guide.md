# 開発手順書（TDD）

## 1. 目的

- 寮歌の `音源(mp3)`, `歌詞(html)`, `楽譜(pdf)` を閲覧/再生できる
- コンテンツ更新は `manifest.json` 経由でアプリ更新なし反映
- iOS/Android は曲単位オフライン保存、Web はストリーミング中心

## 2. 技術スタック

- `Expo SDK 54`
- `TypeScript`
- `expo-router`
- 音声: `expo-av`
- 歌詞表示: `react-native-webview`（iOS/Android）
- 保存: `expo-file-system` + `@react-native-async-storage/async-storage`
- テスト: `jest-expo` + `@testing-library/react-native`

## 3. 開発環境セットアップ

### 必須

- `Node.js LTS`
- `npm`
- `Git`
- Android 開発時: `Android Studio`
- iOS 開発時: `Xcode`（macOS）

### 初回コマンド

```bash
npm install
npm run test
npm run start
```

## 4. TDDルール

1. 仕様を1つ決める（例: manifest の相対URL結合）
2. 失敗するテストを書く
3. 最小実装でテストを通す
4. リファクタして重複を消す
5. 次の仕様へ進む

## 5. 実装順（v1）

1. `manifest` 取得 + キャッシュ + 曲一覧表示
2. `expo-av` でストリーミング再生 + ミニプレイヤー
3. 歌詞表示（WebView / Web DOM）
4. 楽譜PDF表示
5. OfflineRepo（保存/削除/参照）
6. DownloadManager（同時2件・進捗・リトライ）
7. 更新検知（updatedAt/hash）
8. 機内モードを含むE2E確認

## 6. ディレクトリ方針

```txt
app/                 # 画面ルート（expo-router）
src/domain/          # 純粋関数（最優先でテスト）
src/infra/           # I/O（network/files/storage）
src/features/        # ユースケース単位
__tests__/           # 画面/振る舞いテスト
docs/                # 手順書
```

## 7. 受け入れ基準チェック

- 新規インストール後に曲一覧が表示される
- 1曲をストリーミング再生できる
- iOS/Android で1曲をDLし機内モードで再生/歌詞/PDF閲覧できる
- 更新あり表示と再DLができる
- 削除後はローカル参照が消えてリモート参照に戻る

## 8. 開発運用ドキュメント

- 開発ルール正本: `AGENTS.md`
- Git運用ルール: `docs/git-rules.md`
- 重要判断ログ: `docs/decision-log.md`

## 9. サンプルデータ運用

- 曲一覧（manifest）は `../ryoka-content/manifest.json` を使う
- 実リソース（audio/lyrics/score）も `../ryoka-content/` を使う
- ローカル配信は親フォルダで `npx serve . -l 8787`
- `BASE_URL` は `http://<your-ip>:8787/ryoka-content/` を設定する
- 実機確認時はPCと端末を同一ネットワークに接続する

## 10. 音源ソース方針

- `audio` は `vocal` と `piano` に分離して管理する
- `manifest` の `audio` は `vocalMp3Url` と `pianoMp3Url` を持つ
- `defaultSource` は初期再生の選択値として使う（現状は `vocal`）

## 11. 更新検知方針

- まず `updatedAt` 比較で更新判定する
- 追加で `hash/size` がある場合は差分検知に使う
- いずれかに差分があれば「更新あり」を表示する

## 12. 手動起動マニュアル

- 別ターミナルでの起動手順は `docs/local-run-manual.md` を参照する
