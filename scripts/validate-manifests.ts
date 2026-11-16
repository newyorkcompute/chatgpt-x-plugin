/**
 * Validate plugin manifests and skills.
 *
 * - plugin.json / mcp.json / mcp.xurl.fallback.json against their published JSON Schemas
 * - mcp.json `extensions["com.openai"].auth` against OpenAI's documented OAuth fields
 * - marketplace.json entries point at real plugin folders (no published schema yet)
 * - every skills/<name>/SKILL.md has frontmatter whose `name` matches its folder and a description
 * - asset paths referenced by plugin.json exist
 *
 * Usage:
 *   npm run validate
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const ROOT = process.cwd();
const MARKETPLACE = ".agents/plugins/marketplace.json";

type Json = Record<string, unknown>;

// Keep in sync with "OAuth configuration reference" at https://developers.openai.com/plugins/build/auth
const httpsUrl = { type: "string", format: "uri", pattern: "^https?://" };
const scopes = { type: "array", items: { type: "string", pattern: "\\S" } };
const OPENAI_AUTH_SCHEMA = {
  type: "object",
  required: ["type"],
  additionalProperties: false,
  properties: {
    type: { enum: ["oauth", "mixed"] },
    client: {
      type: "object",
      required: ["mode"],
      additionalProperties: false,
      properties: {
        mode: { enum: ["provided", "dcr", "cimd"] },
        clientId: { type: "string", minLength: 1 },
        tokenEndpointAuthMethod: {
          enum: ["none", "client_secret_basic", "client_secret_post", "private_key_jwt"],
        },
      },
      if: { properties: { mode: { const: "provided" } } },
      // biome-ignore lint/suspicious/noThenProperty: JSON Schema if/then keyword
      then: { required: ["clientId"] },
      else: { not: { required: ["clientId"] } },
    },
    authorizationUrl: httpsUrl,
    tokenUrl: httpsUrl,
    registrationUrl: httpsUrl,
    authorizationServerBase: httpsUrl,
    resource: { type: "string", minLength: 1 },
    baseScopes: scopes,
    defaultScopes: scopes,
    oidcEnabled: { type: "boolean" },
    oidcConfigurationUrl: httpsUrl,
    oidcUserinfoEndpoint: httpsUrl,
    oidcScopesSupported: scopes,
  },
};

const errors: string[] = [];

function readJson(rel: string): Json {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8")) as Json;
}

async function fetchSchema(url: string): Promise<Json> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as Json;
}

function makeAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  return ajv;
}

function report(rel: string, validateErrors: Array<{ instancePath: string; message?: string }>) {
  for (const err of validateErrors) {
    errors.push(`${rel}${err.instancePath || "/"} ${err.message}`);
  }
}

// The Agent Plugins 1.0.0 mcp schema rejects unknown server keys, but OpenAI documents
// vendor settings under each server's `extensions`. Validate the two halves separately.
function splitServerExtensions(data: Json): Array<[string, Json]> {
  const servers = data.mcpServers;
  if (!servers || typeof servers !== "object") return [];
  const out: Array<[string, Json]> = [];
  for (const [name, server] of Object.entries(servers as Record<string, Json>)) {
    if (server && typeof server === "object" && "extensions" in server) {
      out.push([name, server.extensions as Json]);
      delete server.extensions;
    }
  }
  return out;
}

async function validateAgainstSchema(rel: string): Promise<void> {
  const data = readJson(rel);
  const schemaUrl = data.$schema;
  if (typeof schemaUrl !== "string") {
    errors.push(`${rel}: missing "$schema"`);
    return;
  }
  const before = errors.length;
  const extensions = rel.endsWith("mcp.json") ? splitServerExtensions(data) : [];

  const ajv = makeAjv();
  const validate = ajv.compile(await fetchSchema(schemaUrl));
  if (!validate(data)) report(rel, validate.errors ?? []);

  const validateAuth = ajv.compile(OPENAI_AUTH_SCHEMA);
  for (const [server, ext] of extensions) {
    const auth = (ext["com.openai"] as Json | undefined)?.auth;
    if (auth !== undefined && !validateAuth(auth)) {
      const path = `${rel}/mcpServers/${server}/extensions/com.openai/auth`;
      report(path, validateAuth.errors ?? []);
    }
  }

  if (errors.length === before) console.log(`✓ ${rel}`);
}

function validateMarketplace(): string[] {
  const data = readJson(MARKETPLACE) as {
    plugins?: Array<{ name?: string; source?: { source?: string; path?: string } }>;
  };
  const pluginDirs: string[] = [];
  if (!Array.isArray(data.plugins) || data.plugins.length === 0) {
    errors.push(`${MARKETPLACE}: "plugins" must be a non-empty array`);
    return pluginDirs;
  }
  for (const entry of data.plugins) {
    const path = entry.source?.path;
    if (!entry.name || entry.source?.source !== "local" || !path) {
      errors.push(`${MARKETPLACE}: each plugin needs a name and a local source path`);
      continue;
    }
    if (!existsSync(resolve(ROOT, path, "plugin.json"))) {
      errors.push(`${MARKETPLACE}: ${path}/plugin.json does not exist`);
      continue;
    }
    const manifest = readJson(`${path}/plugin.json`);
    if (manifest.name !== entry.name) {
      errors.push(
        `${MARKETPLACE}: entry "${entry.name}" does not match plugin name "${manifest.name}"`,
      );
    }
    pluginDirs.push(path.replace(/^\.\//, ""));
  }
  if (errors.length === 0) console.log(`✓ ${MARKETPLACE}`);
  return pluginDirs;
}

function validateAssets(pluginDir: string): void {
  const manifest = readJson(`${pluginDir}/plugin.json`) as {
    extensions?: { "com.openai"?: { interface?: Record<string, unknown> } };
  };
  const iface = manifest.extensions?.["com.openai"]?.interface ?? {};
  for (const key of ["logo", "composerIcon"] as const) {
    const ref = iface[key];
    if (typeof ref === "string" && !existsSync(resolve(ROOT, pluginDir, ref))) {
      errors.push(`${pluginDir}/plugin.json: interface.${key} points to missing ${ref}`);
    }
  }
}

function validateSkills(pluginDir: string): void {
  const skillsDir = resolve(ROOT, pluginDir, "skills");
  if (!existsSync(skillsDir)) return;
  for (const name of readdirSync(skillsDir)) {
    const rel = `${pluginDir}/skills/${name}/SKILL.md`;
    const path = resolve(ROOT, rel);
    if (!existsSync(path)) {
      errors.push(`${rel}: missing`);
      continue;
    }
    const before = errors.length;
    const match = readFileSync(path, "utf8").match(/^---\n(?!\s*\n)([\s\S]*?)\n---\n/);
    if (!match) {
      errors.push(`${rel}: missing YAML frontmatter, or a blank line right after the opening ---`);
      continue;
    }
    const front = parseYaml(match[1]) as { name?: unknown; description?: unknown };
    if (front.name !== name) {
      errors.push(`${rel}: frontmatter name "${String(front.name)}" must match folder "${name}"`);
    }
    if (typeof front.description !== "string" || front.description.trim().length < 20) {
      errors.push(`${rel}: description is missing or too short`);
    }
    if (typeof front.description === "string" && front.description.length > 1024) {
      errors.push(`${rel}: description is longer than 1024 characters`);
    }
    if (errors.length === before) console.log(`✓ ${rel}`);
  }
}

async function main(): Promise<void> {
  for (const pluginDir of validateMarketplace()) {
    for (const file of ["plugin.json", "mcp.json", "mcp.xurl.fallback.json"]) {
      if (existsSync(resolve(ROOT, pluginDir, file))) {
        await validateAgainstSchema(`${pluginDir}/${file}`);
      }
    }
    validateAssets(pluginDir);
    validateSkills(pluginDir);
  }

  if (errors.length > 0) {
    console.error(`\nManifest validation failed:\n${errors.map((e) => `  ✗ ${e}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nManifest validation passed.");
}

main().catch((err) => {
  console.error("\nManifest validation failed:", err);
  process.exitCode = 1;
});
