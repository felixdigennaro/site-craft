# RESKIN mode — extract a palette, then choose a direction

For when a site already exists and the brand colours are not up for debate, but everything else is.

```bash
# 1 · recover a disciplined token spine from the existing site
node scripts/scextract.mjs ./src --live http://localhost:3000

# 2 · generate four starting templates from it
node scripts/scvariants.mjs site-craft.tokens.json -o ./variants --name "Acme"

# 3 · look at them side by side, pick one
open variants/index.html
```

---

## What the extractor actually does

It is not a colour dump. A list of the 47 colours in a stylesheet tells you nothing you can build on. The extractor assigns **roles**, because roles are what a design system is:

| Role | How it's chosen |
|---|---|
| `ground` | the most-painted background (live pass weights by pixel area) |
| `ground-2` | the next background that is near-neutral **and** within 0.14 lightness — so a hero gradient stop can't get promoted to a structural token |
| `ink` / `ink-soft` / `ink-faint` | placed by contrast against the ground, each stop at least **1.25× apart** so the ramp can't collapse into two greys wearing four names |
| `ink-invert` | whichever of white/near-black reads better on the accent |
| `accent` + bright/deep/glow | the most chromatic colour, preferring ones seen on links and buttons; nudged until it clears 3:1 on the ground |
| `pos` / `warn` / `neg` | conventional hues, **not** derived from the accent — and moved only if the brand hue collides with one |
| `hair` / `panel` | derived from the ink direction, not observed. Observed borders are usually a grab-bag of framework greys |

**It imposes discipline rather than preserving the palette faithfully.** It keeps the brand hue and the polarity, then reduces to one accent family plus state colours — and prints every hue family it dropped:

```
· accent #6d28d9 (hue 263°) taken as the brand — runners-up #10b981, #ec4899;
  override with --accent <hex> if this is wrong
· dropped 3 other hue families (30-60°, 240-270°, 210-240°)
```

If it guesses the brand wrong — and on a static pass it sometimes will — correct it:

```bash
node scripts/scextract.mjs ./src --accent '#6d28d9'
```

### Static vs live

The static pass reads stylesheets and guesses roles from properties and selectors. The live pass reads *computed* styles and weights every observation by painted area and font size. Only the second can tell a page's ground from a colour that merely appears often in the CSS. **Use `--live` whenever a URL exists.**

---

## The four directions

Same colour scheme in all four. What changes is the structure — which is precisely what a colour picker cannot decide for you.

| | Ambient | Editorial | Terminal | Soft |
|---|---|---|---|---|
| **Surfaces** | glass, translucent | flat, opaque | flat panels on a 1px grid | opaque cards |
| **Depth** | glow, accent-tinted | hairlines only | borders only | stacked neutral shadows |
| **Radius** | 16px | 4px | 2px | 24px |
| **Type** | tight sans display | serif display, generous | mono throughout | rounded, roomy |
| **Density** | medium | low | high | low |
| **Motion** | stagger + reveal + blur | slow reveal | fast, short | gentle overshoot |
| **Ambient layers** | grid + grain + halos | vignette + grain | dense grid + grain | halos + grain |
| **Fits** | product, fintech, AI | writing, research, studios | dashboards, dev tools | consumer, health, education |

Each direction emits `tokens.css` plus a complete `index.html` you can start editing. They are starting templates, not mockups.

### They all clear the gate

Every generated page is checked against the same 31 rules the skill enforces, in both polarities, and the test suite asserts it:

```
variant "ambient" (light) clears the gate      ✓
variant "editorial" (dark) clears the gate     ✓
…8 combinations, zero failures
```

A tool that shipped templates failing its own linter would deserve to be ignored.

---

## Three rules this feature forced us to fix

Generating legitimate output exposed three places where the gate was measuring the wrong thing. All three are now corrected, and each has a regression test:

1. **`B7` (one accent hue) punished a complete state palette.** Green-for-good and red-for-bad are conventions, not decoration. Colours bound to a state token (`--pos`, `--error`, `--warning`, …) or a state selector are now excluded from the family count. The rule protects against a *third decorative hue*, which is what it always meant.

2. **`A3` (no default shadows) flagged the contact layer of a composed stack.** `0 2px 4px` as the entire shadow is a framework default; the same offsets as one layer of `inset …, 0 2px 4px …, 0 24px 48px -20px …` is exactly the depth model this skill teaches. Only single-layer shadows are flagged now.

3. **`A3b` (negative spread) demanded it of every non-inset layer.** A tight contact shadow is meant to sit flush and correctly has no spread. Only the longest-blur layer per declaration is treated as the ambient one.

The pattern is worth stating: **a rule that fires on your own correct output is a broken rule, not a broken output.** Loosen it so it measures the intent, and add the regression test in the same change.

---

## After you pick

```bash
cp -R variants/ambient ./site        # take one
# replace the words, keep the structure
node scripts/scaudit.mjs ./site --live http://localhost:3000
```

The template starts green. Keeping it green while you add real content is the actual work, and the gate is what tells you when you've stopped.
