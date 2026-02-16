# 恵迪寮 寮歌プレイヤー v1

Expo + TypeScript + expo-router で作る、iOS/Android/Web 対応アプリです。

## クイックスタート

```bash
npm install
npm run test
npm run start
```

## ドキュメント

- 開発手順: `docs/development-guide.md`
- 今回の初期構築ログ: `docs/setup-log.md`
- 開発ルール正本: `AGENTS.md`
- Git運用ルール: `docs/git-rules.md`
- 重要判断ログ: `docs/decision-log.md`
- コンテンツ管理: `../ryoka-content/README.md`
- 手動起動マニュアル: `docs/local-run-manual.md`
- E2Eチェック: `docs/e2e-checklist.md`

## 現在の状態

- `expo-router` の最小ルーティングを作成済み
- TDD開始用に Jest + Testing Library を設定済み
- 初回の画面テストを1本追加済み

## 現時点の概念設計図

- draw.io: [`docs/architecture/concept-architecture.drawio`](docs/architecture/concept-architecture.drawio)
- 対象範囲: `app`（画面）/ `features`（ユースケース）/ `domain+infra`（データ・I/O）/ `ryoka-content`（配信元）/ 端末ローカル保存 / 再生バックエンド（`expo-av`, Web MIDI）
