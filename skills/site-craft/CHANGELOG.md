# Changelog

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
