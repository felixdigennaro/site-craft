---
description: Build or fix a website at shipped-product quality, closing with the executable anti-slop gate
---

Invoke the `site-craft` skill and follow it in order. Do not skip the gate.

**Arguments:** $ARGUMENTS

## Mode

- If the argument names a path, a URL, or an existing site → **AUDIT** mode. Start from `references/audit.md`: look before reading, map the existing system, score against the gate, then rank fixes by payoff-per-risk. Do not rewrite from scratch.
- Otherwise → **BUILD** mode. Start at step 1 of `SKILL.md`.

## Non-negotiables

1. **Copy before polish.** Write the real words in plain text before building the shell.
2. **Direction lock before code.** One sentence naming ground, accent, type pair, and motion budget. If you can't write it, you don't have a direction yet.
3. **The gate is blocking.** Close by running it, and paste the result:

```bash
node scripts/scaudit.mjs <target>
node scripts/scaudit.mjs <target> --live <url-or-file>
```

Report the pass/fail table as it came out of the tool, not a paraphrase. If a line is red and you're choosing not to fix it, name the line and the reason.

4. **Verify by looking.** Render the page at 390px and 1440px, check the console, toggle reduced motion, tab through for the focus ring. Then say what you checked and what you did not.

If the project already has its own design system or brand skill, that system wins on tokens — palette, type, voice. site-craft governs method and owns the exit gate.
