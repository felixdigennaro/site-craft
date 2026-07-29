# Copy

Write the words in plain text **before** you build the shell. A beautiful page that says nothing is the most expensive kind of failure, and it's the default outcome when copy is poured into a finished layout.

---

## The hero formula

Four parts, in this order. It survives every register from institutional to consumer.

```
EYEBROW    who it's for, or the headline number + its qualifier
H1         verb-led promise, ONE phrase emphasised in the accent
SUB        who uses it · what it does · the number · the objection killer
CTA        one primary. one secondary only as an escape hatch.
```

Two worked examples (fictional products, real structure):

> **Reconciliation for finance teams**
> Close the month in three days, not eleven — and *show your work*.
> Controllers at 40-person and 4,000-person companies use Meridian to match ledgers against six upstream systems, flag the 2% that disagree, and hand an auditor the trail. **Free until your first close.**

> **● Rendimento di base ~2,4% l'anno · capitale non vincolato**
> Il capitale al sicuro, che cresce ogni giorno.
> Cassa distribuisce il deposito su tre protocolli con un tetto per ciascuno, riconcilia ogni notte, e ti mostra da dove esce ogni cifra. **Prelievo in 24 ore.**

Note what both do:
- The eyebrow carries **either the audience or the number** — never a slogan.
- The H1 is **verb-led** ("Close the month" / "cresce ogni giorno"), not noun-soup.
- Exactly **one** phrase is emphasised. `show your work` is where the whole positioning lives — it's the promise a competitor can't copy without rebuilding.
- The sub names the **actual customer type** ("controllers at 40-person and 4,000-person companies"), gives a **hard number** ("three days, not eleven" / "tre protocolli"), and ends by **killing the first objection** ("Free until your first close." / "Prelievo in 24 ore.").

---

## The five filters

Run every line through these. They catch most of it.

### F1 · Would a competitor claim the opposite?

If not, the sentence is worthless. "Built for performance." Nobody ships *Built for sluggishness*. Cut it or make it specific enough to be contestable.

### F2 · Where is the number?

Every claim that *can* carry a number, carries one. "in 10 seconds", "~2,7% l'anno", "78–87% of commission", "7-day payouts". A page of adjectives reads as generated; a page of figures reads as known.

If you don't have the number, say the honest thing instead — never invent one, and never round a real one into a rounder-sounding lie. (Rigour protocol R1: a number that isn't verified doesn't ship.)

### F3 · Is the subject a person or a concept?

"Controllers use Meridian to…" beats "Meridian is a platform that enables…". Name the human doing the thing.

### F4 · Does it survive being said out loud?

Read it. If you'd never say it to someone across a table — "Unlock the power of seamless collaboration" — it doesn't go on the page.

### F5 · Is the promise the one you can keep?

Overclaim is the fastest way to lose a technical audience. Say "free until your first close", not "free forever". State the disclosure, and state the thing that didn't work, in the page's own voice. Restraint reads as confidence; a reader who finds one overclaim re-reads everything else as marketing.

---

## Banned

These are the tells. Not "avoid where possible" — banned.

**Verbs:** unlock · unleash · supercharge · revolutionize · empower · elevate · transform your · harness · leverage (as a verb) · delve

**Nouns:** solution · journey · ecosystem (unless it literally is one) · game-changer · powerhouse · one-stop shop · seamless experience

**Adjective stacks:** "powerful, intuitive and beautiful" · "fast, secure and reliable" · any tricolon of unearned adjectives

**Openers:** "In today's fast-paced world" · "Whether you're a X or a Y" · "Imagine a world where" · "It's not just X, it's Y" · "We believe that"

**Structures:**
- The em-dash-pivot cliché: *"Not just a tool — a partner."*
- Rhetorical question headings: *"Why choose us?"* → make it a statement.
- Feature triplets where all three cards start with the same verb.
- "Trusted by industry leaders" with no logos, or logos with no names.

**UI:** emoji as icons · "🚀" anywhere · exclamation marks in body copy · "Get Started" as the only CTA label.

---

## CTA labels

Name the outcome, not the mechanism.

| ✗ | ✓ |
|---|---|
| Get Started | Run my first close |
| Learn More | See a live reconciliation |
| Sign Up Free | Match 100 rows — free |
| Contact Us | Talk to an engineer |
| Submit | Send the brief |

The secondary CTA is for the not-yet-ready, so it should be lower-commitment and *specific*: "See how the matching works", not "Learn more".

---

## Section headings

An H2 is a **claim**, not a label.

| ✗ label | ✓ claim |
|---|---|
| Features | Three things it does that a spreadsheet can't |
| How It Works | You connect a ledger. It returns the 2% that disagree. |
| Pricing | Free until your first close. Then per seat, not per transaction. |
| Testimonials | What the controllers who use it say |
| About | Independent, by design. |

`Independent, by design.` — four words, declarative, load-bearing. That's the target register: an H2 you could defend in a meeting.

---

## Length discipline

| Element | Cap |
|---|---|
| H1 | 12 words / ~20ch per line, `text-wrap:balance` |
| Lead | 2 sentences, `max-width:58ch` |
| Section head | `62ch` |
| Card body | 2 sentences, `34ch` |
| Eyebrow | 6 words |
| Button | 4 words |

`ch` not `px` — the measure has to follow the font size, and it's what stops long paragraphs from becoming unreadable full-bleed lines on a wide monitor.

---

## Micro-copy

The places nobody writes, where quality actually shows:

- **Footnotes under numbers.** "median over the last 200 closes" · "assumptions listed in the methodology". A number with its provenance is worth three without.
- **Empty states.** "Nothing to reconcile — the last batch cleared 4 minutes ago." not "No data available."
- **Disclosure blocks.** If the product carries risk, state it in the page's own voice, not in 9px grey legalese. Give it a full bordered panel with a `--warn` eyebrow and plain sentences. Stating the downside plainly *builds* trust rather than spending it — and a technical audience checks for it specifically.
- **Loading and error text.** "Couldn't reach the ledger — retrying." not "An error occurred."

---

## Multi-language

If the site is bilingual:

- **Translate the argument, not the words.** The two hero examples above are not translations of each other — they're different sentences making the same case in two markets. Word-for-word translation of a headline that relied on an English idiom produces something nobody would say.
- Test the longest language for layout breakage — German and Italian run 15–30% longer than English and will break a tight `max-width` or a button label.
- `lang` attribute set correctly, and number formatting via `toLocaleString` with the right locale (`2,7%` vs `2.7%`).
