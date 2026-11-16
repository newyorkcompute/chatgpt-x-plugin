/**
 * Build an upload-ready ChatGPT plugin ZIP from this repo.
 *
 * ChatGPT ties a personal plugin to its connection through `.app.json` and an internal
 * plugin name, so those come from the ZIP ChatGPT exports. Everything else — description,
 * interface, icons, skills — comes from plugins/x-bookmarks.
 *
 * Usage:
 *   1. ChatGPT → Plugins → your plugin → … → Download plugin ZIP
 *   2. npm run package -- ~/Downloads/plugin.zip
 *   3. ChatGPT → … → Upload new version → dist/x-for-chatgpt-v<version>.zip
 *
 * The version is the exported version with the patch number bumped, because ChatGPT
 * versions personal plugins on its own. Override with --version 1.2.3.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const ROOT = process.cwd();
const PLUGIN_DIR = resolve(ROOT, "plugins/x-bookmarks");
const OUT_DIR = resolve(ROOT, "dist");

type Json = Record<string, unknown>;

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function parseArgs(): { input: string; version?: string } {
  const args = process.argv.slice(2);
  let version: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version") version = args[++i];
    else positional.push(args[i]);
  }
  const input = positional[0];
  if (!input) {
    fail(`Missing the ZIP exported from ChatGPT.

  1. ChatGPT → Plugins → your plugin → … → Download plugin ZIP
  2. npm run package -- ~/Downloads/plugin.zip`);
  }
  if (version !== undefined && !/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`--version must look like 1.2.3 (got "${version}")`);
  }
  return { input: resolve(input.replace(/^~(?=\/)/, process.env.HOME ?? "~")), version };
}

function bumpPatch(version: unknown): string {
  const match = typeof version === "string" && version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return "1.0.0";
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function addDir(files: Record<string, Uint8Array>, dir: string, prefix: string): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = `${prefix}/${relative(dir, path)}`;
    if (statSync(path).isDirectory()) addDir(files, path, rel);
    else files[rel] = readFileSync(path);
  }
}

function main(): void {
  const { input, version: versionOverride } = parseArgs();
  if (!existsSync(input)) fail(`File not found: ${input}`);

  const exported = unzipSync(readFileSync(input));
  const appJson = exported[".app.json"];
  const exportedManifestRaw = exported[".codex-plugin/plugin.json"];
  if (!appJson || !exportedManifestRaw) {
    fail(
      `${input} doesn't look like a ChatGPT plugin export (expected .app.json and .codex-plugin/plugin.json).`,
    );
  }
  const exportedManifest = JSON.parse(strFromU8(exportedManifestRaw)) as Json;
  if (typeof exportedManifest.name !== "string") {
    fail(`${input}: .codex-plugin/plugin.json has no "name"`);
  }

  const repoManifest = JSON.parse(readFileSync(join(PLUGIN_DIR, "plugin.json"), "utf8")) as Json;
  const openai = ((repoManifest.extensions as Json | undefined)?.["com.openai"] ?? {}) as Json;
  const version = versionOverride ?? bumpPatch(exportedManifest.version);

  const manifest: Json = {
    apps: "./.app.json",
    name: exportedManifest.name,
    version,
    description: repoManifest.description,
    author: repoManifest.author,
    skills: "./skills/",
    ...(openai.onboardingSkill ? { onboardingSkill: openai.onboardingSkill } : {}),
    interface: openai.interface,
  };

  const files: Record<string, Uint8Array> = {
    ".app.json": appJson,
    ".codex-plugin/plugin.json": strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
  };
  addDir(files, join(PLUGIN_DIR, "assets"), "assets");
  addDir(files, join(PLUGIN_DIR, "skills"), "skills");

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `x-for-chatgpt-v${version}.zip`);
  writeFileSync(outPath, zipSync(files, { level: 9 }));

  console.log(`Built ${relative(ROOT, outPath)} (version ${version})\n`);
  for (const name of Object.keys(files).sort()) console.log(`  ${name}`);
  console.log(`
Next: ChatGPT → Plugins → your plugin → … → Upload new version → ${relative(ROOT, outPath)}`);
}

main();
