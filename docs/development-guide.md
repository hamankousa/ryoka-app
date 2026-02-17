# 開発手順書（TDD）

## 1. 目的

- 寮歌の `音源（vocal mp3 / piano midi）` `歌詞（html）` `楽譜（pdf）` を再生・閲覧できる
- `manifest.json` 更新でアプリ更新なしに曲データを反映できる
- iOS/Android は曲単位のオフライン保存に対応する

## 2. 現在の画面構成（2026-02-16）

- ルート: `app/_layout.tsx`
- タブ: `app/(tabs)`
- タブ種別: `home` `search` `list` `library`
- 全タブ共通プレイヤー: `src/ui/player/GlobalMiniPlayer.tsx`
- 歌詞画面: `app/lyrics/[songId].tsx`
- 楽譜画面: `app/score/[songId].tsx`

## 3. 技術スタック

- `Expo SDK 54`
- `TypeScript`
- `expo-router`
- 音声再生: `expo-av`
- Web MIDI再生: `WebAudio + midi-file`（`webMidiEngine`）
- 歌詞/楽譜表示: `react-native-webview`（モバイル） + WebのDOM描画
- 保存: `expo-file-system` + `@react-native-async-storage/async-storage`
- テスト: `jest-expo` + `@testing-library/react-native`

## 4. ローカル起動

1. 親フォルダでコンテンツ配信

```bash
npx serve . -l 8787 --cors
```

2. `ryoka-app` でアプリ起動

```bash
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

3. テスト実行

```bash
npm run test
```

4. iOS実機（Expo Go）で確認

```bash
npm run start:go
```

- QR を Expo Go で読み取り
- 既定は LAN モード
- LAN で失敗する場合は `npm run start:go:tunnel`
- 既定の `manifest` 参照先は `https://ryoka-content.pages.dev/`
- ローカルコンテンツを使う場合は `EXPO_PUBLIC_MANIFEST_BASE_URL` に `http://<PCのIP>:8787/ryoka-content/` を指定

## 5. TDDルール

1. 仕様を1つに絞る
2. 失敗するテストを先に書く
3. 最小実装でグリーンにする
4. リファクタで重複を削る
5. UI仕様はレイアウト計算までテストで固定する

## 6. 主要仕様（プレイヤー）

- ミニプレイヤーは全タブで共通状態を持つ
- 最小化バーに `曲名/音源種別/再生ボタン/シークバー/時間` を表示
- 展開プレイヤーは中央基準で以下を配置する
- `シャッフル` `戻る` `再生/一時停止` `進む` `ループ`
- ループモードは `off -> playlist -> track -> off` で循環
- `戻る` は再生位置が5秒以上なら曲頭へ戻す（5秒未満は前曲）

## 7. 主要仕様（検索/一覧/ライブラリ）

- 検索タブはキーワード検索 + 年度クイック検索（元号/年代/年次）
- 一覧タブは高密度リスト表示を優先（モバイル情報量最大化）
- ライブラリタブは保存曲一覧と削除操作を提供（Webは削除不可）

## 8. ディレクトリ方針

```txt
app/                 # 画面ルート（expo-router）
src/domain/          # 純粋関数
src/infra/           # I/O（network/files/storage）
src/features/        # ユースケース
src/ui/              # UIコンポーネント
__tests__/           # 振る舞いテスト
docs/                # ドキュメント
```

## 9. 受け入れ基準（現行）

- 全タブで同一の再生状態を共有できる
- 検索タブ/一覧タブから再生開始し、展開プレイヤーを開ける
- 最小化プレイヤーでシークバーが見え、タップでシークできる
- ループ・シャッフル操作が表示状態に反映される
- iOS/Android でオフライン曲の再生/歌詞/楽譜が利用できる

## 10. 関連ドキュメント

- 重要判断ログ: `docs/decision-log.md`
- セットアップ/変更ログ: `docs/setup-log.md`
- 手動起動: `docs/local-run-manual.md`
- E2Eチェック: `docs/e2e-checklist.md`
- Git運用: `docs/git-rules.md`
