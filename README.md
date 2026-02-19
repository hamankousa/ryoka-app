# 恵迪寮 寮歌プレイヤー v1

Expo + TypeScript + expo-router で作る、iOS / Android / Web 対応アプリです。

## 現在の状態（2026-02-17）

- 4タブ構成: `ホーム / 検索 / 一覧 / ライブラリ`
- 全タブ共通の `GlobalMiniPlayer` を下部に常設
- 展開プレイヤーはドラッグ追従で閉じる（`Animated + PanResponder`）
- 検索タブは `キーワード + 元号 + 年代 + 年次` フィルタ
- 一覧/検索で曲単位DL、詳細画面で再試行/中止/削除
- 一覧/検索/ライブラリで一括DL（表示中 / 全曲、全中止、失敗再試行）
- オフライン保存済み曲は再生/歌詞/楽譜でローカルファイル優先
- MIDI再生は `Web: web-midi` / `Native: native-midi(Dev Client前提)`
- Expo Go で MIDI(Piano) が非対応の場合は Vocal にフォールバック

## クイックスタート

### 1. Webで確認

```bash
# 親フォルダ (260206寮歌アプリ)
npx serve . -l 8787 --cors

# ryoka-app
npm install
$env:EXPO_PUBLIC_MANIFEST_BASE_URL="http://localhost:8787/ryoka-content/"
npm run web
```

### 2. iOS Expo Goで確認

```bash
# LAN
npm run start:go

# LANが不安定な場合
npm run start:go:tunnel
```

## テスト

```bash
npm run test
```

## ドキュメント

- 開発手順: `docs/development-guide.md`
- iOS（Expo Go）: `docs/ios-expo-go-guide.md`
- Androidビルド（EAS）: `docs/android-build-guide.md`
- Cloudflare Pages公開: `docs/deploy-cloudflare-pages.md`
- ローカル起動手順: `docs/local-run-manual.md`
- E2Eチェック: `docs/e2e-checklist.md`
- Figma UI設計手順: `docs/figma-ui-design-guide.md`
- UI/UXコンセプト: `docs/ui-ux-concept.md`
- 判断履歴: `docs/decision-log.md`
- セットアップ履歴: `docs/setup-log.md`
- Git運用: `docs/git-rules.md`
- プライバシーポリシー（ドラフト）: `docs/privacy-policy.md`
- 著作権・利用上の注意（ドラフト）: `docs/copyright-notice.md`

## 注意

- `expo-av` は非推奨警告が出ます（現状は継続使用）。
- Native MIDIはブリッジ契約を先行導入済みで、実機能は Dev Client 側ネイティブ実装が必要です。
