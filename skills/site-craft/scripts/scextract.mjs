#!/usr/bin/env node
/**
 * site-craft extract — recover a disciplined token spine from a site that
 * already exists.
 *
 *   node scripts/scextract.mjs <dir-or-file> [...]        static pass
 *   node scripts/scextract.mjs --live <url|file>          browser pass (better)
 *   node scripts/scextract.mjs ./src --live http://localhost:3000
 *
 *   -o <file>    write JSON here (default: site-craft.tokens.json)
 *   --json       print the JSON to stdout instead of the human summary
 *
 * Two things this is NOT:
 *
 * 1. It is not a colour dump. A list of the 47 colours in a stylesheet is
 *    useless. This assigns ROLES — ground, panel, hair, four ink stops, one
 *    accent family, state colours — because roles are what a design system
 *    is and what the variants need.
 *
 * 2. It does not preserve the palette faithfully. It preserves the BRAND
 *    (the accent hue) and the polarity, then imposes discipline: an accent
 *    family, state colours, and nothing else. Every hue it drops is reported
 *    rather than silently discarded, so you can argue with the decision.
 *
 * The live pass weights every observation by painted area, which is the only
 * way to tell a page's ground from a colour that happens to appear often in
 * the stylesheet. Prefer it whenever a URL is available.
 *
 * Zero required dependencies. Node 18+.
 */

import fs from 'node:fs';
import path from 'node:path';
import { collect, styleText, cssRules } from './scaudit.mjs';

/* ─────────────────────────── colour ─────────────────────────── */

/** Parse hex / rgb() / rgba() / hsl() / hsla() into {r,g,b,a} 0-255 / 0-1. */
export function parseColor(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6) h += 'ff';
    if (h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\/\s]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\/\s]+/).filter(Boolean).map((x) => parseFloat(x));
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { ...hslToRgb(p[0], p[1] / 100, p[2] / 100), a: p.length > 3 ? p[3] : 1 };
  }
  return null;   // oklch/lab/color() — see the limits note in the README
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((t[0] + m) * 255), g: Math.round((t[1] + m) * 255), b: Math.round((t[2] + m) * 255) };
}

export function toHsl({ r, g, b }) {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === R ? 60 * (((G - B) / d) % 6) : mx === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

export const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

const rgba = ({ r, g, b }, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

/** WCAG relative luminance + contrast, used to place the ink ramp. */
function lum({ r, g, b }) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Mix two colours in sRGB. */
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

/* ─────────────────────────── observation ─────────────────────────── */

/** Static pass: every colour a stylesheet mentions, with the property that
 *  used it. No area weighting is possible, so roles are guessed from the
 *  property and the selector — noticeably weaker than the live pass. */
function observeStatic(files) {
  const obs = [];
  const push = (raw, kind, weight, sel) => {
    const c = parseColor(raw);
    if (c && c.a > 0.02) obs.push({ c, kind, weight, sel });
  };
  for (const f of files) {
    for (const r of cssRules(styleText(f))) {
      const isRoot = /^(:root|html|body|\*)\b/.test(r.sel);
      const isInteractive = /\b(a|button|\.btn|\[type|input|\.cta)\b/i.test(r.sel);
      for (const d of r.body.split(';')) {
        const [propRaw, ...rest] = d.split(':');
        if (!rest.length) continue;
        const prop = propRaw.trim().toLowerCase();
        const val = rest.join(':').trim();
        for (const raw of val.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) {
          if (/^background(-color)?$/.test(prop)) push(raw, 'bg', isRoot ? 60 : 8, r.sel);
          else if (prop === 'color') push(raw, 'ink', isInteractive ? 6 : 12, r.sel);
          else if (/^border(-[a-z]+)?(-color)?$/.test(prop)) push(raw, 'hair', 6, r.sel);
          else if (prop === 'box-shadow') push(raw, 'shadow', 2, r.sel);
          else if (prop.startsWith('--')) push(raw, isInteractive ? 'accent' : 'token', 10, r.sel);
          else push(raw, 'other', 2, r.sel);
        }
      }
    }
  }
  return obs;
}

/** Live pass: computed styles weighted by painted area — the only reliable
 *  way to tell the page's ground from a colour that is merely frequent. */
async function observeLive(target) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { return null; }

  const url = /^https?:\/\//.test(target) ? target : 'file://' + path.resolve(target);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let raw;
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    raw = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      for (const el of document.querySelectorAll('body *, body')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const area = Math.min(r.width, 2000) * Math.min(r.height, 4000);
        const leaf = !el.children.length && (el.textContent || '').trim().length > 0;
        out.push({
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderTopColor,
          borderW: parseFloat(cs.borderTopWidth) || 0,
          area, leaf,
          fs: parseFloat(cs.fontSize) || 0,
          fw: cs.fontWeight,
          ff: cs.fontFamily,
          radius: parseFloat(cs.borderTopLeftRadius) || 0,
          shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow,
          backdrop: cs.backdropFilter === 'none' ? '' : cs.backdropFilter,
          interactive: !!el.closest('a,button,[role="button"]'),
          tag: el.tagName,
        });
        if (out.length > 4000) break;
      }
      return { els: out, title: document.title };
    });
  } finally { await browser.close(); }

  const obs = [];
  for (const e of raw.els) {
    const bg = parseColor(e.bg);
    if (bg && bg.a > 0.02) obs.push({ c: bg, kind: 'bg', weight: e.area * bg.a, sel: e.tag });
    const ink = parseColor(e.color);
    // Text colour only counts where text actually renders, weighted by size:
    // a 64px headline states the ink scale far more than a 10px caption.
    if (ink && e.leaf) obs.push({ c: ink, kind: e.interactive ? 'accent' : 'ink', weight: e.fs * e.fs, sel: e.tag });
    const bd = parseColor(e.border);
    if (bd && bd.a > 0.02 && e.borderW > 0) obs.push({ c: bd, kind: 'hair', weight: e.area * 0.02, sel: e.tag });
  }
  return { obs, meta: raw };
}

/* ─────────────────────────── role assignment ─────────────────────────── */

const key = (c) => `${Math.round(c.r / 6)}_${Math.round(c.g / 6)}_${Math.round(c.b / 6)}`;

function cluster(obs, kind) {
  const m = new Map();
  for (const o of obs) {
    if (kind && o.kind !== kind) continue;
    const k = key(o.c);
    const cur = m.get(k) || { c: o.c, weight: 0, n: 0 };
    cur.weight += o.weight; cur.n++;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.weight - a.weight);
}

const CHROMATIC = (c) => { const h = toHsl(c); return h.s >= 0.22 && h.l > 0.06 && h.l < 0.96; };
const hueBin = (c) => Math.floor(toHsl(c).h / 30);

/** Keep a state colour on its conventional hue unless the accent sits on top
 *  of it, in which case push it far enough away to stay distinguishable. */
function stateHue(want, accentH) {
  const raw = Math.abs(want - accentH);
  const d = Math.min(raw, 360 - raw);            // circular distance, not distance-from-opposite
  return d < 32 ? (want + 42) % 360 : want;
}

/**
 * Turn raw observations into the spine. Returns the tokens plus a `notes`
 * array recording every judgement call, because an extractor that silently
 * decides what your brand colour is cannot be argued with.
 */
export function assignRoles(obs, opts = {}) {
  const notes = [];
  const bgs = cluster(obs, 'bg');
  const inks = cluster(obs, 'ink');
  const hairs = cluster(obs, 'hair');
  const accents = cluster(obs, 'accent');

  // ── Ground: the most-painted background.
  const ground = bgs[0]?.c || { r: 255, g: 255, b: 255, a: 1 };
  const gl = toHsl(ground).l;
  const dark = gl < 0.5;
  notes.push(`ground ${hex(ground)} → ${dark ? 'dark' : 'light'} polarity`);

  // ── Ground-2: a SECOND SURFACE, not merely another background. It must sit
  //    near the ground in lightness and stay near-neutral, or a brand-coloured
  //    hero fill or gradient stop gets promoted to a structural token.
  let ground2 = bgs.slice(1).find((b) => {
    const h = toHsl(b.c);
    const dl = Math.abs(h.l - gl);
    return dl > 0.015 && dl < 0.14 && h.s < 0.30;
  })?.c;
  if (!ground2) {
    ground2 = mix(ground, dark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }, 0.035);
    notes.push('no near-neutral second surface found — derived ground-2 from ground');
  }

  // ── Accent: the most chromatic colour, preferring ones seen on
  //    interactive elements. Falls back to any chromatic colour on the page.
  const chromatic = [...accents, ...inks, ...cluster(obs, 'token'), ...cluster(obs, 'other')]
    .filter((x) => CHROMATIC(x.c))
    .sort((a, b) => b.weight * toHsl(b.c).s - a.weight * toHsl(a.c).s);
  let accent = opts.accent ? parseColor(opts.accent) : chromatic[0]?.c;
  if (opts.accent && accent) {
    notes.push(`accent ${hex(accent)} supplied by --accent (heuristic would have picked ${chromatic[0] ? hex(chromatic[0].c) : 'nothing'})`);
  }
  if (!accent) {
    accent = dark ? { r: 77, g: 141, b: 255 } : { r: 37, g: 99, b: 201 };
    notes.push('no chromatic colour found — fell back to a neutral blue accent');
  } else if (!opts.accent) {
    const runnerUp = chromatic.slice(1, 4).filter((x) => hueBin(x.c) !== hueBin(accent)).map((x) => hex(x.c));
    notes.push(`accent ${hex(accent)} (hue ${Math.round(toHsl(accent).h)}°) taken as the brand` +
      (runnerUp.length ? ` — runners-up ${runnerUp.join(', ')}; override with --accent <hex> if this is wrong` : ''));
  }

  // ── Accent must carry text contrast against the ground; nudge if it can't.
  let acc = accent;
  let guard = 0;
  while (contrast(acc, ground) < 3 && guard++ < 24) {
    acc = mix(acc, dark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }, 0.06);
  }
  if (guard) notes.push(`accent lightened/darkened ${guard} step(s) to clear 3:1 against the ground`);
  const accentHsl = toHsl(acc);
  const posHue = stateHue(158, accentHsl.h);
  if (posHue !== 158) {
    notes.push(`the brand hue is green, so "positive" was moved to ${Math.round(posHue)}° to stay distinguishable from the accent`);
  }
  const bright = dark ? mix(acc, { r: 255, g: 255, b: 255 }, 0.34) : mix(acc, { r: 0, g: 0, b: 0 }, 0.26);
  const deep = dark ? mix(acc, { r: 0, g: 0, b: 0 }, 0.42) : mix(acc, { r: 0, g: 0, b: 0 }, 0.5);

  // ── Palette discipline: report every OTHER hue family, then drop it.
  // Count families across EVERY observation, not just the ones that fed a
  // role. A hue seen only in a gradient stop or a one-off badge is still a
  // hue being dropped, and reporting it is the whole point.
  const families = new Map();
  for (const x of cluster(obs)) {
    if (!CHROMATIC(x.c)) continue;
    const b = hueBin(x.c);
    families.set(b, (families.get(b) || 0) + x.weight);
  }
  const accentBin = hueBin(acc);
  const dropped = [...families.entries()].filter(([b]) => b !== accentBin)
    .sort((a, b) => b[1] - a[1]).map(([b]) => `${b * 30}-${b * 30 + 30}°`);
  if (dropped.length) {
    notes.push(`dropped ${dropped.length} other hue famil${dropped.length === 1 ? 'y' : 'ies'} (${dropped.slice(0, 5).join(', ')}) — the spine keeps one accent plus state colours`);
  }

  // ── Ink: four stops by contrast against the ground. Take observed text
  //    colours where they exist, then fill the ramp so all four are present.
  const inkPool = inks.filter((x) => contrast(x.c, ground) > 1.6)
    .sort((a, b) => contrast(b.c, ground) - contrast(a.c, ground));
  const target = [0.98, 0.66, 0.48];   // fraction of max available contrast
  const far = dark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const maxC = contrast(far, ground);
  /** The colour on `ground` whose contrast is closest to `want`. */
  const derive = (want) => {
    let lo = 0, hi = 1, c = far;
    for (let i = 0; i < 18; i++) {
      const t = (lo + hi) / 2; c = mix(ground, far, t);
      if (contrast(c, ground) < want) lo = t; else hi = t;
    }
    return c;
  };

  // Four stops only help if they are actually distinguishable. Each stop must
  // sit at least 1.25× below the one above it, or the ramp collapses — two
  // observed greys that happen to be near each other otherwise fill both slots
  // and the page ends up with two stops wearing four names.
  const MIN_RATIO = 1.25;
  const stops = [];
  for (const t of target) {
    const want = 1 + (maxC - 1) * t;
    const ceiling = stops.length ? contrast(stops[stops.length - 1], ground) / MIN_RATIO : Infinity;
    let best = null, bestErr = Infinity;
    for (const x of inkPool) {
      const cr = contrast(x.c, ground);
      if (cr > ceiling) continue;                       // too close to the stop above
      const err = Math.abs(cr - want);
      if (err < bestErr) { bestErr = err; best = x.c; }
    }
    if (best && bestErr < maxC * 0.14) { stops.push(best); continue; }
    stops.push(derive(Math.min(want, ceiling === Infinity ? want : ceiling)));
  }
  const inkInvert = contrast({ r: 255, g: 255, b: 255 }, acc) >= contrast({ r: 12, g: 18, b: 46 }, acc)
    ? { r: 255, g: 255, b: 255 } : { r: 12, g: 18, b: 46 };

  // ── Hairlines: derived from the ink direction, not from observation.
  //    Observed borders are usually a grab-bag of framework greys.
  const hairBase = dark ? { r: 255, g: 255, b: 255 } : { r: 12, g: 18, b: 46 };

  // ── Type: most common families, headline-weighted.
  const fonts = new Map();
  for (const o of obs) if (o.ff) fonts.set(o.ff, (fonts.get(o.ff) || 0) + o.weight);
  const fam = [...fonts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);

  return {
    polarity: dark ? 'dark' : 'light',
    color: {
      ground: hex(ground),
      ground2: hex(ground2),
      panel: rgba(hairBase, dark ? 0.035 : 0.025),
      panel2: rgba(hairBase, dark ? 0.065 : 0.05),
      hair: rgba(hairBase, dark ? 0.11 : 0.1),
      hairStrong: rgba(hairBase, dark ? 0.22 : 0.18),
      ink: hex(stops[0]),
      inkSoft: hex(stops[1]),
      inkFaint: hex(stops[2]),
      inkInvert: hex(inkInvert),
      accent: hex(acc),
      accentBright: hex(bright),
      accentDeep: hex(deep),
      accentGlow: rgba(acc, dark ? 0.22 : 0.16),
      // State colours are conventional, not derived: green reads as "good"
      // and red as "bad" regardless of the brand, and rotating them off the
      // accent (accent+140° etc.) lands "positive" on magenta often enough
      // to be worse than useless. Only nudged when the accent would collide.
      pos: hex(hslToRgb(posHue, 0.55, dark ? 0.52 : 0.34)),
      warn: hex(hslToRgb(stateHue(45, accentHsl.h), 0.62, dark ? 0.63 : 0.36)),
      neg: hex(hslToRgb(stateHue(10, accentHsl.h), 0.68, dark ? 0.66 : 0.42)),
    },
    type: {
      sans: fam[0] || '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Helvetica,Arial,sans-serif',
      display: fam.find((f) => f !== fam[0]) || fam[0] || '-apple-system,"Segoe UI",system-ui,sans-serif',
      mono: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace',
    },
    contrast: {
      inkOnGround: +contrast(stops[0], ground).toFixed(2),
      inkSoftOnGround: +contrast(stops[1], ground).toFixed(2),
      inkFaintOnGround: +contrast(stops[2], ground).toFixed(2),
      accentOnGround: +contrast(acc, ground).toFixed(2),
      inkInvertOnAccent: +contrast(inkInvert, acc).toFixed(2),
    },
    dropped,
    notes,
  };
}

/* ─────────────────────────── main ─────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const liveIdx = argv.indexOf('--live');
  const live = liveIdx !== -1 ? argv[liveIdx + 1] : null;
  const outIdx = argv.indexOf('-o');
  const out = outIdx !== -1 ? argv[outIdx + 1] : 'site-craft.tokens.json';
  const asJson = argv.includes('--json');
  const accIdx = argv.indexOf('--accent');
  const accent = accIdx !== -1 ? argv[accIdx + 1] : null;
  const targets = argv.filter((a, i) =>
    !a.startsWith('-') && argv[i - 1] !== '--live' && argv[i - 1] !== '-o' && argv[i - 1] !== '--accent');

  if (!targets.length && !live) {
    console.error('usage: node scextract.mjs <dir-or-file> [...] [--live <url|file>] [-o out.json] [--accent <hex>] [--json]');
    process.exit(2);
  }

  let obs = [], source = '';
  if (live) {
    const r = await observeLive(live);
    if (r) { obs = r.obs; source = `live: ${live}`; }
    else console.error('  ! playwright not installed — falling back to the static pass (weaker: no area weighting)\n');
  }
  if (!obs.length && targets.length) {
    obs = observeStatic(targets.flatMap((t) => collect(t)));
    source = `static: ${targets.join(' ')}`;
  }
  if (!obs.length) {
    console.error('no colours observed — check the path or URL');
    process.exit(2);
  }

  if (accent && !parseColor(accent)) { console.error(`--accent ${accent} is not a colour I can parse`); process.exit(2); }
  const tokens = { source, generated: 'site-craft extract', ...assignRoles(obs, { accent }) };
  fs.writeFileSync(out, JSON.stringify(tokens, null, 2));

  if (asJson) { console.log(JSON.stringify(tokens, null, 2)); return; }

  const c = tokens.color;
  console.log(`\nsite-craft extract — ${source}\n${'─'.repeat(62)}`);
  console.log(`polarity   ${tokens.polarity}`);
  console.log(`ground     ${c.ground}   ground-2 ${c.ground2}`);
  console.log(`ink        ${c.ink}  ${c.inkSoft}  ${c.inkFaint}   (on-accent ${c.inkInvert})`);
  console.log(`accent     ${c.accent}  bright ${c.accentBright}  deep ${c.accentDeep}`);
  console.log(`state      pos ${c.pos}  warn ${c.warn}  neg ${c.neg}`);
  console.log(`\ncontrast   ink ${tokens.contrast.inkOnGround}:1 · soft ${tokens.contrast.inkSoftOnGround}:1 ` +
              `· faint ${tokens.contrast.inkFaintOnGround}:1 · accent ${tokens.contrast.accentOnGround}:1`);
  const weak = Object.entries(tokens.contrast).filter(([k, v]) => k.startsWith('ink') && !k.includes('Faint') && v < 4.5);
  if (weak.length) console.log(`  ! ${weak.map(([k]) => k).join(', ')} below 4.5:1 — body text will not pass WCAG AA`);
  console.log('\nnotes');
  for (const n of tokens.notes) console.log('  · ' + n);
  console.log(`\nwrote ${out}`);
  console.log(`next:  node scripts/scvariants.mjs ${out} -o ./variants\n`);
}

if (process.argv[1]?.endsWith('scextract.mjs')) await main();
