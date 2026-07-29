# Installing site-craft

Requires Node 18+. Nothing else is mandatory — the browser pass is optional and says so when it's missing.

## 1 · Verify it before you install it

From inside `skills/site-craft/`:

```bash
node tests/test_all.mjs
```

You should see `100/100 assertions pass — ALL GREEN`. Then see the tool do the thing it claims to do:

```bash
node scripts/scaudit.mjs examples/before.html    # GATE RED — 20 failures
node scripts/scaudit.mjs examples/after.html     # GATE GREEN — 27/31 pass, 0 failures
                                                 # (the other 4 are the browser pass — see step 3)
```

Open the two HTML files side by side. Same product, same claims, same word count.

## 2 · Install as a skill

Pick one:

**Global** — available in every project:

```bash
cp -R skills/site-craft ~/.claude/skills/
```

**Per project** — travels with the repo, so the whole team gets it:

```bash
mkdir -p .claude/skills && cp -R skills/site-craft .claude/skills/
```

**As a plugin** — copy both directories into your plugin root:

```bash
cp -R skills commands /path/to/your-plugin/
```

Restart the session, then:

```
/site-craft build a landing page for <product>
/site-craft audit ./src
```

Other agent tools (Cursor, Codex, Windsurf) read `SKILL.md` directly — point the agent at it, or paste its contents into your rules file. The linter and the reference files are plain Node and plain CSS; nothing is Claude-specific except the skill frontmatter.

## 3 · Enable the browser pass

Four of the 31 rules need a real browser: horizontal scroll at 390px, primary CTA above the fold, nothing left invisible under reduced motion, and console cleanliness. None of them is visible in a desktop screenshot, and they are the ones most likely to be broken in production.

```bash
npm i -D playwright
npx playwright install chromium
```

Then:

```bash
node scripts/scaudit.mjs ./src --live http://localhost:3000
node tests/test_all.mjs --live                   # 105 assertions
```

Without Playwright the four rules report `SKIP` with the reason. They never report a silent pass.

## 4 · Wire it into CI

`scaudit` exits `0` when clean and `1` on any failure.

```json
{
  "scripts": {
    "design:gate": "node .claude/skills/site-craft/scripts/scaudit.mjs ./src ./app"
  }
}
```

```yaml
- run: npm run design:gate
```

Add `--strict` to fail on warnings and skips as well — worth doing once the gate is green, so a rule that silently stops applying gets noticed.

## 5 · If a rule is wrong for your project

It happens: the hue counter under-reports palettes defined in `oklch()`, and a deliberately flat editorial design will fail the ambient-layer rule on purpose. Say which line and why, in the delivery. A documented exception is an answer. Deleting the rule quietly is not.

## Uninstall

```bash
rm -rf ~/.claude/skills/site-craft        # or .claude/skills/site-craft
```

MIT licensed — see `skills/site-craft/LICENSE`.
