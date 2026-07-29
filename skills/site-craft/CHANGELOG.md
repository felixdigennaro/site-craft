# Changelog

## 1.1.0 — 2026-07-29

Keep your colours, change everything else.

### Added
- `scripts/scextract.mjs` — recovers a disciplined token spine from a site that already exists. Assigns roles rather than dumping colours: the most-painted background becomes the ground, ink stops are placed by contrast with each at least 1.25× apart, the most chromatic colour on interactive elements becomes the accent, state colours stay conventional. The live pass weights every observation by painted area and font size, which is the only way to tell a ground from a colour that is merely frequent in the CSS. `--accent <hex>` overrides the guess; every dropped hue family is reported rather than silently discarded.
- `scripts/scvariants.mjs` — four starting templates from one colour scheme: **ambient** (glass over a lit backdrop), **editorial** (flat, generous, typographic), **terminal** (dense, gridded, monospaced), **soft** (rounded, layered, warm). Each emits `tokens.css` plus a complete page, with an `index.html` picker showing all four side by side.
- `references/variants.md` — RESKIN mode: the extraction rules, the four directions, and what the feature forced us to fix.
- `examples/variants/` — the four directions generated and committed, so they can be seen without running anything.
- RESKIN mode in `SKILL.md`, and 46 new assertions (146 total, 151 with `--live`).

### Fixed — three gate rules that were measuring the wrong thing
Generating legitimate output exposed three rules that fired on correct work. A rule that fires on your own correct output is a broken rule, not a broken output; each fix ships with a regression test.

- **`B7` (one accent hue)** punished a complete state palette. Green-for-good and red-for-bad are conventions, not decoration. Colours bound to a state token (`--pos`, `--error`, `--warning`, …) or a state selector are now excluded from the family count.
- **`A3` (no default shadows)** flagged the tight contact layer of a composed stack. `0 2px 4px` as the *entire* shadow is a framework default; the same offsets as one layer of `inset …, 0 2px 4px …, 0 24px 48px -20px …` are exactly the depth model this skill teaches. Only single-layer shadows are flagged now.
- **`A3b` (negative spread)** demanded it of every non-inset layer. A contact shadow is meant to sit flush and correctly has no spread; only the longest-blur layer per declaration is treated as ambient.
- **`E27` (rAF pauses in background tabs)** warned about a one-shot count-up. Only a perpetual loop — one that recurses with no terminating condition — is flagged.

### Fixed — defects found by running the new tools, not by reading them
- `ground-2` could be promoted from a hero gradient stop; it now has to be near-neutral and within 0.14 lightness of the ground.
- The ink ramp could collapse, filling two stops with the same observed grey; stops are now forced at least 1.25× apart.
- State hues were derived as `accent + 140°`, which put "positive" on magenta. They are now conventional, and move only on a real collision with the brand hue.
- The dropped-hue report counted only colours that fed a role, so a hue seen once in a badge was discarded silently — the opposite of the extractor's promise.
- The blur was read from the wrong position in a shadow layer (a unitless `0` offset carries no `px`, which shifted every index by one and read the spread as the blur).

## 1.0.0 — 2026-07-29

First release.

### The method
- `SKILL.md` — nine steps in a fixed order, two modes (BUILD / AUDIT). Copy before polish, tokens before components, gate before delivery.
- `references/tokens.css` — the token spine: two grounds, two panels, two hairlines, four ink stops, one accent hue in four roles, one easing. Glass, the three-part depth recipe, buttons, layout.
- `references/tokens-light.css` — the same spine for light grounds. The lit edge inverts, ambient shadows go neutral, grain and halos drop by roughly half; none of that is expressible as an alpha swap.
- `references/tailwind.md` — Tailwind v4 `@theme` port plus `Reveal` and `CountUp` React primitives, and a translation table from the Tailwind defaults the gate rejects.
- `references/ambient.md` — canvas backdrop with scroll lerp and breathe, fixed SVG backdrop, masked hairline grid, halos, grain, cursor spotlight.
- `references/motion.md` — reveal engine, stagger, count-up, magnetic CTA, per-element duration budget, reduced-motion close.
- `references/copy.md` — the four-part hero formula, five filters, banned phrasing, CTA and heading rewrites, micro-copy, bilingual notes.
- `references/antislop.md` — the 42-line checklist the linter is built from, with the reasoning each rule encodes.
- `references/audit.md` — fixing an existing site: diagnose, rank by payoff-per-risk, apply incrementally, regression-check.

### The gate
- `scripts/scaudit.mjs` — 27 static rules plus 4 browser rules. Zero required dependencies; the browser pass uses Playwright when present and reports SKIP with the reason when absent, never a silent pass. `--json`, `--strict`, `--quiet`. Exits non-zero on any failure.
- `tests/test_all.mjs` — 100 assertions (105 with `--live`). Every rule is proven twice: it must fire on a violating fixture and stay quiet on a clean one.
- `examples/before.html` / `examples/after.html` — same product, same claims, same word count; 22 failures versus 31/31. Both reports committed in `examples/out/`.

### Notes on what was measured while building this
Three defects were found by running the tool against its own examples rather than by reading the code, and are fixed in this release:

- A shadow declaration that mixes `inset` and ambient layers was skipped whole; layers are now judged individually.
- The `prefers-reduced-motion` body was extracted with a non-greedy regex that stopped at the first nested `}`, so a correct reset block read as missing; it now counts braces.
- Ambient-layer inertness declared on a grouped selector (`.halo,.halo-sm{…}`) was not seen; rules are now matched per class across every block that targets it.

Two defects in the guidance itself came from measurement, not opinion:

- A hero using `min-height:100svh` *and* its own vertical padding puts the primary CTA below the fold on a 1280×720 laptop (measured: hero 806px, CTA bottom 742px). `SKILL.md` now states the exception and gives the one-line check.
- `it-IT` does not group four-digit numbers while `en-US` does, so a bilingual counter changes width and gains a separator mid-animation. Documented in `motion.md`, asserted in the test suite.
