#!/usr/bin/env node
/**
 * Account Engagement (Pardot) v5 API でレイアウトテンプレートを一括登録するスクリプト。
 *
 * 使い方:
 *   1. config.example.json を config.json にコピーし、認証情報を埋める
 *   2. node account-engagement/install.mjs            … 登録実行
 *      node account-engagement/install.mjs --dry-run  … 送信せず内容確認のみ
 *      node account-engagement/install.mjs --only=03-form-download  … 1件だけ
 *      node account-engagement/install.mjs --config=path/to/config.json
 *
 * 要件: Node.js 18 以上 (グローバル fetch を使用)
 * 参考: https://developer.salesforce.com/docs/marketing/pardot/guide/layout-template-v5.html
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- 引数パース ----------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args["dry-run"];
// --only=03-form-download または --only=03-form-download,05-event-webinar （カンマ区切りで複数指定可）
const ONLY = typeof args.only === "string" ? args.only.split(",").map((s) => s.trim()).filter(Boolean) : null;
const CONFIG_PATH = typeof args.config === "string" ? args.config : join(__dirname, "config.json");

// ---- 設定読み込み --------------------------------------------------------
if (!existsSync(CONFIG_PATH)) {
  console.error(`✖ 設定ファイルが見つかりません: ${CONFIG_PATH}`);
  console.error("  config.example.json を config.json にコピーして認証情報を入力してください。");
  process.exit(1);
}
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const isSandbox = String(config.environment).toLowerCase() === "sandbox";
const API_BASE = isSandbox ? "https://pi.demo.pardot.com" : "https://pi.pardot.com";

if (!config.businessUnitId || config.businessUnitId.startsWith("0Uvxxxx")) {
  console.error("✖ config.json の businessUnitId を実際の値 (0Uv... 18桁) に設定してください。");
  process.exit(1);
}

// ---- OAuth: アクセストークン取得 -----------------------------------------
async function getAccessToken() {
  const auth = config.auth || {};
  if (auth.accessToken) {
    console.log("• 既存の accessToken を使用します（OAuth をスキップ）");
    return auth.accessToken;
  }
  const loginUrl = (auth.loginUrl || "https://login.salesforce.com").replace(/\/$/, "");
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    username: auth.username,
    password: auth.password,
  });
  console.log(`• OAuth (username-password) でトークン取得中: ${loginUrl}`);
  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error(`✖ トークン取得に失敗しました (HTTP ${res.status})`);
    console.error("  " + JSON.stringify(data));
    process.exit(1);
  }
  console.log("✓ アクセストークンを取得しました");
  return data.access_token;
}

// ---- テンプレート収集 ----------------------------------------------------
function loadTemplates() {
  const dir = join(__dirname, "templates");
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const list = [];
  for (const name of entries) {
    if (ONLY && !ONLY.includes(name)) continue;
    const base = join(dir, name);
    const metaPath = join(base, "meta.json");
    const htmlPath = join(base, "layout.html");
    if (!existsSync(metaPath) || !existsSync(htmlPath)) {
      console.warn(`! スキップ: ${name} (meta.json または layout.html がありません)`);
      continue;
    }
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const layoutContent = readFileSync(htmlPath, "utf8");
    if (!layoutContent.includes("%%content%%")) {
      console.warn(`! 警告: ${name} の layout.html に %%content%% がありません（差込領域が無いと表示されません）`);
    }
    list.push({ dir: name, meta, layoutContent });
  }
  return list;
}

// ---- 1件登録 -------------------------------------------------------------
async function createTemplate(token, tpl) {
  const payload = {
    name: tpl.meta.name,
    layoutContent: tpl.layoutContent,
    isIncludeDefaultCss: tpl.meta.isIncludeDefaultCss ?? false,
  };
  const folderId = tpl.meta.folderId ?? config.folderId;
  if (folderId != null) payload.folderId = folderId;

  if (DRY_RUN) {
    console.log(`  [dry-run] POST layout-templates  name="${payload.name}"  (${tpl.layoutContent.length} bytes)`);
    return { ok: true, dryRun: true };
  }

  const res = await fetch(`${API_BASE}/api/v5/objects/layout-templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Pardot-Business-Unit-Id": config.businessUnitId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: data };
  }
  return { ok: true, id: data.id };
}

// ---- メイン --------------------------------------------------------------
(async () => {
  console.log(`Account Engagement レイアウトテンプレート一括登録`);
  console.log(`  環境: ${config.environment} (${API_BASE})`);
  console.log(`  BU : ${config.businessUnitId}`);
  if (DRY_RUN) console.log("  ※ dry-run モード（API へは送信しません）");

  const templates = loadTemplates();
  if (templates.length === 0) {
    console.error("✖ 登録対象のテンプレートがありません。");
    process.exit(1);
  }
  console.log(`  対象: ${templates.length} 件\n`);

  const token = DRY_RUN ? "DRY_RUN" : await getAccessToken();

  let ok = 0;
  let fail = 0;
  for (const tpl of templates) {
    process.stdout.write(`→ ${tpl.dir} : "${tpl.meta.name}" ... `);
    const r = await createTemplate(token, tpl);
    if (r.ok) {
      ok++;
      console.log(r.dryRun ? "OK (dry-run)" : `OK (id=${r.id})`);
    } else {
      fail++;
      console.log(`NG (HTTP ${r.status})`);
      console.log("   " + JSON.stringify(r.error));
    }
  }

  console.log(`\n完了: 成功 ${ok} / 失敗 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("✖ 予期せぬエラー:", e);
  process.exit(1);
});
