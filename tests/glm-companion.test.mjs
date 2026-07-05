import assert from "node:assert/strict";
import test from "node:test";

import {
  CODING_PLAN_ANTHROPIC_BASE_URL,
  DEFAULT_FAST_MODEL,
  DEFAULT_GLM_MODEL,
  applyGlmSettings,
  buildRecommendedEnv,
  buildStatus,
  splitRawArgumentString
} from "../plugins/glm/scripts/glm-companion.mjs";

test("buildRecommendedEnv targets Z.ai Coding Plan for Claude Code", () => {
  const env = buildRecommendedEnv();
  assert.equal(env.ANTHROPIC_BASE_URL, CODING_PLAN_ANTHROPIC_BASE_URL);
  assert.equal(env.ANTHROPIC_DEFAULT_OPUS_MODEL, DEFAULT_GLM_MODEL);
  assert.equal(env.ANTHROPIC_DEFAULT_SONNET_MODEL, DEFAULT_GLM_MODEL);
  assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, DEFAULT_FAST_MODEL);
  assert.equal(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, "1000000");
});

test("applyGlmSettings strips Bearer prefix and preserves unrelated env", () => {
  const result = applyGlmSettings(
    { env: { EXISTING_FLAG: "keep-me" } },
    { key: "Bearer zai-test-token" }
  );
  assert.equal(result.tokenSource, "--key");
  assert.equal(result.tokenUpdated, true);
  assert.equal(result.settings.env.EXISTING_FLAG, "keep-me");
  assert.equal(result.settings.env.ANTHROPIC_AUTH_TOKEN, "zai-test-token");
});

test("buildStatus reports ready with GLM endpoint, model, and token", () => {
  const { settings } = applyGlmSettings({}, { key: "zai-test-token" });
  const status = buildStatus(settings, "/tmp/settings.json");
  assert.equal(status.ready, true);
  assert.equal(status.values.ANTHROPIC_AUTH_TOKEN, "zai-...oken");
  assert.equal(status.values.ANTHROPIC_BASE_URL, CODING_PLAN_ANTHROPIC_BASE_URL);
});

test("buildStatus catches normal API endpoint because Claude Code needs Anthropic-compatible Coding Plan endpoint", () => {
  const status = buildStatus(
    {
      env: {
        ANTHROPIC_BASE_URL: "https://api.z.ai/api/paas/v4",
        ANTHROPIC_AUTH_TOKEN: "zai-test-token",
        ANTHROPIC_DEFAULT_OPUS_MODEL: DEFAULT_GLM_MODEL,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: DEFAULT_FAST_MODEL,
        CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000"
      }
    },
    "/tmp/settings.json"
  );
  assert.equal(status.ready, false);
  assert.equal(status.checks.find((check) => check.id === "endpoint").ok, false);
});

test("splitRawArgumentString handles quoted slash-command arguments", () => {
  assert.deepEqual(
    splitRawArgumentString('--write --model "glm-5.2[1m]" --key-env ZAI_API_KEY'),
    ["--write", "--model", "glm-5.2[1m]", "--key-env", "ZAI_API_KEY"]
  );
});


