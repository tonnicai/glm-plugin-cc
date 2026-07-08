# GLM Plugin for Claude Code

Delegate **code review** and **coding tasks** to [Z.ai GLM](https://z.ai) from inside Claude Code — while Claude Code itself keeps driving on **your Anthropic model**.

This is a delegation-style plugin: GLM is a *reviewer / task runner* that Claude hands work to. It does **not** reroute Claude Code's own model, and it does **not** touch your `~/.claude` configuration.

It is a rebrand of [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc): it still uses the `codex` binary as the underlying harness (`codex app-server`), but points that harness at the GLM API and runs it under a fully isolated home directory.

## How it stays out of your way

- **`~/.claude` is never modified.** The plugin only installs commands, an agent, hooks, and skills under the plugin root.
- **`ANTHROPIC_BASE_URL` is never set.** Claude Code keeps talking to Anthropic. GLM is reached only through the delegated `codex app-server` process.
- **Isolated harness home.** The bundled `codex` harness is spawned with `CODEX_HOME=~/.codex-glm` (override with `GLM_CODEX_HOME`), so GLM's config, auth, and threads live in `~/.codex-glm` — never in your real `~/.codex`.
- **GLM runs as a delegated reviewer only.** Your main Claude thread decides what to hand off; GLM reviews or runs the delegated task and reports back.

## Get it working (end to end)

You need four things: a Z.ai key, the `codex` harness binary, the GLM config, and the key exported to your environment. Then install the plugin.

### 1. Get a Z.ai API key

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

This points the isolated harness at Z.ai GLM. A ready-to-copy version lives at [`config/codex-glm.config.toml`](config/codex-glm.config.toml) — copy it to `~/.codex-glm/config.toml`:

```toml
model = "glm-5.2"
model_provider = "zai"

[model_providers.zai]
name = "Z.ai GLM Coding Plan"
base_url = "https://api.z.ai/api/coding/paas/v4"
env_key = "ZAI_API_KEY"
wire_api = "responses"
requires_openai_auth = false
```

The `env_key = "ZAI_API_KEY"` line tells the harness to read your key from the `ZAI_API_KEY` environment variable — so the key lives only in your environment, never in this file or the repo.

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

## Use

- `/glm:review` — hand the current diff to GLM for review. Claude stays on your Anthropic model and relays GLM's findings.
- `/glm:adversarial-review` — a stricter, focused review pass.
- `/glm:rescue` (agent `glm:glm-rescue`) — delegate a substantial coding/diagnosis task to GLM.
- `/glm:status`, `/glm:result`, `/glm:cancel` — manage background GLM jobs.
- `/glm:setup` — check that the harness and auth are ready.

Because it shares the same harness design as the Codex plugin, you can run the two side by side: `/codex:review` delegates to Codex/GPT, `/glm:review` delegates to GLM, and Claude Code keeps orchestrating both on your Anthropic model.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE). This is a derivative work of `openai/codex-plugin-cc`.
