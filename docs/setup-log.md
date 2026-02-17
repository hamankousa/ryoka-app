# 初期構築ログ

実施開始: 2026-02-06

## 2026-02-06

- Expo プロジェクトを `blank-typescript` で作成
- `expo-router` を導入し `app/` ルーティングへ移行
- Jest + Testing Library を設定
- 基本再生/検索/一覧/ライブラリの土台を作成

## 2026-02-16

- 4タブ構成へ再編（`home/search/list/library`）
- `GlobalMiniPlayer` を全タブ共通化
- 展開プレイヤー中央基準レイアウト化
- ループ3モード（off/playlist/track）
- 戻るボタンを5秒ルールへ変更
- MIDI音程ガイド（過去1秒 + 未来5秒）追加
- 検索フィルタの手動折りたたみ + 自動開閉追加

## 2026-02-17

- 一括ダウンロード機能を追加
  - 一覧/検索: 表示中一括DL
  - ライブラリ: 全曲一括DL
  - 全中止 / 失敗再試行
- 曲詳細画面でDL管理導線を強化
- オフライン優先参照を再生/歌詞/楽譜で統一
- native-midi エンジンのJS側スキャフォールドを追加（Dev Client前提）
- soundfont キャッシュ層を追加
- iOS Expo Go 起動で詰まりやすい手順を `start:go:tunnel` に整理
- Worklets不整合回避のため、展開シートジェスチャを `Animated + PanResponder` 基準に統一

## 備考

- `expo-av` は非推奨警告が出るため、将来的に `expo-audio` への移行を検討
