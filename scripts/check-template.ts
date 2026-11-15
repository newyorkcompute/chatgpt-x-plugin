/**
 * Guardrail for open-source template hygiene:
 * committed MCP manifests must keep placeholders (no real Client IDs).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PLACEHOLDER = "YOUR_X_APP_CLIENT_ID";

const FILES = [
  "plugins/x-bookmarks/mcp.json",
  "plugins/x-bookmarks/mcp.xurl.fallback.json",
] as const;

function main(): void {
  let failed = false;

  for (const rel of FILES) {
    const path = resolve(ROOT, rel);
    const text = readFileSync(path, "utf8");
    if (!text.includes(PLACEHOLDER)) {
      console.error(`✗ ${rel} is missing ${PLACEHOLDER}`);
      failed = true;
      continue;
    }

    // Heuristic: X OAuth2 client IDs are often base64-ish and end with ":"
    // or include ":MTpjaQ" style suffixes. Flag non-placeholder clientId values.
    const clientIdMatches = [
      ...text.matchAll(/"clientId"\s*:\s*"([^"]+)"/g),
      ...text.matchAll(/"CLIENT_ID"\s*:\s*"([^"]+)"/g),
    ];
    for (const match of clientIdMatches) {
      const value = match[1];
      if (value !== PLACEHOLDER) {
        console.error(`✗ ${rel} has a non-placeholder client id: ${value.slice(0, 8)}…`);
        failed = true;
      }
    }

    if (text.includes("YOUR_X_APP_CLIENT_SECRET") === false && rel.includes("fallback")) {
      console.error(`✗ ${rel} should keep YOUR_X_APP_CLIENT_SECRET placeholder`);
      failed = true;
    }

    console.log(`✓ ${rel}`);
  }

  if (failed) {
    console.error("\nTemplate check failed. Run `git checkout -- plugins/x-bookmarks/mcp*.json` before committing.");
    process.exitCode = 1;
    return;
  }

  console.log("\nTemplate check passed.");
}

main();
