#!/usr/bin/env node
/**
 * 各レイアウトテンプレートにサンプル内容を差し込んでプレビュー HTML を生成し、
 * それらをカテゴリ別に並べたギャラリー (preview/index.html) を出力します。
 *
 *   node account-engagement/preview.mjs
 *
 * 生成物:
 *   preview/<dir>.html  … テンプレ単体の実レンダリング（フルサイズ表示用）
 *   preview/index.html  … 全テンプレを縮小 iframe で構造的に一覧するギャラリー
 *
 * 実 API には接続しません。マージタグ (%%content%% 等) をダミー値に置換するだけです。
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(__dirname, "templates");
const OUT_DIR = join(__dirname, "preview");

const ACCOUNT_NAME = "サンプル株式会社";
const ACCOUNT_WEB = "#";

const CATEGORY_LABEL = {
  landing: "ランディングページ",
  form: "フォーム",
  event: "イベント / ウェビナー",
  thankyou: "サンクスページ",
};
const CATEGORY_ORDER = ["landing", "form", "event", "thankyou"];

// ---- サンプル差込内容 (%%content%%) -------------------------------------
const STD_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const CONTACT_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>お問い合わせ内容</label><br><textarea>製品の詳細について教えてください。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で送信する"></p>
</form>`;

const NEWSLETTER_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const LANDING_BODY = `<h2>こんな課題はありませんか？</h2>
<p>日々の業務に追われ、本来注力すべき仕事に時間を割けない——。本サービスは繰り返し作業を自動化し、チーム全体の生産性を底上げします。</p>
<h2>導入で得られること</h2>
<ul>
  <li>作業時間を平均40%削減</li>
  <li>ヒューマンエラーの大幅な低減</li>
  <li>リアルタイムな進捗の可視化</li>
</ul>
<p style="margin-top:24px;"><a href="#" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700;">資料を請求する</a></p>`;

const EVENT_BODY = `<h2>本セミナーの概要</h2>
<p>最新の市場動向と、現場で成果を出すための実践ノウハウを、第一線の登壇者が解説します。</p>
<h3>こんな方におすすめ</h3>
<ul><li>DX推進を任されている方</li><li>業務改善のヒントを探している方</li><li>同業他社の取り組みを知りたい方</li></ul>
<h3>当日のプログラム</h3>
<ul><li>14:00　開会・基調講演</li><li>14:40　導入事例セッション</li><li>15:30　質疑応答・個別相談</li></ul>`;

const THANKYOU_BODY = `<h1>送信が完了しました</h1>
<p>お問い合わせ／お申し込みいただきありがとうございます。<br>担当者より追ってご連絡いたしますので、今しばらくお待ちください。</p>`;

const THANKYOU_DL_BODY = `<h1>ダウンロードの準備ができました</h1>
<p>ご登録ありがとうございます。下のボタンから資料をダウンロードいただけます。</p>
<a class="ae-dl" href="#">⬇ 資料をダウンロード</a>`;

function contentFor(dir, category) {
  switch (dir) {
    case "04-form-contact": return CONTACT_FORM;
    case "09-form-newsletter": return NEWSLETTER_FORM;
    case "06-thank-you": return THANKYOU_BODY;
    case "12-thankyou-download": return THANKYOU_DL_BODY;
  }
  switch (category) {
    case "form": return STD_FORM;
    case "event": return EVENT_BODY;
    case "thankyou": return THANKYOU_BODY;
    case "landing":
    default: return LANDING_BODY;
  }
}

// ---- マージタグ置換 ------------------------------------------------------
function render(html, { title, description, content }) {
  const map = {
    "%%title%%": (title || "サンプルタイトル").replace(/\n/g, "<br>"),
    "%%description%%": description || "ここに説明文が入ります。",
    "%%content%%": content,
    "%%account-name%%": ACCOUNT_NAME,
    "%%account-website%%": ACCOUNT_WEB,
  };
  let out = html;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  // 未対応の %%...%% タグは空に
  out = out.replace(/%%[a-z0-9\-]+%%/gi, "");
  return out;
}

// ---- 収集 ----------------------------------------------------------------
const dirs = readdirSync(TPL_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const items = [];
for (const dir of dirs) {
  const metaPath = join(TPL_DIR, dir, "meta.json");
  const htmlPath = join(TPL_DIR, dir, "layout.html");
  if (!existsSync(metaPath) || !existsSync(htmlPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const html = readFileSync(htmlPath, "utf8");
  const category = meta.category || "landing";
  const rendered = render(html, {
    title: meta.previewTitle ?? meta.name,
    description: meta.previewDescription ?? meta.description,
    content: meta.previewContent ?? contentFor(dir, category),
  });
  const file = `${dir}.html`;
  writeFileSync(join(OUT_DIR, file), rendered, "utf8");
  items.push({ dir, file, name: meta.name, description: meta.description, category });
}

// ---- ギャラリー index.html ----------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cardHtml(it) {
  return `      <figure class="card">
        <div class="frame"><iframe src="${it.file}" loading="lazy" title="${esc(it.name)}"></iframe></div>
        <figcaption>
          <span class="badge badge-${it.category}">${CATEGORY_LABEL[it.category] || it.category}</span>
          <h3>${esc(it.name)}</h3>
          <p>${esc(it.description || "")}</p>
          <div class="meta"><code>${it.dir}</code><a href="${it.file}" target="_blank" rel="noopener">フルサイズで開く ↗</a></div>
        </figcaption>
      </figure>`;
}

let sections = "";
for (const cat of CATEGORY_ORDER) {
  const group = items.filter((i) => i.category === cat);
  if (group.length === 0) continue;
  sections += `    <section class="group">
      <h2 class="group-title">${CATEGORY_LABEL[cat]} <span>${group.length}</span></h2>
      <div class="grid">
${group.map(cardHtml).join("\n")}
      </div>
    </section>\n`;
}

const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Account Engagement レイアウトテンプレート ギャラリー</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f1f5f9; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:"Hiragino Sans","Yu Gothic",Meiryo,sans-serif; color:var(--ink); background:var(--bg); }
  header.page { background:#0f172a; color:#fff; padding:34px 28px; }
  header.page h1 { margin:0 0 6px; font-size:22px; }
  header.page p { margin:0; opacity:.8; font-size:14px; }
  .wrap { max-width:1320px; margin:0 auto; padding:28px 24px 64px; }
  .group { margin-top:36px; }
  .group-title { font-size:18px; border-left:5px solid #2563eb; padding-left:12px; margin:0 0 18px; }
  .group-title span { color:var(--muted); font-size:14px; font-weight:400; margin-left:6px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(440px,1fr)); gap:24px; }
  .card { margin:0; background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(15,23,42,.05); }
  .frame { width:100%; height:320px; overflow:hidden; border-bottom:1px solid var(--line); background:#fff; position:relative; }
  .frame iframe { width:1280px; height:930px; border:0; transform:scale(0.34375); transform-origin:top left; pointer-events:none; }
  figcaption { padding:16px 18px 18px; }
  .badge { display:inline-block; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; background:#e2e8f0; color:#334155; }
  .badge-landing { background:#dbeafe; color:#1d4ed8; }
  .badge-form { background:#dcfce7; color:#15803d; }
  .badge-event { background:#ffedd5; color:#c2410c; }
  .badge-thankyou { background:#f3e8ff; color:#7e22ce; }
  figcaption h3 { font-size:15px; margin:10px 0 6px; }
  figcaption p { font-size:13px; color:var(--muted); margin:0 0 12px; line-height:1.6; }
  .meta { display:flex; align-items:center; justify-content:space-between; font-size:12px; }
  .meta code { background:#f1f5f9; padding:2px 7px; border-radius:5px; color:#475569; }
  .meta a { color:#2563eb; text-decoration:none; font-weight:600; }
  @media (max-width:520px){ .grid { grid-template-columns:1fr; } .frame { height:auto; aspect-ratio:1280/930; } }
</style>
</head>
<body>
<header class="page">
  <h1>Account Engagement レイアウトテンプレート ギャラリー</h1>
  <p>全 ${items.length} パターン — 各カードは実際のレンダリングを縮小表示しています（サンプル内容を差込済み）。</p>
</header>
<div class="wrap">
${sections}</div>
</body>
</html>
`;

writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf8");

console.log(`✓ プレビューを生成しました: ${items.length} 件`);
for (const it of items) console.log(`  - preview/${it.file}  (${it.category})`);
console.log(`\n▶ ギャラリーを開く: account-engagement/preview/index.html`);
