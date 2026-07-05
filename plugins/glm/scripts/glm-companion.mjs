#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const CODING_PLAN_ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";
export const CODING_PLAN_OPENAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
export const STANDARD_OPENAI_BASE_URL = "https://api.z.ai/api/paas/v4";
export const DEFAULT_GLM_MODEL = "glm-5.2[1m]";
export const DEFAULT_FAST_MODEL = "glm-4.5-air";
export const DEFAULT_COMPACT_WINDOW = "1000000";

const SECRET_KEYS = new Set([
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ZAI_API_KEY",
  "Z_AI_API_KEY"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function splitRawArgumentString(input) {
  const value = String(input ?? "").trim();
  if (!value) {
    return [];
  }
  const result = [];
  const pattern = /"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(value)) !== null) {
    const token = match[1] ?? match[2] ?? match[3] ?? "";
    result.push(token.replace(/\\(["'\\])/g, "$1"));
  }
  return result;
}

export function normalizeArgv(argv) {
  if (argv.length === 1) {
    return splitRawArgumentString(argv[0]);
  }
  return argv;
}

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  const tokens = normalizeArgv(argv);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") {
      positionals.push(...tokens.slice(index + 1));
      break;
    }
    if (!token.startsWith("--") || token === "-") {
      positionals.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex !== -1) {
      const key = withoutPrefix.slice(0, equalsIndex);
      const value = withoutPrefix.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const next = tokens[index + 1];
    if (next && !next.startsWith("--")) {
      options[withoutPrefix] = next;
      index += 1;
    } else {
      options[withoutPrefix] = true;
    }
  }
  return { options, positionals };
}

export function defaultClaudeSettingsPath() {
  return path.join(os.homedir(), ".claude", "settings.json");
}

export function resolveSettingsPath(options = {}, cwd = process.cwd()) {
  if (options.settings) {
    if (process.env.GLM_COMPANION_ALLOW_SETTINGS_PATH === "1") {
      return path.resolve(cwd, String(options.settings));
    }
    throw new Error("`--settings` is for tests only. Use --scope user, --scope project, or --scope local.");
  }
  const scope = String(options.scope ?? "user").toLowerCase();
  if (scope === "local") {
    return path.resolve(cwd, ".claude", "settings.local.json");
  }
  if (scope === "project") {
    return path.resolve(cwd, ".claude", "settings.json");
  }
  if (scope !== "user") {
    throw new Error(`Unsupported settings scope "${scope}". Use user, project, or local.`);
  }
  return defaultClaudeSettingsPath();
}

export function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  const raw = fs.readFileSync(settingsPath, "utf8");
  if (!raw.trim()) {
    return {};
  }
  const parsed = JSON.parse(raw);
  if (!isObject(parsed)) {
    throw new Error(`Expected ${settingsPath} to contain a JSON object.`);
  }
  return parsed;
}

export function writeSettings(settingsPath, settings) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function buildRecommendedEnv(options = {}) {
  const primaryModel = String(options.model ?? DEFAULT_GLM_MODEL).trim() || DEFAULT_GLM_MODEL;
  const fastModel = String(options.fastModel ?? DEFAULT_FAST_MODEL).trim() || DEFAULT_FAST_MODEL;
  const compactWindow = String(options.compactWindow ?? DEFAULT_COMPACT_WINDOW).trim() || DEFAULT_COMPACT_WINDOW;
  return {
    ANTHROPIC_BASE_URL: CODING_PLAN_ANTHROPIC_BASE_URL,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: fastModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: primaryModel,
    ANTHROPIC_DEFAULT_OPUS_MODEL: primaryModel,
    ANTHROPIC_CUSTOM_MODEL_OPTION: primaryModel,
    ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: primaryModel,
    ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION: "Z.ai GLM Coding Plan",
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: compactWindow
  };
}

function normalizeToken(token) {
  const value = String(token ?? "").trim();
  return value.replace(/^Bearer\s+/i, "");
}

function resolveToken(options = {}) {
  if (options.key) {
    return { value: normalizeToken(options.key), source: "--key" };
  }
  if (options["key-env"]) {
    const name = String(options["key-env"]);
    return { value: normalizeToken(process.env[name]), source: name };
  }
  for (const name of ["ZAI_API_KEY", "Z_AI_API_KEY", "ANTHROPIC_AUTH_TOKEN"]) {
    if (process.env[name]) {
      return { value: normalizeToken(process.env[name]), source: name };
    }
  }
  return { value: null, source: null };
}

export function applyGlmSettings(settings, options = {}) {
  const next = { ...settings };
  const currentEnv = isObject(settings.env) ? settings.env : {};
  const env = { ...currentEnv, ...buildRecommendedEnv(options) };
  const token = resolveToken(options);
  if (token.value) {
    env.ANTHROPIC_AUTH_TOKEN = token.value;
  } else if (typeof currentEnv.ANTHROPIC_AUTH_TOKEN === "string" && currentEnv.ANTHROPIC_AUTH_TOKEN.trim()) {
    env.ANTHROPIC_AUTH_TOKEN = currentEnv.ANTHROPIC_AUTH_TOKEN;
  }

  next.env = env;
  return {
    settings: next,
    tokenSource: token.source,
    tokenUpdated: Boolean(token.value)
  };
}

function statusValue(settings, key) {
  const env = isObject(settings.env) ? settings.env : {};
  if (typeof env[key] === "string" && env[key].trim()) {
    return env[key].trim();
  }
  return null;
}

function redactValue(key, value) {
  if (value == null) {
    return "<missing>";
  }
  if (SECRET_KEYS.has(key)) {
    const text = String(value);
    return text.length <= 8 ? "<set>" : `${text.slice(0, 4)}...${text.slice(-4)}`;
  }
  return String(value);
}

export function buildStatus(settings, settingsPath) {
  const env = isObject(settings.env) ? settings.env : {};
  const hasAuthToken = Boolean(statusValue(settings, "ANTHROPIC_AUTH_TOKEN"));
  const hasApiKey = Boolean(statusValue(settings, "ANTHROPIC_API_KEY"));
  const hasApiKeyHelper = typeof settings.apiKeyHelper === "string" && settings.apiKeyHelper.trim();
  const authReady = hasAuthToken || hasApiKey || hasApiKeyHelper;
  const baseUrl = statusValue(settings, "ANTHROPIC_BASE_URL");
  const primaryModel = statusValue(settings, "ANTHROPIC_DEFAULT_OPUS_MODEL") || statusValue(settings, "ANTHROPIC_DEFAULT_SONNET_MODEL");
  const compactWindow = statusValue(settings, "CLAUDE_CODE_AUTO_COMPACT_WINDOW");

  const checks = [
    {
      id: "endpoint",
      ok: baseUrl === CODING_PLAN_ANTHROPIC_BASE_URL,
      label: "Claude Code endpoint points to the Z.ai Coding Plan Anthropic-compatible API",
      expected: CODING_PLAN_ANTHROPIC_BASE_URL,
      actual: baseUrl
    },
    {
      id: "auth",
      ok: authReady,
      label: "A Z.ai Coding Plan token is configured for Claude Code",
      expected: "ANTHROPIC_AUTH_TOKEN or apiKeyHelper",
      actual: hasAuthToken ? "ANTHROPIC_AUTH_TOKEN" : hasApiKey ? "ANTHROPIC_API_KEY" : hasApiKeyHelper ? "apiKeyHelper" : null
    },
    {
      id: "primary-model",
      ok: Boolean(primaryModel && primaryModel.startsWith("glm-5.2")),
      label: "Primary Claude Code models map to GLM-5.2",
      expected: "glm-5.2 or glm-5.2[1m]",
      actual: primaryModel
    },
    {
      id: "fast-model",
      ok: Boolean(statusValue(settings, "ANTHROPIC_DEFAULT_HAIKU_MODEL")),
      label: "Fast/Haiku model fallback is configured",
      expected: DEFAULT_FAST_MODEL,
      actual: statusValue(settings, "ANTHROPIC_DEFAULT_HAIKU_MODEL")
    },
    {
      id: "compact-window",
      ok: compactWindow === DEFAULT_COMPACT_WINDOW,
      label: "Claude Code auto-compact window is aligned with GLM-5.2 1M context",
      expected: DEFAULT_COMPACT_WINDOW,
      actual: compactWindow
    },
  ];

  const snapshotKeys = [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_CUSTOM_MODEL_OPTION",
    "ANTHROPIC_CUSTOM_MODEL_OPTION_NAME",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW"
  ];
  const values = Object.fromEntries(snapshotKeys.map((key) => [key, redactValue(key, env[key])]));
  if (settings.apiKeyHelper) {
    values.apiKeyHelper = "<configured>";
  }

  return {
    settingsPath,
    ready: checks.every((check) => check.ok),
    checks,
    values,
    endpoints: {
      claudeCodeAnthropicCompatible: CODING_PLAN_ANTHROPIC_BASE_URL,
      codingPlanOpenAICompatible: CODING_PLAN_OPENAI_BASE_URL,
      standardOpenAICompatible: STANDARD_OPENAI_BASE_URL
    }
  };
}

export function renderStatus(report, heading = "GLM Coding Plan status") {
  const lines = [heading, `Settings: ${report.settingsPath}`, `Ready: ${report.ready ? "yes" : "no"}`, "", "Checks:"];
  for (const check of report.checks) {
    const marker = check.ok ? "OK" : "MISSING";
    lines.push(`- ${marker}: ${check.label}`);
    if (!check.ok) {
      lines.push(`  expected: ${check.expected}`);
      lines.push(`  actual: ${check.actual ?? "<missing>"}`);
    }
  }
  lines.push("", "Configured values:");
  for (const [key, value] of Object.entries(report.values)) {
    lines.push(`- ${key}: ${value}`);
  }
  if (!report.ready) {
    lines.push(
      "",
      "Next steps:",
      "- Run `/glm:setup --write --key-env ZAI_API_KEY` after exporting your Z.ai Coding Plan key.",
      "- Or run `/glm:setup --write --key <zai-coding-plan-api-key>` if you accept storing the token in Claude Code settings.",
      "- Restart Claude Code after changing model endpoint settings."
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderSetup(report) {
  const heading = report.wrote ? "GLM Coding Plan setup applied" : "GLM Coding Plan setup preview";
  const lines = [renderStatus(report.status, heading).trimEnd()];
  if (!report.wrote) {
    lines.push("", "No files were changed. Add `--write` to apply this configuration.");
  }
  if (report.tokenUpdated) {
    lines.push(`Token source: ${report.tokenSource}`);
  } else if (!report.status.ready) {
    lines.push("No token was found. Prefer `--key-env ZAI_API_KEY` so the secret is not typed into the slash-command transcript.");
  }
  return `${lines.join("\n")}\n`;
}

export async function runLiveProbe(settings, options = {}) {
  const env = isObject(settings.env) ? settings.env : {};
  const baseUrl = String(env.ANTHROPIC_BASE_URL || CODING_PLAN_ANTHROPIC_BASE_URL).replace(/\/+$/, "");
  if (baseUrl !== CODING_PLAN_ANTHROPIC_BASE_URL) {
    return {
      ok: false,
      skipped: true,
      reason: `Refusing live probe because ANTHROPIC_BASE_URL is ${baseUrl}. Expected ${CODING_PLAN_ANTHROPIC_BASE_URL}.`
    };
  }
  const token = normalizeToken(env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY || process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (!token) {
    return { ok: false, skipped: true, reason: "No token available for live probe." };
  }
  const model = String(options.model || env.ANTHROPIC_DEFAULT_OPUS_MODEL || DEFAULT_GLM_MODEL);
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with OK." }]
    })
  });
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    model,
    bodyPreview: body.slice(0, 500)
  };
}

async function handleSetup(argv) {
  const { options } = parseArgs(argv);
  const settingsPath = resolveSettingsPath(options);
  const current = readSettings(settingsPath);
  const applied = applyGlmSettings(current, {
    model: options.model,
    fastModel: options["fast-model"],
    compactWindow: options["compact-window"],
    key: options.key,
    "key-env": options["key-env"]
  });
  const shouldWrite = Boolean(options.write);
  if (shouldWrite) {
    writeSettings(settingsPath, applied.settings);
  }
  const report = {
    wrote: shouldWrite,
    tokenSource: applied.tokenSource,
    tokenUpdated: applied.tokenUpdated,
    status: buildStatus(applied.settings, settingsPath)
  };
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderSetup(report));
  }
}

async function handleStatus(argv) {
  const { options } = parseArgs(argv);
  const settingsPath = resolveSettingsPath(options);
  const report = buildStatus(readSettings(settingsPath), settingsPath);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderStatus(report));
  }
}

async function handleDoctor(argv) {
  const { options } = parseArgs(argv);
  const settingsPath = resolveSettingsPath(options);
  const settings = readSettings(settingsPath);
  const status = buildStatus(settings, settingsPath);
  const report = { status, liveProbe: null };
  if (options.live) {
    report.liveProbe = await runLiveProbe(settings, { model: options.model });
  }
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const lines = [renderStatus(status, "GLM Coding Plan doctor").trimEnd()];
  if (options.live) {
    lines.push("", `Live probe: ${report.liveProbe.ok ? "OK" : "FAILED"}`);
    if (report.liveProbe.skipped) {
      lines.push(`Reason: ${report.liveProbe.reason}`);
    } else {
      lines.push(`HTTP status: ${report.liveProbe.status}`);
      lines.push(`Model: ${report.liveProbe.model}`);
      if (!report.liveProbe.ok) {
        lines.push(`Response preview: ${report.liveProbe.bodyPreview}`);
      }
    }
  } else {
    lines.push("", "Live probe skipped. Add `--live` to send a tiny test request to Z.ai.");
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printUsage() {
  console.log([
    "Usage:",
    "  node scripts/glm-companion.mjs setup [--write] [--key-env ZAI_API_KEY|--key <token>] [--model glm-5.2[1m]] [--json]",
    "  node scripts/glm-companion.mjs status [--json]",
    "  node scripts/glm-companion.mjs doctor [--live] [--model <model>] [--json]",
    "",
    "Defaults target the Z.ai Coding Plan Anthropic-compatible endpoint used by Claude Code:",
    `  ${CODING_PLAN_ANTHROPIC_BASE_URL}`
  ].join("\n"));
}

export async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  switch (command) {
    case "setup":
      await handleSetup(rest);
      break;
    case "status":
      await handleStatus(rest);
      break;
    case "doctor":
      await handleDoctor(rest);
      break;
    case undefined:
    case "help":
    case "--help":
      printUsage();
      break;
    default:
      throw new Error(`Unknown subcommand: ${command}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

