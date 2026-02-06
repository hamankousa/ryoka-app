# sample-content

開発初期の実リソース（音源/歌詞/楽譜）を置くフォルダ。

## 構成

- `audio/vocal/<songId>.mp3`
- `audio/piano/<songId>.mp3`
- `lyrics/<songId>.html`
- `score/<songId>.pdf`

## 使い方（manifestとの関係）

- 曲一覧（manifest）は `../ryoka-content/manifest.json` で管理する
- このフォルダのファイルは manifest から相対参照される

## 注意

- 音源とPDFは開発用のダミーを配置している
- 再生・表示の本確認では実データへ差し替える
- 音源は「歌唱」と「ピアノ伴奏」を分離している
