---
description: Show the current Claude Code GLM Coding Plan configuration
argument-hint: '[--scope user|project|local] [--json]'
allowed-tools: Bash(node:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/glm-companion.mjs" status $ARGUMENTS
```

Output rules:
- Present the command output to the user exactly as-is.
- Do not reveal or ask for API keys.
