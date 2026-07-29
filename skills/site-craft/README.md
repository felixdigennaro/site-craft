# site-craft

**A design gate that actually runs.**

Not a style guide. Style guides are free and everywhere, and an agent that has read one still ships a page with a flat background, a `0 4px 6px` shadow, "Unlock the power of seamless collaboration" in the hero, and no `prefers-reduced-motion` block. This is the method *plus* the linter that refuses to call the page finished until 31 specific things are true.

Works as a Claude Code / Claude Agent skill. The linter runs standalone in any project — vanilla HTML, Tailwind, React, Vue, Svelte, Astro.

---

## Quickstart (30 seconds, no dependencies)

```bash
node tests/test_all.mjs                                  # 100 assertions — ALL GREEN
node scripts/scaudit.mjs examples/before.html            # a deliberately generic page → GATE RED
node scripts/scaudit.mjs examples/after.html             # same content, method applied → GATE GREEN
```

Open `examples/before.html` and `examples/after.html` side by side. Same product, same claims, same word count. The reports for both are committed in `examples/out/` if you'd rather read the result before running anything.

Audit your own site:

```bash
node scripts/scaudit.mjs ./src ./app                     # static pass over CSS/HTML/JSX/TSX
node scripts/scaudit.mjs ./src --live http://localhost:3000   # + the browser pass
node scripts/scaudit.mjs ./dist --json                   # machine-readable, for CI
```

The browser pass needs Playwright and says so plainly when it's missing, rather than passing silently:

```bash
npm i -D playwright && npx playwright install chromium
node tests/test_all.mjs --live                           # 105 assertions
```

Exit code is `0` when clean and `1` on any failure, so it drops into CI as-is.

---

## What it checks

31 rules. Every one is proven twice in the test suite — it must fire on a violating fixture and stay quiet on a clean one.

| Group | Rules |
|---|---|
| **Background & depth** | ambient layers present · no framework-default shadows · ambient shadows have negative spread · glass uses `saturate()` not blur alone · halo containers clip horizontally |
| **Colour** | one accent hue family · four ink stops, tokenised |
| **Typography** | fluid `clamp()` display sizes · `text-wrap: balance/pretty` · measure capped in `ch` · tabular figures on numbers |
| **Motion** | one easing curve · reveal fires once · `prefers-reduced-motion` block present · reduced motion resets hidden resting states · rAF pauses in background tabs · no scale-on-hover |
| **Copy** | no banned phrasing · concrete numbers present · CTA labels name outcomes · H2s are claims not labels · no emoji in UI |
| **Craft** | explicit `:focus-visible` · ambient layers inert · custom favicon · title + meta description · real empty/error states |
| **Browser pass** | no horizontal scroll at 390px · primary CTA above the fold at 1280×720 · nothing invisible under reduced motion · console clean |

The four browser-pass rules are the ones that matter most and the ones a screenshot never catches. On the bundled `before.html` they find a 558px-wide document inside a 390px viewport and two text elements left permanently invisible under reduced motion — neither of which is visible in a desktop review.

---

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | the workflow: 9 steps in a fixed order, two modes (build / audit) |
| `scripts/scaudit.mjs` | the gate, executable. Static + optional browser pass |
| `tests/test_all.mjs` | 100 assertions (105 with `--live`) |
| `examples/before.html` | a competent-looking generic page — GATE RED, 22 failures with `--live` |
| `examples/after.html` | same content, method applied — GATE GREEN, 31/31 with `--live` |
| `examples/out/` | both audit reports, text and JSON |
| `references/tokens.css` | the token spine, glass, the three-part depth recipe, buttons |
| `references/tokens-light.css` | the same spine for light grounds — the lit edge inverts |
| `references/tailwind.md` | Tailwind v4 `@theme` port + React primitives |
| `references/ambient.md` | canvas backdrop, halos, grain, cursor spotlight |
| `references/motion.md` | reveal engine, stagger, count-up, magnetic CTA, budgets |
| `references/copy.md` | hero formula, five filters, banned phrasing, rewrites |
| `references/antislop.md` | the checklist behind the linter, with the reasoning |
| `references/audit.md` | fixing a site that already exists, ranked by payoff/risk |

---

## The three rules that carry most of the result

**Never a single flat shadow.** Depth is three parts: a lit top edge, a seated inner shade, and a long ambient shadow tinted with the accent and given negative spread. `0 4px 6px rgba(0,0,0,.1)` is the single most reliable tell that nobody looked at the page.

**Never a flat background.** Two ambient layers minimum — a fixed backdrop, blurred halos, and SVG grain at `opacity: .038` with `mix-blend-mode: overlay`. They cost almost nothing and carry most of the perceived quality.

**Copy before polish.** Write the real words in plain text first. A page built shell-first says nothing beautifully, and no amount of motion fixes it.

---

## Using it as a skill

Drop `skills/site-craft/` into `.claude/skills/` (project) or `~/.claude/skills/` (global), or install the plugin — see `INSTALL.md`. Then:

```
/site-craft build a landing page for <product>
/site-craft audit ./src
```

In BUILD mode it works through brief → direction lock → tokens → ambient → copy → depth → motion → gate → verify. In AUDIT mode it diagnoses first and ranks fixes by payoff-per-risk, because most sites that feel machine-made are fixed by the first three changes and restructuring them would be wasted work.

If your project already has its own design system, that system wins on tokens — palette, type, voice. site-craft governs method and owns the exit gate.

---

## Honest limits

- The gate checks what a machine can check. Taste, hierarchy, and whether the argument on the page is any good are still yours — 31 green lines mean the page isn't *broken*, not that it's *good*.
- The colour rule counts hue families from hex literals. A palette defined entirely in `oklch()` or via a CSS-in-JS runtime will under-report; check it by eye.
- The browser pass measures one page at a time. Point it at each route that matters.
- Rules are heuristics with a stated threshold, not proofs. When one is wrong for your project, say which line and why — that's a documented answer, not a bypass.

## Licence

MIT — see `LICENSE`.
