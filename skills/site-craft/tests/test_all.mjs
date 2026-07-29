#!/usr/bin/env node
/**
 * site-craft — test suite.
 *
 *   node tests/test_all.mjs            static rules + helpers
 *   node tests/test_all.mjs --live     also exercises the browser pass
 *
 * Every rule is proven twice: it must FIRE on a fixture that violates it
 * and stay QUIET on one that doesn't. A linter that only ever fires is a
 * random number generator; one that never fires is decoration.
 *
 * No dependencies. Node 18+.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditFiles, hexToHsl, hueFamilies, layers, atRuleBody, dedupe,
  contentText, styleText, cssRules, collect,
} from '../scripts/scaudit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, extra = '') {
  if (cond) { pass++; return; }
  fail++; failures.push(`${name}${extra ? ' — ' + extra : ''}`);
}

/** Build a synthetic single-file corpus. A fixture with no `<` is bare CSS
 *  and must be named .css — otherwise styleText() looks for a <style> block,
 *  finds none, and every style rule silently reads an empty corpus. */
const f = (text, name) => [{ file: name ?? (text.includes('<') ? 'fixture.html' : 'fixture.css'), text }];

/** Status of one rule id over a corpus. */
function statusOf(id, files) {
  const r = auditFiles(files).find((x) => x.id === id);
  return r ? r.status : 'missing';
}

/* ══════════════════════════ 1 · helpers ══════════════════════════ */

ok('hexToHsl pure red', (() => { const h = hexToHsl('#ff0000'); return h.h === 0 && h.s === 1; })());
ok('hexToHsl pure green hue 120', Math.round(hexToHsl('#00ff00').h) === 120);
ok('hexToHsl pure blue hue 240', Math.round(hexToHsl('#0000ff').h) === 240);
ok('hexToHsl grey has zero saturation', hexToHsl('#808080').s === 0);
ok('hexToHsl expands 3-digit shorthand', Math.round(hexToHsl('#f00').h) === 0);
ok('hexToHsl rejects malformed', hexToHsl('#12345') === null);

ok('hueFamilies ignores near-neutrals',
   hueFamilies(f('a{color:#808080} b{color:#7d7d7d} c{color:#828282}')).count === 0);
ok('hueFamilies counts one family for a monochrome ramp',
   hueFamilies(f('a{color:#4d8dff} b{color:#8fb6ff} c{color:#1c46a8}')).count === 1);
ok('hueFamilies separates distant hues',
   hueFamilies(f('a{color:#ff0000} b{color:#00ff00} c{color:#0000ff}')).count === 3);

ok('layers splits top-level commas', layers('0 1px 0 red, 0 2px 4px blue').length === 2);
ok('layers does not split inside rgb()',
   layers('0 1px 0 rgba(0,0,0,.5), inset 0 2px 4px blue').length === 2);
ok('layers keeps a single layer whole', layers('inset 0 1px 0 rgba(1,2,3,.4)').length === 1);

ok('atRuleBody spans nested braces', (() => {
  const css = '@media (prefers-reduced-motion:reduce){ *{animation:none} .rev{opacity:1} }';
  const [body] = atRuleBody(css, /@media[^{]*prefers-reduced-motion[^{]*/gi);
  return /opacity\s*:\s*1/.test(body);        // the bug this replaced stopped at the first }
})(), 'must not stop at the first nested closing brace');
ok('atRuleBody returns empty for no match',
   atRuleBody('a{b:c}', /@media[^{]*nothing[^{]*/gi).length === 0);

ok('dedupe collapses identical locations',
   dedupe([{ file: 'a', line: 1, text: 'x' }, { file: 'a', line: 1, text: 'x' }]).length === 1);
ok('dedupe keeps distinct locations',
   dedupe([{ file: 'a', line: 1, text: 'x' }, { file: 'a', line: 2, text: 'x' }]).length === 2);

ok('contentText strips script bodies',
   !contentText({ file: 'a.html', text: '<p>hi</p><script>unlock()</script>' }).includes('unlock'));
ok('contentText strips style bodies',
   !contentText({ file: 'a.html', text: '<style>.seamless{color:red}</style><p>hi</p>' }).includes('seamless'));
ok('contentText keeps visible copy',
   contentText({ file: 'a.html', text: '<h1>Close the month</h1>' }).includes('Close the month'));
ok('contentText strips HTML comments',
   !contentText({ file: 'a.html', text: '<!-- supercharge --><p>ok</p>' }).includes('supercharge'));

ok('styleText extracts <style> blocks',
   styleText({ file: 'a.html', text: '<style>.a{color:red}</style>' }).includes('color:red'));
ok('styleText treats a .css file as all style',
   styleText({ file: 'a.css', text: '.a{color:red}' }).includes('color:red'));
ok('cssRules pairs selector with body',
   cssRules('.a,.b{pointer-events:none}')[0].sel === '.a,.b');

/* ══════════════════════════ 2 · rules fire ══════════════════════════ */

const BAD = {
  A1: 'body{background:#fff}',
  A3: '.c{box-shadow:0 4px 6px rgba(0,0,0,0.1)}',
  A4: '.g{backdrop-filter:blur(10px)}',
  A6: '.halo{position:absolute;filter:blur(20px);background:radial-gradient(circle,#4d8dff,transparent)}',
  B7: 'a{color:#ff0000}b{color:#00ff00}c{color:#0000ff}d{color:#ff00ff}',
  B8: 'a{color:#111}b{color:#222}c{color:#333}d{color:#444}e{color:#555}f{color:#666}g{color:#777}',
  C11: 'h1{font-size:48px}',
  C12: 'h1{font-size:clamp(1rem,2vw,3rem)}',
  C13: 'p{max-width:700px}',
  C15: '<p>we closed 1200 accounts</p><style>p{color:red}</style>',
  E22: '.a{transition:all .3s cubic-bezier(.1,.2,.3,.4)}.b{transition:all .3s cubic-bezier(.5,.6,.7,.8)}.c{transition:all .3s cubic-bezier(.9,.1,.2,.3)}',
  E23: '<script>const io=new IntersectionObserver(()=>{});io.observe(x)</script>',
  E24: '.a{color:red}',
  E25: '<style>.rev{opacity:0}@media (prefers-reduced-motion:reduce){*{animation:none}}</style>',
  E28: '.card:hover{transform:scale(1.05)}',
  F29: '<p>Unlock the power of seamless collaboration</p>',
  F30: '<p>Fast, secure and reliable for every team</p>',
  F31: '<a href="#">Get Started</a>',
  F32: '<h2>Features</h2>',
  F33: '<p>Fast 🚀 and simple</p>',
  G35: '.a{outline:none}',
  G36: '.grain{position:fixed;opacity:.038}',
  G37: '<html><head><title>Hi</title></head></html>',
  G38: '<html><head></head><body>x</body></html>',
  G41: '<p>No data available</p>',
};

for (const [id, text] of Object.entries(BAD)) {
  const st = statusOf(id, f(text));
  ok(`${id} fires on a violating fixture`, st === 'fail' || st === 'warn', `got "${st}"`);
}

/* ══════════════════════════ 3 · rules stay quiet ══════════════════════════ */

// The corrected example is the canonical "clean" corpus.
const AFTER = collect(path.join(ROOT, 'examples', 'after.html'));
ok('after.html fixture is readable', AFTER.length === 1);

const afterResults = auditFiles(AFTER);
for (const r of afterResults) {
  ok(`${r.id} stays quiet on the corrected page`, r.status === 'pass' || r.status === 'skip',
     `got "${r.status}": ${r.detail}`);
}

/* Targeted negatives — each rule silenced by the specific fix it asks for. */
const GOOD = {
  A3: '.c{box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 8px 26px -8px rgba(77,141,255,.5)}',
  A4: '.g{backdrop-filter:blur(14px) saturate(125%)}',
  E22: '.a{transition:all .3s cubic-bezier(.2,.75,.2,1)}.b{transition:all .3s cubic-bezier(.2,.9,.3,1.2)}',
  E23: '<script>const io=new IntersectionObserver(e=>{io.unobserve(e[0].target)});io.observe(x)</script>',
  E28: '.card:hover{transform:translateY(-3px)}',
  F31: '<a href="#">Run my first close</a>',
  F32: '<h2>Three things a spreadsheet cannot do.</h2>',
  G36: '.grain,.halo{position:fixed;pointer-events:none}',
};
for (const [id, text] of Object.entries(GOOD)) {
  const st = statusOf(id, f(text));
  ok(`${id} is silenced by its own fix`, st === 'pass' || st === 'skip', `got "${st}"`);
}

/* Grouped-selector inertness — the false positive that G36 used to produce. */
ok('G36 accepts inertness declared on a grouped selector',
   statusOf('G36', f('.halo,.halo-sm{pointer-events:none}.halo{width:380px}')) === 'pass');

/* Multi-layer shadows — the false skip that A3b used to produce. */
ok('A3b reads ambient layers inside a mixed declaration',
   statusOf('A3b', f('.b{box-shadow:inset 0 1px 0 #fff, 0 8px 26px -8px rgba(1,2,3,.4)}')) === 'pass');
ok('A3b flags an ambient layer with no negative spread',
   statusOf('A3b', f('.b{box-shadow:inset 0 1px 0 #fff, 0 8px 26px rgba(1,2,3,.4)}')) === 'warn');

/* ══════════════════════════ 4 · count-up logic ══════════════════════════ */

const fmt = (n, d, loc = 'en-US') =>
  n.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });
const ease = (p) => 1 - Math.pow(1 - p, 3);

ok('easeOutCubic lands exactly on 1', ease(1) === 1);
ok('easeOutCubic starts at 0', ease(0) === 0);
ok('easeOutCubic is monotonic',
   Array.from({ length: 60 }, (_, i) => i / 59).every((p, i, a) => i === 0 || ease(p) >= ease(a[i - 1])));
ok('easeOutCubic is intermediate at the midpoint', ease(0.5) > 0 && ease(0.5) < 1);
ok('count-up reaches its target value', fmt(2.7 * ease(1), 1) === '2.7');
ok('it-IT decimal comma', fmt(2.7, 1, 'it-IT') === '2,7');
ok('it-IT does NOT group four digits', fmt(1080, 0, 'it-IT') === '1080');
ok('it-IT groups five digits', fmt(10800, 0, 'it-IT') === '10.800');
ok('en-US groups four digits', fmt(1080, 0, 'en-US') === '1,080');
ok('locale width differs between it and en — size for the longer',
   fmt(1080, 0, 'it-IT').length !== fmt(1080, 0, 'en-US').length);

/* ══════════════════════════ 5 · end to end ══════════════════════════ */

const BEFORE = collect(path.join(ROOT, 'examples', 'before.html'));
const beforeResults = auditFiles(BEFORE);
const beforeFails = beforeResults.filter((r) => r.status === 'fail').length;
const afterFails = afterResults.filter((r) => r.status === 'fail').length;

ok('before.html trips the gate', beforeFails >= 15, `${beforeFails} failures`);
ok('after.html clears the gate', afterFails === 0, `${afterFails} failures`);
ok('the pair separates cleanly', beforeFails > afterFails + 10);

/* ══════════════════════════ 6 · browser pass (opt-in) ══════════════════════════ */

if (process.argv.includes('--live')) {
  const { livePass } = await import('../scripts/scaudit.mjs');
  const live = await livePass(path.join(ROOT, 'examples', 'after.html'));
  const skipped = live.every((r) => r.status === 'skip');
  if (skipped) {
    console.log('\n  note: browser pass skipped — playwright not installed\n');
  } else {
    for (const r of live) ok(`live ${r.id} passes on the corrected page`, r.status === 'pass', r.detail);
    const liveBad = await livePass(path.join(ROOT, 'examples', 'before.html'));
    ok('live pass finds defects the static pass cannot',
       liveBad.some((r) => r.status === 'fail'),
       'expected horizontal-scroll and/or reduced-motion failures on before.html');
  }
}

/* ══════════════════════════ 7 · extraction ══════════════════════════ */

const { parseColor, toHsl, contrast: xcontrast, assignRoles, hex: xhex } =
  await import('../scripts/scextract.mjs');

ok('parseColor reads 6-digit hex', (() => { const c = parseColor('#4d8dff'); return c.r === 77 && c.g === 141 && c.b === 255; })());
ok('parseColor expands 3-digit hex', (() => { const c = parseColor('#f00'); return c.r === 255 && c.g === 0 && c.b === 0; })());
ok('parseColor reads rgb()', (() => { const c = parseColor('rgb(10, 20, 30)'); return c.r === 10 && c.b === 30 && c.a === 1; })());
ok('parseColor reads rgba() alpha', parseColor('rgba(0,0,0,0.5)').a === 0.5);
ok('parseColor reads hsl()', (() => { const c = parseColor('hsl(0, 100%, 50%)'); return c.r === 255 && c.g === 0; })());
ok('parseColor treats transparent as alpha 0', parseColor('transparent').a === 0);
ok('parseColor returns null for oklch (documented limit)', parseColor('oklch(0.7 0.18 160)') === null);
ok('parseColor returns null for nonsense', parseColor('banana') === null);

ok('contrast white-on-black is 21:1', Math.round(xcontrast({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })) === 21);
ok('contrast is symmetric',
   xcontrast({ r: 20, g: 30, b: 40 }, { r: 200, g: 210, b: 220 }) === xcontrast({ r: 200, g: 210, b: 220 }, { r: 20, g: 30, b: 40 }));
ok('contrast of a colour with itself is 1', xcontrast({ r: 77, g: 141, b: 255 }, { r: 77, g: 141, b: 255 }) === 1);

/** Synthetic observations: a light page with a purple brand and stray hues. */
const obsLight = [
  { c: parseColor('#ffffff'), kind: 'bg', weight: 900000, sel: 'body' },
  { c: parseColor('#f4f5f8'), kind: 'bg', weight: 40000, sel: '.card' },
  { c: parseColor('#6d28d9'), kind: 'accent', weight: 4000, sel: 'a' },
  { c: parseColor('#111111'), kind: 'ink', weight: 4096, sel: 'h1' },
  { c: parseColor('#5a5a5a'), kind: 'ink', weight: 400, sel: 'p' },
  { c: parseColor('#ec4899'), kind: 'ink', weight: 120, sel: '.tag' },
  { c: parseColor('#f59e0b'), kind: 'other', weight: 80, sel: '.badge' },
];
const rolesL = assignRoles(obsLight);

ok('extract detects light polarity', rolesL.polarity === 'light');
ok('extract takes the most-painted background as the ground', rolesL.color.ground === '#ffffff');
ok('extract picks a near-neutral second surface, not a brand fill',
   toHsl(parseColor(rolesL.color.ground2)).s < 0.3, rolesL.color.ground2);
ok('extract finds the brand accent', rolesL.color.accent.toLowerCase() === '#6d28d9', rolesL.color.accent);
ok('extract reports the hue families it dropped', rolesL.dropped.length >= 2, JSON.stringify(rolesL.dropped));

const ramp = ['ink', 'inkSoft', 'inkFaint'].map((k) => xcontrast(parseColor(rolesL.color[k]), parseColor(rolesL.color.ground)));
ok('ink ramp is strictly descending', ramp[0] > ramp[1] && ramp[1] > ramp[2], ramp.join(' > '));
ok('ink ramp stops are at least 1.25x apart',
   ramp[0] / ramp[1] >= 1.24 && ramp[1] / ramp[2] >= 1.24, ramp.map((x) => x.toFixed(2)).join(' '));
ok('primary ink clears WCAG AA on the ground', ramp[0] >= 4.5, ramp[0].toFixed(2));
ok('on-accent text is readable', xcontrast(parseColor(rolesL.color.inkInvert), parseColor(rolesL.color.accent)) >= 4.5);
ok('accent clears 3:1 against the ground', rolesL.contrast.accentOnGround >= 3);

ok('--accent overrides the heuristic',
   assignRoles(obsLight, { accent: '#0f766e' }).color.accent.toLowerCase() === '#0f766e');

const obsDark = [
  { c: parseColor('#06080f'), kind: 'bg', weight: 900000, sel: 'body' },
  { c: parseColor('#4d8dff'), kind: 'accent', weight: 4000, sel: 'a' },
  { c: parseColor('#e8ecf5'), kind: 'ink', weight: 4096, sel: 'h1' },
];
const rolesD = assignRoles(obsDark);
ok('extract detects dark polarity', rolesD.polarity === 'dark');
ok('dark ink ramp also clears AA',
   xcontrast(parseColor(rolesD.color.ink), parseColor(rolesD.color.ground)) >= 4.5);

/* State hues stay conventional, and move only on a real collision. */
const greenBrand = assignRoles([
  { c: parseColor('#ffffff'), kind: 'bg', weight: 900000, sel: 'body' },
  { c: parseColor('#10b981'), kind: 'accent', weight: 4000, sel: 'a' },
  { c: parseColor('#111111'), kind: 'ink', weight: 4096, sel: 'h1' },
]);
ok('a red "negative" stays red when the brand is green',
   (() => { const h = toHsl(parseColor(greenBrand.color.neg)).h; return h < 40 || h > 330; })(),
   `hue ${Math.round(toHsl(parseColor(greenBrand.color.neg)).h)}°`);
ok('"positive" moves off the accent when the brand is green',
   Math.abs(toHsl(parseColor(greenBrand.color.pos)).h - toHsl(parseColor(greenBrand.color.accent)).h) > 25);
ok('the positive/accent collision is reported',
   greenBrand.notes.some((n) => /positive/i.test(n)));

/* ══════════════════════════ 8 · variants clear their own gate ══════════════════════════ */

const { DIRECTIONS, page: vpage } = await import('../scripts/scvariants.mjs');

ok('four directions are shipped', DIRECTIONS.length === 4);
ok('direction ids are unique', new Set(DIRECTIONS.map((d) => d.id)).size === DIRECTIONS.length);

for (const tok of [{ label: 'light', t: rolesL }, { label: 'dark', t: rolesD }]) {
  for (const d of DIRECTIONS) {
    const corpus = [
      { file: `${d.id}/tokens.css`, text: d.css(tok.t) },
      { file: `${d.id}/index.html`, text: vpage(tok.t, d, 'Testbrand') },
    ];
    const res = auditFiles(corpus);
    const bad = res.filter((r) => r.status === 'fail' || r.status === 'warn');
    ok(`variant "${d.id}" (${tok.label}) clears the gate`, bad.length === 0,
       bad.map((r) => `${r.id}: ${r.detail}`).join(' | '));
  }
}

/* The directions must be genuinely different, not one palette in four hats. */
const shapes = DIRECTIONS.map((d) => {
  const css = d.css(rolesL);
  return {
    id: d.id,
    radius: (css.match(/--radius:\s*(\d+)px/) || [])[1],
    glass: /backdrop-filter/.test(css),
    halos: /\.halo/.test(css),
  };
});
ok('the four directions use four different radii',
   new Set(shapes.map((s) => s.radius)).size === 4, shapes.map((s) => `${s.id}:${s.radius}`).join(' '));
ok('only some directions use glass', new Set(shapes.map((s) => s.glass)).size === 2);
ok('only some directions use halos', new Set(shapes.map((s) => s.halos)).size === 2);

/* B7 must not punish a complete state palette. */
ok('B7 excludes state-bound colours from the family count',
   statusOf('B7', f(':root{--accent:#4d8dff;--pos:#10b981;--warn:#e8c15a;--neg:#f2795f}')) === 'pass');
ok('B7 still fails on decorative extra hues',
   statusOf('B7', f(':root{--a:#4d8dff;--b:#10b981;--c:#e8c15a;--d:#f2795f}')) === 'fail');

/* A3 must not punish a contact layer inside a composed stack. */
ok('A3 accepts a tight contact layer inside a multi-layer shadow',
   statusOf('A3', f('.c{box-shadow:inset 0 1px 0 #fff, 0 2px 4px rgba(1,2,3,.1), 0 24px 48px -20px rgba(1,2,3,.3)}')) === 'pass');
ok('A3 still fails on a lone default shadow',
   statusOf('A3', f('.c{box-shadow:0 2px 4px rgba(0,0,0,0.1)}')) === 'fail');

/* E27 must not punish a one-shot rAF. */
ok('E27 accepts a rAF guarded by a terminating condition',
   statusOf('E27', f('<script>function s(t){if(p<1) requestAnimationFrame(s)}</script>')) === 'pass');
ok('E27 still warns on a perpetual loop',
   statusOf('E27', f('<script>function m(){raf=requestAnimationFrame(m)}m()</script>')) === 'warn');

/* ══════════════════════════ report ══════════════════════════ */

const total = pass + fail;
console.log(`\n${'─'.repeat(52)}`);
if (fail) {
  console.log('FAILURES:');
  for (const m of failures) console.log('  ✗ ' + m);
  console.log('');
}
console.log(`${pass}/${total} assertions pass${fail ? ` · ${fail} FAIL` : ' — ALL GREEN'}`);
process.exit(fail ? 1 : 0);
