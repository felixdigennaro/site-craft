# Motion grammar

One easing, one vocabulary, a hard budget. Motion that varies its easing per element reads as noise; motion that shares one curve reads as a system.

```css
--ease:     cubic-bezier(.2,.75,.2,1);    /* everything */
--ease-pop: cubic-bezier(.2,.9,.3,1.2);   /* only things that physically pop in */
```

## Budget

| Where | What | Duration |
|---|---|---|
| Hero, on load | stagger rise | .9s, ~110ms apart, max 5 items |
| Section, on scroll | reveal (fade + rise + deblur) | .8s |
| Numbers, on reveal | count-up easeOutCubic | 1.0s |
| Bars / rings, on reveal | width fill | 1.1s |
| Hover | lift + border + shadow | .28–.35s |
| Ambient loops | sheen, pulse, conic spin | 3–8s, low contrast |

Anything outside this table needs a reason. Parallax on text, scale-on-hover for cards, and bounce easing on anything that isn't a small pop-in are all out.

---

## 1 · Hero stagger (on load)

```css
.stagger > *{
  opacity:0; transform:translateY(16px);
  animation:rise .9s var(--ease) forwards;
}
.stagger > *:nth-child(1){ animation-delay:.05s }
.stagger > *:nth-child(2){ animation-delay:.16s }
.stagger > *:nth-child(3){ animation-delay:.28s }
.stagger > *:nth-child(4){ animation-delay:.40s }
@keyframes rise{ to{ opacity:1; transform:none } }
```

Keep the last delay under ~450ms. Past that the page reads as slow even when the data was instant — a real regression we hit once with a 500ms duration and ten staggered elements, where the last item landed ~1.2s after mount.

## 2 · Scroll reveal

The three-property reveal. The `blur` is what makes it feel like focus pulling rather than a fade.

```css
.rev{
  opacity:0; transform:translateY(22px); filter:blur(5px);
  transition:opacity .8s var(--ease), transform .8s var(--ease), filter .8s;
}
.rev.in{ opacity:1; transform:none; filter:none }
```

## 3 · The observer — one for the whole page

One `IntersectionObserver` drives reveals, counters, and bar fills, then unobserves. Re-triggering on every scroll pass is the difference between "alive" and "twitchy".

```js
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');

    e.target.querySelectorAll('[data-count]').forEach(countUp);
    e.target.querySelectorAll('[data-w]').forEach(i => i.style.width = i.dataset.w + '%');

    io.unobserve(e.target);          // fire once, then stop watching
  });
}, { threshold:.16 });               // .16 ≈ "a sixth of it is on screen"

document.querySelectorAll('.rev').forEach(el => io.observe(el));
```

`threshold: .16` is tuned: at `0` things animate while still off-screen, at `.5` tall sections never fire at all on short viewports.

## 4 · Count-up

Every headline number animates. easeOutCubic, ~1s, locale-formatted, tabular figures (see `tokens.css`).

```js
function fmt(n,d,locale='it-IT'){
  return n.toLocaleString(locale,{minimumFractionDigits:d,maximumFractionDigits:d});
}
function countUp(el){
  const target = parseFloat(el.dataset.count);
  const dec    = parseInt(el.dataset.dec || '0');
  const suffix = el.dataset.suf || '';
  if (reduce){ el.textContent = fmt(target,dec)+suffix; return; }   // land on the value
  const t0 = performance.now();
  (function step(t){
    const p = Math.min(1, (t-t0)/1000);
    const e = 1 - Math.pow(1-p, 3);                                 // easeOutCubic
    el.textContent = fmt(target*e, dec) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}
```

```html
<span class="tnum" data-count="2.7" data-dec="1" data-suf="%">0</span>
```

Under reduced motion it must **land on the final value**, not stay at 0. Getting this wrong turns an accessibility setting into a data bug.

**Locale trap on bilingual sites** (verified in Node, ICU `it-IT`): Italian does not group four-digit numbers, English does.

| value | `it-IT` | `en-US` |
|---|---|---|
| 1080 | `1080` | `1,080` |
| 10800 | `10.800` | `10,800` |

So the same counter is 4 glyphs wide in Italian and 5 in English, and it gains a separator mid-animation as it crosses 10 000. Two consequences: size the slot for the **longest locale**, and keep `font-variant-numeric: tabular-nums` on it — with proportional digits the number visibly jitters as it counts.

## 5 · Bars and rings

Width transitions from 0, triggered on reveal. Never on load — a bar that filled before you scrolled to it has already spent its moment.

```css
.track{ height:32px; border-radius:9px; background:rgba(150,180,255,.06); overflow:hidden }
.fill { height:100%; width:0; border-radius:9px;
        background:linear-gradient(90deg,var(--accent-deep),var(--accent));
        transition:width 1.1s var(--ease); }
```
```html
<div class="track"><div class="fill" data-w="62"></div></div>
```

## 6 · Sequenced scenes

When a section makes an argument in steps, stage it with `setTimeout` off the observer. Beats ~450ms apart — fast enough to hold attention, slow enough to read.

```js
if (e.target.id === 'stage1'){
  setTimeout(()=> document.getElementById('block').classList.add('gone'), 450);
  setTimeout(()=> document.getElementById('tiles').classList.add('in'),   650);
}
```

Grid children pop in with a `nth-child` transition-delay ramp and the overshoot easing:

```css
.tile{ opacity:0; transform:scale(.6) translateY(10px);
       transition:opacity .5s, transform .5s var(--ease-pop) }
.tiles.in .tile{ opacity:1; transform:none }
.tiles.in .tile:nth-child(1){ transition-delay:.02s }
.tiles.in .tile:nth-child(2){ transition-delay:.06s }
/* …+40ms each… */
```

## 7 · Magnetic primary CTA

Desktop, pointer devices, motion allowed. The button leans toward the cursor.

```js
if (!reduce && !matchMedia('(hover:none)').matches){
  document.querySelectorAll('.btn-solid').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r  = b.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width/2)  / r.width;
      const my = (e.clientY - r.top  - r.height/2) / r.height;
      b.style.transform = `translateY(-2px) translate(${mx*7}px,${my*5}px)`;
    });
    b.addEventListener('pointerleave', ()=> b.style.transform = '');
  });
}
```

7px / 5px. Past ~10px it stops feeling magnetic and starts feeling broken.

## 8 · Ambient loops

Slow, low-contrast, infinite. They keep the page alive when nothing is happening.

- **Sheen sweep** across the primary button — 4.8s, `translateX(-135%) → 135%`, pausing at both ends
- **Pulse dot** on the eyebrow — 2.6s opacity `1 → .4`
- **Conic border spin** on graphic boxes — 8s (`.lit-edge` in `tokens.css`)
- **Float** on a hero element — 6s, ±6px

All of them die under `prefers-reduced-motion`.

---

## 9 · Reduced motion — the close

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.001ms!important;
    animation-iteration-count:1!important;
    animation-delay:0ms!important;
    transition:none!important;
  }
  .rev,.stagger>*{ opacity:1; transform:none; filter:none }
  html{ scroll-behavior:auto }
}
```

Two things this must not break:
- **Nothing may be left invisible.** Anything whose resting state is `opacity:0` needs an explicit reset here.
- **Count-ups must show their final value** (handled in the JS above, not in CSS).

The `!important` is load-bearing — it has to beat inline `style={{animation}}` set by components.

## 10 · Performance floor

- Animate **`transform` and `opacity` only**. Never `width`/`height`/`top` on a loop. The bar-fill `width` transition is the sanctioned exception — it's one-shot, on a small element.
- `requestAnimationFrame`, never `setInterval`, for continuous motion.
- Cancel the rAF loop on `visibilitychange`.
- Cap canvas DPR at 2 (1 on mobile).
- Scroll listeners `{passive:true}`.
