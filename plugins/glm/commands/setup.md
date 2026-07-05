---
description: Configure Claude Code to use Z.ai GLM Coding Plan models
argument-hint: '[--write] [--key-env ZAI_API_KEY|--key <token>] [--model glm-5.2[1m]] [--scope user|project|local]'
allowed-tools: Bash(node:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/glm-companion.mjs" setup $ARGUMENTS
```

Output rules:
- Present the command output to the user exactly as-is.
- If the user did not pass `--write`, tell them no files were changed only if the helper output does not already say so.
- If the helper reports that a token is missing, recommend `--key-env ZAI_API_KEY` before `--key <token>`.
- Do not ask the user to paste their API key into chat unless they explicitly choose that route.
- Remind the user to restart Claude Code after applying endpoint/model settings.
