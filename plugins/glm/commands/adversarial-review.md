---
description: Run a stricter GLM review that actively looks for edge cases and hidden regressions
argument-hint: '[--base <ref>] [--scope auto|working-tree|branch] [focus text]'
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

You are running `/glm:adversarial-review`. Treat the active Claude Code model as GLM; do not call external model APIs yourself.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not edit files, apply patches, run formatters, or claim you are about to fix anything.
- Be skeptical, but stay evidence-based and avoid speculative noise.

Review posture:
- Look for correctness bugs, data loss, auth/security footguns, race conditions, lifecycle leaks, platform-specific breakage, bad defaults, migrations, and missing tests.
- Prefer one or two high-signal findings over a long list of weak guesses.
- If the user supplied focus text, use it as an extra lens, not as a reason to ignore the rest of the diff.

Target and collection rules:
- Parse `--base <ref>` and `--scope <auto|working-tree|branch>` from the raw arguments.
- Start with `git status --short --untracked-files=all`.
- Use `git diff --stat`, `git diff --cached --stat`, and `git diff --name-only` variants before reading large diffs.
- For branch reviews, use `git diff <base>...HEAD`.
- Inspect surrounding code before writing any finding.
- If there is nothing to review, say that clearly and stop.

Output format:
- Findings first, ordered by severity.
- Each finding should include severity, impact, and a concrete file/line reference when possible.
- Include open questions or assumptions only when they materially affect confidence.
- End with a short residual-risk or test-gap note.
- If no issues are found, say that clearly and mention any test gaps or residual risk.
