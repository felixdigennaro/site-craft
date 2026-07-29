# AUDIT mode — fixing a site that already exists

The failure mode here is rewriting. A working site has constraints you can't see from the outside: analytics on specific selectors, i18n keys, SEO equity on headings, a design system somebody else owns. **Diagnose, rank, apply the smallest change that moves each axis.**

---

## Step 1 · Look before reading

Render it first. Screenshot at **390** and **1440**. Scroll the whole page.

```
preview_start / navigate → screenshot → scroll → screenshot
```

Write down your first impression in one sentence before opening any file. That sentence is the most valuable diagnostic you'll get, and it evaporates the moment you start reading CSS.

## Step 2 · Map the system

Find out what's already there before proposing anything:

```bash
# token files
find . -name '*token*' -o -name 'globals.css' -o -name 'theme*' | grep -v node_modules

# is there an existing design skill / handoff?
find . -path '*design*' -name '*.md' | grep -v node_modules

# how are surfaces currently built?
grep -rnE 'backdrop-filter|box-shadow|prefers-reduced-motion' <css> | head -40
```

If the project already ships its own design system or brand skill, **it wins on tokens** — palette, type, logo, voice. You are changing method, not brand.

## Step 3 · Score against the gate

Run `antislop.md` in full against the live page. Produce the table. Do not skip lines because they "look fine" — line 17 (horizontal scroll at 390) and line 24 (reduced motion) both fail silently on pages that look perfect in a desktop screenshot.

## Step 4 · Rank by payoff-per-risk

Order the fixes. In practice the ranking is almost always this, because these are the changes with the largest visual delta and the smallest blast radius:

| Rank | Fix | Risk |
|---|---|---|
| 1 | Add ambient layers (grain + halos + backdrop) | ~zero — additive, `pointer-events:none` |
| 2 | Replace default shadows with the three-part recipe | low — CSS-only |
| 3 | Add the four-stop ink scale where text is flat | low |
| 4 | Add scroll-reveal + count-up | low — additive JS |
| 5 | Rewrite hero copy | medium — SEO/messaging, needs sign-off |
| 6 | Restructure sections | high — do last, only if the gate scored 4+ red |

**Rule: never do 6 before 1–4 have been applied and looked at.** Most sites that "feel AI-generated" are fixed entirely by 1–3, and restructuring them would have been wasted work.

## Step 5 · Apply incrementally, look after each

After each ranked fix: re-render, re-screenshot, compare. Per the rigour protocol (R5 checkpoint), if you've touched the same file a second time or applied ~5 changes, stop and re-verify the whole page before continuing — layered CSS changes interact, and a fix at rank 3 can undo one at rank 1.

## Step 6 · Regression check

Specific to existing sites — things that break when you add ambient layers to a page that wasn't built for them:

- **Solid sections punch through the new backdrop.** Anything with an opaque `background-color` will hide it. Either make those surfaces translucent or accept the section as intentionally solid — but decide, don't discover.
- **Stacking contexts.** A parent with `transform`, `filter`, `will-change`, or `isolation` creates a new stacking context and your `z-index:-1` backdrop will render *behind that parent's own background* instead of behind the page. Symptom: the layer works on one page and not another.
- **Halos vs `100vw`.** New absolutely-positioned glows need `overflow-x: clip` on their container or they cause horizontal scroll on mobile.
- **`backdrop-filter` performance.** Many blurred surfaces on one screen tanks scroll on Safari mobile. If the page has 10+ glass cards in view, drop the blur radius or limit blur to cards above the fold.
- **Existing animations** may not honour the new reduced-motion block if they're set via inline `style={{animation}}` — that's why the block uses `!important`.

## Step 7 · Report

State plainly:

- The gate table: before → after, per line.
- What you changed, file by file.
- **What you did not change and why** — brand constraints, risk, awaiting sign-off.
- What you verified (which widths, reduced motion, console) and what you did not.

Never report "the site now looks premium". Report which lines went green.
