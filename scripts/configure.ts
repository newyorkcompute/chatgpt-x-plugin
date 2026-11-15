/**
 * Write CLIENT_ID from .env.local into the plugin MCP manifests.
 *
 * Usage:
 *   cp .env.example .env.local   # then fill CLIENT_ID / CLIENT_SECRET
 *   npm run configure
 *
 * Do not commit the patched client ID. Only the public Client ID is written.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PLACEHOLDER = "YOUR_X_APP_CLIENT_ID";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(ROOT, ".env.local");
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function patchFile(relPath: string, clientId: string): void {
  const path = resolve(ROOT, relPath);
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    mcpServers: {
      x: {
        extensions?: {
          "com.openai"?: {
            auth?: { client?: { clientId?: string } };
          };
        };
        env?: { CLIENT_ID?: string; CLIENT_SECRET?: string };
      };
    };
  };

  const server = data.mcpServers.x;
  const client = server.extensions?.["com.openai"]?.auth?.client;
  if (client) client.clientId = clientId;
  if (server.env) {
    server.env.CLIENT_ID = clientId;
    server.env.CLIENT_SECRET = "YOUR_X_APP_CLIENT_SECRET";
  }

  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`updated ${relPath}`);
}

function main(): void {
  const env = loadEnvLocal();
  const clientId = (process.env.CLIENT_ID || env.CLIENT_ID || "").trim();
  if (!clientId) {
    console.error(`Missing CLIENT_ID.

Create .env.local from .env.example and set CLIENT_ID (OAuth 2.0 Client ID), then re-run:
  npm run configure
`);
    process.exitCode = 1;
    return;
  }
  if (clientId === PLACEHOLDER) {
    console.error("CLIENT_ID is still the placeholder. Paste your real OAuth 2.0 Client ID.");
    process.exitCode = 1;
    return;
  }

  patchFile("plugins/x-bookmarks/mcp.json", clientId);
  patchFile("plugins/x-bookmarks/mcp.xurl.fallback.json", clientId);

  console.log(`
Done. Client ID written into MCP manifests (public identifier only).

Next:
  1. Keep CLIENT_SECRET in .env.local / ChatGPT UI only — never commit it
  2. npm run verify:discovery
  3. Connect ChatGPT → Add custom MCP server → https://api.x.com/mcp?read_only=true
  4. Before pushing: git checkout -- plugins/x-bookmarks/mcp.json plugins/x-bookmarks/mcp.xurl.fallback.json
`);
}

main();
