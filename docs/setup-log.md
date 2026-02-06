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
