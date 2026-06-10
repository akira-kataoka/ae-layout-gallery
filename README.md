# Account Engagement レイアウトテンプレート ギャラリー

Account Engagement（旧 Pardot）向けレイアウトテンプレート 12 パターンの
プレビューギャラリーです。GitHub Actions で `preview.mjs` を実行して
`preview/` を生成し、GitHub Pages へ自動デプロイします。

## 公開ページ

➡ **https://akira-kataoka.github.io/ae-layout-gallery/**

（`main` ブランチへの push で自動的に再ビルド・再デプロイされます）

## 構成

| パス | 内容 |
|---|---|
| `templates/<NN-xxx>/layout.html` | 各レイアウトテンプレートの HTML（差込領域 `%%content%%`） |
| `templates/<NN-xxx>/meta.json`   | 名称・カテゴリ・プレビュー用サンプル設定 |
| `preview.mjs` | マージタグにサンプルを差し込み、`preview/` にプレビューとギャラリーを生成 |
| `.github/workflows/pages.yml` | Pages へのビルド＆デプロイ |

## ローカルで確認

```bash
node preview.mjs
# preview/index.html をブラウザで開く
```

> 本リポジトリはギャラリー公開専用です。実際の Account Engagement への
> 一括登録スクリプト（`install.mjs`）は別途プライベートリポジトリで管理しています。
