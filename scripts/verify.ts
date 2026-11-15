/**
 * Local verification for X's hosted MCP endpoint.
 *
 * Usage:
 *   npm run verify:discovery
 *   X_TOKEN=$(xurl token) npm run verify
 *
 * Loads `.env.local` if present (CLIENT_ID / CLIENT_SECRET / X_TOKEN).
 * Requires a user-context OAuth2 access token (from xurl) for the MCP tools step.
 * Discovery-only mode needs no token.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const MCP_URL = "https://api.x.com/mcp?read_only=true";
const MCP_RESOURCE = "https://api.x.com/mcp";
const PRM_URL = "https://api.x.com/.well-known/oauth-protected-resource";
const AS_URL = "https://api.x.com/.well-known/oauth-authorization-server";

const EXPECTED_SCOPES = [
  "tweet.read",
  "users.read",
  "bookmark.read",
  "offline.access",
] as const;

type Json = Record<string, unknown>;

async function fetchJson(url: string): Promise<Json> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} returned ${res.status}`);
  }
  return (await res.json()) as Json;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function verifyDiscovery(): Promise<void> {
  console.log("=== 1. OAuth discovery metadata ===\n");

  const prm = await fetchJson(PRM_URL);
  const as = await fetchJson(AS_URL);

  console.log("Protected resource metadata:");
  console.log(`  resource: ${prm.resource}`);
  console.log(`  authorization_servers: ${JSON.stringify(prm.authorization_servers)}`);
  console.log(`  scopes_supported: ${asStringArray(prm.scopes_supported).length} scopes`);

  console.log("\nAuthorization server metadata:");
  console.log(`  issuer: ${as.issuer}`);
  console.log(`  authorization_endpoint: ${as.authorization_endpoint}`);
  console.log(`  token_endpoint: ${as.token_endpoint}`);
  console.log(
    `  code_challenge_methods_supported: ${JSON.stringify(as.code_challenge_methods_supported)}`,
  );
  console.log(
    `  token_endpoint_auth_methods_supported: ${JSON.stringify(as.token_endpoint_auth_methods_supported)}`,
  );
  console.log(`  registration_endpoint: ${as.registration_endpoint ?? "(none — no DCR)"}`);
  console.log(
    `  client_id_metadata_document_supported: ${as.client_id_metadata_document_supported ?? false}`,
  );
  console.log(
    `  authorization_response_iss_parameter_supported: ${as.authorization_response_iss_parameter_supported ?? false}`,
  );

  assert(prm.resource === MCP_RESOURCE, `expected resource ${MCP_RESOURCE}`);
  assert(
    Array.isArray(prm.authorization_servers) &&
      prm.authorization_servers.includes("https://api.x.com"),
    "expected authorization_servers to include https://api.x.com",
  );
  assert(as.issuer === "https://api.x.com", "expected issuer https://api.x.com");
  assert(
    as.authorization_endpoint === "https://x.com/i/oauth2/authorize",
    "unexpected authorization_endpoint",
  );
  assert(
    as.token_endpoint === "https://api.x.com/2/oauth2/token",
    "unexpected token_endpoint",
  );

  const pkce = asStringArray(as.code_challenge_methods_supported);
  assert(pkce.includes("S256"), "AS must advertise S256 PKCE for ChatGPT");

  const authMethods = asStringArray(as.token_endpoint_auth_methods_supported);
  assert(
    authMethods.includes("client_secret_basic"),
    "AS must support client_secret_basic for a confidential X app",
  );

  const scopes = asStringArray(prm.scopes_supported);
  for (const scope of EXPECTED_SCOPES) {
    assert(scopes.includes(scope), `missing required scope in PRM: ${scope}`);
  }

  assert(
    as.registration_endpoint == null,
    "unexpected registration_endpoint — X was not expected to support DCR",
  );

  console.log("\nDiscovery checks passed.");
  console.log(
    "Implication: ChatGPT must use a predefined (provided) OAuth client — no DCR/CIMD.",
  );
}

function extractText(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return JSON.stringify(result, null, 2);
  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part) {
        return String((part as { text: unknown }).text);
      }
      return JSON.stringify(part);
    })
    .join("\n");
}

function extractUserId(payload: string): string | undefined {
  try {
    const parsed = JSON.parse(payload) as {
      data?: { id?: string };
      id?: string;
    };
    return parsed.data?.id ?? parsed.id;
  } catch {
    const match = payload.match(/"id"\s*:\s*"(\d+)"/);
    return match?.[1];
  }
}

function isToolError(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && (result as { isError?: boolean }).isError);
}

function pickBookmarkTool(
  tools: Array<{ name: string; description?: string }>,
): { name: string; description?: string } | undefined {
  const preferred = [
    "get_users_bookmarks",
    "get_bookmarks",
    "list_bookmarks",
    "bookmarks_list",
    "bookmark_list",
  ];
  for (const name of preferred) {
    const hit = tools.find((t) => t.name === name);
    if (hit) return hit;
  }
  return tools.find(
    (t) =>
      /bookmark/i.test(t.name) &&
      !/(add|create|delete|remove|folder)/i.test(t.name),
  );
}

async function verifyMcp(token: string): Promise<void> {
  console.log("\n=== 2. MCP tools/list + bookmarks call ===\n");
  console.log(`Connecting to ${MCP_URL}`);

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const client = new Client({ name: "chatgpt-x-plugin-verify", version: "0.1.0" });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    console.log(`Discovered ${tools.length} tools (read_only=true):\n`);
    for (const tool of tools) {
      const annotations = tool.annotations
        ? ` annotations=${JSON.stringify(tool.annotations)}`
        : "";
      console.log(`  - ${tool.name}${annotations}`);
      if (tool.description) {
        console.log(`      ${tool.description.slice(0, 120)}`);
      }
    }

    const bookmarkTool = pickBookmarkTool(tools);
    if (!bookmarkTool) {
      console.log(
        "\nNo bookmarks tool found. Full tool names above — update the skill with the real name.",
      );
      return;
    }

    const meTool = tools.find((t) => t.name === "get_users_me");
    let userId: string | undefined;
    if (meTool) {
      console.log("\nCalling get_users_me for authenticated user id…");
      const meResult = await client.callTool({ name: "get_users_me", arguments: {} });
      const meText = extractText(meResult);
      console.log(meText.length > 1500 ? `${meText.slice(0, 1500)}\n…(truncated)` : meText);
      userId = extractUserId(meText);
      if (userId) console.log(`Resolved user id: ${userId}`);
    }

    const bookmarkArgs: Record<string, unknown> = {};
    if (userId) bookmarkArgs.id = userId;

    console.log(
      `\nCalling bookmarks tool: ${bookmarkTool.name}` +
        (userId ? ` (id=${userId})` : " (no id — may fail)"),
    );
    const result = await client.callTool({
      name: bookmarkTool.name,
      arguments: bookmarkArgs,
    });

    const preview = JSON.stringify(result, null, 2);
    console.log(preview.length > 4000 ? `${preview.slice(0, 4000)}\n…(truncated)` : preview);
    if (isToolError(result)) {
      throw new Error(
        `${bookmarkTool.name} returned an error — see output above. ` +
          "Usually means missing `id` (pass get_users_me.id) or insufficient scopes/credits.",
      );
    }
    console.log("\nMCP tools step passed.");
    console.log(`Use this tool name in the skill: ${bookmarkTool.name}`);
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const discoveryOnly = process.argv.includes("--discovery-only");
  await verifyDiscovery();

  if (discoveryOnly) {
    console.log("\nSkipping MCP tools step (--discovery-only).");
    return;
  }

  const token = process.env.X_TOKEN?.trim();
  if (!token) {
    console.log(`
Missing X_TOKEN.

Mint a user-context token with xurl, then re-run:

  # one-time
  brew install --cask xdevplatform/tap/xurl   # or: npm i -g @xdevplatform/xurl
  xurl auth apps add chatgpt-x --client-id "$CLIENT_ID" --client-secret "$CLIENT_SECRET"
  xurl auth oauth2 --app chatgpt-x

  # verify
  X_TOKEN=$(xurl token) npm run verify

Or run discovery only:
  npm run verify:discovery
`);
    process.exitCode = 2;
    return;
  }

  await verifyMcp(token);
}

main().catch((err) => {
  console.error("\nVerification failed:", err);
  process.exitCode = 1;
});
