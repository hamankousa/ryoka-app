# 開発手順書（TDD）

最終更新: 2026-02-17

## 1. 目的

- 寮歌の `音源（vocal mp3 / piano midi）` `歌詞（html）` `楽譜（pdf）` を再生・閲覧できる
- `manifest.json` 更新でアプリ更新なしに曲データを反映できる
- iOS/Android は曲単位のオフライン保存 + 一括保存に対応する

## 2. 画面構成

- ルート: `app/_layout.tsx`
- タブ: `app/(tabs)`
- タブ種別: `home` `search` `list` `library`
- 追加画面（タブ外遷移）:
  - `app/(tabs)/song/[songId].tsx`
  - `app/(tabs)/lyrics/[songId].tsx`
  - `app/(tabs)/score/[songId].tsx`
  - `app/(tabs)/settings.tsx`
  - `app/(tabs)/legal.tsx`
- 全タブ共通プレイヤー: `src/ui/player/GlobalMiniPlayer.tsx`

## 3. 技術スタック

- `Expo SDK 54`
- `TypeScript`
- `expo-router`
- 音声再生: `expo-av`（将来 `expo-audio` へ移行予定）
- MIDI再生:
  - Web: `WebAudio + midi-file`（`webMidiEngine`）
  - Native: `nativeMidiEngine`（Dev Client前提、Expo Goはフォールバック）
- 保存: `expo-file-system` + `@react-native-async-storage/async-storage`
- テスト: `jest-expo` + `@testing-library/react-native`

## 4. ローカル起動

### 4.1 Web

```bash
# 親フォルダ
npx serve . -l 8787 --cors

# ryoka-app
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

### 4.2 iOS Expo Go

```bash
# LAN
npm run start:go

# LANで不安定なら tunnel
npm run start:go:tunnel
```

備考:
- `start:go:tunnel` は ADB reverse 周りの失敗を回避するラッパー経由
- 既定の manifest 参照先は `https://ryoka-content.pages.dev/`

### 4.3 テスト

```bash
npm run test
```

## 5. TDDルール

1. 仕様を1つに絞る
2. 失敗するテストを先に書く
3. 最小実装でグリーンにする
4. リファクタで重複を削る
5. UI仕様はレイアウト計算までテストで固定する

## 6. プレイヤー仕様

- ミニプレイヤーは全タブで共通状態を持つ
- 最小化バーに `曲名/音源種別/再生ボタン/シークバー/時間` を表示
- 展開プレイヤーの主要操作
  - `シャッフル` `戻る` `再生/一時停止` `進む` `ループ`
- ループモードは `off -> playlist -> track -> off`
- `戻る` は再生位置5秒以上で曲頭へ戻す（5秒未満は前曲）
- 展開シートは下方向ドラッグで追従し、閾値超過で閉じる

## 7. MIDI仕様

- Webで `.mid/.midi` は `web-midi` backend を使用
- Nativeで `.mid/.midi` は `native-midi` backend を優先
- Expo Go で native-midi が使えない場合は、Piano失敗時に Vocal へフォールバック
- 音色/テンポ/ループ/シーク/オクターブはMIDI再生時に制御可能

## 8. ダウンロード仕様

- 曲単位DL（一覧/検索/詳細）
- 一括DL
  - 一覧/検索: 表示中を一括DL
  - ライブラリ: 全曲一括DL
- 全中止、失敗再試行に対応
- 再起動時の未完了は中断失敗として扱う
- 再生/歌詞/楽譜はオフライン資産を優先利用

## 9. 受け入れ基準（現行）

- 全タブで同一の再生状態を共有できる
- 検索/一覧/詳細からDL開始できる
- 一括DLの開始/全中止/失敗再試行が動作する
- オフライン保存済み曲は再生・歌詞・楽譜でローカル優先になる
- `npm run test` が通る

## 10. 関連ドキュメント

- 重要判断ログ: `docs/decision-log.md`
- セットアップ/変更ログ: `docs/setup-log.md`
- 手動起動: `docs/local-run-manual.md`
- E2Eチェック: `docs/e2e-checklist.md`
- Git運用: `docs/git-rules.md`
