# GLM Plugin for Claude Code

Delegate **code review** and **coding tasks** to [Z.ai GLM](https://z.ai) from inside Claude Code — while Claude Code itself keeps driving on **your Anthropic model**.

This is a delegation-style plugin: GLM is a *reviewer / task runner* that Claude hands work to. It does **not** reroute Claude Code's own model, and it does **not** touch your `~/.claude` configuration.

It is a rebrand of [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc): it still uses the `codex` binary as the underlying harness (`codex app-server`), but points that harness at the GLM API and runs it under a fully isolated home directory.

## How it stays out of your way

- **`~/.claude` is never modified.** The plugin only installs commands, an agent, hooks, and skills under the plugin root.
- **`ANTHROPIC_BASE_URL` is never set.** Claude Code keeps talking to Anthropic. GLM is reached only through the delegated `codex app-server` process.
- **Isolated harness home.** The bundled `codex` harness is spawned with `CODEX_HOME=~/.codex-glm` (override with `GLM_CODEX_HOME`), so GLM's config, auth, and threads live in `~/.codex-glm` — never in your real `~/.codex`.
- **GLM runs as a delegated reviewer only.** Your main Claude thread decides what to hand off; GLM reviews or runs the delegated task and reports back.

## Install

```text
/plugin marketplace add tonnicai/glm-plugin-cc
/plugin install glm@z-ai-glm
```

Then reload plugins (or restart Claude Code):

```text
/reload-plugins
```

## Configure the GLM harness

The plugin drives the `codex` binary as its harness. You need the binary installed and a GLM-pointed config in the isolated home.

1. **Install the `codex` binary** (the harness — not an OpenAI account):

   ```bash
   npm install -g @openai/codex
   ```

2. **Create `~/.codex-glm/config.toml`** pointing the harness at Z.ai GLM. A ready-to-copy version lives at [`config/codex-glm.config.toml`](config/codex-glm.config.toml):

   ```toml
   model = "glm-5.2"
   model_provider = "zai"

   [model_providers.zai]
   name = "Z.ai GLM Coding Plan"
   base_url = "https://api.z.ai/api/coding/paas/v4"
   env_key = "ZAI_API_KEY"
   wire_api = "chat"
   requires_openai_auth = false
   ```

3. **Set your Z.ai API key** in your shell profile so the harness can authenticate:

   ```bash
   export ZAI_API_KEY="your-zai-api-key"
   ```

   (Get the key from your Z.ai coding-plan dashboard. It is read from the environment via `env_key = "ZAI_API_KEY"` — the plugin never stores it.)

## Use

- `/glm:review` — hand the current diff to GLM for review. Claude stays on your Anthropic model and relays GLM's findings.
- `/glm:adversarial-review` — a stricter, focused review pass.
- `/glm:rescue` (agent `glm:glm-rescue`) — delegate a substantial coding/diagnosis task to GLM.
- `/glm:status`, `/glm:result`, `/glm:cancel` — manage background GLM jobs.
- `/glm:setup` — check that the harness and auth are ready.

Because it shares the same harness design as the Codex plugin, you can run the two side by side: `/codex:review` delegates to Codex/GPT, `/glm:review` delegates to GLM, and Claude Code keeps orchestrating both on your Anthropic model.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). This is a derivative work of `openai/codex-plugin-cc`.
