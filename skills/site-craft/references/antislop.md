# Anti-slop gate

**Blocking.** Run every line before reporting the page as done. A red line either gets fixed or gets named in the delivery — "I left #14 red because the client's brand mandates the stock palette" is fine. Silence is not.

Format the result as a table of pass/fail, not prose.

---

## A · Background & depth

1. **Not a flat fill.** At least two ambient layers present (backdrop + halos, backdrop + grain, …). A single solid `background-color` on `body` with nothing behind it fails.
2. **Grain present** at `opacity .03–.045`, `mix-blend-mode:overlay`. (Optional only when the register is explicitly flat-editorial.)
3. **No default shadow anywhere.** Grep the stylesheet for `rgba(0,0,0,0.1)`, `0 4px 6px`, `0 2px 4px`, Tailwind's bare `shadow-md`/`shadow-lg`. Every shadow is the three-part recipe with negative spread and an accent tint.
4. **Glass has `saturate()`**, not just `blur()`. Blur alone renders as grey plastic.
5. **Hairlines are 1px** and come from a token, not from `border-gray-200`.
6. **Halo parents have `overflow-x: clip`.**

## B · Colour

7. **One accent hue.** A second hue exists only if it carries meaning (positive/negative, tier). Count the distinct hues in the stylesheet — more than 3 non-state hues is a fail.
8. **Four ink stops in use**, not two. If every piece of text is either `#fff` or `#888`, hierarchy is missing.
9. **No unearned gradients.** Gradient text on at most one element per viewport. No gradient on body copy, no rainbow gradients, no purple→pink unless it is genuinely the brand.
10. **Contrast checked** on the accent-on-dark combinations actually used for body text (not just for accents). WCAG AA on anything you expect people to read.

## C · Typography

11. **Every size is `clamp()`.** No breakpoint-by-breakpoint font-size juggling.
12. **`text-wrap: balance`** on headings, **`pretty`** on paragraphs.
13. **Measures capped in `ch`.** No full-bleed paragraphs on a 1440px monitor.
14. **Negative tracking on display** (`-.02em` to `-.04em`), **positive + uppercase on eyebrows** (`.14–.2em`).
15. **`font-variant-numeric: tabular-nums`** on every number, table, and counter.
16. **Two typefaces max.** Three is a fail unless one is mono used strictly for data.

## D · Layout

17. **No horizontal scroll at 390px.** Verified by looking, not by reasoning.
18. **The hero fits a 13" laptop** (≈800px of usable height) with the primary CTA visible. A hero that needs a scroll to reach its own button is a fail.
19. **No cards inside cards inside cards.** Two levels of nesting maximum.
20. **Sections are not all the same shape.** If every section is `eyebrow → h2 → 3-column card grid`, the page reads as a template. Vary: full-bleed diagram, a table, a two-column split, a single centred statement.
21. **Asymmetry somewhere.** Not every row is a perfect 3-up grid.

## E · Motion

22. **One easing** across the site (plus one overshoot for pop-ins).
23. **Reveal fires once** — `unobserve` after triggering.
24. **`prefers-reduced-motion` block present**, and nothing is left invisible under it. Toggle it and look.
25. **Count-ups land on their real value** under reduced motion.
26. **Only `transform`/`opacity` in loops.** One-shot `width` on a bar fill is the sanctioned exception.
27. **rAF loops cancel on `visibilitychange`.**
28. **No scale-on-hover for cards.** Lift + border + shadow.

## F · Copy

29. **Zero banned phrases** (`copy.md`). Grep for: unlock, unleash, supercharge, revolutionize, empower, seamless, game-chang, one-stop, "In today's", "Whether you're a", "It's not just".
30. **Numbers present** in the hero and in at least half the sections.
31. **CTA labels name outcomes**, not mechanisms. No bare "Get Started" / "Learn More".
32. **H2s are claims, not labels.**
33. **No emoji in UI. No exclamation marks in body copy.**
34. **Every number on the page is verified** (rigour protocol R1) or explicitly marked as illustrative. An invented stat is worse than no stat.

## G · Craft details — where quality actually shows

35. **Focus ring visible** on the dark surface, accent-coloured, `:focus-visible` only. Tab through the page.
36. **All ambient layers `pointer-events:none`** and `aria-hidden`.
37. **Custom favicon**, not the framework default.
38. **Real `<title>` and meta description.**
39. **Hover states on everything interactive**, including table rows and nav links.
40. **Console clean** — no errors, no 404s on assets.
41. **Empty/loading/error states written**, not left as "No data available."
42. **Buttons have a leading-arrow or icon that responds to hover** (`translateX(5px)`), or a deliberate reason not to.

---

## Fast grep pass

```bash
# default shadows
grep -rnE '0 4px 6px|0 2px 4px|rgba\(0, ?0, ?0, ?0?\.1\)|shadow-(md|lg|xl)\b' <dir>

# banned copy
grep -rniE 'unlock|unleash|supercharge|revolutioniz|empower|seamless|game.chang|one.stop|in today' <dir>

# missing reduced-motion
grep -rn 'prefers-reduced-motion' <dir> || echo "FAIL — no reduced-motion block"

# hardcoded hex outside the token file
grep -rnE '#[0-9a-fA-F]{6}' <dir> --include=*.tsx --include=*.jsx | grep -v tokens
```

Grep finds candidates, not verdicts — confirm each hit before calling it a fail.

---

## Scoring

- **0 red lines** → ship.
- **1–3 red** → fix them, then report.
- **4+ red** → the direction is wrong, not the details. Go back to step 2 (direction lock) rather than patching.
