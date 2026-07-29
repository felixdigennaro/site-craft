# Ambient layers

**A flat background is the loudest AI-slop tell there is.** Every page gets at least two of these, ideally three. They cost almost nothing and they carry most of the perceived quality.

All ambient layers are `pointer-events:none` and `aria-hidden`. None of them ever intercept a click or reach a screen reader.

## Layer stack (z-index contract)

| z | layer | behaviour |
|---|---|---|
| `-1` | backdrop (canvas / starfield / grid) | `position:fixed`, never scrolls |
| `1` | cursor spotlight | follows pointer, eased |
| `2` | content (`.wrap`) | the page |
| `30` | header | fixed, blurred |
| `45` | grain | `position:fixed`, `mix-blend-mode:overlay` |

Halos are `position:absolute` *inside* content and sit below their element — they are not part of this global stack.

---

## 1 · Backdrop — pick one

### 1a. Canvas scene (highest effort, highest payoff)

A worked case: a glowing globe sitting below the fold that rises and dims as you scroll. The pattern generalises to any slow scene — an orbit, a horizon, a drifting field.

```js
(function(){
  const cv = document.getElementById('bg'); if(!cv) return;
  const x = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const mob = innerWidth < 640;
  let W,H,dpr,raf,cx,cy,R;

  function size(){
    // cap DPR at 2 (1 on mobile) — retina at 3x on a full-screen
    // canvas is where the frame budget goes to die
    dpr = Math.min(devicePixelRatio||1, mob?1:2);
    W = innerWidth; H = innerHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    cv.style.width = W+'px'; cv.style.height = H+'px';
    x.setTransform(dpr,0,0,dpr,0,0);
    cx = W/2; cy = H*1.30; R = Math.min(W*.60, H*1.02);
  }
  size(); addEventListener('resize', size);

  // Two scroll signals: raw for opacity (must respond instantly),
  // eased for position (must feel like parallax).
  let sf=0, sfc=0;
  addEventListener('scroll', ()=>{
    sf = scrollY / ((document.documentElement.scrollHeight - innerHeight) || 1);
  }, {passive:true});

  function frame(t){
    sfc += (sf - sfc) * .05;                     // lerp — the whole trick
    // bright in the hero, fades to a low ambient so it never eats text
    cv.style.opacity = (0.10 + 0.32*(1 - Math.min(1, sf*7))).toFixed(3);

    /* …draw the scene at (cx, cy - sfc*H*0.12, R)… */
    // use globalCompositeOperation='lighter' for glows, then restore
    // to 'source-over'. Add a slow breathe: 0.6 + Math.sin(t*.0009)*.12

    raf = requestAnimationFrame(frame);
  }

  if (reduce){ frame(0); cancelAnimationFrame(raf); }   // one static frame
  else {
    raf = requestAnimationFrame(frame);
    // stop burning CPU in a background tab
    document.addEventListener('visibilitychange', ()=>{
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(frame);
    });
  }
})();
```

Four things make this feel expensive rather than gimmicky:
- **lerp** (`sfc += (sf-sfc)*.05`) — nothing snaps to scroll position
- **breathe** (`sin(t*.0009)`) — the rim light pulses slowly, so the scene is alive when the user isn't
- **opacity keyed to scroll** — bright behind the hero, ~0.10 everywhere else, so it never competes with body text
- **`lighter` composite for glows** — additive light, not painted-on white

### 1b. Fixed SVG / image backdrop (low effort)

A fixed starfield or texture. Watch the stacking trap: if `body` has an opaque background it covers `body::before`.

```css
html { background-color: #0a0a0a; }          /* fallback if the SVG fails */
body { background-color: transparent;        /* so the layer below shows */
       position: relative; }
body::before{
  content:""; position:fixed; inset:0; z-index:-1;
  background-image:url("/backgrounds/stars.svg");
  background-size:cover; background-position:center;
  pointer-events:none;
}
```

Consequence to respect everywhere else: **sections must use translucent surfaces** (`rgba(255,255,255,.02)`, `rgba(0,0,0,.4)`) rather than solid `#0a0a0a`, or they punch a hole through the backdrop.

### 1c. Hairline grid (technical / terminal register)

```css
.grid-bg::before{
  content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size:64px 64px;
  mask-image:radial-gradient(ellipse at 50% 0%, #000 20%, transparent 75%);
}
```

The `mask-image` matters — an edge-to-edge grid reads as a wireframe, a masked one reads as depth.

---

## 2 · Halos

Large blurred radial glows behind key elements — CTA clusters, stat rows, section heads.

```html
<div class="halo-sm" aria-hidden style="top:-40px;left:30%;width:460px;height:200px"></div>
```

See `.halo` / `.halo-sm` in `tokens.css`. Two rules:

1. **The parent needs `overflow-x: clip`.** A 380px absolute glow on a 390px viewport pushes `scrollWidth` past the window and triggers iOS Safari rubber-banding — user-visible as "the card is cut off on the right". It reaches production easily because it is invisible on every desktop screenshot; `scaudit` checks it at 390px for exactly this reason.
2. **Two halos, offset, different sizes** (one at `left:30%`, one at `left:70%`, `aria-hidden` both). One centred halo reads as a spotlight; two offset read as atmosphere.

---

## 3 · Grain

The cheapest quality-per-byte on the whole page. Inline SVG turbulence, no network request.

```css
.grain{
  position:fixed; inset:0; z-index:45; pointer-events:none;
  opacity:.038;                       /* .03–.045. Above .06 it reads as dirt. */
  mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:140px;
}
```

`mix-blend-mode:overlay` is what makes it sit *in* the image rather than *on* it. `multiply` or plain opacity both look like a dirty screen.

---

## 4 · Cursor spotlight

Desktop only, and only when motion is allowed.

```css
#spot{
  position:fixed; left:0; top:0; width:640px; height:640px; z-index:1;
  pointer-events:none; border-radius:50%; transform:translate(-50%,-50%);
  opacity:0; transition:opacity .5s; mix-blend-mode:screen;
  background:radial-gradient(circle,
    rgba(77,141,255,.11), rgba(95,223,230,.04) 42%, transparent 65%);
}
```

```js
(function(){
  if (reduce || matchMedia('(hover:none)').matches) return;   // never on touch
  const spot = document.getElementById('spot'); if(!spot) return;
  let tx=innerWidth/2, ty=innerHeight/2, cx=tx, cy=ty;
  addEventListener('pointermove', e=>{ tx=e.clientX; ty=e.clientY; spot.style.opacity='1'; });
  addEventListener('pointerleave', ()=> spot.style.opacity='0');
  (function move(){
    cx += (tx-cx)*.1; cy += (ty-cy)*.1;                       // trails, never snaps
    spot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(move);
  })();
})();
```

The `*.1` lerp is the whole effect. A spotlight pinned exactly to the cursor feels like a bug; one that trails feels like light.

---

## 5 · Sections that need to breathe through a busy backdrop

When a diagram or a dense block sits over an active backdrop, give it its own dark pocket rather than turning the backdrop off:

```css
#flow{ position:relative }
#flow::before{
  content:""; position:absolute; inset:-6% -10%; z-index:-1; pointer-events:none;
  background:radial-gradient(66% 60% at 50% 54%,
    rgba(5,7,13,.72) 16%, rgba(5,7,13,.4) 50%, transparent 80%);
}
```

And mask the element's own top and bottom edges so it melts into the sections above and below instead of sitting in a box:

```css
.flow{
  -webkit-mask:linear-gradient(to bottom,transparent 0,#000 15%,#000 85%,transparent 100%);
          mask:linear-gradient(to bottom,transparent 0,#000 15%,#000 85%,transparent 100%);
}
```

Edge-masking instead of bordering is a large part of why a page reads as composed rather than assembled from cards.
