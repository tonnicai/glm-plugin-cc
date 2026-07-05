---
description: Diagnose GLM Coding Plan settings and optionally send a tiny live test request
argument-hint: '[--live] [--model glm-5.2[1m]] [--scope user|project|local]'
allowed-tools: Bash(node:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/glm-companion.mjs" doctor $ARGUMENTS
```

Output rules:
- Present the command output to the user exactly as-is.
- If `--live` was used, mention that it may consume a tiny amount of Z.ai Coding Plan quota only if the helper output does not already make that clear.
- Do not reveal or ask for API keys.
