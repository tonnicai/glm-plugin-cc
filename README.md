# GLM & Ollama Cloud Plugins for Claude Code

Delegate **code review** and **coding tasks** to **GLM-5.2** and other [Ollama Cloud](https://ollama.com/cloud) models from inside Claude Code — while Claude Code itself keeps driving on **your Anthropic model**.

These are delegation-style plugins: the cloud model is a *reviewer / task runner* that Claude hands work to. They do **not** reroute Claude Code's own model, and they do **not** touch your `~/.claude` configuration. Both are rebrands of [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc), driving the `codex` binary as their engine under fully isolated home directories.

| Plugin | Commands | Default model | Harness home | Key env var |
|---|---|---|---|---|
| `glm` | `/glm:*` | GLM-5.2 (1M context) | `~/.codex-glm` | `OLLAMA_API_KEY` |
| `ollama` | `/ollama:*` | GLM-5.2 — swap for Qwen3-Coder, DeepSeek-V3.1, Kimi-K2, gpt-oss, ... | `~/.codex-ollama` | `OLLAMA_API_KEY` |

Why two plugins? They are fully namespace-isolated (separate env vars, broker sockets, harness homes), so you can pin `glm` to GLM-5.2 and point `ollama` at a different model — and run both in one session, alongside OpenAI's original `codex` plugin. If you only want GLM-5.2, install just `glm`.

**Verified end-to-end** (2026-07-07): GLM-5.2 responding through the full chain — plugin → `codex app-server` → `ollama.com/v1` (OpenAI Responses API) → GLM-5.2.

## How it stays out of your way

- **`~/.claude` is never modified.** The plugins only install commands, agents, hooks, and skills under their plugin roots.
- **`ANTHROPIC_BASE_URL` is never set.** Claude Code keeps talking to Anthropic. The delegate model is reached only through the spawned `codex app-server` process.
- **Isolated harness homes.** The `codex` harness is spawned with `CODEX_HOME=~/.codex-glm` / `~/.codex-ollama` (overrides: `GLM_CODEX_HOME` / `OLLAMA_CODEX_HOME`), so delegate config, auth, and threads never touch your real `~/.codex`.
- **The delegate only reviews or runs handed-off tasks.** Your main Claude thread decides what to delegate.

## Get it working (end to end)

### 1. Get an Ollama API key

Create one at <https://ollama.com/settings/keys> (Ollama account required; cloud usage has a free tier with limits, paid plans beyond). The key goes into an environment variable below — never into this repo.

### 2. Install the `codex` harness binary

This is the engine the plugins drive. It does **not** require an OpenAI account.

```bash
npm install -g @openai/codex
```

### 3. Create the harness config

For the `glm` plugin, copy [`config/codex-glm.config.toml`](config/codex-glm.config.toml) to `~/.codex-glm/config.toml`:

```toml
model = "glm-5.2"
model_context_window = 1000000
model_provider = "ollama-cloud"

[model_providers.ollama-cloud]
name = "Ollama Cloud"
base_url = "https://ollama.com/v1"
env_key = "OLLAMA_API_KEY"
wire_api = "responses"
requires_openai_auth = false
```

For the `ollama` plugin, copy [`config/codex-ollama.config.toml`](config/codex-ollama.config.toml) to `~/.codex-ollama/config.toml` (same content; swap `model` for any cloud model — names carry **no** `:cloud` suffix on the direct API — and scale `model_context_window` to that model's window).

**About the 1M context:** clients on Ollama's *native* API (e.g. n8n) must pass `num_ctx` per request to unlock the full window. Codex speaks the OpenAI wire, which has no such field — Ollama Cloud runs cloud models at their full advertised window server-side, and `model_context_window = 1000000` tells codex the window is 1M so it budgets correctly and doesn't compact the conversation prematurely.

### 4. Add your key to the environment

The plugins spawn the harness inside Claude Code's own process, so the key must be a **persistent** environment variable that exists **before Claude Code starts**. Set it, then restart Claude Code (and your terminal).

**Windows (PowerShell):**

```powershell
setx OLLAMA_API_KEY "your-ollama-api-key"
```

**macOS / Linux:**

```bash
echo 'export OLLAMA_API_KEY="your-ollama-api-key"' >> ~/.zshrc   # or ~/.bashrc
source ~/.zshrc
```

### 5. Install the plugins in Claude Code

```text
/plugin marketplace add tonnicai/glm-plugin-cc
/plugin install glm@tonnicai
/plugin install ollama@tonnicai
/reload-plugins
```

### 6. Verify

Run `/glm:setup` (or `/ollama:setup`) — it checks the `codex` binary, the config, and your key together. If it reports an auth problem, `OLLAMA_API_KEY` isn't visible to Claude Code yet (recheck step 4 and restart). Then try `/glm:review`.

You can also smoke-test without installing anything, straight from a terminal:

```bash
CODEX_HOME=~/.codex-glm codex exec --skip-git-repo-check "Reply with exactly: OK"
```

## Use

- `/glm:review` / `/ollama:review` — hand the current diff to the delegate for review. Claude stays on your Anthropic model and relays the findings.
- `/glm:adversarial-review` / `/ollama:adversarial-review` — a stricter, focused review pass.
- `/glm:rescue` / `/ollama:rescue` (agents `glm:glm-rescue`, `ollama:ollama-rescue`) — delegate a substantial coding/diagnosis task.
- `/glm:status`, `/glm:result`, `/glm:cancel` — manage background jobs (same for `/ollama:*`).
- `/glm:setup` / `/ollama:setup` — check that the harness and auth are ready.

## Why not Z.ai's API directly?

codex ≥ 0.84 only speaks the OpenAI **Responses API**; Z.ai's coding endpoint only offers chat-completions (`POST .../responses` → 404, verified live 2026-07-07), so a direct Z.ai backend cannot work with the codex engine. If Z.ai ships a Responses endpoint, a provider block pointing at their API can be added back in one small config change.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). Derivative work of `openai/codex-plugin-cc`.
