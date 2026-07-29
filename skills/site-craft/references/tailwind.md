# Tailwind v4 + React port

The recipes in `tokens.css` are plain CSS so they work anywhere. This is the same spine expressed for Tailwind v4 (`@theme`, CSS-first config — no `tailwind.config.js`) plus the React primitives.

**What does not survive the port:** the depth recipe. Tailwind's `shadow-*` scale is exactly the flat-shadow anti-pattern the gate rejects (`A3` fails on `shadow-md`/`shadow-lg`/`shadow-xl`). Define real shadows as theme tokens and use those instead.

---

## 1 · `app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Grounds & surfaces */
  --color-ground:      #06080f;
  --color-ground-2:    #0b0e1a;
  --color-panel:       rgb(120 160 255 / 0.03);
  --color-panel-2:     rgb(120 160 255 / 0.06);

  /* Hairlines */
  --color-hair:        rgb(150 180 255 / 0.11);
  --color-hair-strong: rgb(150 180 255 / 0.22);

  /* Four ink stops — the gate (B8) checks for four */
  --color-ink:         #e8ecf5;
  --color-ink-soft:    #9aa4bd;
  --color-ink-faint:   #7883a0;
  --color-ink-invert:  #04122e;

  /* One accent hue, four roles */
  --color-accent:        #4d8dff;
  --color-accent-bright: #8fb6ff;
  --color-accent-deep:   #1c46a8;
  --color-accent-2:      #5fdfe6;

  /* State — reserved, never decorative */
  --color-pos:  #3ad0c0;
  --color-warn: #e8c15a;
  --color-neg:  #f2795f;

  /* Depth — replaces Tailwind's flat shadow scale.
     Three parts: lit edge / seated shade / tinted ambient. */
  --shadow-lift:  inset 0 1px 0 rgb(255 255 255 / 0.06),
                  0 16px 40px -20px rgb(77 141 255 / 0.22);
  --shadow-solid: inset 0 1px 0 rgb(255 255 255 / 0.4),
                  inset 0 -1px 3px rgb(5 18 46 / 0.28),
                  0 8px 26px -8px rgb(77 141 255 / 0.55);
  --shadow-solid-hover: inset 0 1px 0 rgb(255 255 255 / 0.5),
                  inset 0 -1px 3px rgb(5 18 46 / 0.28),
                  0 16px 42px -8px rgb(77 141 255 / 0.7);

  /* Fluid type — the gate (C11) rejects fixed display sizes */
  --text-hero:    clamp(2.4rem, 6.4vw, 4.4rem);
  --text-h2:      clamp(1.8rem, 3.8vw, 2.7rem);
  --text-lead:    clamp(1.05rem, 1.6vw, 1.28rem);

  /* One easing */
  --ease-site: cubic-bezier(0.2, 0.75, 0.2, 1);
  --ease-pop:  cubic-bezier(0.2, 0.9, 0.3, 1.2);

  /* Measure caps in ch (C13) */
  --spacing-measure:      58ch;
  --spacing-measure-wide: 62ch;
  --spacing-measure-card: 34ch;
}

@layer base {
  html { scroll-behavior: smooth; overflow-x: hidden; background: var(--color-ground); }
  body {
    background: transparent;             /* let the fixed backdrop show through */
    color: var(--color-ink);
    letter-spacing: -0.011em;
    overflow-x: hidden;
    max-width: 100vw;
  }
  /* G35 — the default ring is invisible on dark surfaces */
  *:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 3px;
    border-radius: 5px;
  }
  h1, h2, h3 { text-wrap: balance; letter-spacing: -0.03em; line-height: 1.05; }
  p { text-wrap: pretty; }
}

@layer utilities {
  .glass {
    background: rgb(255 255 255 / 0.04);
    backdrop-filter: blur(14px) saturate(125%);
    -webkit-backdrop-filter: blur(14px) saturate(125%);
    border: 1px solid var(--color-hair);
  }
  .tnum { font-variant-numeric: tabular-nums; }
  .grain { /* see references/ambient.md — paste the fixed layer verbatim */ }
}

/* E24 — ships with the page or the page is broken.
   !important is load-bearing: it must beat inline style={{animation}}. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0ms !important;
    transition: none !important;
  }
  .rev, .stagger > * { opacity: 1; transform: none; filter: none; }
  html { scroll-behavior: auto; }
}
```

Now `shadow-lift`, `shadow-solid`, `text-hero`, `ease-site`, `max-w-measure`, `text-ink-soft`, `border-hair` are all real utilities.

---

## 2 · Class translations

| Instead of | Use | Why |
|---|---|---|
| `shadow-md` / `shadow-lg` | `shadow-lift` | flat default shadow — gate A3 |
| `text-5xl md:text-7xl` | `text-hero` | fixed steps instead of fluid — C11 |
| `text-gray-400` | `text-ink-soft` | keeps the four-stop scale — B8 |
| `border-gray-800` | `border-hair` | one hairline token |
| `max-w-2xl` on prose | `max-w-measure` | measure must be in `ch` — C13 |
| `ease-out` / `ease-in-out` | `ease-site` | one curve across the site — E22 |
| `hover:scale-105` on a card | `hover:-translate-y-[3px]` | lift, don't zoom — E28 |
| `bg-white/5 backdrop-blur` | `glass` | blur without `saturate` is grey plastic — A4 |

---

## 3 · React primitives

### `Reveal` — scroll reveal, fires once

```tsx
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.unobserve(e.target); } },
      { threshold: 0.16 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform,filter] duration-[800ms] ease-site ${
        shown ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-[22px] blur-[5px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
```

The reduced-motion early return matters: without it the element stays at `opacity-0` when the observer is suppressed, and the gate's `E24L` live check catches exactly that — invisible content, not just missing animation.

### `CountUp` — animated figure that lands on its value

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

export function CountUp({ to, decimals = 0, suffix = "", locale = "en-US" }:
  { to: number; decimals?: number; suffix?: string; locale?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) { setV(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 1000);
        setV(to * (1 - Math.pow(1 - p, 3)));         // easeOutCubic
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.16 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref} className="tnum">
      {v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
```

`tnum` is not optional — proportional digits make the number visibly jitter as it counts. And see the locale trap in `motion.md`: `it-IT` does not group four-digit numbers while `en-US` does, so the same counter is a glyph wider in one locale.

### Ambient layers in `layout.tsx`

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative">
        {/* backdrop lives on body::before in CSS — see ambient.md */}
        <div className="grain" aria-hidden />
        <div className="relative z-[2]">{children}</div>
      </body>
    </html>
  );
}
```

Every ambient layer needs `aria-hidden` and `pointer-events-none` (gate `G36`), and any section containing halos needs `overflow-x-clip` (gate `A6`) or you ship the iOS horizontal-scroll bug.

---

## 4 · Running the gate on a Tailwind project

The static pass reads `.tsx`/`.jsx` as well as CSS, so class-name violations are caught in components:

```bash
node scripts/scaudit.mjs ./src ./app
```

The browser pass needs a running dev server:

```bash
node scripts/scaudit.mjs ./src --live http://localhost:3000
```

Wire it into CI once the gate is green — it exits non-zero on any failure:

```json
{ "scripts": { "design:gate": "node scripts/scaudit.mjs ./src ./app" } }
```
