#!/usr/bin/env node
/**
 * 各レイアウトテンプレートにサンプル内容を差し込んでプレビュー HTML を生成し、
 * カテゴリ別に並べたギャラリー (preview/index.html) を出力します。
 * ギャラリーからは「選択／一括ダウンロード(ZIP)」「インストーラ生成」が行えます。
 *
 *   node account-engagement/preview.mjs
 *
 * 実 API には接続しません（マージタグをダミー値に置換するのみ）。
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
  utility: "配信設定",
};
const CATEGORY_ORDER = ["landing", "form", "event", "thankyou", "utility"];

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

const SURVEY_FORM = `<form>
  <fieldset><legend>総合満足度</legend>
    <label><input type="radio" name="sat">とても満足</label>
    <label><input type="radio" name="sat" checked>満足</label>
    <label><input type="radio" name="sat">普通</label>
    <label><input type="radio" name="sat">不満</label>
  </fieldset>
  <fieldset><legend>役立った点（複数可）</legend>
    <label><input type="checkbox" checked>使いやすさ</label>
    <label><input type="checkbox">サポート</label>
    <label><input type="checkbox">価格</label>
  </fieldset>
  <p><label>ご意見・ご要望</label><br><textarea>とても使いやすかったです。</textarea></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const PREFERENCE_FORM = `<form>
  <fieldset><legend>受け取りたい情報</legend>
    <label><input type="checkbox" checked> 製品アップデート</label>
    <label><input type="checkbox" checked> イベント・セミナー案内</label>
    <label><input type="checkbox"> ニュースレター</label>
    <label><input type="checkbox"> キャンペーン情報</label>
  </fieldset>
  <fieldset><legend>配信頻度</legend>
    <label><input type="radio" name="freq" checked> 都度</label>
    <label><input type="radio" name="freq"> 週1回まとめて</label>
    <label><input type="radio" name="freq"> 月1回まとめて</label>
  </fieldset>
  <p class="submit"><input type="submit" value="設定を保存"></p>
</form>`;

const UNSUB_FORM = `<form>
  <label><input type="radio" name="r" checked> 配信頻度が多い</label>
  <label><input type="radio" name="r"> 内容が役に立たない</label>
  <label><input type="radio" name="r"> 登録した覚えがない</label>
  <label><input type="radio" name="r"> その他</label>
  <p style="margin-top:10px;"><textarea placeholder="ご意見（任意）"></textarea></p>
  <p class="submit"><input type="submit" value="配信を停止する"></p>
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

const PRICING_INTRO = `<p>すべてのプランで30日間の無料トライアルをご利用いただけます。年払いなら2ヶ月分お得。詳細はお気軽にお問い合わせください。</p>`;

const CASESTUDY_BODY = `<h2>導入の背景</h2>
<p>業務が属人化し、担当者の負荷が高止まりしていました。標準化と自動化を両立できる仕組みを探していたところ、本サービスの導入に至りました。</p>
<blockquote>「導入後、定型業務にかかる時間が体感で半分以下になりました。チームが本来の業務に集中できています。」</blockquote>
<h2>成果</h2>
<p>導入から3ヶ月で主要KPIが改善。現在は他部門への展開も進めています。</p>`;

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

const CONFIRM_BODY = `<h1>確認メールを送信しました</h1>
<p>ご登録のメールアドレス宛に確認メールをお送りしました。<br>本文内のリンクをクリックして登録を完了してください。</p>`;

const REFERRAL_FORM = `<form>
  <p><label>あなたのお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご友人のメールアドレス</label><br><input type="email" value="friend@example.com"></p>
  <p class="submit"><input type="submit" value="招待を送る"></p>
</form>`;

const FAQ_BODY = `<p style="text-align:center;color:#475569;">上記で解決しない場合は、お気軽にサポートまでお問い合わせください。担当者が丁寧にご案内します。</p>`;

const COMPARISON_BODY = `<p>料金・機能・サポートを総合的に比較しても、当社サービスは高いコストパフォーマンスを実現しています。</p>`;

const JOBAPPLY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>希望職種</label><br><select><option>ソフトウェアエンジニア</option><option>デザイナー</option><option>PM</option></select></p>
  <p><label>履歴書 / 職務経歴書</label><br><input type="file"></p>
  <p><label>志望動機</label><br><textarea>貴社のプロダクトに強く共感し応募しました。</textarea></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

const RSVP_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label> <label><input type="radio" name="rsvp"> 検討中</label></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option>1名</option><option>2名</option><option>3名以上</option></select></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const APP_BODY = `<p>App Store / Google Play から無料でダウンロードできます。QRコードからもアクセス可能です。</p>`;

const COUPON_BODY = `<h1>ご登録ありがとうございます！</h1>
<p>特典として使える限定クーポンをご用意しました。<br>下記コードを購入時にご入力ください。</p>`;

const QUIZ_FORM = `<form>
  <fieldset><legend>Q1. 現在の主な課題は？</legend>
    <label><input type="radio" name="q1" checked> 業務効率化</label>
    <label><input type="radio" name="q1"> コスト削減</label>
    <label><input type="radio" name="q1"> 売上拡大</label>
  </fieldset>
  <fieldset><legend>Q2. ご利用人数は？</legend>
    <label><input type="radio" name="q2"> 〜10名</label>
    <label><input type="radio" name="q2" checked> 11〜50名</label>
    <label><input type="radio" name="q2"> 51名以上</label>
  </fieldset>
  <p><label>結果の送信先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="診断結果を見る"></p>
</form>`;

function contentFor(dir, category) {
  switch (dir) {
    case "04-form-contact": return CONTACT_FORM;
    case "09-form-newsletter": return NEWSLETTER_FORM;
    case "13-landing-coming-soon": return NEWSLETTER_FORM;
    case "14-landing-pricing": return PRICING_INTRO;
    case "15-landing-casestudy": return CASESTUDY_BODY;
    case "16-form-survey": return SURVEY_FORM;
    case "20-thankyou-confirm": return CONFIRM_BODY;
    case "21-utility-preference": return PREFERENCE_FORM;
    case "22-utility-unsubscribe": return UNSUB_FORM;
    case "23-landing-referral": return REFERRAL_FORM;
    case "24-landing-faq": return FAQ_BODY;
    case "25-landing-comparison": return COMPARISON_BODY;
    case "26-form-jobapply": return JOBAPPLY_FORM;
    case "27-event-rsvp": return RSVP_FORM;
    case "28-landing-appdownload": return APP_BODY;
    case "29-landing-countdown": return NEWSLETTER_FORM;
    case "30-form-demo": return STD_FORM;
    case "31-thankyou-coupon": return COUPON_BODY;
    case "32-landing-testimonials": return NEWSLETTER_FORM;
    case "33-form-quiz": return QUIZ_FORM;
    case "34-utility-maintenance": return NEWSLETTER_FORM;
    case "06-thank-you": return THANKYOU_BODY;
    case "12-thankyou-download": return THANKYOU_DL_BODY;
  }
  switch (category) {
    case "form": return STD_FORM;
    case "event": return EVENT_BODY;
    case "thankyou": return THANKYOU_BODY;
    case "utility": return PREFERENCE_FORM;
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
  writeFileSync(join(OUT_DIR, `${dir}.html`), rendered, "utf8");
  items.push({ dir, file: `${dir}.html`, name: meta.name, description: meta.description, category, meta, layout: html });
}

// ---- ダウンロード用データ (data.js) --------------------------------------
const installerFiles = {};
for (const f of ["install.mjs", "config.example.json"]) {
  const p = join(__dirname, f);
  if (existsSync(p)) installerFiles[f] = readFileSync(p, "utf8");
}
const INSTALLER_README = `# Account Engagement レイアウトテンプレート インストーラ

このZIPは、選択したレイアウトテンプレートを Account Engagement (Pardot) v5 API で
一括登録するための一式です。

## 手順
1. このフォルダ内の config.example.json を config.json にコピーし、認証情報を記入
2. node install.mjs --dry-run   # 送信せず内容確認
3. node install.mjs             # 本番登録

要件: Node.js 18 以上 / 接続アプリ(pardot_api スコープ) / ビジネスユニットID(0Uv...)
詳細は各 templates/<NN-xxx>/meta.json と install.mjs 冒頭のコメントを参照してください。
`;

const galleryData = {
  templates: items.map((it) => ({
    dir: it.dir,
    name: it.name,
    description: it.description || "",
    category: it.category,
    layout: it.layout,
    meta: it.meta,
  })),
  installer: installerFiles,
  installerReadme: INSTALLER_README,
};
writeFileSync(
  join(OUT_DIR, "data.js"),
  "window.__GALLERY__ = " + JSON.stringify(galleryData) + ";\n",
  "utf8"
);

// ---- ギャラリー index.html ----------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cardHtml(it) {
  return `      <figure class="card" data-dir="${it.dir}" data-cat="${it.category}" data-search="${esc((it.name + " " + (it.description||"") + " " + it.dir).toLowerCase())}">
        <label class="pick"><input type="checkbox" class="cb" data-dir="${it.dir}"><span></span></label>
        <a class="frame" href="${it.file}" target="_blank" rel="noopener" title="フルサイズで開く"><iframe src="${it.file}" loading="lazy" tabindex="-1" title="${esc(it.name)}"></iframe></a>
        <figcaption>
          <span class="badge badge-${it.category}">${CATEGORY_LABEL[it.category] || it.category}</span>
          <h3>${esc(it.name)}</h3>
          <p>${esc(it.description || "")}</p>
          <div class="meta"><code>${it.dir}</code>
            <span class="acts">
              <button class="dl-one" data-dir="${it.dir}" title="このテンプレのHTMLをダウンロード">⬇ HTML</button>
              <a href="${it.file}" target="_blank" rel="noopener">拡大 ↗</a>
            </span>
          </div>
        </figcaption>
      </figure>`;
}

const filterBtns = ['<button class="fbtn active" data-f="all">すべて<span>' + items.length + "</span></button>"]
  .concat(
    CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)).map((c) => {
      const n = items.filter((i) => i.category === c).length;
      return `<button class="fbtn" data-f="${c}">${CATEGORY_LABEL[c]}<span>${n}</span></button>`;
    })
  )
  .join("");

let sections = "";
for (const cat of CATEGORY_ORDER) {
  const group = items.filter((i) => i.category === cat);
  if (group.length === 0) continue;
  sections += `    <section class="group" data-cat="${cat}">
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="data.js"></script>
<style>
  :root{ --ink:#0f172a; --muted:#64748b; --line:#e6eaf0; --bg:#eef1f6; --brand:#4f46e5; --brand2:#06b6d4; }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:"Hiragino Sans","Yu Gothic",Meiryo,system-ui,sans-serif; color:var(--ink); background:var(--bg); }
  a{ color:var(--brand); }
  .hero{ background:linear-gradient(120deg,#312e81,#4f46e5 45%,#06b6d4); color:#fff; padding:48px 28px 40px; position:relative; overflow:hidden; }
  .hero::after{ content:""; position:absolute; inset:0; background:radial-gradient(600px 300px at 85% -20%,rgba(255,255,255,.25),transparent); pointer-events:none; }
  .hero .in{ max-width:1280px; margin:0 auto; position:relative; }
  .hero h1{ margin:0 0 8px; font-size:26px; letter-spacing:.01em; }
  .hero p{ margin:0; opacity:.9; font-size:14px; }
  .hero .chips{ margin-top:18px; display:flex; gap:8px; flex-wrap:wrap; }
  .hero .chip{ background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.25); padding:5px 12px; border-radius:999px; font-size:12px; backdrop-filter:blur(4px); }
  .toolbar{ position:sticky; top:0; z-index:20; background:rgba(255,255,255,.85); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .toolbar .in{ max-width:1280px; margin:0 auto; padding:12px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .search{ flex:1; min-width:200px; position:relative; }
  .search input{ width:100%; padding:10px 14px 10px 38px; border:1px solid var(--line); border-radius:10px; font-size:14px; background:#fff; }
  .search::before{ content:"🔍"; position:absolute; left:12px; top:9px; opacity:.5; font-size:14px; }
  .filters{ display:flex; gap:6px; flex-wrap:wrap; }
  .fbtn{ border:1px solid var(--line); background:#fff; color:#334155; padding:8px 12px; border-radius:999px; font-size:13px; cursor:pointer; display:inline-flex; gap:6px; align-items:center; }
  .fbtn span{ background:#eef2ff; color:var(--brand); border-radius:999px; padding:0 7px; font-size:11px; font-weight:700; }
  .fbtn.active{ background:var(--brand); color:#fff; border-color:var(--brand); }
  .fbtn.active span{ background:rgba(255,255,255,.25); color:#fff; }
  .actionbar{ position:sticky; top:57px; z-index:19; background:#0f172a; color:#fff; }
  .actionbar .in{ max-width:1280px; margin:0 auto; padding:10px 24px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .actionbar .cnt{ font-size:13px; opacity:.85; }
  .actionbar .cnt b{ color:#67e8f9; }
  .actionbar .spacer{ flex:1; }
  .abtn{ border:0; border-radius:9px; padding:9px 14px; font-size:13px; font-weight:700; cursor:pointer; }
  .abtn.ghost{ background:rgba(255,255,255,.12); color:#fff; }
  .abtn.primary{ background:#22d3ee; color:#053b45; }
  .abtn.green{ background:#34d399; color:#053527; }
  .abtn:disabled{ opacity:.4; cursor:not-allowed; }
  .wrap{ max-width:1280px; margin:0 auto; padding:26px 24px 80px; }
  .group{ margin-top:30px; }
  .group.hide{ display:none; }
  .group-title{ font-size:17px; border-left:5px solid var(--brand); padding-left:12px; margin:0 0 16px; }
  .group-title span{ color:var(--muted); font-size:13px; font-weight:400; margin-left:6px; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(430px,1fr)); gap:22px; }
  .card{ margin:0; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; box-shadow:0 4px 14px rgba(15,23,42,.05); transition:transform .15s, box-shadow .15s, outline-color .15s; outline:2px solid transparent; position:relative; }
  .card:hover{ transform:translateY(-3px); box-shadow:0 14px 34px rgba(15,23,42,.13); }
  .card.sel{ outline-color:var(--brand); box-shadow:0 10px 30px rgba(79,70,229,.22); }
  .card.hide{ display:none; }
  .pick{ position:absolute; top:12px; left:12px; z-index:3; cursor:pointer; }
  .pick input{ position:absolute; opacity:0; width:24px; height:24px; cursor:pointer; }
  .pick span{ display:block; width:24px; height:24px; border-radius:7px; background:rgba(255,255,255,.92); border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,.15); position:relative; }
  .pick input:checked + span{ background:var(--brand); border-color:var(--brand); }
  .pick input:checked + span::after{ content:"✓"; color:#fff; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; }
  .frame{ display:block; width:100%; height:300px; overflow:hidden; border-bottom:1px solid var(--line); background:#fff; }
  .frame iframe{ width:1280px; height:882px; border:0; transform:scale(0.336); transform-origin:top left; pointer-events:none; }
  figcaption{ padding:15px 17px 17px; }
  .badge{ display:inline-block; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; background:#e2e8f0; color:#334155; }
  .badge-landing{ background:#dbeafe; color:#1d4ed8; } .badge-form{ background:#dcfce7; color:#15803d; }
  .badge-event{ background:#ffedd5; color:#c2410c; } .badge-thankyou{ background:#f3e8ff; color:#7e22ce; }
  .badge-utility{ background:#e0f2fe; color:#0369a1; }
  figcaption h3{ font-size:15px; margin:10px 0 6px; }
  figcaption p{ font-size:13px; color:var(--muted); margin:0 0 12px; line-height:1.6; min-height:2.6em; }
  .meta{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; }
  .meta code{ background:#f1f5f9; padding:2px 7px; border-radius:5px; color:#475569; }
  .acts{ display:flex; gap:10px; align-items:center; }
  .acts button{ border:0; background:none; color:var(--brand); font-weight:700; cursor:pointer; font-size:12px; padding:0; }
  .acts a{ text-decoration:none; font-weight:600; }
  .empty{ text-align:center; color:var(--muted); padding:60px 20px; display:none; }
  footer{ text-align:center; color:var(--muted); font-size:12px; padding:24px; }
  .toast{ position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(20px); background:#0f172a; color:#fff; padding:12px 20px; border-radius:10px; font-size:14px; opacity:0; transition:.25s; z-index:50; }
  .toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }
  @media (max-width:520px){ .grid{ grid-template-columns:1fr; } .frame{ height:auto; aspect-ratio:1280/882; } .frame iframe{ transform:scale(calc((100vw - 50px)/1280)); } }
</style>
</head>
<body>
<header class="hero"><div class="in">
  <h1>Account Engagement レイアウトテンプレート ギャラリー</h1>
  <p>全 ${items.length} パターン — 選択して ZIP ダウンロード、または API 一括登録用インストーラを生成できます。</p>
  <div class="chips"><span class="chip">クリックで拡大プレビュー</span><span class="chip">チェックで選択</span><span class="chip">%%content%% 差込済みのサンプル表示</span></div>
</div></header>

<div class="toolbar"><div class="in">
  <div class="search"><input id="q" type="search" placeholder="名称・用途・カテゴリで検索..."></div>
  <div class="filters">${filterBtns}</div>
</div></div>

<div class="actionbar"><div class="in">
  <label style="display:flex;gap:7px;align-items:center;font-size:13px;cursor:pointer;"><input type="checkbox" id="selAll"> 表示中をすべて選択</label>
  <span class="cnt"><b id="selCount">0</b> 件を選択中</span>
  <span class="spacer"></span>
  <button class="abtn ghost" id="clearSel">選択解除</button>
  <button class="abtn primary" id="dlSel" disabled>⬇ 選択をZIP</button>
  <button class="abtn ghost" id="dlAll">⬇ 全てZIP</button>
  <button class="abtn green" id="dlInstaller" disabled>⚙ インストーラ生成</button>
</div></div>

<div class="wrap">
${sections}  <div class="empty" id="empty">該当するテンプレートがありません。</div>
</div>
<footer>Account Engagement Layout Templates · ${items.length} patterns</footer>
<div class="toast" id="toast"></div>

<script>
const G = window.__GALLERY__ || {templates:[],installer:{},installerReadme:""};
const byDir = Object.fromEntries(G.templates.map(t => [t.dir, t]));
const sel = new Set();
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200); }
function saveBlob(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }

function updateCount(){
  $("#selCount").textContent = sel.size;
  $("#dlSel").disabled = sel.size===0;
  $("#dlInstaller").disabled = sel.size===0;
  $$(".card").forEach(c=> c.classList.toggle("sel", sel.has(c.dataset.dir)));
}
function applyFilter(){
  const f = $(".fbtn.active").dataset.f;
  const q = $("#q").value.trim().toLowerCase();
  $$(".card").forEach(c=>{
    const okCat = f==="all" || c.dataset.cat===f;
    const okQ = !q || c.dataset.search.includes(q);
    c.classList.toggle("hide", !(okCat&&okQ));
  });
  let anyVisible=false;
  $$(".group").forEach(g=>{ const vis=$$(".card:not(.hide)",g).length>0; g.classList.toggle("hide",!vis); if(vis)anyVisible=true; });
  $("#empty").style.display = anyVisible?"none":"block";
  $("#selAll").checked=false;
}
async function buildZip(dirs, withInstaller){
  if(typeof JSZip==="undefined"){ toast("ZIPライブラリの読込に失敗しました"); return; }
  const zip = new JSZip();
  dirs.forEach(d=>{ const t=byDir[d]; if(!t) return; const fo=zip.folder("templates/"+d); fo.file("layout.html",t.layout); fo.file("meta.json",JSON.stringify(t.meta,null,2)); });
  if(withInstaller){
    Object.entries(G.installer||{}).forEach(([n,c])=> zip.file(n,c));
    if(G.installerReadme) zip.file("README.md", G.installerReadme);
  }
  const blob = await zip.generateAsync({type:"blob"});
  saveBlob(blob, withInstaller?"ae-installer.zip":"ae-templates.zip");
  toast((withInstaller?"インストーラ":"テンプレ")+" "+dirs.length+"件をダウンロードしました");
}

document.addEventListener("change", e=>{
  if(e.target.classList.contains("cb")){ const d=e.target.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); updateCount(); }
});
$("#q").addEventListener("input", applyFilter);
$$(".fbtn").forEach(b=> b.addEventListener("click", ()=>{ $$(".fbtn").forEach(x=>x.classList.remove("active")); b.classList.add("active"); applyFilter(); }));
$("#selAll").addEventListener("change", e=>{
  $$(".card:not(.hide) .cb").forEach(cb=>{ cb.checked=e.target.checked; const d=cb.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); });
  updateCount();
});
$("#clearSel").addEventListener("click", ()=>{ sel.clear(); $$(".cb").forEach(cb=>cb.checked=false); $("#selAll").checked=false; updateCount(); });
$("#dlSel").addEventListener("click", ()=> buildZip([...sel], false));
$("#dlAll").addEventListener("click", ()=> buildZip(G.templates.map(t=>t.dir), false));
$("#dlInstaller").addEventListener("click", ()=> buildZip([...sel], true));
document.addEventListener("click", e=>{
  const b=e.target.closest(".dl-one"); if(!b) return;
  const t=byDir[b.dataset.dir]; if(!t) return;
  saveBlob(new Blob([t.layout],{type:"text/html"}), b.dataset.dir+".html");
  toast(b.dataset.dir+".html をダウンロードしました");
});
updateCount();
</script>
</body>
</html>
`;

writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf8");

console.log(`✓ プレビューを生成しました: ${items.length} 件`);
console.log(`  data.js + index.html を出力（DL/インストーラ機能つき）`);
for (const c of CATEGORY_ORDER) {
  const n = items.filter((i) => i.category === c).length;
  if (n) console.log(`  - ${CATEGORY_LABEL[c]}: ${n}`);
}
console.log(`\n▶ ギャラリーを開く: account-engagement/preview/index.html`);
