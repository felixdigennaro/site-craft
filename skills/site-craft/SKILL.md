---
name: site-craft
description: Build or fix a website/landing page at shipped-product quality — ambient background layers, real depth (not flat box-shadows), scroll-reveal motion, concrete copy, and a mandatory anti-AI-slop gate before delivery. Use for any new site, landing page, marketing surface, or hero/section rebuild, and for auditing or upgrading a site that already exists. Brand-agnostic: it encodes the method and the code recipes, not one palette.
user-invocable: true
---

# site-craft

Method distilled from two shipped production surfaces — one standalone HTML/canvas marketing site, one Next.js + Tailwind product landing. Both ambient, motion-led, numerically concrete. This skill generalises what made them work so a new site lands there in one pass.

**This skill is not an aesthetic.** It doesn't force a palette, a typeface, or dark mode. It forces *structure* — a token spine, layered depth, one motion grammar, concrete copy — inside whatever direction the brief calls for. The recipes are written dark-first because that's the harder case; `references/tokens-light.css` inverts them.

## Two modes — pick first

| Mode | Trigger | Entry point |
|---|---|---|
| **BUILD** | new site, new landing, new section | step 1 below |
| **AUDIT** | "sistema questo sito", "migliora la home", existing codebase | `references/audit.md`, then re-enter at step 3 |

In AUDIT mode you never rewrite from scratch. You diagnose against the same rubric, then apply the smallest set of changes that moves each failing axis.

---

## Order of operations

Do not reorder. Copy before polish; tokens before components; gate before delivery.

### 1 · Brief (before a single line of code)

Answer these six from context. Ask only the ones you genuinely cannot infer — a wrong guess here costs more than one question.

1. **Who lands here, in what state of mind?** (skeptical buyer? warm lead? peer?)
2. **What is the one thing they must believe when they leave?**
3. **What is the proof?** Numbers, names, screenshots, live data. If there is no proof, say so — the page will have to be honest instead of loud.
4. **What is the single primary action?** One. A second CTA is allowed only as an escape hatch for the not-yet-ready.
5. **Register:** institutional / editorial / technical / consumer. This sets type weight, density, and motion budget.
6. **Constraints:** stack, existing tokens, i18n, perf budget, dark-vs-light.

### 2 · Direction lock

Write one sentence, out loud, before coding: *"Dark institutional, single blue accent, Space Grotesk display + system sans, one easing, motion on reveal only."* If you can't write that sentence, you don't have a direction and the page will drift into slop.

Then lock, and do not exceed:
- **One accent hue** (+ its bright/deep/glow variants). A second accent only if it carries semantic meaning. Two patterns that work: *blue + cyan as one family*, with `--pos/--warn/--neg` reserved strictly for state; or *green primary + amber for "needs attention"*, with red reserved for hard errors only. What fails is a third decorative hue.
- **Two typefaces max.** One display, one body. Numbers get tabular figures — always.
- **One easing** for everything: `cubic-bezier(.2,.75,.2,1)`. Overshoot (`cubic-bezier(.2,.9,.3,1.2)`) only where something physically pops in.
- **One radius scale** derived from a single `--radius`.

### 3 · Token spine

Read and adapt `references/tokens.css`. Never hardcode a colour in a component. The spine is:

- 2 grounds, 2 panels, 2 hairlines, **4 ink stops** (`ink / ink-soft / ink-faint` + inverse). Four text stops is the single highest-leverage token decision — three is not enough hierarchy, six is mush.
- Accent as `accent / accent-bright / accent-deep / accent-glow`.
- Spacing as a named scale (`--s3: 24px … --s6: 104px`), not ad-hoc pixels.

### 4 · Ambient layers

Read `references/ambient.md`. **A flat background is the loudest AI-slop tell there is.** Every page gets at least two, ideally three, of:

1. A **fixed backdrop** — canvas scene, starfield SVG, or a 64px hairline grid. `position:fixed; z-index:-1; pointer-events:none`.
2. **Halos** — large blurred radial glows behind key elements, `filter:blur(16-20px)`, opacity `.4–.6`, `aria-hidden`.
3. **Grain** — SVG fractal-noise at `opacity:.038`, `mix-blend-mode:overlay`. Costs nothing, kills the "rendered by a machine" flatness instantly.

Mandatory with halos: the containing element gets `overflow-x: clip`, or they blow past `100vw` and trigger the iOS rubber-band "card cut off on the right" bug. It survives review because it is invisible on desktop — the gate checks it at 390px.

### 5 · Structure + copy — *before* any polish

Read `references/copy.md`. Write the real words first, in plain text, then build around them. Building the shell first and pouring copy in later is how pages end up saying nothing beautifully.

Structural rules:
- **Section = one viewport, one idea.** `min-height:100svh` + centred flex works when each section carries a single claim. Use it when the page is an argument; use dense stacking when it's a catalogue.
- **The hero is the exception — and it is a measured one.** `min-height:100svh` plus the hero's own vertical padding *stacks* with the section padding and pushes the primary CTA below the fold on a 13" laptop. Measured on a probe of this exact recipe: viewport 1280×720, hero height 806px, CTA bottom at 742px — **off-screen**. So: the hero either *replaces* the section padding (`.hero{padding:var(--s6) 0 var(--s5)}`, not an added `padding-top`) or drops `min-height` entirely. Then verify by measuring, not by looking at a tall screenshot:
  ```js
  const r = document.querySelector('.btn-solid').getBoundingClientRect();
  ({ ctaBottom: r.bottom, vh: innerHeight, visible: r.bottom < innerHeight })
  ```
- Section head caps at `62ch`; lead paragraphs at `58ch`; card body at `34ch`.
- Every claim that can carry a number, carries a number.

### 6 · Components with real depth

From `references/tokens.css`. The rule that separates expensive from cheap:

> **Never a single flat shadow.** Depth is always three parts: an *inset top highlight* (light hits the top edge), an *inset bottom shade*, and a *long ambient shadow tinted with the accent* and given negative spread.

```css
box-shadow:
  inset 0 1px 0 rgba(255,255,255,.4),          /* lit edge */
  inset 0 -1px 3px rgba(5,18,46,.28),          /* seated in */
  0 8px 26px -8px var(--accent-glow);          /* ambient, tinted, negative spread */
```

`0 4px 6px rgba(0,0,0,.1)` is a tell. So is a shadow with no negative spread.

### 7 · Motion

Read `references/motion.md`. The budget:
- **Reveal on scroll** — `opacity + translateY(22px) + blur(5px)` → clear. IntersectionObserver at `threshold:.16`, `unobserve` after firing.
- **Stagger** on hero children via `nth-child` delays, ~110ms apart, max 4–5 items.
- **Count-up** on every headline number, easeOutCubic, ~1s, locale-formatted.
- **Bars/rings fill** on reveal, not on load.
- **Ambient loops** — sheen sweep, pulse dot, rotating conic border — slow (4–8s), low contrast.
- Hover: `translateY(-2px/-3px)` + border brightening + shadow deepening. Never scale a card.

Non-negotiable close:

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.001ms!important; animation-iteration-count:1!important; animation-delay:0ms!important }
  .rev,.stagger>*{ opacity:1; transform:none; filter:none }
  html{ scroll-behavior:auto }
}
```
Ship the page without this and it's broken, not stylish.

### 8 · Anti-slop gate — **mandatory, blocking**

Run the linter. It is not advisory and it is not a summary of your own opinion of the page:

```bash
node scripts/scaudit.mjs <dir-or-file>                    # static pass
node scripts/scaudit.mjs <dir> --live http://localhost:3000   # + browser pass
```

It exits non-zero while anything is red. The four browser rules — horizontal scroll at 390px, CTA above the fold, nothing invisible under reduced motion, console clean — are the ones a screenshot never catches, so run `--live` before claiming the page is done.

`references/antislop.md` holds the same rules in prose, with the reasoning behind each and the handful of checks a machine can't make (nesting depth, section-shape variety, whether the argument is any good). Read it when a rule fires and you need to know what it's actually protecting.

Do not report the page as done with a red line on it. If a rule is wrong for this project, say which line and why — that's an answer; silence isn't.

### 9 · Verify — actually look

Per the rigour protocol (R1: verified now, not remembered):

- Render it. `preview_start` / `navigate` for a dev server, or open the file. Take a screenshot.
- **390px and 1440px.** Not one. Horizontal scroll at 390 is the most common real defect.
- Console clean.
- Toggle `prefers-reduced-motion` and confirm the page still reads.
- Tab through it — the focus ring must be visible on the dark surface (default rings are invisible; set an explicit `:focus-visible` outline in the accent).

Then report honestly: what you saw, at which widths, and what you did **not** check.

---

## Delivery format

Close with:

**Stato — fatto:** … · **prossimo:** … · **rischi:** …

Plus the gate result: which anti-slop lines pass, which don't and why.

---

## Reference files

| File | Load when |
|---|---|
| `references/tokens.css` | step 3 & 6 — token spine, glass, depth, buttons (dark ground) |
| `references/tokens-light.css` | step 3 & 6 — light ground. The lit edge inverts; read the header |
| `references/tailwind.md` | step 3 — Tailwind v4 `@theme` port + `Reveal` / `CountUp` React primitives |
| `references/ambient.md` | step 4 — canvas backdrop, halos, grain, spotlight |
| `references/motion.md` | step 7 — reveal engine, stagger, count-up, magnetic CTA |
| `references/copy.md` | step 5 — voice, banned phrasing, before/after rewrites |
| `references/antislop.md` | step 8 — the rules in prose, with reasoning |
| `references/audit.md` | AUDIT mode — diagnose an existing site |
| `scripts/scaudit.mjs` | step 8 — the gate, executable |
| `examples/after.html` | any step — a complete page that clears all 31 rules; copy from it |
| `examples/before.html` | step 8 — what each rule is protecting against, made concrete |

## Interaction with other skills

If a project already ships its own design system or brand skill, **that system wins on tokens** — palette, type, logo, voice. site-craft still governs method: layering, depth recipe, motion grammar, copy discipline, and the exit gate. They compose; they don't compete.
