# ふちゅぽ – 府中市ポータル (Skeleton)

## 開発手順
```bash
npm install
npm run fetch:news   # data/news.json が生成
npm run dev          # http://localhost:4321 で確認
```

## デプロイ

GitHub Actions が `./dist` を Pages に自動公開します。

## 機能

- **ニュース取得**: RSS フィードから府中市の最新ニュースを自動取得
- **静的サイト生成**: Astro を使用した高速な静的サイト
- **自動更新**: GitHub Actions により毎時15分に自動更新
- **Discord 通知**: 新しいニュースがあった場合の Discord 通知（オプション）

## ファイル構成

```
├── src/pages/index.astro    # メインページ
├── public/styles.css        # スタイルシート
├── scripts/fetch-news.ts    # ニュース取得スクリプト
├── data/news.json          # ニュースデータ
├── .github/workflows/build.yml  # CI/CD設定
└── README.md               # このファイル
```

## 今後の予定

- 天気情報取得機能
- 火災情報取得機能
- 鉄道運行情報取得機能
- Twitter 情報取得機能
