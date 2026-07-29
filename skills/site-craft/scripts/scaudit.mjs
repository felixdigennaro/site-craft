#!/usr/bin/env node
/**
 * site-craft audit — the anti-slop gate, executable.
 *
 *   node scripts/scaudit.mjs <dir-or-file> [...] [options]
 *
 *   --live <url|file>   also run the browser pass (needs playwright)
 *   --json              machine-readable output
 *   --strict            treat SKIP and WARN as failures
 *   --quiet             only print failures
 *
 * Exit code: 0 = clean, 1 = at least one FAIL (or WARN/SKIP under --strict).
 *
 * Zero required dependencies. Node 18+. The static pass always runs;
 * the browser pass degrades to SKIP when playwright is not installed,
 * and says so rather than silently passing.
 */

import fs from 'node:fs';
import path from 'node:path';

const CODE_EXT = new Set(['.html', '.htm', '.css', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.svelte-kit']);

/* ─────────────────────────── collection ─────────────────────────── */

function collect(target, acc = []) {
  const st = fs.statSync(target);
  if (st.isDirectory()) {
    if (SKIP_DIR.has(path.basename(target))) return acc;
    for (const e of fs.readdirSync(target)) collect(path.join(target, e), acc);
  } else if (CODE_EXT.has(path.extname(target).toLowerCase())) {
    acc.push({ file: target, text: fs.readFileSync(target, 'utf8') });
  }
  return acc;
}

/** Style-ish text: css files, <style> blocks, and inline style attributes. */
function styleText(f) {
  const ext = path.extname(f.file).toLowerCase();
  if (ext === '.css') return f.text;
  let out = '';
  for (const m of f.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) out += m[1] + '\n';
  for (const m of f.text.matchAll(/style\s*=\s*(["'`])([\s\S]*?)\1/gi)) out += m[2] + '\n';
  for (const m of f.text.matchAll(/style\s*=\s*\{\{([\s\S]*?)\}\}/g)) out += m[1] + '\n';
  return out;
}

/** Visible copy: HTML text nodes and JSX text, minus script/style/comments. */
function contentText(f) {
  const ext = path.extname(f.file).toLowerCase();
  if (ext === '.css') return '';
  return f.text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Collapse hits that point at the same source location — several rules
 *  match the same declaration (a `0 4px 6px rgba(0,0,0,.1)` trips both the
 *  offset pattern and the colour pattern) and it must count once. */
function dedupe(hits) {
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${h.file}:${h.line}:${h.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Find every match of `re` across files, in the given projection. */
function scan(files, re, project = styleText) {
  const hits = [];
  for (const f of files) {
    const body = project(f);
    if (!body) continue;
    for (const m of body.matchAll(re)) {
      hits.push({ file: f.file, line: lineOf(body, m.index), text: m[0].trim().slice(0, 90) });
    }
  }
  return hits;
}

/* ─────────────────────────── tiny CSS reader ─────────────────────────── */

/** Body of an at-rule, found by counting braces — a non-greedy regex stops
 *  at the first nested `}` and silently reads only the first inner rule. */
function atRuleBody(css, headRe) {
  const out = [];
  for (const m of css.matchAll(headRe)) {
    let i = css.indexOf('{', m.index);
    if (i === -1) continue;
    let depth = 0, j = i;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) break;
    }
    out.push(css.slice(i + 1, j));
  }
  return out;
}

/** Flat list of {sel, body} for every plain rule, at-rules included. */
function cssRules(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    out.push({ sel: m[1].trim(), body: m[2], index: m.index });
  }
  return out;
}

/** Split a shorthand value on top-level commas (multi-layer box-shadow). */
function layers(value) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of value) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim());
}

/* ─────────────────────────── colour maths ─────────────────────────── */

function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let hue;
  if (mx === r) hue = 60 * (((g - b) / d) % 6);
  else if (mx === g) hue = 60 * ((b - r) / d + 2);
  else hue = 60 * ((r - g) / d + 4);
  if (hue < 0) hue += 360;
  return { h: hue, s, l };
}

/** Distinct chromatic hue families (30° bins), ignoring near-neutrals. */
function hueFamilies(files) {
  const bins = new Set();
  const sample = new Map();
  for (const f of files) {
    for (const m of styleText(f).matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
      const hsl = hexToHsl(m[0]);
      if (!hsl) continue;
      if (hsl.s < 0.22) continue;              // grey / near-grey → not a hue
      if (hsl.l < 0.06 || hsl.l > 0.96) continue;
      const bin = Math.floor(hsl.h / 30);
      bins.add(bin);
      if (!sample.has(bin)) sample.set(bin, m[0]);
    }
  }
  return { count: bins.size, samples: [...sample.values()] };
}

/* ─────────────────────────── rules ─────────────────────────── */

const BANNED = [
  'unlock', 'unleash', 'supercharge', 'revolutioniz', 'empower',
  'seamless', 'game-chang', 'game chang', 'one-stop', 'cutting-edge',
  "in today's", 'take it to the next level', 'best-in-class', 'delve',
];

const LABEL_H2 = /^(features?|pricing|about|about us|testimonials?|how it works|faq|contact|contact us|our services|benefits|why choose us\??)$/i;

const rules = [
  /* ── A · Background & depth ───────────────────────────────── */
  {
    id: 'A1', line: 'Ambient layers present (≥2)',
    run: ({ files }) => {
      const grain = scan(files, /feTurbulence|fractalNoise|noise\.(png|svg|webp)/gi, (f) => f.text).length;
      const halo = scan(files, /radial-gradient[^;]{0,160}/gi).filter((h) => /transparent|rgba?\(|0%/.test(h.text)).length;
      const backdrop = scan(files, /position\s*:\s*fixed[^}]{0,200}z-index\s*:\s*-\d|z-index\s*:\s*-\d[^}]{0,200}position\s*:\s*fixed/gi).length;
      const grid = scan(files, /background-size\s*:\s*\d+px\s+\d+px/gi).length;
      const n = [grain, halo, backdrop || grid].filter((x) => x > 0).length;
      return n >= 2
        ? { status: 'pass', detail: `${n}/3 layer families (grain=${grain} halo=${halo} backdrop=${backdrop || grid})` }
        : { status: 'fail', detail: `only ${n}/3 layer families — a flat background is the loudest slop tell` };
    },
  },
  {
    id: 'A3', line: 'No default flat shadows',
    run: ({ files }) => {
      const hits = dedupe([
        ...scan(files, /box-shadow\s*:[^;{}]*\b0 4px 6px[^;{}]*/gi),
        ...scan(files, /box-shadow\s*:[^;{}]*\b0 2px 4px[^;{}]*/gi),
        ...scan(files, /box-shadow\s*:[^;{}]*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.1\s*\)[^;{}]*/gi),
        ...scan(files, /(?:^|["'\s])shadow-(?:sm|md|lg|xl|2xl)(?=["'\s]|$)/g, (f) => f.text),
      ]);
      return hits.length
        ? { status: 'fail', detail: `${hits.length} default shadow(s)`, hits }
        : { status: 'pass', detail: 'no framework-default shadows' };
    },
  },
  {
    id: 'A3b', line: 'Ambient shadows use negative spread',
    run: ({ files }) => {
      // A declaration can mix inset and ambient layers — judge each layer,
      // not the whole declaration, or a single `inset` hides the rest.
      const decls = scan(files, /box-shadow\s*:[^;{}]+/gi);
      const amb = [];
      for (const d of decls) {
        for (const l of layers(d.text.replace(/^[^:]*:/, ''))) {
          if (!/inset/i.test(l) && !/^\s*(none|0)\s*$/i.test(l)) amb.push({ ...d, text: l });
        }
      }
      if (!amb.length) return { status: 'skip', detail: 'no ambient (non-inset) shadow layers' };
      const bad = amb.filter((h) => !/\s-\d+(\.\d+)?(px|rem)/.test(h.text));
      return bad.length
        ? { status: 'warn', detail: `${bad.length}/${amb.length} ambient shadow layer(s) with no negative spread`, hits: bad.slice(0, 5) }
        : { status: 'pass', detail: `${amb.length} ambient shadow layer(s), all with negative spread` };
    },
  },
  {
    id: 'A4', line: 'Glass uses saturate(), not blur alone',
    run: ({ files }) => {
      const blurs = scan(files, /backdrop-filter\s*:[^;{}]+/gi);
      if (!blurs.length) return { status: 'skip', detail: 'no backdrop-filter used' };
      const bad = blurs.filter((h) => !/saturate/i.test(h.text));
      return bad.length
        ? { status: 'fail', detail: `${bad.length}/${blurs.length} blur without saturate — renders as grey plastic`, hits: bad.slice(0, 5) }
        : { status: 'pass', detail: `${blurs.length} glass surface(s), all saturated` };
    },
  },
  {
    id: 'A6', line: 'Halo containers clip horizontally',
    run: ({ files }) => {
      const halos = scan(files, /\.halo|radial-gradient\([^)]*\)[^;]*;\s*filter\s*:\s*blur/gi);
      if (!halos.length) return { status: 'skip', detail: 'no halos detected' };
      const clip = scan(files, /overflow-x\s*:\s*(clip|hidden)/gi).length;
      return clip
        ? { status: 'pass', detail: `${halos.length} halo(s), overflow-x clipped` }
        : { status: 'fail', detail: 'halos present but no overflow-x:clip — causes iOS horizontal scroll' };
    },
  },

  /* ── B · Colour ───────────────────────────────────────────── */
  {
    id: 'B7', line: 'One accent hue family (≤3 chromatic families)',
    run: ({ files }) => {
      const { count, samples } = hueFamilies(files);
      if (count === 0) return { status: 'skip', detail: 'no chromatic colours found' };
      return count <= 3
        ? { status: 'pass', detail: `${count} hue famil${count === 1 ? 'y' : 'ies'}: ${samples.join(' ')}` }
        : { status: 'fail', detail: `${count} hue families: ${samples.join(' ')} — more than accent + state` };
    },
  },
  {
    id: 'B8', line: 'Four ink stops in use',
    run: ({ files }) => {
      const toks = new Set();
      for (const f of files) {
        for (const m of styleText(f).matchAll(/--(?:ink|text|fg|foreground|content)[\w-]*\s*:/gi)) {
          toks.add(m[0].replace(/\s*:$/, '').trim().toLowerCase());
        }
      }
      const colours = new Set(scan(files, /(?:^|[;{\s])color\s*:\s*([^;{}]+)/gi).map((h) => h.text.split(':')[1].trim().toLowerCase()));
      // Literal colours that are themselves var() references count as tokens.
      const literals = new Set([...colours].filter((c) => !/^var\(/.test(c)));
      if (toks.size >= 4) return { status: 'pass', detail: `${toks.size} ink tokens` };
      if (toks.size === 0 && literals.size > 6) {
        return { status: 'fail', detail: `${literals.size} ad-hoc text colours and no ink tokens — that is a pile, not a scale` };
      }
      const n = Math.max(toks.size, literals.size);
      return n >= 4
        ? { status: 'warn', detail: `${n} text stops but only ${toks.size} tokenised — hierarchy exists, it just isn't a system` }
        : { status: 'fail', detail: `${n} text stop(s) — under four there is no readable hierarchy` };
    },
  },

  /* ── C · Typography ───────────────────────────────────────── */
  {
    id: 'C11', line: 'Display sizes are fluid (clamp)',
    run: ({ files }) => {
      const sizes = scan(files, /font-size\s*:[^;{}]+/gi);
      if (!sizes.length) return { status: 'skip', detail: 'no font-size declarations' };
      const fluid = sizes.filter((h) => /clamp\(|vw\b/.test(h.text)).length;
      return fluid > 0
        ? { status: 'pass', detail: `${fluid}/${sizes.length} fluid` }
        : { status: 'fail', detail: `0/${sizes.length} font-size uses clamp() or vw` };
    },
  },
  {
    id: 'C12', line: 'text-wrap balance / pretty set',
    run: ({ files }) => {
      const n = scan(files, /text-wrap\s*:\s*(balance|pretty)/gi).length;
      return n ? { status: 'pass', detail: `${n} declaration(s)` }
               : { status: 'fail', detail: 'no text-wrap:balance/pretty — headings will widow' };
    },
  },
  {
    id: 'C13', line: 'Measure capped in ch',
    run: ({ files }) => {
      const n = scan(files, /max-width\s*:\s*\d+(\.\d+)?ch/gi).length;
      return n ? { status: 'pass', detail: `${n} measure cap(s) in ch` }
               : { status: 'fail', detail: 'no max-width in ch — paragraphs run full-bleed on wide screens' };
    },
  },
  {
    id: 'C15', line: 'Numbers use tabular figures',
    run: ({ files }) => {
      const hasDigits = files.some((f) => /\d{2,}/.test(contentText(f)));
      const n = scan(files, /font-variant-numeric\s*:[^;{}]*tabular-nums|tabular-nums/gi, (f) => f.text).length;
      if (!hasDigits) return { status: 'skip', detail: 'no multi-digit numbers on the page' };
      return n ? { status: 'pass', detail: `${n} declaration(s)` }
               : { status: 'fail', detail: 'numbers present but no tabular-nums — counters will jitter' };
    },
  },

  /* ── E · Motion ───────────────────────────────────────────── */
  {
    id: 'E22', line: 'One easing across the site (≤2 curves)',
    run: ({ files }) => {
      const set = new Set(scan(files, /cubic-bezier\([^)]+\)/gi).map((h) => h.text.replace(/\s/g, '')));
      if (!set.size) return { status: 'skip', detail: 'no custom easing used' };
      return set.size <= 2
        ? { status: 'pass', detail: `${set.size} curve(s): ${[...set].join(' ')}` }
        : { status: 'fail', detail: `${set.size} distinct curves — motion reads as noise: ${[...set].slice(0, 4).join(' ')}` };
    },
  },
  {
    id: 'E23', line: 'Scroll reveal fires once (unobserve)',
    run: ({ files }) => {
      const io = scan(files, /new IntersectionObserver/g, (f) => f.text).length;
      if (!io) return { status: 'skip', detail: 'no IntersectionObserver' };
      const un = scan(files, /\.unobserve\s*\(/g, (f) => f.text).length;
      return un ? { status: 'pass', detail: `${io} observer(s), ${un} unobserve call(s)` }
                : { status: 'fail', detail: 'observer never unobserves — reveals re-trigger on every pass' };
    },
  },
  {
    id: 'E24', line: 'prefers-reduced-motion block present',
    run: ({ files }) => {
      const n = scan(files, /@media[^{]*prefers-reduced-motion/gi).length;
      return n ? { status: 'pass', detail: `${n} block(s)` }
               : { status: 'fail', detail: 'no reduced-motion block — the page is broken, not stylish' };
    },
  },
  {
    id: 'E25', line: 'Reduced motion resets hidden resting states',
    run: ({ files }) => {
      const has = scan(files, /@media[^{]*prefers-reduced-motion/gi).length;
      if (!has) return { status: 'skip', detail: 'no reduced-motion block (see E24)' };
      const hidden = scan(files, /opacity\s*:\s*0\b(?!\.)/gi).length;
      if (!hidden) return { status: 'pass', detail: 'nothing rests at opacity:0' };
      const blocks = [];
      for (const f of files) {
        blocks.push(...atRuleBody(styleText(f), /@media[^{]*prefers-reduced-motion[^{]*/gi));
      }
      const resets = blocks.join('\n');
      return /opacity\s*:\s*1/.test(resets)
        ? { status: 'pass', detail: 'resting opacity:0 states are reset' }
        : { status: 'fail', detail: `${hidden} element(s) rest at opacity:0 and the reduced-motion block never resets them — content stays invisible` };
    },
  },
  {
    id: 'E27', line: 'rAF loops cancel on visibilitychange',
    run: ({ files }) => {
      const raf = scan(files, /requestAnimationFrame/g, (f) => f.text).length;
      if (!raf) return { status: 'skip', detail: 'no rAF loops' };
      const vis = scan(files, /visibilitychange/g, (f) => f.text).length;
      return vis ? { status: 'pass', detail: `${raf} rAF call(s), visibility handled` }
                 : { status: 'warn', detail: 'rAF loops never pause in a background tab' };
    },
  },
  {
    id: 'E28', line: 'No scale-on-hover for cards',
    run: ({ files }) => {
      const hits = scan(files, /:hover[^{}]*\{[^{}]*transform\s*:[^;{}]*scale\([^)]*\)[^{}]*\}/gi);
      return hits.length
        ? { status: 'fail', detail: `${hits.length} scale-on-hover rule(s) — lift, don't zoom`, hits: hits.slice(0, 4) }
        : { status: 'pass', detail: 'no scale-on-hover' };
    },
  },

  /* ── F · Copy ─────────────────────────────────────────────── */
  {
    id: 'F29', line: 'No banned phrasing',
    run: ({ files }) => {
      const hits = [];
      for (const f of files) {
        const body = contentText(f);
        const low = body.toLowerCase();
        for (const b of BANNED) {
          let i = low.indexOf(b);
          while (i !== -1) {
            hits.push({ file: f.file, line: 0, text: body.slice(Math.max(0, i - 20), i + b.length + 25).trim() });
            i = low.indexOf(b, i + b.length);
          }
        }
      }
      return hits.length
        ? { status: 'fail', detail: `${hits.length} banned phrase(s)`, hits: hits.slice(0, 6) }
        : { status: 'pass', detail: 'clean' };
    },
  },
  {
    id: 'F30', line: 'Numbers present in the copy',
    run: ({ files }) => {
      const body = files.map(contentText).join(' ');
      const nums = body.match(/(?<![\w#-])\d[\d.,]*\s*(%|x|×|k\b|m\b|s\b|ms\b|days?|hours?|minutes?|seconds?|€|\$|£)/gi) || [];
      return nums.length >= 3
        ? { status: 'pass', detail: `${nums.length} concrete figure(s)` }
        : { status: 'fail', detail: `${nums.length} concrete figure(s) — a page of adjectives reads as generated` };
    },
  },
  {
    id: 'F31', line: 'CTA labels name outcomes',
    run: ({ files }) => {
      const hits = [];
      for (const f of files) {
        for (const m of f.text.matchAll(/<(?:a|button)\b[^>]*>([\s\S]{0,60}?)<\/(?:a|button)>/gi)) {
          const label = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (/^(get started|learn more|sign up( free)?|contact us|submit|read more|click here|try now)$/i.test(label)) {
            hits.push({ file: f.file, line: lineOf(f.text, m.index), text: label });
          }
        }
      }
      return hits.length
        ? { status: 'fail', detail: `${hits.length} generic CTA label(s)`, hits }
        : { status: 'pass', detail: 'CTA labels are specific' };
    },
  },
  {
    id: 'F32', line: 'H2s are claims, not labels',
    run: ({ files }) => {
      const hits = [];
      for (const f of files) {
        for (const m of f.text.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
          const t = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (LABEL_H2.test(t)) hits.push({ file: f.file, line: lineOf(f.text, m.index), text: t });
        }
      }
      return hits.length
        ? { status: 'fail', detail: `${hits.length} label-style H2(s)`, hits }
        : { status: 'pass', detail: 'no label-style H2s' };
    },
  },
  {
    id: 'F33', line: 'No emoji in UI',
    run: ({ files }) => {
      const re = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu;
      const hits = scan(files, re, contentText);
      return hits.length
        ? { status: 'fail', detail: `${hits.length} emoji in visible copy`, hits: hits.slice(0, 5) }
        : { status: 'pass', detail: 'no emoji' };
    },
  },

  /* ── G · Craft ────────────────────────────────────────────── */
  {
    id: 'G35', line: 'Explicit :focus-visible ring',
    run: ({ files }) => {
      const n = scan(files, /:focus-visible/gi).length;
      return n ? { status: 'pass', detail: `${n} rule(s)` }
               : { status: 'fail', detail: 'no :focus-visible — the default ring is invisible on dark surfaces' };
    },
  },
  {
    id: 'G36', line: 'Ambient layers are inert',
    run: ({ files }) => {
      // A class is inert if ANY rule targeting it declares pointer-events:none —
      // grouped selectors (`.halo,.halo-sm{…}`) set it for the whole group.
      const NAMES = ['grain', 'halo', 'halo-sm', 'spot', 'spotlight', 'grid-bg', 'aurora', 'bloom'];
      const present = [], leaky = [];
      for (const name of NAMES) {
        const sel = new RegExp(`\\.${name}(?![\\w-])`);
        let seen = false, inert = false;
        for (const f of files) {
          for (const r of cssRules(styleText(f))) {
            if (!sel.test(r.sel)) continue;
            seen = true;
            if (/pointer-events\s*:\s*none/i.test(r.body)) inert = true;
          }
        }
        if (seen) { present.push(name); if (!inert) leaky.push(name); }
      }
      if (!present.length) return { status: 'skip', detail: 'no named ambient layers' };
      return leaky.length
        ? { status: 'fail', detail: `${leaky.length}/${present.length} ambient layer(s) still intercept clicks: .${leaky.join(' .')}` }
        : { status: 'pass', detail: `${present.length} layer(s), all pointer-events:none` };
    },
  },
  {
    id: 'G37', line: 'Custom favicon',
    run: ({ files }) => {
      const html = files.filter((f) => /\.html?$/i.test(f.file));
      if (!html.length) return { status: 'skip', detail: 'no HTML entry point' };
      const n = scan(html, /<link[^>]+rel=["'][^"']*icon/gi, (f) => f.text).length;
      return n ? { status: 'pass', detail: `${n} icon link(s)` }
               : { status: 'fail', detail: 'no favicon — the framework default is a tell' };
    },
  },
  {
    id: 'G38', line: 'Title and meta description',
    run: ({ files }) => {
      const html = files.filter((f) => /\.html?$/i.test(f.file));
      if (!html.length) return { status: 'skip', detail: 'no HTML entry point' };
      const t = scan(html, /<title>[^<]{3,}<\/title>/gi, (f) => f.text).length;
      const d = scan(html, /<meta[^>]+name=["']description["'][^>]*>/gi, (f) => f.text).length;
      if (t && d) return { status: 'pass', detail: 'both present' };
      return { status: 'fail', detail: `${t ? '' : 'no <title>. '}${d ? '' : 'no meta description.'}`.trim() };
    },
  },
  {
    id: 'G41', line: 'Empty / error states written',
    run: ({ files }) => {
      const hits = scan(files, /no data available|an error occurred|something went wrong|nothing to show|no results found/gi, contentText);
      return hits.length
        ? { status: 'fail', detail: `${hits.length} placeholder state string(s)`, hits }
        : { status: 'pass', detail: 'no boilerplate state strings' };
    },
  },
];

/* ─────────────────────────── live pass ─────────────────────────── */

const liveRules = [
  { id: 'D17', line: 'No horizontal scroll at 390px' },
  { id: 'D18', line: 'Primary CTA above the fold at 1280×720' },
  { id: 'E24L', line: 'Nothing invisible under reduced motion' },
  { id: 'G40', line: 'Console clean' },
];

async function livePass(target) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return liveRules.map((r) => ({ ...r, status: 'skip', detail: 'playwright not installed — run `npm i -D playwright` for the browser pass' }));
  }
  const url = /^https?:\/\//.test(target) ? target : 'file://' + path.resolve(target);
  const browser = await chromium.launch();
  const out = [];
  try {
    // D17 — narrow viewport
    let page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url, { waitUntil: 'load' });
    const sw = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: innerWidth }));
    out.push({ ...liveRules[0], status: sw.s <= sw.w + 1 ? 'pass' : 'fail', detail: `scrollWidth ${sw.s} vs viewport ${sw.w}` });
    await page.close();

    // D18 + G40 — laptop viewport
    const errs = [];
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });
    const cta = await page.evaluate(() => {
      // Priority order, not one selector list: a comma-separated list returns
      // the first match in DOCUMENT order, which is usually the header button,
      // not the hero's primary CTA — and the header always clears the fold.
      const PRIORITY = ['[data-cta="primary"]', '.btn-solid', '.btn-primary',
                        'main .btn', 'section .btn', 'section a[href]', '.btn', 'button'];
      let el = null;
      for (const sel of PRIORITY) {
        for (const c of document.querySelectorAll(sel)) {
          if (c.closest('header, nav')) continue;      // chrome, not the CTA
          if (!c.getClientRects().length) continue;
          el = c; break;
        }
        if (el) break;
      }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { bottom: Math.round(r.bottom), vh: innerHeight, label: (el.textContent || '').trim().slice(0, 40) };
    });
    out.push(cta === null
      ? { ...liveRules[1], status: 'skip', detail: 'no CTA element found' }
      : { ...liveRules[1], status: cta.bottom < cta.vh ? 'pass' : 'fail', detail: `"${cta.label}" bottom ${cta.bottom} / viewport ${cta.vh}` });
    out.push({ ...liveRules[3], status: errs.length ? 'fail' : 'pass', detail: errs.length ? errs.slice(0, 3).join(' | ') : 'no console errors' });
    await page.close();

    // E24L — reduced motion
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 720 } });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const invisible = await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (!el.getClientRects().length) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'absolute') continue;
        if (parseFloat(cs.opacity) < 0.05 && (el.textContent || '').trim().length > 8) n++;
      }
      return n;
    });
    out.push({ ...liveRules[2], status: invisible === 0 ? 'pass' : 'fail', detail: invisible ? `${invisible} text element(s) stuck invisible` : 'all content painted' });
    await ctx.close();
  } finally {
    await browser.close();
  }
  return out;
}

/* ─────────────────────────── report ─────────────────────────── */

const ICON = { pass: '✓ PASS', fail: '✗ FAIL', warn: '! WARN', skip: '- SKIP' };

function render(results, opts) {
  const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
  const lines = [];
  for (const r of results) {
    counts[r.status]++;
    if (opts.quiet && r.status === 'pass') continue;
    lines.push(`${ICON[r.status].padEnd(7)}  ${r.id.padEnd(5)} ${r.line}`);
    if (r.detail) lines.push(`${''.padEnd(9)}${r.detail}`);
    for (const h of (r.hits || []).slice(0, 4)) {
      lines.push(`${''.padEnd(9)}↳ ${path.relative(process.cwd(), h.file)}${h.line ? ':' + h.line : ''}  ${h.text}`);
    }
  }
  const total = results.length;
  lines.push('');
  lines.push(`${counts.pass}/${total} pass · ${counts.fail} fail · ${counts.warn} warn · ${counts.skip} skip`);
  lines.push(counts.fail === 0
    ? (counts.warn === 0 ? 'GATE GREEN — ship it.' : 'GATE GREEN with warnings.')
    : counts.fail <= 3 ? `GATE RED — ${counts.fail} line(s) to fix.`
    : `GATE RED — ${counts.fail} lines. That is a direction problem, not a detail problem: go back to the direction lock.`);
  return { text: lines.join('\n'), counts };
}

/* ─────────────────────────── api ─────────────────────────── */

/** Run the static pass over an in-memory file list. Used by the CLI
 *  below and by tests/test_all.mjs, which feeds it synthetic fixtures
 *  so every rule can be proven to fire AND to stay quiet. */
export function auditFiles(files) {
  return rules.map((r) => {
    try {
      return { id: r.id, line: r.line, ...r.run({ files }) };
    } catch (e) {
      return { id: r.id, line: r.line, status: 'warn', detail: 'rule error: ' + e.message };
    }
  });
}

export { rules, liveRules, livePass, render, collect, hexToHsl, hueFamilies, layers, atRuleBody, dedupe, contentText, styleText, cssRules };

/* ─────────────────────────── main ─────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const opts = {
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
    quiet: argv.includes('--quiet'),
    live: (() => { const i = argv.indexOf('--live'); return i !== -1 ? argv[i + 1] : null; })(),
  };
  const targets = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--live');

  if (!targets.length) {
    console.error('usage: node scaudit.mjs <dir-or-file> [...] [--live <url|file>] [--json] [--strict] [--quiet]');
    process.exit(2);
  }

  const files = targets.flatMap((t) => collect(t));
  if (!files.length) {
    console.error('no auditable files found (looked for: ' + [...CODE_EXT].join(' ') + ')');
    process.exit(2);
  }

  const results = auditFiles(files);

  if (opts.live) results.push(...(await livePass(opts.live)));
  else results.push(...liveRules.map((r) => ({ ...r, status: 'skip', detail: 'browser pass not requested (--live <url|file>)' })));

  const { text, counts } = render(results, opts);

  if (opts.json) console.log(JSON.stringify({ files: files.length, counts, results }, null, 2));
  else {
    console.log(`\nsite-craft audit — ${files.length} file(s)\n${'─'.repeat(60)}`);
    console.log(text);
  }

  const failed = counts.fail + (opts.strict ? counts.warn + counts.skip : 0);
  process.exit(failed ? 1 : 0);
}

// Only run the CLI when executed directly, so tests can import the rules.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scaudit.mjs')) {
  await main();
}
