# 恵迪寮 寮歌プレイヤー v1

Expo + TypeScript + expo-router で作る、iOS/Android/Web 対応アプリです。

## クイックスタート（Web）

1. コンテンツ配信（親フォルダ）

```bash
npx serve . -l 8787 --cors
```

2. アプリ起動（`ryoka-app`）

```bash
npm install
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

3. テスト実行

```bash
npm run test
```

## 現在の状態（2026-02-16）

- 4タブ構成: `ホーム / 検索 / 一覧 / ライブラリ`
- 画面下部に全タブ共通の `GlobalMiniPlayer` を配置
- 展開プレイヤーで `シャッフル / 戻る / 再生・一時停止 / 進む / ループ` を中央基準レイアウトで提供
- ループモードは `off / playlist / track` の3状態
- 最小化プレイヤーでシークバーと再生時間を常時表示
- 検索タブでキーワード検索 + 年度クイック検索（元号/年代/年次）
- 一覧タブはモバイル情報量優先の高密度リスト
- ライブラリタブでオフライン保存済み曲を管理（Webは閲覧のみ）

## ドキュメント

- 開発手順: `docs/development-guide.md`
- Web公開手順（Cloudflare Pages）: `docs/deploy-cloudflare-pages.md`
- Androidビルド手順（EAS）: `docs/android-build-guide.md`
- セットアップ/変更ログ: `docs/setup-log.md`
- 重要判断ログ: `docs/decision-log.md`
- 手動起動マニュアル: `docs/local-run-manual.md`
- E2Eチェック: `docs/e2e-checklist.md`
- Git運用ルール: `docs/git-rules.md`
- 開発ルール正本: `AGENTS.md`
- コンテンツ管理: `../ryoka-content/README.md`

## 概念設計図

- draw.io: [`docs/architecture/concept-architecture.drawio`](docs/architecture/concept-architecture.drawio)
