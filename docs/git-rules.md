# Git運用ルール

## 1. ブランチ

- `main`: 常にデプロイ可能
- 作業ブランチ: `feature/<topic>` または `fix/<topic>`
- 1ブランチ1目的（複数機能を混在させない）

## 2. コミット

- 小さく刻む（レビュー可能な単位）
- 1コミット1論点
- メッセージ形式:

```txt
<type>: <summary>

例:
feat: add manifest cache repository
test: add download manager retry tests
fix: prefer local file over remote audio url
docs: add git workflow rules
```

- `type` は `feat|fix|test|refactor|docs|chore`

## 3. PR

- PRタイトルはコミットと同じ形式で書く
- PR本文に以下を必ず書く
- 目的
- 変更点
- テスト結果
- 影響範囲

## 4. マージ条件

- `npm run test` が通る
- 受け入れ基準に対して説明できる
- ドキュメント更新が必要なら同PRで更新する

## 5. CodexのGit操作

- Codex は必要に応じて `git` コマンドを実行してよい
- 目的は状況確認・差分確認・履歴確認・通常コミット作業
- 破壊的操作（履歴破壊、強制上書き）は明示指示がある場合のみ
## 6. 禁止事項

- `main` への直接コミット
- テスト失敗のままマージ
- 関係ないファイルの変更を混ぜる
