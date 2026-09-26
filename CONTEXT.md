# School Today — context

A web tool telling Australian parents whether a sick child can go to school.
Red / amber / green, and it shows the rule behind the call, not just the verdict.

This file exists because the reasoning behind the rules doesn't survive a refactor.
Read it before changing anything in `evaluate()`.

---

## Sources and precedence

Rules were checked in September 2026 against three sources. Where they conflict,
this order decides:

1. **Queensland Health, "Time Out" poster** — revised January 2026, cites NHMRC 6th ed.
   Primary source.
2. **NHMRC, *Staying Healthy* 6th edition** — symptom and condition fact sheets.
   Used where Time Out is silent, mainly the symptom-level rules (fever thresholds,
   respiratory symptom counting, concerning symptoms).
3. **healthdirect's school exclusion periods page** — last reviewed December 2023 and
   cites the NHMRC *5th* edition. **Not a source for any rule here.** It is the page
   parents will find first if they google, and it is out of date on at least two
   periods, so the relevant cards name the discrepancy explicitly:
   - Mumps: healthdirect says 9 days. Current figure is 5 days from onset of swelling.
   - Rubella: healthdirect says 4 days. Current figure is 7 days from rash onset, or
     full recovery, whichever is longer.

Do not "simplify" those discrepancy notes away. Telling a parent why the app disagrees
with the page they just read is most of the tool's value.

### Scope caveat

*Staying Healthy* is written for **early childhood education and care**, not schools.
School exclusion is set by state law — in Queensland, the Public Health Act 2005 — and
by individual school policy, which can be stricter. The app surfaces this as a closing
note that changes with the child's age. It is a real limitation, not boilerplate.

---

## Three design invariants

These are the point of the tool. If a change would break one of them, it is the wrong
change even if it makes the code tidier.

**1. Urgent red flags are a separate gate.**
They sit at the top of the form, above any symptom input. If one is ticked, the app
returns "get medical help now" and **no school verdict at all**. It does not also tell
you the child is excluded. The school question is off the table.

The under-3-months fever flag is now derived rather than ticked — it fires from the age
field plus a 38°C reading, so parents of older children never read it.

**2. Green is only ever a positive match to a known-benign pattern.**
It is never inferred from the absence of red flags. Every green in the file points at a
specific rule that says no exclusion applies, or at a return condition that has
demonstrably been met. Anything unmatched falls to amber.

The head lice rule is the clearest illustration: lice carry no exclusion, but only on
the condition that effective treatment starts before the next attendance day. Until the
parent confirms that, it is amber — because the condition, not the lice, is what makes
it green.

**3. Amber refuses to guess.**
Where a symptom has several possible causes with different rules, amber names them and
says what would distinguish them. It does not average them into a vague caution and it
does not pick the most likely. See the undiagnosed rash, blister, skin sore, swollen
gland and night-itching branches — each one lists the candidate conditions, their
differing return rules, and the distinguishing feature.

A refactor that collapses those branches into generic advice destroys the tool.

---

## Two judgement calls the app makes that the guidelines don't

Both are flagged in the UI copy. Keep them flagged.

**The "new" respiratory window.** NHMRC excludes a single respiratory symptom if it is
"new or worsening" but doesn't define new. The app treats anything starting within the
last 3 days as new. That number is ours. The card says so.

**The cold sore age line.** The source splits on "young children unable to comply with
good hygiene practices" and names no age. The app uses under 5. That number is ours.
The card says so, and quotes the source's actual wording.

---

## How the rule engine is shaped

- `FLAGS` — the urgent gate. Flat list, no sub-questions.
- `SYMPTOMS` — 15 groups. Each carries only the sub-questions its own rules need,
  revealed inline when ticked. Kinds: `choice`, `multi`, `date`, `toggle`.
- `evaluate(ageMonths, picked, flagged, detail)` — returns `{ verdict, findings, note }`.
  Each finding has `v` (verdict), `name`, `rule`, `watch`, `back`, `src`.
- Verdict is the worst of the findings. `VERDICT[x].rank` orders them.
- Answers only count while their parent symptom is ticked — see the `live` memo.
  A sub-question with `showIf` also only renders and counts while that holds.
- A rule must read a date from its own symptom's sub-questions. Reading another
  symptom's field silently fails when that symptom isn't ticked. The rash rules for
  scarlet fever, scabies and tinea read `r_tx`, falling back to the matching date
  from the throat, itch or scaly-patch questions if the parent answered it there.

Per-symptom onset dates drive the exclusion clocks, so "back at school" renders as an
actual date rather than a countdown the parent has to do. `returnLine()` handles that,
and says so when the clock has already run out.

The gastro rule deliberately uses three coarse time buckets rather than a date, because
that rule runs in hours and a date input can't express "last vomited at 6am."

---

## If this ships

**The rules go stale.** Time Out was revised in January 2026 and return periods move
between editions. Either date-stamp the rules visibly in the UI, or lift them into a
JSON file with a `checked` field, so review becomes a scheduled task rather than
something rediscovered years later. Right now the check date lives only in a comment
and the footer.

**Conditions not yet covered.** Meningococcal beyond the glass test, hepatitis B and C
and HIV (all non-excluding, so they'd be greens), CMV, tuberculosis, hand hygiene for
outbreak situations, and the notifiable-disease pathway generally. There is currently
no concept of a school outbreak, which changes some rules.

**Not yet decided.** Whether the tool is general-Australian or Queensland-anchored. It
currently resolves conflicts using a Queensland source while addressing a national
audience. That is defensible while Time Out is the most current document, but it should
be a stated position rather than an accident.

**Liability and framing.** The footer disclaims medical advice. Whether that is
sufficient for a public-facing health triage tool is a question for someone other than
a coding agent.
