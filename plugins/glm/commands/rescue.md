---
description: Delegate debugging, implementation, or follow-up work to the GLM rescue subagent
argument-hint: '[--background|--wait] [what GLM should investigate or fix]'
allowed-tools: Agent, AskUserQuestion
---

Invoke the `glm:glm-rescue` subagent through the `Agent` tool, forwarding the raw user request as the prompt.

Raw user request:
`$ARGUMENTS`

Rules:
- If the user did not supply a request, ask what GLM should investigate or fix.
- If the request includes `--background`, run the subagent in the background if the Agent tool supports background execution in this Claude Code build.
- If the request includes `--wait`, run the subagent in the foreground.
- Strip `--background` and `--wait` from the natural-language task text before forwarding.
- Do not call the setup, status, review, or doctor commands from here.
- Return the subagent's final response to the user.
- Do not paraphrase the subagent result unless the tool returns metadata that needs a one-line explanation.
