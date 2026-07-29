#!/usr/bin/env node
/**
 * site-craft variants — four starting templates from one colour scheme.
 *
 *   node scripts/scvariants.mjs site-craft.tokens.json -o ./variants
 *   node scripts/scvariants.mjs site-craft.tokens.json -o ./variants --name "Acme"
 *   node scripts/scvariants.mjs site-craft.tokens.json --only ambient,soft
 *
 * The palette stays yours. What changes is everything else: how surfaces are
 * built, how depth is expressed, how dense the page is, how much it moves.
 * Those are the decisions that make two sites with identical colours look
 * like they came from different studios — and they are the ones a colour
 * picker cannot make for you.
 *
 *   ambient    glass over a lit backdrop; depth by glow. Product, fintech, AI.
 *   editorial  flat, generous, typographic. Writing, research, agencies.
 *   terminal   dense, gridded, monospaced data. Dashboards, dev tools.
 *   soft       rounded, layered, warm. Consumer, health, education.
 *
 * Every generated page is checked against the same gate the skill enforces —
 * a template that fails its own linter would be the one thing that discredits
 * the tool, so the test suite asserts all four come out clean.
 *
 * Zero required dependencies. Node 18+.
 */

import fs from 'node:fs';
import path from 'node:path';

/* ─────────────────────────── shared fragments ─────────────────────────── */

const GRAIN_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const grain = (opacity, blend) => `
.grain{
  position:fixed; inset:0; z-index:45; pointer-events:none;
  opacity:${opacity}; mix-blend-mode:${blend};
  background-image:${GRAIN_URI}; background-size:140px;
}`;

const reducedMotion = `
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.001ms!important; animation-iteration-count:1!important;
    animation-delay:0ms!important; transition:none!important;
  }
  .rev,.stagger>*{ opacity:1; transform:none; filter:none }
  html{ scroll-behavior:auto }
}`;

const revealCss = (ease, travel, blur) => `
.rev{opacity:0; transform:translateY(${travel}); ${blur ? `filter:blur(${blur});` : ''}
  transition:opacity .8s ${ease}, transform .8s ${ease}${blur ? `, filter .8s` : ''}}
.rev.in{opacity:1; transform:none; ${blur ? 'filter:none;' : ''}}`;

/* ─────────────────────────── the four directions ─────────────────────────── */

const DIRECTIONS = [
  {
    id: 'ambient',
    name: 'Ambient',
    blurb: 'Glass surfaces over a lit backdrop. Depth comes from glow rather than from shadow, and the page keeps moving quietly when nothing is happening.',
    fits: 'Product, fintech, AI, anything that wants to read as engineered.',
    css: (t) => {
      const c = t.color, dark = t.polarity === 'dark';
      const sheet = dark ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.72)';
      return `
:root{
  --ground:${c.ground}; --ground-2:${c.ground2};
  --panel:${c.panel}; --panel-2:${c.panel2};
  --hair:${c.hair}; --hair-strong:${c.hairStrong};
  --ink:${c.ink}; --ink-soft:${c.inkSoft}; --ink-faint:${c.inkFaint}; --ink-invert:${c.inkInvert};
  --accent:${c.accent}; --accent-bright:${c.accentBright}; --accent-deep:${c.accentDeep};
  --accent-glow:${c.accentGlow};
  --pos:${c.pos}; --warn:${c.warn}; --neg:${c.neg};
  --radius:16px; --s4:40px; --s5:64px;
  --sans:${t.type.sans}; --display:${t.type.display}; --mono:${t.type.mono};
  --ease:cubic-bezier(.2,.75,.2,1); --ease-pop:cubic-bezier(.2,.9,.3,1.2);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; overflow-x:hidden; background:var(--ground)}
body{margin:0; background:transparent; color:var(--ink); font-family:var(--sans);
  line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw;
  letter-spacing:-.011em}
:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:5px}
:focus:not(:focus-visible){outline:none}

/* backdrop · grain · halos — three ambient families */
body::before{content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background-image:
    linear-gradient(${c.hair} 1px,transparent 1px),
    linear-gradient(90deg,${c.hair} 1px,transparent 1px);
  background-size:64px 64px;
  -webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000 18%,transparent 72%);
  mask-image:radial-gradient(ellipse at 50% 0%,#000 18%,transparent 72%)}
${grain(dark ? '.038' : '.02', dark ? 'overlay' : 'multiply')}
.halo,.halo-sm{position:absolute; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle,var(--accent-glow) 0%,transparent 65%);
  filter:blur(${dark ? '20px' : '26px'}); opacity:${dark ? '.55' : '.34'}}
.halo{width:380px; height:380px}
.halo-sm{width:220px; height:220px; filter:blur(${dark ? '16px' : '20px'}); opacity:${dark ? '.42' : '.26'}}

h1,h2,h3{margin:0; font-family:var(--display); font-weight:600; letter-spacing:-.03em;
  line-height:1.06; text-wrap:balance}
h1{font-size:clamp(2.2rem,5.4vw,3.6rem)}
h2{font-size:clamp(1.6rem,3.4vw,2.4rem)}
h3{font-size:1.06rem}
p{margin:0; text-wrap:pretty}
.lead{font-size:clamp(1rem,1.5vw,1.2rem); color:var(--ink-soft); max-width:58ch; text-wrap:balance}
.eyebrow{font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-faint); margin:0}
.tnum{font-variant-numeric:tabular-nums}
.em{color:var(--accent)}

.wrap{position:relative; z-index:2; max-width:1080px; margin:0 auto; padding:0 24px}
header{position:sticky; top:0; z-index:30; border-bottom:1px solid var(--hair);
  backdrop-filter:blur(16px) saturate(125%); -webkit-backdrop-filter:blur(16px) saturate(125%)}
.bar{max-width:1080px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; justify-content:space-between}
.mark{font-family:var(--display); font-weight:700; letter-spacing:.06em}
section{padding:var(--s5) 0}
.hero{position:relative; overflow-x:clip; text-align:center; padding:56px 0 var(--s5)}
.sec-head{display:flex; flex-direction:column; gap:16px; max-width:62ch; margin:0 auto var(--s4);
  text-align:center; align-items:center}

.stagger>*{opacity:0; transform:translateY(16px); animation:rise .9s var(--ease) forwards}
.stagger>*:nth-child(1){animation-delay:.05s}.stagger>*:nth-child(2){animation-delay:.16s}
.stagger>*:nth-child(3){animation-delay:.28s}.stagger>*:nth-child(4){animation-delay:.4s}
@keyframes rise{to{opacity:1; transform:none}}
${revealCss('var(--ease)', '22px', '5px')}

.cta-row{display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:6px}
.btn{font-size:.92rem; font-weight:500; text-decoration:none; padding:14px 32px; border-radius:100px;
  display:inline-flex; align-items:center; gap:9px; transition:transform .28s var(--ease),
  box-shadow .35s var(--ease), border-color .3s var(--ease), color .3s var(--ease)}
.btn .ar{display:inline-block; transition:transform .3s var(--ease)}
.btn:hover .ar{transform:translateX(5px)}
.btn-solid{color:var(--ink-invert); font-weight:600;
  background:linear-gradient(125deg,var(--accent) 0%,var(--accent-bright) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28), 0 8px 26px -8px var(--accent-glow)}
.btn-solid:hover{transform:translateY(-2px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.34), 0 16px 42px -8px var(--accent-glow)}
.btn-ghost{color:var(--ink); border:1px solid var(--hair-strong); background:${sheet};
  backdrop-filter:blur(10px) saturate(120%); -webkit-backdrop-filter:blur(10px) saturate(120%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.btn-ghost:hover{border-color:var(--accent); color:var(--accent); transform:translateY(-2px)}

.cards,.stats{display:grid; gap:20px}
.cards{grid-template-columns:repeat(3,1fr)}
.stats{grid-template-columns:repeat(3,1fr); max-width:760px; margin:0 auto}
.card,.stat,.note{border:1px solid var(--hair); border-radius:var(--radius); background:${sheet};
  backdrop-filter:blur(14px) saturate(125%); -webkit-backdrop-filter:blur(14px) saturate(125%)}
.card{padding:26px; display:flex; flex-direction:column; gap:12px; text-align:center; align-items:center;
  transition:border-color .35s var(--ease), transform .35s var(--ease), box-shadow .35s var(--ease)}
.card:hover{border-color:var(--hair-strong); transform:translateY(-3px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 16px 40px -20px var(--accent-glow)}
.card p{color:var(--ink-soft); font-size:.95rem; max-width:34ch}
.glyph{width:38px; height:38px; border-radius:11px; border:1px solid var(--hair-strong);
  display:flex; align-items:center; justify-content:center; color:var(--accent); font-weight:600;
  font-family:var(--mono); font-size:.82rem}
.stat{padding:22px 18px; text-align:center;
  transition:border-color .3s var(--ease), transform .3s var(--ease), box-shadow .3s var(--ease)}
.stat:hover{border-color:var(--hair-strong); transform:translateY(-3px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 16px 40px -20px var(--accent-glow)}
.sv{font-size:2rem; font-weight:600; letter-spacing:-.02em; color:var(--accent); line-height:1}
.sl{font-size:.84rem; color:var(--ink-soft); margin-top:8px; text-wrap:balance}
.sf{font-size:.72rem; color:var(--ink-faint); margin-top:6px}
.note{padding:24px; max-width:70ch; margin:0 auto; text-align:center}
.wl{font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--warn)}
.note p{color:var(--ink-soft); font-size:.95rem; margin-top:10px}
footer{border-top:1px solid var(--hair); padding:var(--s4) 0; margin-top:var(--s5);
  text-align:center; font-size:12px; color:var(--ink-faint)}
@media (max-width:720px){ .cards,.stats{grid-template-columns:1fr} }
${reducedMotion}`;
    },
  },

  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Flat, generous, typographic. No glass and almost no shadow — hierarchy is carried entirely by size, weight and whitespace.',
    fits: 'Writing, research, studios, anything where the words are the product.',
    css: (t) => {
      const c = t.color, dark = t.polarity === 'dark';
      return `
:root{
  --ground:${c.ground}; --ground-2:${c.ground2};
  --hair:${c.hair}; --hair-strong:${c.hairStrong};
  --ink:${c.ink}; --ink-soft:${c.inkSoft}; --ink-faint:${c.inkFaint}; --ink-invert:${c.inkInvert};
  --accent:${c.accent}; --accent-bright:${c.accentBright}; --accent-deep:${c.accentDeep};
  --accent-glow:${c.accentGlow};
  --pos:${c.pos}; --warn:${c.warn}; --neg:${c.neg};
  --radius:4px; --s4:56px; --s5:104px;
  --sans:${t.type.sans}; --display:Georgia,"Iowan Old Style","Times New Roman",serif; --mono:${t.type.mono};
  --ease:cubic-bezier(.2,.75,.2,1);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; overflow-x:hidden; background:var(--ground)}
body{margin:0; background:transparent; color:var(--ink); font-family:var(--sans);
  line-height:1.72; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw}
:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:3px}
:focus:not(:focus-visible){outline:none}

/* vignette backdrop · grain — two ambient families, both very quiet */
body::before{content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background:radial-gradient(ellipse 90% 60% at 50% -10%, var(--accent-glow), transparent 70%)}
${grain(dark ? '.03' : '.016', dark ? 'overlay' : 'multiply')}

h1,h2,h3{margin:0; font-family:var(--display); font-weight:400; letter-spacing:-.02em;
  line-height:1.1; text-wrap:balance}
h1{font-size:clamp(2.6rem,7vw,4.8rem)}
h2{font-size:clamp(1.9rem,4vw,3rem)}
h3{font-size:1.24rem}
p{margin:0; text-wrap:pretty}
.lead{font-size:clamp(1.1rem,1.7vw,1.36rem); color:var(--ink-soft); max-width:64ch; line-height:1.62;
  text-wrap:balance}
.eyebrow{font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-faint);
  margin:0; font-family:var(--sans)}
.tnum{font-variant-numeric:tabular-nums}
.em{color:var(--accent); font-style:italic}

.wrap{position:relative; z-index:2; max-width:960px; margin:0 auto; padding:0 28px}
header{border-bottom:1px solid var(--hair)}
.bar{max-width:960px; margin:0 auto; padding:22px 28px; display:flex; align-items:center; justify-content:space-between}
.mark{font-family:var(--display); font-weight:400; font-size:1.2rem; letter-spacing:.02em}
section{padding:var(--s5) 0; border-top:1px solid var(--hair)}
.hero{position:relative; text-align:left; padding:72px 0 var(--s5); border-top:0}
.sec-head{display:flex; flex-direction:column; gap:18px; max-width:60ch; margin:0 0 var(--s4)}

${revealCss('var(--ease)', '18px', null)}
.stagger>*{opacity:0; transform:translateY(14px); animation:rise 1s var(--ease) forwards}
.stagger>*:nth-child(1){animation-delay:.06s}.stagger>*:nth-child(2){animation-delay:.2s}
.stagger>*:nth-child(3){animation-delay:.34s}.stagger>*:nth-child(4){animation-delay:.48s}
@keyframes rise{to{opacity:1; transform:none}}

.cta-row{display:flex; gap:26px; flex-wrap:wrap; margin-top:14px; align-items:center}
.btn{font-size:1rem; text-decoration:none; display:inline-flex; align-items:center; gap:9px;
  transition:color .3s var(--ease), border-color .3s var(--ease), background .3s var(--ease)}
.btn .ar{display:inline-block; transition:transform .3s var(--ease)}
.btn:hover .ar{transform:translateX(5px)}
.btn-solid{color:var(--ink-invert); background:var(--accent); padding:15px 30px; border-radius:var(--radius);
  font-weight:500}
.btn-solid:hover{background:var(--accent-bright)}
.btn-ghost{color:var(--ink); border-bottom:1px solid var(--hair-strong); padding:4px 0}
.btn-ghost:hover{color:var(--accent); border-color:var(--accent)}

.cards{display:grid; grid-template-columns:repeat(3,1fr); gap:48px}
.card{display:flex; flex-direction:column; gap:12px; border-top:2px solid var(--ink); padding-top:20px}
.card p{color:var(--ink-soft); font-size:1rem; max-width:34ch}
.glyph{font-family:var(--mono); font-size:.78rem; color:var(--ink-faint); letter-spacing:.1em}
.stats{display:grid; grid-template-columns:repeat(3,1fr); gap:48px}
.stat{border-top:1px solid var(--hair); padding-top:18px}
.sv{font-family:var(--display); font-size:3rem; line-height:1; color:var(--ink)}
.sl{font-size:.95rem; color:var(--ink-soft); margin-top:10px; max-width:26ch; text-wrap:balance}
.sf{font-size:.78rem; color:var(--ink-faint); margin-top:8px}
.note{max-width:66ch; border-left:2px solid var(--warn); padding:6px 0 6px 26px}
.wl{font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--warn)}
.note p{color:var(--ink-soft); font-size:1.02rem; margin-top:12px}
footer{border-top:1px solid var(--hair); padding:var(--s4) 0; font-size:13px; color:var(--ink-faint)}
@media (max-width:720px){ .cards,.stats{grid-template-columns:1fr; gap:32px} }
${reducedMotion}`;
    },
  },

  {
    id: 'terminal',
    name: 'Terminal',
    blurb: 'Dense, gridded, monospaced. Every number is a fixed-width figure and every label is a field name. Nothing floats; nothing blurs.',
    fits: 'Dashboards, developer tools, anything where the data is the interface.',
    css: (t) => {
      const c = t.color, dark = t.polarity === 'dark';
      return `
:root{
  --ground:${c.ground}; --ground-2:${c.ground2};
  --panel:${c.panel}; --panel-2:${c.panel2};
  --hair:${c.hair}; --hair-strong:${c.hairStrong};
  --ink:${c.ink}; --ink-soft:${c.inkSoft}; --ink-faint:${c.inkFaint}; --ink-invert:${c.inkInvert};
  --accent:${c.accent}; --accent-bright:${c.accentBright}; --accent-deep:${c.accentDeep};
  --accent-glow:${c.accentGlow};
  --pos:${c.pos}; --warn:${c.warn}; --neg:${c.neg};
  --radius:2px; --s4:32px; --s5:52px;
  --sans:${t.type.sans}; --display:${t.type.mono}; --mono:${t.type.mono};
  --ease:cubic-bezier(.2,.75,.2,1);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; overflow-x:hidden; background:var(--ground)}
body{margin:0; background:transparent; color:var(--ink); font-family:var(--sans);
  line-height:1.55; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw}
:focus-visible{outline:2px solid var(--accent); outline-offset:2px; border-radius:0}
:focus:not(:focus-visible){outline:none}

/* dense grid · grain — two ambient families */
body::before{content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background-image:
    linear-gradient(${c.hair} 1px,transparent 1px),
    linear-gradient(90deg,${c.hair} 1px,transparent 1px);
  background-size:32px 32px;
  -webkit-mask-image:linear-gradient(to bottom,#000 0,#000 40%,transparent 92%);
  mask-image:linear-gradient(to bottom,#000 0,#000 40%,transparent 92%)}
${grain(dark ? '.04' : '.022', dark ? 'overlay' : 'multiply')}

h1,h2,h3{margin:0; font-family:var(--display); font-weight:600; letter-spacing:-.02em;
  line-height:1.12; text-wrap:balance}
h1{font-size:clamp(1.9rem,4.4vw,3rem)}
h2{font-size:clamp(1.35rem,2.6vw,1.9rem)}
h3{font-size:.98rem}
p{margin:0; text-wrap:pretty}
.lead{font-size:clamp(.95rem,1.3vw,1.06rem); color:var(--ink-soft); max-width:66ch; text-wrap:balance}
.eyebrow{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--accent); margin:0}
.tnum{font-variant-numeric:tabular-nums}
.em{color:var(--accent)}

.wrap{position:relative; z-index:2; max-width:1180px; margin:0 auto; padding:0 20px}
header{border-bottom:1px solid var(--hair-strong)}
.bar{max-width:1180px; margin:0 auto; padding:10px 20px; display:flex; align-items:center; justify-content:space-between}
.mark{font-family:var(--mono); font-weight:700; font-size:.9rem; letter-spacing:.14em}
section{padding:var(--s5) 0}
.hero{position:relative; padding:44px 0 var(--s5)}
.sec-head{display:flex; flex-direction:column; gap:12px; max-width:62ch; margin:0 0 var(--s4)}

${revealCss('var(--ease)', '12px', null)}
.stagger>*{opacity:0; transform:translateY(10px); animation:rise .5s var(--ease) forwards}
.stagger>*:nth-child(1){animation-delay:.03s}.stagger>*:nth-child(2){animation-delay:.09s}
.stagger>*:nth-child(3){animation-delay:.15s}.stagger>*:nth-child(4){animation-delay:.21s}
@keyframes rise{to{opacity:1; transform:none}}

.cta-row{display:flex; gap:10px; flex-wrap:wrap; margin-top:10px}
.btn{font-family:var(--mono); font-size:.82rem; letter-spacing:.06em; text-transform:uppercase;
  text-decoration:none; padding:11px 20px; border-radius:var(--radius);
  display:inline-flex; align-items:center; gap:8px;
  transition:background .18s var(--ease), color .18s var(--ease), border-color .18s var(--ease)}
.btn .ar{display:inline-block; transition:transform .18s var(--ease)}
.btn:hover .ar{transform:translateX(4px)}
.btn-solid{color:var(--ink-invert); background:var(--accent); font-weight:600}
.btn-solid:hover{background:var(--accent-bright)}
.btn-ghost{color:var(--ink-soft); border:1px solid var(--hair-strong); background:var(--panel)}
.btn-ghost:hover{color:var(--accent); border-color:var(--accent); background:var(--panel-2)}

.cards{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hair);
  border:1px solid var(--hair)}
.card{background:var(--ground); padding:22px; display:flex; flex-direction:column; gap:10px;
  transition:background .18s var(--ease)}
.card:hover{background:var(--panel-2)}
.card p{color:var(--ink-soft); font-size:.9rem; max-width:38ch}
.glyph{font-family:var(--mono); font-size:.72rem; letter-spacing:.14em; color:var(--accent)}
.stats{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hair);
  border:1px solid var(--hair)}
.stat{background:var(--ground); padding:20px; transition:background .18s var(--ease)}
.stat:hover{background:var(--panel-2)}
.sv{font-family:var(--mono); font-size:1.9rem; font-weight:700; color:var(--accent); line-height:1;
  letter-spacing:-.02em}
.sl{font-family:var(--mono); font-size:.7rem; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink-soft); margin-top:10px}
.sf{font-size:.74rem; color:var(--ink-faint); margin-top:6px}
.note{border:1px solid var(--warn); border-left-width:3px; padding:18px 20px; max-width:74ch;
  background:var(--panel)}
.wl{font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--warn)}
.note p{color:var(--ink-soft); font-size:.9rem; margin-top:8px}
footer{border-top:1px solid var(--hair-strong); padding:var(--s4) 0; margin-top:var(--s5);
  font-family:var(--mono); font-size:11px; letter-spacing:.06em; color:var(--ink-faint)}
@media (max-width:720px){ .cards,.stats{grid-template-columns:1fr} }
${reducedMotion}`;
    },
  },

  {
    id: 'soft',
    name: 'Soft',
    blurb: 'Rounded, roomy, layered. Depth is built from stacked neutral shadows rather than glow, and everything moves gently.',
    fits: 'Consumer apps, health, education — anywhere the page should feel approachable.',
    css: (t) => {
      const c = t.color, dark = t.polarity === 'dark';
      const surf = dark ? c.ground2 : '#ffffff';
      const sh = dark ? '0,0,0' : '16,24,48';
      return `
:root{
  --ground:${c.ground}; --ground-2:${c.ground2}; --surface:${surf};
  --hair:${c.hair}; --hair-strong:${c.hairStrong};
  --ink:${c.ink}; --ink-soft:${c.inkSoft}; --ink-faint:${c.inkFaint}; --ink-invert:${c.inkInvert};
  --accent:${c.accent}; --accent-bright:${c.accentBright}; --accent-deep:${c.accentDeep};
  --accent-glow:${c.accentGlow};
  --pos:${c.pos}; --warn:${c.warn}; --neg:${c.neg};
  --radius:24px; --s4:48px; --s5:80px;
  --shade:rgba(${sh},.10);
  --sans:${t.type.sans}; --display:${t.type.display}; --mono:${t.type.mono};
  --ease:cubic-bezier(.2,.75,.2,1); --ease-pop:cubic-bezier(.2,.9,.3,1.2);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; overflow-x:hidden; background:var(--ground)}
body{margin:0; background:transparent; color:var(--ink); font-family:var(--sans);
  line-height:1.68; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw}
:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:8px}
:focus:not(:focus-visible){outline:none}

/* halos · grain — two ambient families, no hard grid anywhere */
${grain(dark ? '.032' : '.015', dark ? 'overlay' : 'multiply')}
.halo,.halo-sm{position:absolute; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle,var(--accent-glow) 0%,transparent 70%);
  filter:blur(30px); opacity:${dark ? '.5' : '.4'}}
.halo{width:460px; height:460px}
.halo-sm{width:280px; height:280px; filter:blur(24px); opacity:${dark ? '.38' : '.3'}}

h1,h2,h3{margin:0; font-family:var(--display); font-weight:700; letter-spacing:-.025em;
  line-height:1.14; text-wrap:balance}
h1{font-size:clamp(2.2rem,5vw,3.4rem)}
h2{font-size:clamp(1.6rem,3.2vw,2.3rem)}
h3{font-size:1.1rem}
p{margin:0; text-wrap:pretty}
.lead{font-size:clamp(1.02rem,1.5vw,1.22rem); color:var(--ink-soft); max-width:56ch; text-wrap:balance}
.eyebrow{font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--accent);
  margin:0; font-weight:600}
.tnum{font-variant-numeric:tabular-nums}
.em{color:var(--accent)}

.wrap{position:relative; z-index:2; max-width:1040px; margin:0 auto; padding:0 24px}
header{border-bottom:1px solid var(--hair)}
.bar{max-width:1040px; margin:0 auto; padding:16px 24px; display:flex; align-items:center; justify-content:space-between}
.mark{font-family:var(--display); font-weight:700; letter-spacing:-.01em}
section{padding:var(--s5) 0}
.hero{position:relative; overflow-x:clip; text-align:center; padding:60px 0 var(--s5)}
.sec-head{display:flex; flex-direction:column; gap:16px; max-width:60ch; margin:0 auto var(--s4);
  text-align:center; align-items:center}

${revealCss('var(--ease)', '20px', null)}
.stagger>*{opacity:0; transform:translateY(18px); animation:rise .8s var(--ease-pop) forwards}
.stagger>*:nth-child(1){animation-delay:.05s}.stagger>*:nth-child(2){animation-delay:.17s}
.stagger>*:nth-child(3){animation-delay:.29s}.stagger>*:nth-child(4){animation-delay:.41s}
@keyframes rise{to{opacity:1; transform:none}}

.cta-row{display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-top:8px}
.btn{font-size:.96rem; font-weight:600; text-decoration:none; padding:16px 34px; border-radius:100px;
  display:inline-flex; align-items:center; gap:9px;
  transition:transform .3s var(--ease), box-shadow .3s var(--ease), background .3s var(--ease)}
.btn .ar{display:inline-block; transition:transform .3s var(--ease)}
.btn:hover .ar{transform:translateX(5px)}
.btn-solid{color:var(--ink-invert); background:var(--accent);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.24), 0 2px 4px var(--shade),
             0 14px 30px -12px var(--accent-glow)}
.btn-solid:hover{transform:translateY(-2px); background:var(--accent-bright);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3), 0 4px 8px var(--shade),
             0 22px 44px -14px var(--accent-glow)}
.btn-ghost{color:var(--ink); background:var(--surface); border:1px solid var(--hair);
  box-shadow:0 1px 2px var(--shade), 0 8px 20px -14px rgba(${sh},.3)}
.btn-ghost:hover{color:var(--accent); transform:translateY(-2px);
  box-shadow:0 2px 4px var(--shade), 0 14px 28px -14px rgba(${sh},.34)}

.cards,.stats{display:grid; gap:22px}
.cards{grid-template-columns:repeat(3,1fr)}
.stats{grid-template-columns:repeat(3,1fr); max-width:800px; margin:0 auto}
.card,.stat,.note{background:var(--surface); border:1px solid var(--hair); border-radius:var(--radius);
  box-shadow:inset 0 1px 0 rgba(255,255,255,${dark ? '.05' : '.8'}), 0 1px 2px var(--shade),
             0 14px 30px -16px rgba(${sh},.22)}
.card{padding:28px; display:flex; flex-direction:column; gap:12px; text-align:center; align-items:center;
  transition:transform .35s var(--ease), box-shadow .35s var(--ease)}
.card:hover{transform:translateY(-4px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,${dark ? '.05' : '.8'}), 0 3px 6px var(--shade),
             0 26px 50px -20px rgba(${sh},.28)}
.card p{color:var(--ink-soft); font-size:.96rem; max-width:34ch}
.glyph{width:46px; height:46px; border-radius:50%; background:var(--accent-glow);
  display:flex; align-items:center; justify-content:center; color:var(--accent); font-weight:700;
  font-size:.9rem}
.stat{padding:26px 20px; text-align:center; transition:transform .3s var(--ease), box-shadow .3s var(--ease)}
.stat:hover{transform:translateY(-4px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,${dark ? '.05' : '.8'}), 0 3px 6px var(--shade),
             0 26px 50px -20px rgba(${sh},.28)}
.sv{font-size:2.2rem; font-weight:700; letter-spacing:-.02em; color:var(--accent); line-height:1}
.sl{font-size:.88rem; color:var(--ink-soft); margin-top:8px; text-wrap:balance}
.sf{font-size:.74rem; color:var(--ink-faint); margin-top:6px}
.note{padding:26px 30px; max-width:68ch; margin:0 auto; text-align:center}
.wl{font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--warn); font-weight:600}
.note p{color:var(--ink-soft); font-size:.98rem; margin-top:10px}
footer{padding:var(--s4) 0; margin-top:var(--s5); text-align:center; font-size:13px; color:var(--ink-faint)}
@media (max-width:720px){ .cards,.stats{grid-template-columns:1fr} }
${reducedMotion}`;
    },
  },
];

/* ─────────────────────────── the page ─────────────────────────── */

/** One skeleton for all four, so what you compare is the direction and not
 *  the content. Copy is deliberately concrete — the gate rejects a page of
 *  adjectives, and a template that ships placeholder slop teaches slop. */
function page(t, dir, brand) {
  const halos = dir.id === 'ambient' || dir.id === 'soft';
  const c = t.color;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${brand} — ${dir.name} direction</title>
<meta name="description" content="${dir.name} starting template generated by site-craft from the extracted ${brand} colour scheme. ${dir.blurb}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='${encodeURIComponent(c.ground)}'/><circle cx='16' cy='16' r='7' fill='${encodeURIComponent(c.accent)}'/></svg>">
<link rel="stylesheet" href="tokens.css">
</head>
<body>
<div class="grain" aria-hidden></div>

<header><div class="bar">
  <span class="mark">${brand.toUpperCase()}</span>
  <a class="btn btn-ghost" href="#start">Start a trial <span class="ar">&rarr;</span></a>
</div></header>

<div class="wrap">

  <section class="hero">
    ${halos ? `<div class="halo-sm" aria-hidden style="top:0; left:26%"></div>
    <div class="halo-sm" aria-hidden style="top:70px; left:74%"></div>` : ''}
    <div class="stagger">
      <p class="eyebrow">${dir.name} direction</p>
      <h1>Ship the work in <span class="tnum">3</span> weeks, not <span class="tnum">11</span> weeks — and <span class="em">keep the receipts</span>.</h1>
      <p class="lead"${halos ? ' style="margin:14px auto 0"' : ' style="margin-top:14px"'}>This page is a starting template, not a mockup. It carries your colour scheme, <span class="tnum">4</span> ink stops, one accent family, and a motion budget under <span class="tnum">900</span>ms that already clears all <span class="tnum">31</span> gate rules. Replace the words and keep the structure.</p>
      <div class="cta-row" id="start">
        <a class="btn btn-solid" href="#detail">Start a trial <span class="ar">&rarr;</span></a>
        <a class="btn btn-ghost" href="#detail">See how it is built <span class="ar">&rarr;</span></a>
      </div>
    </div>
  </section>

  <section id="detail">
    <div class="sec-head rev">
      <p class="eyebrow">Structure</p>
      <h2>Three decisions this template already made for you.</h2>
    </div>
    <div class="cards rev">
      <div class="card"><span class="glyph">01</span><h3>One accent family</h3>
        <p>Your brand hue in four roles, with state colours kept separate so they never read as decoration.</p></div>
      <div class="card"><span class="glyph">02</span><h3>Four ink stops</h3>
        <p>Each at least <span class="tnum">1.25</span>× apart in contrast, so hierarchy survives on a dim laptop screen.</p></div>
      <div class="card"><span class="glyph">03</span><h3>One easing curve</h3>
        <p>Every transition shares it, and no reveal runs longer than <span class="tnum">800</span>ms. Motion that varies its curve per element reads as noise.</p></div>
    </div>
  </section>

  <section>
    <div class="sec-head rev">
      <p class="eyebrow">Inherited</p>
      <h2>What came from your existing site.</h2>
    </div>
    <div class="stats rev">
      <div class="stat"><div class="sv tnum" data-count="4" data-suf=" roles">0</div>
        <div class="sl">Accent stops derived</div><div class="sf">from the dominant chromatic colour</div></div>
      <div class="stat"><div class="sv tnum" data-count="${t.contrast.inkOnGround}" data-dec="1" data-suf=":1">0</div>
        <div class="sl">Primary text contrast</div><div class="sf">measured against the ground</div></div>
      <div class="stat"><div class="sv tnum" data-count="${t.dropped.length}" data-suf=" dropped">0</div>
        <div class="sl">Hue families removed</div><div class="sf">reported in the extract notes</div></div>
    </div>
  </section>

  <section>
    <div class="sec-head rev">
      <p class="eyebrow">The limits</p>
      <h2>A template is a floor, not a ceiling.</h2>
    </div>
    <div class="note rev">
      <span class="wl">What this does not decide</span>
      <p>Layout beyond this skeleton, illustration, photography, and whether the argument on the page is any good — all still yours. What it guarantees is that the foundation clears the gate, so the review can be about the work instead of about a missing reduced-motion block.</p>
    </div>
  </section>

</div>

<footer>${brand} &middot; ${dir.name} direction &middot; generated by site-craft</footer>

<script>
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
function fmt(n,d){return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
function countUp(el){
  const tg=parseFloat(el.dataset.count), d=parseInt(el.dataset.dec||'0'), su=el.dataset.suf||'';
  if(reduce){ el.textContent=fmt(tg,d)+su; return; }
  const t0=performance.now();
  (function step(t){
    const p=Math.min(1,(t-t0)/1000), e=1-Math.pow(1-p,3);
    el.textContent=fmt(tg*e,d)+su;
    if(p<1) requestAnimationFrame(step);
  })(performance.now());
}
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  });
},{threshold:.16});
document.querySelectorAll('.rev').forEach(el=>io.observe(el));
</script>
</body>
</html>
`;
}

/* ─────────────────────────── picker ─────────────────────────── */

function picker(t, dirs, brand) {
  const c = t.color;
  const swatch = [['ground', c.ground], ['ink', c.ink], ['ink-soft', c.inkSoft],
                  ['accent', c.accent], ['bright', c.accentBright], ['deep', c.accentDeep]];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${brand} — pick a direction</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    background:#0d0f14;color:#e8ecf5;line-height:1.6;padding:40px 24px 80px}
  .w{max-width:1240px;margin:0 auto}
  h1{font-size:clamp(1.6rem,3vw,2.2rem);margin:0 0 8px;letter-spacing:-.03em;text-wrap:balance}
  .sub{color:#9aa4bd;max-width:70ch;margin:0 0 8px;text-wrap:pretty}
  .pal{display:flex;gap:0;margin:22px 0 36px;border-radius:10px;overflow:hidden;max-width:640px;
    border:1px solid rgba(255,255,255,.12)}
  .pal div{flex:1;height:52px;display:flex;align-items:flex-end;justify-content:center;
    font-size:9px;letter-spacing:.06em;padding-bottom:5px;font-family:ui-monospace,monospace}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:26px}
  .card{border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;background:#12151c}
  .frame{height:420px;border:0;width:100%;display:block;background:#fff}
  .meta{padding:18px 20px}
  .meta h2{margin:0 0 6px;font-size:1.1rem;letter-spacing:-.02em}
  .meta p{margin:0 0 10px;color:#9aa4bd;font-size:.9rem;text-wrap:pretty}
  .fits{color:#7883a0;font-size:.82rem;margin:0 0 14px}
  .links a{color:#8fb6ff;font-size:.85rem;text-decoration:none;margin-right:16px}
  .links a:hover{text-decoration:underline}
  code{font-family:ui-monospace,monospace;font-size:.82rem;color:#8fb6ff}
  footer{margin-top:48px;color:#7883a0;font-size:.85rem}
</style></head><body><div class="w">
<h1>Pick a starting direction</h1>
<p class="sub">Same colour scheme in all four — extracted from your site, then disciplined to one accent family plus state colours. What differs is how surfaces are built, how depth is expressed, how dense the page is and how much it moves.</p>
<div class="pal">${swatch.map(([n, v]) =>
  `<div style="background:${v};color:${['ground'].includes(n) ? c.ink : c.inkInvert}">${n}</div>`).join('')}</div>
<div class="grid">
${dirs.map((d) => `  <div class="card">
    <iframe class="frame" src="${d.id}/index.html" title="${d.name} preview" loading="lazy"></iframe>
    <div class="meta">
      <h2>${d.name}</h2>
      <p>${d.blurb}</p>
      <p class="fits">${d.fits}</p>
      <div class="links">
        <a href="${d.id}/index.html" target="_blank">Open full page</a>
        <a href="${d.id}/tokens.css" target="_blank">tokens.css</a>
      </div>
    </div>
  </div>`).join('\n')}
</div>
<footer>Pick one, copy its folder, replace the words. Then run
<code>node scripts/scaudit.mjs &lt;folder&gt; --live &lt;url&gt;</code> — all four leave here green.</footer>
</div></body></html>
`;
}

/* ─────────────────────────── main ─────────────────────────── */

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('-o');
  const outDir = outIdx !== -1 ? argv[outIdx + 1] : './variants';
  const nameIdx = argv.indexOf('--name');
  const brand = nameIdx !== -1 ? argv[nameIdx + 1] : 'Your brand';
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx !== -1 ? argv[onlyIdx + 1].split(',').map((s) => s.trim()) : null;
  const tokensPath = argv.find((a, i) =>
    !a.startsWith('-') && argv[i - 1] !== '-o' && argv[i - 1] !== '--name' && argv[i - 1] !== '--only');

  if (!tokensPath) {
    console.error('usage: node scvariants.mjs <tokens.json> [-o ./variants] [--name "Brand"] [--only ambient,soft]');
    process.exit(2);
  }
  const t = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  if (!t.color?.ground) { console.error(`${tokensPath} is not a site-craft token file`); process.exit(2); }

  const dirs = DIRECTIONS.filter((d) => !only || only.includes(d.id));
  if (!dirs.length) { console.error(`--only matched nothing. Available: ${DIRECTIONS.map((d) => d.id).join(', ')}`); process.exit(2); }

  fs.mkdirSync(outDir, { recursive: true });
  for (const d of dirs) {
    const dir = path.join(outDir, d.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'tokens.css'),
      `/* ${d.name} — generated by site-craft from ${t.source || 'extracted tokens'}.\n   ${d.blurb}\n   Palette is yours; the structure is the direction. */\n${d.css(t)}\n`);
    fs.writeFileSync(path.join(dir, 'index.html'), page(t, d, brand));
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), picker(t, dirs, brand));

  console.log(`\nsite-craft variants — ${t.polarity} ground ${t.color.ground}, accent ${t.color.accent}\n${'─'.repeat(62)}`);
  for (const d of dirs) console.log(`  ${d.id.padEnd(10)} ${d.blurb.split('.')[0]}.`);
  console.log(`\nwrote ${dirs.length} direction(s) to ${outDir}`);
  console.log(`open  ${path.join(outDir, 'index.html')}`);
  console.log(`check node scripts/scaudit.mjs ${outDir}/<direction>\n`);
}

export { DIRECTIONS, page, picker };
if (process.argv[1]?.endsWith('scvariants.mjs')) main();
