# site-craft

**A design gate that actually runs.**

Not a style guide. Style guides are free and everywhere, and an agent that has read one still ships a page with a flat background, a `0 4px 6px` shadow, "Unlock the power of seamless collaboration" in the hero, and no `prefers-reduced-motion` block.

This is the method *plus* a linter that refuses to call the page finished until 31 specific things are true.

Works as a Claude Code / Claude Agent skill. The linter runs standalone in any project — vanilla HTML, Tailwind, React, Vue, Svelte, Astro.

---

## Try it in 30 seconds

```bash
git clone https://github.com/felixdigennaro/site-craft.git
cd site-craft/skills/site-craft

node tests/test_all.mjs                        # 146 assertions — ALL GREEN
node scripts/scaudit.mjs examples/before.html  # GATE RED  — 20 failures
node scripts/scaudit.mjs examples/after.html   # GATE GREEN — 27/31, 0 failures
```

No dependencies. Node 18+.

Then open `examples/before.html` and `examples/after.html` side by side. **Same product, same claims, same word count** — one reads as generated, the other doesn't. The audit reports for both are committed in `examples/out/` if you'd rather read the result than run anything.

## Keep your colours, change everything else

Already have a site? Extract its real palette and get four different starting templates from it — same colour scheme, genuinely different structure.

```bash
node scripts/scextract.mjs /path/to/src --live http://localhost:3000
node scripts/scvariants.mjs site-craft.tokens.json -o ./variants --name "Acme"
open variants/index.html
```

Committed example: **[`skills/site-craft/examples/variants/index.html`](skills/site-craft/examples/variants/index.html)** — all four side by side, no install needed.

| | Ambient | Editorial | Terminal | Soft |
|---|---|---|---|---|
| Surfaces | glass | flat | gridded panels | opaque cards |
| Depth | glow | hairlines | borders | stacked neutral shadows |
| Radius | 16px | 4px | 2px | 24px |
| Fits | product, fintech, AI | writing, research | dashboards, dev tools | consumer, health |

The extractor assigns **roles**, not a colour list — ground by painted area, ink stops placed by contrast at least 1.25× apart, accent from the most chromatic colour on links and buttons — then reduces to one accent family plus state colours and **prints every hue family it dropped**. Override a wrong guess with `--accent <hex>`.

All four directions clear the gate in both light and dark, and the test suite asserts it.

---

## Point it at your own site

```bash
node scripts/scaudit.mjs /path/to/your/src                          # static pass
node scripts/scaudit.mjs /path/to/your/src --live http://localhost:3000   # + browser pass
node scripts/scaudit.mjs /path/to/your/dist --json                  # for CI
```

Exit code is `0` when clean, `1` on any failure.

The four browser rules need Playwright. Without it they report `SKIP` **with the reason** — never a silent pass:

```bash
npm i -D playwright && npx playwright install chromium
node tests/test_all.mjs --live                 # 151 assertions
```

---

## What it checks

31 rules. Every one is proven twice in the test suite: it must **fire** on a violating fixture and stay **quiet** on a clean one.

| Group | Rules |
|---|---|
| **Background & depth** | ambient layers present · no framework-default shadows · ambient shadows have negative spread · glass uses `saturate()` not blur alone · halo containers clip horizontally |
| **Colour** | one accent hue family · four ink stops, tokenised |
| **Typography** | fluid `clamp()` display sizes · `text-wrap: balance/pretty` · measure capped in `ch` · tabular figures on numbers |
| **Motion** | one easing curve · reveal fires once · `prefers-reduced-motion` present · reduced motion resets hidden resting states · rAF pauses in background tabs · no scale-on-hover |
| **Copy** | no banned phrasing · concrete numbers present · CTA labels name outcomes · H2s are claims not labels · no emoji in UI |
| **Craft** | explicit `:focus-visible` · ambient layers inert · custom favicon · title + meta description · real empty/error states |
| **Browser pass** | no horizontal scroll at 390px · primary CTA above the fold at 1280×720 · nothing invisible under reduced motion · console clean |

The browser rules are the ones a screenshot never catches. On the bundled `before.html` they find a **558px-wide document inside a 390px viewport** and **two text elements left permanently invisible under reduced motion** — neither visible in a desktop review.

---

## Install it as a skill

```bash
cp -R skills/site-craft ~/.claude/skills/          # global
# or
mkdir -p .claude/skills && cp -R skills/site-craft .claude/skills/   # per project
```

Then:

```
/site-craft build a landing page for <product>
/site-craft audit ./src
/site-craft reskin ./src — keep our colours, show me some options
```

BUILD mode runs brief → direction lock → tokens → ambient → **copy** → depth → motion → gate → verify. AUDIT mode diagnoses first and ranks fixes by payoff-per-risk, because most sites that feel machine-made are fixed by the first three changes — restructuring them would be wasted work. RESKIN mode extracts the existing palette and offers the four directions to choose from.

Other agent tools (Cursor, Codex, Windsurf) read `skills/site-craft/SKILL.md` directly. Nothing is Claude-specific except the frontmatter.

Full instructions, plugin layout and CI wiring: **[INSTALL.md](INSTALL.md)**.

---

## The three rules that carry most of the result

**Never a single flat shadow.** Depth is three parts: a lit top edge, a seated inner shade, and a long ambient shadow tinted with the accent and given negative spread. `0 4px 6px rgba(0,0,0,.1)` is the most reliable tell that nobody looked at the page.

**Never a flat background.** Two ambient layers minimum — fixed backdrop, blurred halos, SVG grain at `opacity: .038` with `mix-blend-mode: overlay`. They cost almost nothing and carry most of the perceived quality.

**Copy before polish.** Write the real words in plain text first. A page built shell-first says nothing beautifully, and no amount of motion fixes it.

---

## Repository layout

| Path | What it is |
|---|---|
| `skills/site-craft/SKILL.md` | the workflow: 9 steps, fixed order, three modes |
| `skills/site-craft/scripts/scaudit.mjs` | the gate, executable |
| `skills/site-craft/scripts/scextract.mjs` | recover a token spine from an existing site |
| `skills/site-craft/scripts/scvariants.mjs` | four starting templates from one palette |
| `skills/site-craft/tests/test_all.mjs` | 146 assertions (151 with `--live`) |
| `skills/site-craft/examples/` | the before/after pair, both reports, and the four generated directions |
| `skills/site-craft/references/tokens.css` | token spine, glass, depth recipe, buttons |
| `skills/site-craft/references/tokens-light.css` | the same spine for light grounds — the lit edge inverts |
| `skills/site-craft/references/tailwind.md` | Tailwind v4 `@theme` port + React primitives |
| `skills/site-craft/references/ambient.md` | canvas backdrop, halos, grain, spotlight |
| `skills/site-craft/references/motion.md` | reveal engine, stagger, count-up, budgets |
| `skills/site-craft/references/copy.md` | hero formula, filters, banned phrasing |
| `skills/site-craft/references/antislop.md` | the rules in prose, with the reasoning |
| `skills/site-craft/references/audit.md` | fixing an existing site, ranked by payoff/risk |
| `skills/site-craft/references/variants.md` | RESKIN mode — extraction rules and the four directions |
| `commands/site-craft.md` | the `/site-craft` slash command |

---

## Honest limits

- The gate checks what a machine can check. Taste, hierarchy and whether the argument on the page is any good are still yours — 31 green lines mean the page isn't *broken*, not that it's *good*.
- Colour parsing covers hex, `rgb()`, `rgba()`, `hsl()`. A palette written entirely in `oklch()`/`lab()` is skipped by the hue-family rule and by the extractor's **static** pass — the live pass reads computed styles and is unaffected, so use `--live` on modern-colour codebases.
- The extractor guesses which colour is your brand. On a static pass it sometimes picks the loudest colour rather than the logo's; the runners-up are printed and `--accent <hex>` overrides it.
- The browser pass measures one page at a time. Point it at each route that matters.
- Thresholds (≤3 hue families, ≤2 easing curves, ≥3 concrete figures) are defensible but were tuned against the bundled examples, not a large sample. **If a rule is wrong for your project, open an issue** — a documented exception is an answer, silently deleting the rule isn't.

## Licence

MIT — see [LICENSE](LICENSE).
