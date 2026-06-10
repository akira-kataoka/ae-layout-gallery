# Account Engagement レイアウトテンプレート ギャラリー

Account Engagement（旧 Pardot）向けレイアウトテンプレートのプレビューギャラリーです。
GitHub Actions で `preview.mjs` を実行して `preview/` を生成し、GitHub Pages へ自動デプロイします。

## 公開ページ

➡ **https://akira-kataoka.github.io/ae-layout-gallery/**

（`main` ブランチへの push で自動的に再ビルド・再デプロイ）

## ギャラリーでできること

- **プレビュー**: 各テンプレートにサンプルを差し込んだ実レンダリングを縮小表示（クリックで拡大）
- **検索 / カテゴリ絞り込み**: 名称・用途・カテゴリでフィルタ
- **ダウンロード**:
  - 単体 `⬇ HTML` … そのテンプレの `layout.html`
  - `⬇ 選択をZIP` / `⬇ 全てZIP` … 選択（または全件）の `layout.html` + `meta.json`
  - `⚙ インストーラ生成` … 選択テンプレ + `install.mjs` + `config.example.json` + 手順書を ZIP 化。
    ローカルで `node install.mjs` を実行すると Account Engagement v5 API へ一括登録できます。

> **なぜ API 直送ではなくインストーラ ZIP なのか**: 公開 Web ページのブラウザから AE API を直接叩くことは
> ① AE API がブラウザの CORS を許可しない ② アクセストークン等の認証情報を公開ページに置けない、
> という理由で安全に行えません。そのため認証情報を扱う送信処理はローカル実行（`install.mjs`）に分離しています。

## 構成

| パス | 内容 |
|---|---|
| `templates/<NN-xxx>/layout.html` | レイアウト HTML（差込領域 `%%content%%`） |
| `templates/<NN-xxx>/meta.json`   | 名称・カテゴリ・プレビュー設定 |
| `preview.mjs` | プレビュー・ギャラリー・`data.js` を生成 |
| `install.mjs` | AE v5 API へ一括登録（`--only=a,b` で選択登録 / `--dry-run` で確認） |
| `.github/workflows/pages.yml` | Pages へのビルド＆デプロイ |

## ローカルで確認

```bash
node preview.mjs        # preview/ を生成
# preview/index.html をブラウザで開く
```
