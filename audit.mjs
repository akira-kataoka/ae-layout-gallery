#!/usr/bin/env node
/**
 * 静的解析 / セキュリティ点検スクリプト。
 *   node account-engagement/audit.mjs
 *
 * チェック内容:
 *  1. .mjs スクリプトの構文チェック（node --check 相当）
 *  2. テンプレート/スクリプト内の危険パターン走査
 *     (eval / new Function / document.write / innerHTML / outerHTML / インラインイベント属性)
 *  3. 平文 HTTP リソース（混在コンテンツ）の検出
 *  4. 外部 CDN <script src="https://..."> の SRI(integrity) 未設定検出
 *  5. layout.html に %%content%% が存在するかの確認
 * 問題が見つかった場合は exit 1。
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(__dirname, "templates");
const findings = [];
const add = (sev, file, msg) => findings.push({ sev, file, msg });

// ---- 1) .mjs 構文チェック -------------------------------------------------
for (const f of ["preview.mjs", "install.mjs", "test-install.mjs", "audit.mjs"]) {
  const p = join(__dirname, f);
  if (!existsSync(p)) continue;
  try {
    execFileSync(process.execPath, ["--check", p], { stdio: "pipe" });
  } catch (e) {
    add("ERROR", f, "構文エラー: " + (e.stderr ? e.stderr.toString().trim() : e.message));
  }
}

// ---- 走査対象ファイル収集 -------------------------------------------------
const files = [];
for (const f of ["preview.mjs", "install.mjs", "test-install.mjs"]) {
  const p = join(__dirname, f);
  if (existsSync(p)) files.push({ rel: f, text: readFileSync(p, "utf8") });
}
for (const dir of readdirSync(TPL_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const p = join(TPL_DIR, dir.name, "layout.html");
  if (existsSync(p)) files.push({ rel: `templates/${dir.name}/layout.html`, text: readFileSync(p, "utf8"), isTemplate: true });
}

// ---- 2) 危険パターン ------------------------------------------------------
// .innerHTML/.outerHTML 代入、eval、new Function、document.write、インラインイベントハンドラ属性
const DANGER = [
  { re: /\beval\s*\(/, msg: "eval() の使用" },
  { re: /new\s+Function\s*\(/, msg: "new Function() の使用" },
  { re: /document\.write\s*\(/, msg: "document.write() の使用" },
  { re: /\.(inner|outer)HTML\s*=/, msg: "innerHTML/outerHTML への代入（XSSリスク）" },
  { re: /\son\w+\s*=\s*["']/i, msg: "インラインイベントハンドラ属性（onclick等）" },
];
for (const f of files) {
  for (const d of DANGER) {
    if (d.re.test(f.text)) add("WARN", f.rel, d.msg);
  }
}

// ---- 3) 平文 HTTP ---------------------------------------------------------
for (const f of files) {
  if (/\b(src|href)\s*=\s*["']http:\/\//i.test(f.text)) add("WARN", f.rel, "平文HTTPリソース（混在コンテンツ）");
}

// ---- 4) 外部 script の SRI 未設定 ----------------------------------------
const scriptTag = /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^>]*><\/script>/gi;
for (const f of files) {
  const tags = f.text.match(scriptTag) || [];
  for (const t of tags) {
    if (!/\bintegrity\s*=/.test(t)) add("ERROR", f.rel, "外部scriptにSRI(integrity)未設定: " + t.slice(0, 80));
  }
}

// ---- 5) %%content%% 必須（テンプレートのみ） -----------------------------
for (const f of files) {
  if (f.isTemplate && !f.text.includes("%%content%%")) add("ERROR", f.rel, "layout.html に %%content%% がありません");
}

// ---- レポート -------------------------------------------------------------
const errors = findings.filter((x) => x.sev === "ERROR");
const warns = findings.filter((x) => x.sev === "WARN");
console.log(`静的解析/セキュリティ点検: 対象 ${files.length} ファイル`);
if (findings.length === 0) {
  console.log("✓ 問題は見つかりませんでした（クリーン）");
  process.exitCode = 0;
} else {
  for (const x of findings) console.log(`  [${x.sev}] ${x.rel || x.file}: ${x.msg}`);
  console.log(`\n結果: ERROR ${errors.length} / WARN ${warns.length}`);
  process.exitCode = errors.length > 0 ? 1 : 0;
}
