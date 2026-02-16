# 初期構築ログ

実施日: 2026-02-06

## 実施内容

- Expo プロジェクトを `blank-typescript` で作成
- `expo-router` を導入し `app/` ルーティングへ移行
- v1で必要な依存を追加
- Jest + Testing Library を設定
- 初回テスト `__tests__/app.index.test.tsx` を追加

## 追加した主要依存

- `expo-router`
- `expo-av`
- `expo-file-system`
- `expo-crypto`
- `expo-network`
- `react-native-webview`
- `@react-native-async-storage/async-storage`
- `zod`
- `jest`, `jest-expo`, `@testing-library/react-native`

## 注意点

- `tabs-typescript` テンプレートは依存衝突が出たため不採用
- 安定性優先で `blank-typescript` + 手動導入に変更

## 追記ログ（2026-02-06 夜）

- 年度クイック検索を改善（元号 -> 年代 -> 年次の段階選択）
- 年次フィルターを `src/features/songs/yearFilters.ts` に分離しテスト追加
- Webでのタップ阻害を避けるため、年度チップの構成を見直し
- MIDIにオクターブ変更（-2〜+2）を追加
- オクターブUIは5択チップに統一（`+/-` ボタンは廃止）
- `Liquid Glass` 表示モードを追加し、`ON/OFF` トグルで切替可能に変更

## 追記ログ（2026-02-16）

- 画面構成を `home/search/list/library` の4タブに再編成
- 再生状態を全タブ共通化し、`GlobalMiniPlayer` をタブバー上に常設
- 検索タブに年度クイック検索を実装し、下部に結果一覧を表示
- 一覧タブを高密度リスト化してモバイルでの情報量を増加
- 最小化プレイヤーにシークバーと時間表示を常時表示
- 展開プレイヤーの操作ボタンを中央基準レイアウトへ変更
- `シャッフル` を追加し、`ループ` を `off/playlist/track` の3モード化
- 戻るボタンを「5秒以上で曲頭へ戻る」仕様に変更
- 上記UI配置崩れを防ぐため `__tests__/player/miniPlayer.test.tsx` を拡張
