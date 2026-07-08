# GLM & Ollama Cloud Plugins for Claude Code

Delegate **code review** and **coding tasks** to [Z.ai GLM](https://z.ai) or [Ollama Cloud](https://ollama.com/cloud) models from inside Claude Code — while Claude Code itself keeps driving on **your Anthropic model**.

This marketplace ships two delegation-style plugins built on the same isolated-harness design (each is a rebrand of [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc), driving the `codex` binary as its engine):

| Plugin | Commands | Backend | Harness home | Key env var |
|---|---|---|---|---|
| `glm` | `/glm:*` | Z.ai GLM Coding Plan (`api.z.ai`) | `~/.codex-glm` | `ZAI_API_KEY` |
| `ollama` | `/ollama:*` | Ollama Cloud (`ollama.com`) — GLM-5.2, Qwen3-Coder, DeepSeek, Kimi, gpt-oss | `~/.codex-ollama` | `OLLAMA_API_KEY` |

Neither reroutes Claude Code's own model, and neither touches your `~/.claude` configuration. They are fully namespace-isolated (separate env vars, broker sockets, and harness homes), so you can install both — plus OpenAI's original `codex` plugin — side by side.

> **Backend status (verified live, 2026-07-07):**
> - ✅ **Ollama Cloud works end-to-end** — codex ≥ 0.84 only speaks the OpenAI **Responses API**, and Ollama Cloud supports it natively (GLM-5.2 verified responding through the full chain).
> - ❌ **Z.ai direct does NOT currently work** — `POST https://api.z.ai/api/coding/paas/v4/responses` returns **404** (no Responses endpoint; their API is chat-completions, which codex removed). No client-side setting can bridge this.
> - **To run the `glm` plugin today**, use GLM-5.2 on Ollama Cloud via [`config/codex-glm-via-ollama-cloud.config.toml`](config/codex-glm-via-ollama-cloud.config.toml) as your `~/.codex-glm/config.toml`. The direct Z.ai config ([`config/codex-glm.config.toml`](config/codex-glm.config.toml)) is kept for the day Z.ai ships Responses support.

## How it stays out of your way

- **`~/.claude` is never modified.** The plugin only installs commands, an agent, hooks, and skills under the plugin root.
- **`ANTHROPIC_BASE_URL` is never set.** Claude Code keeps talking to Anthropic. GLM is reached only through the delegated `codex app-server` process.
- **Isolated harness home.** The bundled `codex` harness is spawned with `CODEX_HOME=~/.codex-glm` (override with `GLM_CODEX_HOME`), so GLM's config, auth, and threads live in `~/.codex-glm` — never in your real `~/.codex`.
- **GLM runs as a delegated reviewer only.** Your main Claude thread decides what to hand off; GLM reviews or runs the delegated task and reports back.

## Get it working (end to end)

You need four things: a Z.ai key, the `codex` harness binary, the GLM config, and the key exported to your environment. Then install the plugin.

### 1. Get an API key

> **Which key?** Until Z.ai ships a Responses endpoint, the working GLM backend is **Ollama Cloud** — get a key at <https://ollama.com/settings/keys> and you'll use `OLLAMA_API_KEY` below. The Z.ai steps are kept for when their direct backend becomes possible:

1. Sign up for the **GLM Coding Plan**: <https://z.ai/subscribe> (or the pay-as-you-go platform at <https://z.ai/model-api>).
2. Open the **API Keys** page: <https://z.ai/manage-apikey/apikey-list>.
3. Click **Create an API Key** and copy it. (If you're on pay-as-you-go, add funds first at <https://z.ai/manage-apikey/billing>.)

Keep the key somewhere safe — you'll paste it into an environment variable below, never into the repo.

### 2. Install the `codex` harness binary

This is the runtime the plugin drives. It does **not** require an OpenAI account — it's just the engine, pointed at GLM.

```bash
npm install -g @openai/codex
```

### 3. Create `~/.codex-glm/config.toml`

Use the **working** backend — GLM-5.2 served by Ollama Cloud. Copy [`config/codex-glm-via-ollama-cloud.config.toml`](config/codex-glm-via-ollama-cloud.config.toml) to `~/.codex-glm/config.toml`:

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

The `env_key` line tells the harness to read your key from that environment variable — the key lives only in your environment, never in this file or the repo.

(The direct Z.ai variant, [`config/codex-glm.config.toml`](config/codex-glm.config.toml), returns **404** today — Z.ai has no Responses endpoint. Swap to it only if Z.ai announces Responses API support.)

### 4. Add your key to the environment

The plugin spawns the harness inside Claude Code's own process, so the key must be a **persistent** environment variable that exists **before Claude Code starts**. Setting it in a one-off terminal is not enough — set it at the user/system level, then **restart Claude Code** (and your terminal).

**Windows (PowerShell):**

```powershell
setx ZAI_API_KEY "your-zai-api-key"
```

`setx` writes it permanently for future processes (it does **not** affect the shell you run it in). Close and reopen your terminal and Claude Code afterward. Alternatively: *Settings → System → About → Advanced system settings → Environment Variables → New…*.

**macOS / Linux:**

```bash
echo 'export ZAI_API_KEY="your-zai-api-key"' >> ~/.zshrc   # or ~/.bashrc
source ~/.zshrc
```

Then restart the terminal you launch Claude Code from.

### 5. Install the plugin in Claude Code

```text
/plugin marketplace add tonnicai/glm-plugin-cc
/plugin install glm@z-ai-glm
/reload-plugins
```

### 6. Verify

Run `/glm:setup` — it checks that the `codex` binary, the GLM config, and your key are all wired up. If it reports an auth problem, `ZAI_API_KEY` almost certainly isn't visible to Claude Code yet (recheck step 4 and restart Claude Code). Then try `/glm:review`.

## The `ollama` plugin (Ollama Cloud)

Same delegation design, pointed at [Ollama Cloud](https://ollama.com/cloud) — which hosts GLM-5.2 (1M context), Qwen3-Coder, DeepSeek-V3.1, Kimi-K2, gpt-oss and more, and natively supports the Responses API that current codex requires.

1. **Get an Ollama API key**: create one at <https://ollama.com/settings/keys> (Ollama Cloud account required).
2. **Create `~/.codex-ollama/config.toml`** — copy [`config/codex-ollama.config.toml`](config/codex-ollama.config.toml):

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

   Swap `model` for any cloud model you prefer (`qwen3-coder`, `deepseek-v3.1`, `kimi-k2`, `gpt-oss:120b`) — on the direct cloud API model names carry **no** `:cloud` suffix.

   **About context:** clients on Ollama's *native* API (e.g. n8n) must pass `num_ctx` per request to unlock the full window. Codex speaks the OpenAI wire, which has no such field — instead, Ollama Cloud runs cloud models at their full advertised window server-side, and `model_context_window = 1000000` tells codex the window is 1M so it budgets correctly and doesn't compact the conversation prematurely. Scale it down if you pick a smaller-window model.
3. **Set the key** (persistent, before Claude Code starts — same rules as step 4 above): Windows `setx OLLAMA_API_KEY "your-key"`, macOS/Linux `export OLLAMA_API_KEY=...` in your shell profile. Restart Claude Code.
4. **Install**:

   ```text
   /plugin install ollama@z-ai-glm
   /reload-plugins
   ```

5. **Verify** with `/ollama:setup`, then try `/ollama:review`.

## Use

- `/glm:review` / `/ollama:review` — hand the current diff to the delegate for review. Claude stays on your Anthropic model and relays the findings.
- `/glm:adversarial-review` / `/ollama:adversarial-review` — a stricter, focused review pass.
- `/glm:rescue` / `/ollama:rescue` (agents `glm:glm-rescue`, `ollama:ollama-rescue`) — delegate a substantial coding/diagnosis task.
- `/glm:status`, `/glm:result`, `/glm:cancel` — manage background jobs (same for `/ollama:*`).
- `/glm:setup` / `/ollama:setup` — check that the harness and auth are ready.

All three plugins (codex, glm, ollama) share the same harness design and are namespace-isolated, so `/codex:review`, `/glm:review`, and `/ollama:review` can coexist in one session — Claude Code keeps orchestrating on your Anthropic model.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). This is a derivative work of `openai/codex-plugin-cc`.
