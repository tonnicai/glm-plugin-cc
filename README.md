# GLM Plugin for Claude Code

An unofficial Claude Code plugin for using Z.ai GLM Coding Plan models, especially `glm-5.2[1m]`, from the same kind of command surface that `openai/codex-plugin-cc` provides for Codex.

This is an unofficial local fork/port of [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc), but it is not a background Codex app-server clone. Z.ai's Coding Plan integrates with Claude Code through an Anthropic-compatible endpoint, so this plugin configures Claude Code to route its active model to GLM and adds `/glm:*` commands for setup, review, diagnosis, and rescue workflows.

## What It Provides

- `/glm:setup` configures Claude Code settings for Z.ai Coding Plan.
- `/glm:status` shows whether Claude Code is currently pointed at GLM.
- `/glm:doctor` checks the same settings and can optionally send a tiny live test request.
- `/glm:review` performs a review-only pass over local git changes using the active GLM-backed Claude Code model.
- `/glm:adversarial-review` runs a stricter review prompt for hidden regressions and edge cases.
- `/glm:rescue` delegates substantial debugging or implementation work to the `glm-rescue` subagent.

## Endpoint Model

Z.ai exposes more than one OpenAI-compatible surface. For a GLM Coding Plan subscription in Claude Code, use the Anthropic-compatible endpoint:

```text
https://api.z.ai/api/anthropic
```

The normal Z.ai OpenAI-compatible endpoint is:

```text
https://api.z.ai/api/paas/v4
```

The Coding Plan OpenAI-compatible endpoint is:

```text
https://api.z.ai/api/coding/paas/v4
```

This plugin targets Claude Code, so it configures `ANTHROPIC_BASE_URL` to the Anthropic-compatible Coding Plan endpoint.

## Install From GitHub

```bash
claude plugin marketplace add https://github.com/tonnicai/glm-plugin-cc
claude plugin install glm@z-ai-glm
```

The GitHub install path requires this repository to be public, or the installing user must have access to the private repository and a Git credential setup that Claude Code can use.

For local development from a clone of this repository:

```bash
claude plugin marketplace add .
claude plugin install glm@z-ai-glm
```

## Configure Claude Code For GLM

Set your Z.ai Coding Plan key in the shell that launches Claude Code, then run the setup command inside Claude Code. If Claude Code is already running from another launcher, restart it from that shell or use `--key <token>` instead:

```bash
export ZAI_API_KEY="zai-..."
```

```text
/glm:setup --write --key-env ZAI_API_KEY
```

On Windows PowerShell:

```powershell
$env:ZAI_API_KEY = "zai-..."
```

Then in Claude Code:

```text
/glm:setup --write --key-env ZAI_API_KEY
```

The setup helper writes these Claude Code settings:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<your token>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.2[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.2[1m]",
    "ANTHROPIC_CUSTOM_MODEL_OPTION": "glm-5.2[1m]",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "1000000"
  }
}
```

Restart Claude Code after changing endpoint or model settings. For harder coding tasks, use Claude Code's `/effort max` command after restart; Z.ai maps `xhigh`, `max`, and `ultracode` to GLM-5.2 max effort.

## Commands

### `/glm:setup`

Preview or apply the recommended Claude Code settings.

```text
/glm:setup
/glm:setup --write --key-env ZAI_API_KEY
/glm:setup --write --model glm-5.2
```

By default it edits user settings at `~/.claude/settings.json`. Use `--scope project` or `--scope local` to write project-level Claude Code settings instead.

### `/glm:status`

Shows the configured endpoint, model aliases, compact window, and whether an auth token is present. Tokens are redacted.

```text
/glm:status
```

### `/glm:doctor`

Runs the same status checks. With `--live`, sends a tiny test request to Z.ai.

```text
/glm:doctor --live
```

### `/glm:review`

Reviews local git state without editing files.

```text
/glm:review
/glm:review --base main --scope branch
/glm:review focus on auth and migration risk
```

### `/glm:adversarial-review`

Runs a stricter, skeptical review-only pass.

```text
/glm:adversarial-review --base main
```

### `/glm:rescue`

Delegates a substantial debugging or implementation task to the GLM rescue subagent.

```text
/glm:rescue fix the failing upload retry test
```

## Security Notes

- This plugin has no install-time scripts, hooks, or runtime dependencies.
- `/glm:doctor --live` sends a tiny test request only to `https://api.z.ai/api/anthropic`; it refuses to send a bearer token if `ANTHROPIC_BASE_URL` points anywhere else.
- Prefer `/glm:setup --write --key-env ZAI_API_KEY` over `/glm:setup --write --key <token>` so the token is not typed into the slash-command transcript.
- Avoid `--scope project` or `--scope local` when storing real tokens unless the relevant `.claude` settings file is ignored and never committed.
- `/glm:rescue` is intentionally edit-capable and can run shell commands through Claude Code. Use it only in repositories where you are comfortable granting a coding agent normal implementation permissions.
## Limitations

- `openai/codex-plugin-cc` talks to Codex's app-server runtime and can manage Codex background jobs. Z.ai's Claude Code integration uses Claude Code's model routing instead, so this plugin does not provide an independent GLM job server.
- Review and rescue commands use the active Claude Code runtime. Run `/glm:setup --write ...` and restart Claude Code before expecting them to execute on GLM.
- The helper never embeds a key in this repository. It writes a token only when the user explicitly passes `--key` or `--key-env` at setup time.

## Development

```bash
npm test
npm run validate
```

## License

Apache-2.0. This fork keeps attribution to `openai/codex-plugin-cc` in `NOTICE`.
