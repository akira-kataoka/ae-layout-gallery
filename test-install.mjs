#!/usr/bin/env node
/**
 * install.mjs の API 登録機能をローカルのモックサーバで実地テストする。
 * 本物の認証情報は不要。以下を検証する:
 *   1. OAuth (username-password) フローでトークンを取得して使うこと
 *   2. POST /api/v5/objects/layout-templates に正しいヘッダを付けること
 *      (Authorization: Bearer <token> / Pardot-Business-Unit-Id / Content-Type: application/json)
 *   3. ボディに name と %%content%% を含む layoutContent が入っていること
 *   4. --only のカンマ区切りで対象を絞れること（件数一致）
 *   5. 正常時 exit 0 / API がエラーを返したら exit 1 で失敗報告すること
 *   6. --dry-run では API を呼ばないこと
 *
 *   node account-engagement/test-install.mjs
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTALL = join(__dirname, "install.mjs");
const TOKEN = "MOCK_ACCESS_TOKEN_123";
const BU = "0UvTEST00000000000";

let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✖ ${msg}`); } };

// ---- モックサーバ：受信内容を記録 ---------------------------------------
function startServer({ failCreate = false } = {}) {
  const rec = { tokenHits: 0, creates: [], tokenForm: null };
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url.startsWith("/services/oauth2/token")) {
        rec.tokenHits++;
        rec.tokenForm = Object.fromEntries(new URLSearchParams(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ access_token: TOKEN, instance_url: "https://example.my.salesforce.com" }));
      } else if (req.url.startsWith("/api/v5/objects/layout-templates")) {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        rec.creates.push({ headers: req.headers, body: json });
        if (failCreate) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: 4, message: "Invalid layout template" }));
        } else {
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ id: 1000 + rec.creates.length, name: json && json.name }));
        }
      } else {
        res.writeHead(404); res.end("{}");
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, rec, port: server.address().port })));
}

function runInstall(configPath, extraArgs = []) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [INSTALL, `--config=${configPath}`, ...extraArgs], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

function writeConfig(dir, port, overrides = {}) {
  const cfg = {
    environment: "sandbox",
    businessUnitId: BU,
    folderId: null,
    apiBaseUrl: `http://127.0.0.1:${port}`,
    auth: {
      loginUrl: `http://127.0.0.1:${port}`,
      clientId: "CID", clientSecret: "SECRET",
      username: "user@example.com", password: "pw+token",
    },
    ...overrides,
  };
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify(cfg));
  return path;
}

// ---- 実行 ----------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "ae-test-"));
let exitCode = 0;
try {
  // --- ケース1: 正常系（--only で2件）+ OAuth + ヘッダ/ボディ検証 ---
  console.log("\n[1] 正常系: OAuth → 2件登録 (--only)");
  {
    const { server, rec, port } = await startServer();
    const cfg = writeConfig(tmp, port);
    const { code, out } = await runInstall(cfg, ["--only=01-landing-simple,03-form-download"]);
    server.close();
    check(code === 0, `exit code 0 (実際: ${code})`);
    check(rec.tokenHits === 1, `OAuth トークン取得を1回呼ぶ (実際: ${rec.tokenHits})`);
    check(rec.tokenForm && rec.tokenForm.grant_type === "password", "grant_type=password で送信");
    check(rec.creates.length === 2, `layout-templates へ2回 POST (実際: ${rec.creates.length})`);
    const h = rec.creates[0]?.headers || {};
    check(h.authorization === `Bearer ${TOKEN}`, "Authorization: Bearer <取得トークン>");
    check(h["pardot-business-unit-id"] === BU, "Pardot-Business-Unit-Id ヘッダが正しい");
    check((h["content-type"] || "").includes("application/json"), "Content-Type: application/json");
    const b = rec.creates[0]?.body || {};
    check(typeof b.name === "string" && b.name.length > 0, "ボディに name がある");
    check(typeof b.layoutContent === "string" && b.layoutContent.includes("%%content%%"), "layoutContent に %%content%% を含む");
    check(out.includes("成功 2 / 失敗 0"), "サマリが 成功2/失敗0");
  }

  // --- ケース2: API エラー時は exit 1 ---
  console.log("\n[2] 異常系: API が 400 → 失敗報告 exit 1");
  {
    const { server, rec, port } = await startServer({ failCreate: true });
    const cfg = writeConfig(tmp, port);
    const { code, out } = await runInstall(cfg, ["--only=01-landing-simple"]);
    server.close();
    check(rec.creates.length === 1, `POST は試行される (実際: ${rec.creates.length})`);
    check(code === 1, `exit code 1 (実際: ${code})`);
    check(out.includes("失敗 1") || out.includes("NG"), "失敗として報告される");
  }

  // --- ケース3: dry-run は API を一切呼ばない ---
  console.log("\n[3] dry-run: API 未送信");
  {
    const { server, rec, port } = await startServer();
    const cfg = writeConfig(tmp, port);
    const { code } = await runInstall(cfg, ["--only=01-landing-simple", "--dry-run"]);
    server.close();
    check(code === 0, `exit code 0 (実際: ${code})`);
    check(rec.tokenHits === 0 && rec.creates.length === 0, "OAuth も POST も呼ばれない");
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n===== テスト結果: ${pass} passed / ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
