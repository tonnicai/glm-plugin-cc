---
description: Review local git changes using the active GLM Claude Code model
argument-hint: '[--base <ref>] [--scope auto|working-tree|branch] [focus text]'
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

You are running `/glm:review`. Treat the active Claude Code model as GLM; do not call external model APIs yourself.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not edit files, apply patches, run formatters, or claim you are about to fix anything.
- Return a code-review report only.

Target selection:
- Parse `--base <ref>` and `--scope <auto|working-tree|branch>` from the raw arguments.
- If `--scope branch` or `--base <ref>` is present, review `git diff <base>...HEAD`, using the provided base or the repository default base when you can determine it.
- If `--scope working-tree` is present, review staged, unstaged, and untracked work.
- If scope is omitted or `auto`, inspect both the working tree and branch diff, then choose the review target that best reflects the user's current local work.
- Treat remaining positional text as optional review focus.

Collection rules:
- Start with `git status --short --untracked-files=all`.
- Use `git diff --stat`, `git diff --cached --stat`, and `git diff --name-only` variants before reading large diffs.
- For each relevant changed file, inspect enough of the diff and surrounding code to ground findings in concrete file/line references.
- If there is nothing to review, say that clearly and stop.

Output format:
- Findings first, ordered by severity.
- Each finding should include a severity label, a concise title, and a file/line reference when possible.
- After findings, include open questions or assumptions only if they affect confidence.
- End with a short residual-risk or test-gap note.
- If no issues are found, say that clearly and mention any test gaps or residual risk.
