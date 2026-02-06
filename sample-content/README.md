# sample-content

開発初期はこのフォルダを配信元データとして使う。

## 構成

- `manifest.json`
- `audio/vocal/<songId>.mp3`
- `audio/piano/<songId>.mp3`
- `lyrics/<songId>.html`
- `score/<songId>.pdf`

## 使い方（ローカル配信）

```bash
npx serve sample-content -l 8787
```

`BASE_URL` は `http://<your-ip>:8787/` を利用する。

## 注意

- 音源とPDFは開発用のダミーを配置している
- 再生・表示の本確認では実データへ差し替える
- 音源は「歌唱」と「ピアノ伴奏」を分離している
