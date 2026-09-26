import React, { useState, useMemo } from "react";
import { track } from "@vercel/analytics";

/**
 * School Today — prototype
 *
 * Exclusion rules checked September 2026 against:
 *   QLD   — Queensland Health "Time Out" poster, revised January 2026.
 *           Primary source: where sources conflict, this one wins.
 *   NHMRC — Staying Healthy (6th ed.) symptom and condition fact sheets.
 *   healthdirect's exclusion-periods page (reviewed Dec 2023, cites the 5th
 *   edition) is not used as a source for any rule here; where it differs, the
 *   card says so.
 *
 * Two things the app decides that the guidelines don't:
 *   - "new" respiratory symptoms are taken as started within the last 3 days.
 *   - the cold sore rule splits on "young children unable to comply with good
 *     hygiene practices". The app draws that line at 5. The number is the
 *     app's, not the guideline's.
 *
 * Scope caveat: Staying Healthy is written for early childhood education and
 * care, not schools. School exclusion is set by state law (in Queensland, the
 * Public Health Act 2005). For a school-age child these rules are the national
 * infection-control baseline, not an attendance ruling.
 */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter+Tight:wght@400;500;600&display=swap');

.st-root {
  --ink: #1B2A2F;
  --ink-soft: #5C6A66;
  --paper: #EDF0EE;
  --card: #FFFFFF;
  --line: #CDD5D1;
  font-family: 'Inter Tight', ui-sans-serif, system-ui, sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  padding: 28px 20px 140px;
  -webkit-font-smoothing: antialiased;
}
.st-wrap { max-width: 460px; margin: 0 auto; }

.st-title {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 34px; line-height: 1.08; font-weight: 400;
  letter-spacing: -0.01em; margin: 0 0 10px; text-wrap: balance;
}
.st-sub { font-size: 15px; line-height: 1.5; color: var(--ink-soft); margin: 0 0 26px; }
/* step number sits in front of each section heading */
.st-step {
  display: inline-block; min-width: 20px;
  font-family: 'Newsreader', Georgia, serif; font-size: 18px; font-weight: 400;
  line-height: 1; color: var(--ink-soft);
}
.st-flags-head .st-step { color: #6B2D5C; }
.st-stepped { padding-left: 20px; }

.st-age {
  display: flex; align-items: flex-end; gap: 12px;
  padding-bottom: 22px; margin-bottom: 24px;
  border-bottom: 1px solid var(--line);
}
.st-field { display: flex; flex-direction: column; gap: 5px; }
.st-field-label { font-size: 13.5px; color: var(--ink-soft); }
.st-num {
  font: inherit; font-size: 16px; width: 92px;
  padding: 10px 11px; background: #fff;
  border: 1px solid var(--line); border-radius: 3px; color: var(--ink);
}
.st-num:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }

.st-flags {
  background: var(--card); border: 1.5px solid #6B2D5C; border-radius: 4px;
  padding: 16px 16px 6px; margin-bottom: 28px;
}
.st-flags-head { font-size: 15px; font-weight: 600; margin: 0 0 4px; color: #6B2D5C; }
.st-flags-note { font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); margin: 0 0 10px; }

.st-section-head { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
.st-section-note { font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); margin: 0 0 10px; }

.st-list { border-top: 1px solid var(--line); }
.st-entry { border-bottom: 1px solid var(--line); }
.st-entry:last-child { border-bottom: none; }
.st-flags .st-list { border-top: 1px solid #E2D3DE; }
.st-flags .st-entry { border-bottom: 1px solid #E2D3DE; }
.st-flags .st-entry:last-child { border-bottom: none; }

.st-item {
  display: flex; align-items: flex-start; gap: 13px;
  width: 100%; text-align: left; background: none; border: none;
  padding: 14px 2px; font: inherit; font-size: 16px; line-height: 1.35;
  color: var(--ink); cursor: pointer; min-height: 52px;
}
.st-item:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }

.st-box {
  flex: 0 0 auto; width: 21px; height: 21px; margin-top: 1px;
  border: 1.5px solid var(--ink-soft); border-radius: 3px;
  display: grid; place-items: center; background: #fff;
}
.st-box svg { display: block; }
.st-item[data-on="true"] .st-box { background: var(--ink); border-color: var(--ink); }
.st-flags .st-item[data-on="true"] .st-box { background: #6B2D5C; border-color: #6B2D5C; }

/* sub-questions hang off the symptom that triggered them */
.st-subs { padding: 0 2px 16px 34px; }
.st-subq { margin-top: 4px; }
.st-subq-label { font-size: 13.5px; line-height: 1.4; color: var(--ink-soft); margin: 0 0 8px; }
.st-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.st-chip {
  font: inherit; font-size: 14.5px; line-height: 1.25;
  padding: 9px 13px; min-height: 40px;
  background: #fff; color: var(--ink);
  border: 1px solid var(--line); border-radius: 3px; cursor: pointer;
}
.st-chip[data-on="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
.st-chip:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.st-date {
  font: inherit; font-size: 15.5px; padding: 9px 11px;
  background: #fff; border: 1px solid var(--line); border-radius: 3px; color: var(--ink);
}
.st-date:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.st-subtoggle {
  display: flex; align-items: flex-start; gap: 11px;
  width: 100%; text-align: left; background: none; border: none;
  padding: 9px 0; font: inherit; font-size: 15px; line-height: 1.35;
  color: var(--ink); cursor: pointer; min-height: 42px;
}
.st-subtoggle:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
.st-subbox {
  flex: 0 0 auto; width: 19px; height: 19px; margin-top: 1px;
  border: 1.5px solid var(--ink-soft); border-radius: 3px;
  display: grid; place-items: center; background: #fff;
}
.st-subtoggle[data-on="true"] .st-subbox { background: var(--ink); border-color: var(--ink); }

.st-group { margin-bottom: 26px; }

.st-foot {
  font-size: 12.5px; line-height: 1.55; color: var(--ink-soft);
  border-top: 1px solid var(--line); padding-top: 14px; margin-top: 30px;
}

.st-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  border: none; width: 100%; font: inherit; color: #fff; cursor: pointer;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  text-align: left; box-shadow: 0 -1px 0 rgba(0,0,0,0.12);
}
.st-bar-inner { max-width: 460px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
.st-bar-word { font-family: 'Newsreader', Georgia, serif; font-size: 25px; line-height: 1.1; font-weight: 400; flex: 1; }
.st-bar-hint { font-size: 13px; opacity: 0.85; margin-top: 3px; }
.st-bar:focus-visible { outline: 2px solid #fff; outline-offset: -6px; }

.st-scrim { position: fixed; inset: 0; background: rgba(27,42,47,0.45); border: none; width: 100%; cursor: pointer; }
.st-sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  max-height: 88vh; overflow-y: auto; background: var(--card);
  border-radius: 10px 10px 0 0; padding: 0 0 calc(24px + env(safe-area-inset-bottom));
}
.st-sheet-inner { max-width: 460px; margin: 0 auto; }
.st-sheet-top { color: #fff; padding: 24px 20px 22px; }
.st-sheet-word { font-family: 'Newsreader', Georgia, serif; font-size: 32px; line-height: 1.1; font-weight: 400; margin: 0; }
.st-sheet-say { font-size: 14.5px; line-height: 1.5; margin: 9px 0 0; opacity: 0.92; }
.st-body { padding: 4px 20px 0; }

.st-finding { padding: 20px 0; border-bottom: 1px solid var(--line); }
.st-finding:last-child { border-bottom: none; }
.st-finding-name { font-size: 16px; font-weight: 600; margin: 0 0 7px; }
.st-rule { font-size: 15px; line-height: 1.5; margin: 0 0 10px; }
.st-meta { font-size: 14px; line-height: 1.5; color: var(--ink-soft); margin: 0 0 4px; }
.st-meta b { color: var(--ink); font-weight: 600; }
.st-src { font-size: 13px; line-height: 1.45; color: var(--ink-soft); margin: 9px 0 0; }
.st-note { font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); padding: 16px 0 2px; border-top: 1px solid var(--line); }

.st-close {
  display: block; width: calc(100% - 40px); margin: 18px 20px 0;
  padding: 15px; font: inherit; font-size: 16px; font-weight: 500;
  background: var(--ink); color: #fff; border: none; border-radius: 4px; cursor: pointer;
}
.st-close:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

@media (prefers-reduced-motion: no-preference) {
  .st-sheet { animation: st-up 0.22s ease-out; }
  @keyframes st-up { from { transform: translateY(14px); opacity: 0.6; } to { transform: none; opacity: 1; } }
}
`;

const VERDICT = {
  urgent: { rank: 4, word: "Get medical help now", bg: "#6B2D5C", say: "This isn't a school question any more. Ring your GP, call 13 HEALTH (13 43 25 84), or go to an emergency department." },
  red:    { rank: 3, word: "Keep them home",       bg: "#A8322A", say: "An exclusion rule applies today." },
  amber:  { rank: 2, word: "Your call today",      bg: "#B0700A", say: "No clear rule decides this one. Here's what to weigh up." },
  green:  { rank: 1, word: "School is fine",       bg: "#2E6F4E", say: "This matches a pattern that carries no exclusion. Send them if they can take part in a normal day." },
  none:   { rank: 0, word: "Nothing ticked yet",   bg: "#5C6A66", say: "Tick what you're seeing this morning." },
};

const QLD = "Queensland Health, Time Out poster (Jan 2026).";
const SH = "NHMRC, Staying Healthy 6th ed. fact sheets.";

const FLAGS = [
  { id: "glass",  label: "A rash that doesn't fade when you press a glass against it" },
  { id: "neck",   label: "Stiff neck, or a headache with light hurting their eyes" },
  { id: "breath", label: "Working hard to breathe, or pale, grey or blue lips" },
  { id: "rouse",  label: "Floppy, very drowsy, or hard to wake properly" },
  { id: "fit",    label: "Has had a fit or seizure" },
  { id: "fluid",  label: "Can't keep any fluid down" },
  { id: "wee",    label: "Not passing urine, or far fewer wet nappies than usual" },
  { id: "pain",   label: "Pain that doesn't settle with pain relief" },
];

/* Each symptom carries only the questions its own rules need. */
const SYMPTOMS = [
  {
    id: "temp", label: "Temperature",
    subs: [
      { id: "temp_band", kind: "choice", q: "How high is it?", options: [
        ["t_low", "Under 37.5°C"], ["t_mid", "37.5–37.9°C"], ["t_high", "38°C or over"],
      ]},
      { id: "temp_cause", kind: "toggle", q: "A doctor has found a non-infectious cause for it" },
    ],
  },
  {
    id: "gastro", label: "Vomiting or diarrhoea",
    subs: [
      { id: "g_last", kind: "choice", q: "When did it last happen?", options: [
        ["g_now", "In the last 24 hours"], ["g_24", "24 to 48 hours ago"], ["g_48", "More than 48 hours ago"],
      ]},
      { id: "g_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["gx_none", "Not yet"], ["gx_noro", "Norovirus"], ["gx_stec", "Shigella, STEC or typhoid"], ["gx_gastro", "Gastro, cause not identified"],
      ]},
    ],
  },
  {
    id: "rash", label: "A rash or spots",
    subs: [
      { id: "r_since", kind: "date", q: "When did the rash appear?" },
      { id: "r_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["rx_none", "Not yet"], ["rx_measles", "Measles"], ["rx_rubella", "Rubella"], ["rx_roseola", "Roseola"],
        ["rx_slapped", "Slapped cheek"], ["rx_chicken", "Chickenpox"], ["rx_strep", "Scarlet fever"],
        ["rx_moll", "Molluscum"], ["rx_scabies", "Scabies"], ["rx_tinea", "Ringworm or tinea"],
      ]},
      { id: "r_tx", kind: "date", q: "When did treatment start?",
        showIf: (d) => ["rx_strep", "rx_scabies", "rx_tinea"].includes(d.r_dx) },
      { id: "r_crusted", kind: "toggle", q: "Every spot has dried and crusted over" },
      { id: "r_well", kind: "toggle", q: "Otherwise fully recovered" },
    ],
  },
  {
    id: "blister", label: "Blisters",
    subs: [
      { id: "b_where", kind: "choice", q: "Where are they?", options: [
        ["b_hfm", "Palms, soles and inside the mouth"], ["b_all", "Spread over the whole body"], ["b_band", "One band on one side"],
      ]},
      { id: "b_since", kind: "date", q: "When did they appear?" },
      { id: "b_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["bx_none", "Not yet"], ["bx_hfmd", "Hand, foot and mouth"], ["bx_chicken", "Chickenpox"], ["bx_shingles", "Shingles"],
      ]},
      { id: "b_dried", kind: "toggle", q: "All blisters have dried and crusted" },
      { id: "b_well", kind: "toggle", q: "Fever gone, eating and drinking normally" },
    ],
  },
  {
    id: "resp", label: "Cough, runny nose or sore throat",
    subs: [
      { id: "resp_which", kind: "multi", q: "Which of these?", options: [
        ["c_cough", "Cough"], ["c_nose", "Runny or blocked nose"], ["c_throat", "Sore throat"],
      ]},
      { id: "resp_since", kind: "date", q: "When did they start?" },
      { id: "resp_worse", kind: "toggle", q: "Getting worse rather than easing" },
      { id: "resp_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["px_none", "Not yet"], ["px_ili", "COVID-19, flu or RSV"], ["px_whoop", "Whooping cough"],
        ["px_strep", "Strep throat"], ["px_gland", "Glandular fever"],
      ]},
      { id: "resp_abx", kind: "date", q: "When did antibiotics start?" },
      { id: "resp_gone", kind: "toggle", q: "Symptoms have gone — a leftover cough at most" },
    ],
  },
  {
    id: "eyes", label: "Red, itchy or weeping eyes",
    subs: [
      { id: "e_discharge", kind: "toggle", q: "There's pus or sticky discharge" },
      { id: "e_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["ex_none", "Not yet"], ["ex_conj", "Infectious conjunctivitis"], ["ex_non", "Allergy, irritant or blocked tear duct"],
      ]},
    ],
  },
  {
    id: "sores", label: "Crusty or weeping skin sores",
    subs: [
      { id: "s_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["sx_none", "Not yet"], ["sx_impetigo", "School sores (impetigo)"],
      ]},
      { id: "s_tx", kind: "date", q: "When did treatment start?" },
      { id: "s_covered", kind: "toggle", q: "Sores on exposed skin are covered with a waterproof dressing" },
    ],
  },
  {
    id: "ring", label: "A round, scaly, spreading patch",
    subs: [
      { id: "ring_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["kx_none", "Not yet"], ["kx_tinea", "Ringworm or tinea"],
      ]},
      { id: "ring_tx", kind: "date", q: "When did antifungal treatment start?" },
    ],
  },
  {
    id: "itch", label: "Intense itching, worse at night",
    subs: [
      { id: "i_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["ix_none", "Not yet"], ["ix_scabies", "Scabies"], ["ix_eczema", "Eczema or dry skin"],
      ]},
      { id: "i_tx", kind: "date", q: "When did treatment start?" },
    ],
  },
  {
    id: "coldsore", label: "Cold sores on or around the lips",
    subs: [
      { id: "cs_dry", kind: "toggle", q: "The sores are dry" },
    ],
  },
  {
    id: "glands", label: "Swollen glands under the ears or jaw",
    subs: [
      { id: "gl_since", kind: "date", q: "When did the swelling start?" },
      { id: "gl_dx", kind: "choice", q: "Has a doctor named it?", options: [
        ["lx_none", "Not yet"], ["lx_mumps", "Mumps"], ["lx_gland", "Glandular fever"],
      ]},
    ],
  },
  { id: "jaundice", label: "Yellow tinge to the skin or the whites of the eyes", subs: [] },
  {
    id: "lice", label: "Head lice",
    subs: [
      { id: "l_tx", kind: "choice", q: "Treatment?", options: [
        ["l_no", "Not started"], ["l_tonight", "Starting before school tomorrow"], ["l_done", "Started yesterday or earlier"],
      ]},
    ],
  },
  { id: "bottom", label: "Itchy bottom, worse at night", subs: [] },
  { id: "off", label: "Just not themselves — flat, clingy, off their food", subs: [] },
];

/* Local date, not UTC: toISOString() is still "yesterday" before 10am in Queensland. */
const shown = (q, d) => !q.showIf || q.showIf(d);

const todayISO = () => new Date().toLocaleDateString("en-CA");

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso + "T00:00:00");
  if (isNaN(then.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - then) / 86400000);
}

function dateAfter(iso, n) {
  if (!iso) return null;
  const x = new Date(iso + "T00:00:00");
  if (isNaN(x.getTime())) return null;
  x.setDate(x.getDate() + n);
  return x.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

/* "Back at school" reads better as a date than as a countdown the parent runs. */
function returnLine(iso, n, fallback) {
  const d = daysSince(iso);
  if (d === null) return fallback;
  const when = dateAfter(iso, n);
  return d >= n ? `That point has passed — it was ${when}.` : `From ${when}.`;
}

function ago(days) {
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function evaluate(ageMonths, picked, flagged, d) {
  const has = (k) => picked.includes(k);
  const is = (k, v) => d[k] === v;
  const on = (k) => d[k] === true;
  const multi = (k) => (Array.isArray(d[k]) ? d[k] : []);

  const babyFever = ageMonths !== null && ageMonths < 3 && is("temp_band", "t_high");

  if (flagged.length > 0 || babyFever) {
    const findings = flagged.map((id) => ({
      name: FLAGS.find((x) => x.id === id).label,
      rule: "This is one of the signs that shouldn't wait. Don't spend time deciding about school.",
      watch: null, back: null,
      src: `${SH} Concerning symptoms.`,
    }));
    if (babyFever) findings.unshift({
      name: "Under 3 months, with a temperature of 38°C or over",
      rule: "At this age a temperature of 38°C or over needs a doctor today, even with no other symptoms at all. That's the whole rule — there's no threshold of other symptoms to reach first.",
      watch: null, back: null,
      src: `${SH} Fever fact sheet.`,
    });
    return { verdict: "urgent", findings, note: null };
  }

  if (picked.length === 0) return { verdict: "none", findings: [], note: null };

  const f = [];

  /* ---- Temperature ---- */
  if (has("temp")) {
    if (is("temp_band", "t_high")) {
      if (on("temp_cause")) f.push({
        v: "amber",
        name: "Fever with a known non-infectious cause",
        rule: "The exclusion has an exception written into it: exclude until the temperature is normal, unless the fever has a known non-infectious cause. If a doctor has identified one, the infection-control rule doesn't apply — but a child with a temperature still has to be well enough for the day.",
        watch: "Anything new appearing alongside the fever.",
        back: "No exclusion applies, but judge it on how they are.",
        src: `${SH} Fever fact sheet.`,
      });
      else f.push({
        v: "red",
        name: "Temperature 38°C or over",
        rule: "Excluded until the temperature stays normal. Note what the rule doesn't say: there's no 24-hour clock in the national guidance, and no requirement to be off paracetamol for a set period. Many schools add that themselves — check your school's policy, because it may be stricter than this.",
        watch: "A rash appearing, neck stiffness, or getting drowsier rather than better.",
        back: "When their temperature stays normal on its own.",
        src: `${SH} Fever fact sheet.`,
      });
    } else if (is("temp_band", "t_mid")) f.push({
      v: "amber",
      name: "Temperature 37.5–37.9°C",
      rule: "Not a fever yet, and not an exclusion. The guidance for staff is to retest within 30 minutes; 38°C and over is the threshold that sends a child home. Do the same at the kitchen table before deciding.",
      watch: "A reading that climbs past 38°C on the retest.",
      back: null,
      src: `${SH} Fever fact sheet.`,
    });
    else if (is("temp_band", "t_low")) f.push({
      v: "green",
      name: "Temperature under 37.5°C",
      rule: "That's a normal reading. No fever, so no fever rule.",
      watch: null, back: null,
      src: `${SH} Fever fact sheet.`,
    });
    else f.push({
      v: "amber",
      name: "Temperature — no reading yet",
      rule: "The whole rule turns on the number. Take a reading before deciding: under 37.5°C is normal, 37.5 to 37.9 means retest in 30 minutes, and 38°C or over is the exclusion threshold.",
      watch: null, back: null,
      src: `${SH} Fever fact sheet.`,
    });
  }

  /* ---- Vomiting and diarrhoea ---- */
  if (has("gastro")) {
    const clear48 = is("g_last", "g_48");
    const clear24 = is("g_last", "g_24") || clear48;
    if (is("g_dx", "gx_noro")) f.push({
      v: clear48 ? "green" : "red",
      name: "Norovirus",
      rule: "Norovirus is the 48-hour one, not 24. Excluded until there's been no diarrhoea or vomiting for at least 48 hours.",
      watch: "Signs of dehydration — dry mouth, no tears, passing much less urine.",
      back: "48 hours clear of both vomiting and diarrhoea.",
      src: QLD,
    });
    else if (is("g_dx", "gx_stec")) f.push({
      v: "red",
      name: "Shigella, STEC or typhoid",
      rule: "48 hours clear of symptoms, and negative stool samples may be required before return. Your public health unit decides this one — don't work it out from a chart.",
      watch: "Blood in the stool, or a child getting worse rather than better.",
      back: "The public health unit will tell you. 48 hours clear is the floor, not the answer.",
      src: QLD,
    });
    else f.push({
      v: clear24 ? "green" : "red",
      name: "Vomiting or diarrhoea",
      rule: clear24
        ? "24 hours clear of both is the default rule and you've met it — unless the cause turns out to be norovirus, shigella, STEC or typhoid, which are all 48 hours."
        : "Excluded until there's been no vomiting and no diarrhoea for at least 24 hours. That's the default. Norovirus, shigella, STEC and typhoid are all 48 hours instead, with possible stool clearance. With no cause named you're working to 24 hours and watching for a reason to extend.",
      watch: "Signs of dehydration — dry mouth, no tears, passing much less urine. Blood in the stool.",
      back: "24 hours clear of both, or 48 if a 48-hour bug is named.",
      src: `${QLD} Diarrhoea here means 3 or more loose motions in 24 hours.`,
    });
  }

  /* ---- Rash ---- */
  if (has("rash")) {
    const since = d.r_since;
    const days = daysSince(since);
    /* Treatment date from the rash question, or the same date given under another ticked symptom. */
    const rashTx = (other) => d.r_tx ?? d[other];
    if (is("r_dx", "rx_measles")) f.push({
      v: "red",
      name: "Measles",
      rule: "Excluded until the treating doctor confirms they're no longer infectious, and not earlier than 4 days after the rash started. Measles is notifiable — your doctor contacts the public health unit, and unvaccinated contacts at school may be excluded too.",
      watch: "Breathing trouble, drowsiness, or a fever that climbs again after improving.",
      back: `${returnLine(since, 4, "4 days after the rash appeared.")} The doctor still has to confirm it.`,
      src: QLD,
    });
    else if (is("r_dx", "rx_rubella")) f.push({
      v: days !== null && days >= 7 && on("r_well") ? "green" : "red",
      name: "Rubella",
      rule: "Excluded for 7 days after the rash started, or until fully recovered — whichever is longer. Tell the school: pregnant staff and parents need to know.",
      watch: null,
      back: returnLine(since, 7, "7 days from the rash, or full recovery, whichever is later."),
      src: `${QLD} healthdirect still lists 4 days from the older 5th-edition guidance; 7 is current.`,
    });
    else if (is("r_dx", "rx_chicken")) f.push({
      v: on("r_crusted") ? "green" : "red",
      name: "Chickenpox",
      rule: "Excluded until every blister has dried and crusted. In unvaccinated children that's usually at least 5 days from when the rash appeared, and less in vaccinated children — but the crusting is the rule, not the count.",
      watch: "Blisters that look infected, or a child who becomes drowsy or breathless.",
      back: since ? `When all spots have crusted. Unvaccinated, that's typically around ${dateAfter(since, 5)}.` : "When all spots have crusted.",
      src: `${QLD} and ${SH}`,
    });
    else if (is("r_dx", "rx_roseola")) f.push({
      v: "green", name: "Roseola",
      rule: "Roseola carries no exclusion. By the time the rash shows, they've stopped being infectious. The parent advice is still to keep them home until the fever has gone and they feel well.",
      watch: null, back: "No exclusion applies.", src: `${QLD} and ${SH}`,
    });
    else if (is("r_dx", "rx_slapped")) f.push({
      v: "green", name: "Slapped cheek (fifth disease)",
      rule: "No exclusion. Do tell the school, because pregnant staff and parents are advised to speak to their doctor.",
      watch: null, back: "No exclusion applies.", src: QLD,
    });
    else if (is("r_dx", "rx_moll")) f.push({
      v: "green", name: "Molluscum contagiosum",
      rule: "No exclusion.", watch: null, back: "No exclusion applies.", src: QLD,
    });
    else if (is("r_dx", "rx_strep")) f.push({
      v: daysSince(rashTx("resp_abx")) !== null && daysSince(rashTx("resp_abx")) >= 1 ? "green" : "red",
      name: "Scarlet fever",
      rule: "Excluded until they've had antibiotics for at least 24 hours and feel well. Both conditions, not just the clock.",
      watch: "Trouble swallowing or breathing, or a fever that returns days later.",
      back: "24 hours of antibiotics, and feeling well.",
      src: QLD,
    });
    else if (is("r_dx", "rx_scabies")) f.push({
      v: daysSince(rashTx("i_tx")) !== null && daysSince(rashTx("i_tx")) >= 1 ? "green" : "red",
      name: "Scabies",
      rule: "Excluded until the day after treatment started. Starting it this morning doesn't clear them for today.",
      watch: null, back: returnLine(rashTx("i_tx"), 1, "The day after treatment starts."), src: QLD,
    });
    else if (is("r_dx", "rx_tinea")) f.push({
      v: daysSince(rashTx("ring_tx")) !== null && daysSince(rashTx("ring_tx")) >= 1 ? "green" : "red",
      name: "Ringworm or tinea",
      rule: "Excluded until the day after antifungal treatment started. (Thrush carries no exclusion.)",
      watch: null, back: returnLine(rashTx("ring_tx"), 1, "The day after antifungal treatment starts."), src: QLD,
    });
    else f.push({
      v: "amber",
      name: "A rash, cause not identified",
      rule: `The rules split sharply. No exclusion at all: roseola, slapped cheek, molluscum. Firm exclusions: measles (4 days from the rash, and notifiable), rubella (7 days), chickenpox (until crusted), scarlet fever (24 hours of antibiotics). What separates them is mostly what came first — measles brings fever, cough and sore red eyes for 3 to 4 days before the rash; roseola's fever breaks as the rash arrives; slapped cheek is bright red cheeks then a lacy rash on the limbs.${days !== null ? ` Yours appeared ${ago(days)}, which narrows it without settling it.` : ""} An undiagnosed rash on a child who is unwell needs a GP, not a guess.`,
      watch: "Whether it fades when pressed with a glass. If it doesn't, that's urgent — go back to the top of this form.",
      back: "Depends entirely on the cause.",
      src: `${QLD} and ${SH} Rash fact sheet.`,
    });
  }

  /* ---- Blisters ---- */
  if (has("blister")) {
    const since = d.b_since;
    if (is("b_dx", "bx_hfmd")) f.push({
      v: on("b_dried") && on("b_well") ? "green" : "red",
      name: "Hand, foot and mouth disease",
      rule: "Excluded until all blisters have dried. Staying Healthy adds two conditions for parents: the fever has stopped and they're eating and drinking normally.",
      watch: "Refusing all fluids because their mouth hurts.",
      back: "All blisters dried, fever gone, eating and drinking normally.",
      src: `${QLD} Return conditions from ${SH}`,
    });
    else if (is("b_dx", "bx_chicken")) f.push({
      v: on("b_dried") ? "green" : "red",
      name: "Chickenpox",
      rule: "Excluded until every blister has dried and crusted. Unvaccinated, that's usually at least 5 days from when the rash appeared; less if vaccinated. The crusting is the rule, not the count.",
      watch: "Blisters that look infected, or a child who becomes drowsy or breathless.",
      back: since ? `When all blisters have crusted. Unvaccinated, typically around ${dateAfter(since, 5)}.` : "When all blisters have crusted.",
      src: `${QLD} and ${SH}`,
    });
    else if (is("b_dx", "bx_shingles")) f.push({
      v: on("b_dried") ? "green" : "red",
      name: "Shingles",
      rule: "Children are excluded until the blisters have dried and crusted. (Adults have a different rule — not excluded if every blister can be covered.)",
      watch: "A rash near the eye — that needs a doctor the same day.",
      back: "When all blisters have dried and crusted.",
      src: QLD,
    });
    else {
      const hint = is("b_where", "b_hfm")
        ? "Palms, soles and inside the mouth is the hand, foot and mouth pattern, and it's mainly a disease of under-10s. That would mean back once blisters are dry, the fever's gone and they're eating normally."
        : is("b_where", "b_all")
        ? "Blisters spread all over, in crops at different stages and intensely itchy, is the chickenpox pattern. That would mean back once every blister has crusted."
        : is("b_where", "b_band")
        ? "A band of blisters on one side of the body only is the shingles pattern. For a child that means back once they've dried and crusted."
        : "Where they are is what separates these: palms, soles and mouth points to hand, foot and mouth; spread all over in crops points to chickenpox; a band on one side points to shingles.";
      f.push({
        v: "amber",
        name: "Blisters, cause not identified",
        rule: `${hint} All three carry an exclusion, but the return conditions differ, so this needs naming before you can act on it. A GP can tell them apart in a minute.`,
        watch: "Refusing all fluids, or blisters that look infected.",
        back: "Depends which one it is.",
        src: `${QLD} and ${SH}`,
      });
    }
  }

  /* ---- Respiratory ---- */
  if (has("resp")) {
    const which = multi("resp_which");
    const count = which.length;
    const started = daysSince(d.resp_since);
    const isNew = started !== null && started <= 3;
    const abxDays = daysSince(d.resp_abx);

    if (is("resp_dx", "px_ili")) f.push({
      v: on("resp_gone") ? "green" : "red",
      name: "COVID-19, flu or RSV",
      rule: "Queensland groups these as influenza-like illness: excluded until symptoms have resolved, normally 5 to 7 days. A lingering cough on its own doesn't hold them back once everything else has cleared and they feel well.",
      watch: "Breathing that gets harder, or a fever that returns after improving.",
      back: d.resp_since
        ? `When symptoms resolve — typically between ${dateAfter(d.resp_since, 5)} and ${dateAfter(d.resp_since, 7)}.`
        : "When symptoms have resolved. A leftover cough alone is fine.",
      src: `${QLD} Return-with-cough allowance from ${SH}`,
    });
    else if (is("resp_dx", "px_whoop")) {
      const noAbxOK = started !== null && started >= 21;
      const abxOK = abxDays !== null && abxDays >= 5;
      f.push({
        v: noAbxOK || abxOK ? "green" : "red",
        name: "Whooping cough",
        rule: "Excluded until 5 days after starting appropriate antibiotics, or 21 days from when the cough started if they're not taking antibiotics. Contacts at school may need excluding too — that's a public health unit call.",
        watch: "Coughing fits that end in vomiting, or pauses in breathing.",
        back: d.resp_abx
          ? returnLine(d.resp_abx, 5, "5 days into antibiotics.")
          : returnLine(d.resp_since, 21, "21 days from the first cough, or 5 days into antibiotics."),
        src: QLD,
      });
    }
    else if (is("resp_dx", "px_strep")) f.push({
      v: abxDays !== null && abxDays >= 1 ? "green" : "red",
      name: "Strep throat",
      rule: "Excluded until they've had antibiotics for at least 24 hours and feel well. Both conditions, not just the clock.",
      watch: "Trouble swallowing or breathing, or a fever that returns days later.",
      back: "24 hours of antibiotics, and feeling well.",
      src: QLD,
    });
    else if (is("resp_dx", "px_gland")) f.push({
      v: "green", name: "Glandular fever",
      rule: "No exclusion. Fatigue often outlasts the infection, so the question is whether they can get through the day, not whether they're allowed in.",
      watch: null, back: "No exclusion applies.", src: QLD,
    });
    else if (count >= 2) f.push({
      v: "red",
      name: "Several respiratory symptoms at once",
      rule: "A cough on its own usually isn't an exclusion. Several respiratory symptoms together is — the guidance gives cough plus fever plus runny nose as its own example, excluded until symptoms resolve or the illness is diagnosed. You've ticked more than one, so this is the case the rule was written for.",
      watch: "Breathing that gets harder, or symptoms worsening over days rather than easing.",
      back: "When the symptoms have resolved. A leftover cough alone is fine once everything else has cleared.",
      src: `${SH} Respiratory symptoms fact sheet.`,
    });
    else if (count === 1 && (isNew || on("resp_worse"))) f.push({
      v: "red",
      name: "A new or worsening respiratory symptom",
      rule: `One symptom, but ${on("resp_worse") ? "getting worse" : `it started ${ago(started)}`}. That's the second trigger in the rule: exclude if symptoms are new or worsening, even when there's only one. Long-standing or recurring symptoms are treated differently, because they usually have a non-infectious cause. This app counts anything from the last 3 days as new.`,
      watch: "Breathing that gets harder.",
      back: "When the symptoms have resolved.",
      src: `${SH} Respiratory symptoms fact sheet.`,
    });
    else if (count === 1 && !has("off") && !is("temp_band", "t_high") && !is("temp_band", "t_mid")) f.push({
      v: "green",
      name: "A single settled respiratory symptom",
      rule: "One respiratory symptom, not new, not worsening, no fever, and they're themselves. That is the pattern the guidance explicitly does not exclude. An ongoing cough after a cold is the standard example — if the other symptoms have gone and they feel well, they can go.",
      watch: "A second symptom appearing, or a fever developing later.",
      back: null,
      src: `${SH} Respiratory symptoms fact sheet.`,
    });
    else f.push({
      v: "amber",
      name: count === 0 ? "Respiratory symptoms — which ones?" : "A respiratory symptom, with something else going on",
      rule: count === 0
        ? "The rule counts symptoms, so it needs to know which ones. One settled symptom isn't an exclusion; two or more at once is."
        : "One respiratory symptom by itself wouldn't exclude. But you've also flagged a temperature or that they're off in themselves, and the guidance is explicit that symptoms are assessed together rather than separately, alongside general wellness. That takes this out of the clear-yes column.",
      watch: "A second respiratory symptom, or a temperature climbing past 38°C.",
      back: null,
      src: `${SH} Respiratory symptoms fact sheet and Managing infections.`,
    });
  }

  /* ---- Eyes ---- */
  if (has("eyes")) {
    if (is("e_dx", "ex_non")) f.push({
      v: "green",
      name: "Non-infectious eye discharge",
      rule: "Discharge from allergy, an irritant or a blocked tear duct isn't infectious, and the conjunctivitis exclusion doesn't apply. This is the exception written into the rule itself.",
      watch: null, back: "No exclusion applies.",
      src: `${QLD} and ${SH} Eye discharge fact sheet.`,
    });
    else if (is("e_dx", "ex_conj")) f.push({
      v: on("e_discharge") ? "red" : "green",
      name: "Infectious conjunctivitis",
      rule: on("e_discharge")
        ? "Excluded while there's still discharge from the eye."
        : "The rule keys on discharge, not redness. Once discharge has stopped the exclusion is over, even if the eye still looks pink.",
      watch: "Pain in the eye rather than irritation, or vision that seems off.",
      back: "When the discharge has stopped.",
      src: QLD,
    });
    else f.push({
      v: on("e_discharge") ? "red" : "amber",
      name: "Eye symptoms",
      rule: on("e_discharge")
        ? "Discharge is the trigger, and it's an exclusion until the discharge stops — unless a doctor diagnoses a non-infectious cause. Allergy, an irritant and a blocked tear duct can all produce discharge and none are infectious, so a diagnosis can lift this."
        : "Red or itchy eyes without discharge aren't what the rule is aimed at — it's worded around discharge stopping. Hayfever, an irritant and a blocked tear duct all produce red or weepy eyes and carry no exclusion; infectious conjunctivitis usually brings yellow or green sticky discharge that gums the lid shut. If you're unsure which, that's a GP or pharmacist question.",
      watch: "Pain in the eye rather than irritation, or vision that seems off.",
      back: "When any discharge has stopped.",
      src: `${QLD} and ${SH} Eye discharge fact sheet.`,
    });
  }

  /* ---- Skin sores ---- */
  if (has("sores")) {
    const txDays = daysSince(d.s_tx);
    if (is("s_dx", "sx_impetigo")) f.push({
      v: txDays !== null && txDays >= 1 && on("s_covered") ? "green" : "red",
      name: "School sores (impetigo)",
      rule: "Excluded until the day after treatment started — not the same day. Sores on exposed skin must be covered with a waterproof dressing until they're dry.",
      watch: "Sores spreading quickly, or red streaks running from them.",
      back: returnLine(d.s_tx, 1, "The day after treatment starts, with exposed sores covered."),
      src: QLD,
    });
    else f.push({
      v: "amber",
      name: "Skin sores, cause not identified",
      rule: "If it's school sores (impetigo), the rule is stricter than people expect: excluded until the day after treatment starts, with exposed sores covered by a waterproof dressing. Starting a cream this morning doesn't clear them for today. Other things look similar — infected eczema, insect bites, a healing graze — and carry no exclusion. A look from a GP or pharmacist settles it.",
      watch: "Sores spreading quickly, or red streaks running from them.",
      back: "If impetigo: the day after treatment starts, sores covered.",
      src: QLD,
    });
  }

  /* ---- Ringworm ---- */
  if (has("ring")) {
    const txDays = daysSince(d.ring_tx);
    if (is("ring_dx", "kx_tinea")) f.push({
      v: txDays !== null && txDays >= 1 ? "green" : "red",
      name: "Ringworm or tinea",
      rule: "Excluded until the day after antifungal treatment started. (Thrush carries no exclusion.)",
      watch: null,
      back: returnLine(d.ring_tx, 1, "The day after antifungal treatment starts."),
      src: QLD,
    });
    else f.push({
      v: "amber",
      name: "A round scaly patch",
      rule: "Ringworm and tinea carry an exclusion until the day after antifungal treatment starts. But a round scaly patch can also be eczema or pityriasis, neither of which excludes. A pharmacist can usually call this.",
      watch: null,
      back: "If tinea: the day after antifungal treatment starts.",
      src: QLD,
    });
  }

  /* ---- Night itching ---- */
  if (has("itch")) {
    const txDays = daysSince(d.i_tx);
    if (is("i_dx", "ix_scabies")) f.push({
      v: txDays !== null && txDays >= 1 ? "green" : "red",
      name: "Scabies",
      rule: "Excluded until the day after treatment started.",
      watch: null,
      back: returnLine(d.i_tx, 1, "The day after treatment starts."),
      src: QLD,
    });
    else if (is("i_dx", "ix_eczema")) f.push({
      v: "green",
      name: "Eczema or dry skin",
      rule: "No exclusion. Itching from eczema or dry skin isn't infectious, and the guidance treats symptoms with a known non-infectious cause differently from new ones.",
      watch: "Skin that looks infected — weeping, crusting or spreading redness.",
      back: "No exclusion applies.",
      src: `${SH} Managing infections.`,
    });
    else f.push({
      v: "amber",
      name: "Intense itching at night",
      rule: "Scabies is the one with a rule — excluded until the day after treatment starts. Eczema and dry skin itch at night too and carry no exclusion. Scabies usually shows thin burrow lines between the fingers, at the wrists or around the waist, and often more than one person in the house is itching.",
      watch: null,
      back: "If scabies: the day after treatment starts.",
      src: QLD,
    });
  }

  /* ---- Cold sores. The rule splits on age and hygiene. ---- */
  if (has("coldsore")) {
    if (ageMonths === null) f.push({
      v: "amber",
      name: "Cold sores",
      rule: "This rule turns on age and hygiene, not the sore. Young children who can't manage good hygiene are excluded until the sores are dry. Older children aren't excluded, and should cover the sore where possible. Add an age at the top and this one resolves.",
      watch: "A cold sore near the eye.",
      back: "For younger children: when the sores are dry.",
      src: QLD,
    });
    else if (ageMonths < 60) f.push({
      v: on("cs_dry") ? "green" : "red",
      name: "Cold sores",
      rule: "At this age the rule is exclusion until the sores are dry, because it applies to young children who can't reliably manage hygiene. The source says exactly that — young children unable to comply with good hygiene practices — rather than naming an age. This app draws that line at 5.",
      watch: "A cold sore near the eye.",
      back: "When the sores are dry.",
      src: QLD,
    });
    else f.push({
      v: "green",
      name: "Cold sores",
      rule: "Older children aren't excluded for cold sores, provided they can manage hygiene. Cover the sore with a dressing where that's practical.",
      watch: "A cold sore near the eye.",
      back: "No exclusion applies.",
      src: QLD,
    });
  }

  /* ---- Swollen glands ---- */
  if (has("glands")) {
    const days = daysSince(d.gl_since);
    if (is("gl_dx", "lx_mumps")) f.push({
      v: days !== null && days >= 5 ? "green" : "red",
      name: "Mumps",
      rule: "Excluded for 5 days after the swelling started.",
      watch: "Severe headache, neck stiffness or abdominal pain.",
      back: returnLine(d.gl_since, 5, "5 days after the swelling appeared."),
      src: `${QLD} healthdirect still lists 9 days from the older 5th-edition guidance; 5 is current.`,
    });
    else if (is("gl_dx", "lx_gland")) f.push({
      v: "green", name: "Glandular fever",
      rule: "No exclusion. Fatigue often outlasts the infection, so the question is whether they can get through the day.",
      watch: null, back: "No exclusion applies.", src: QLD,
    });
    else f.push({
      v: "amber",
      name: "Swollen glands",
      rule: "Swelling under the ears along the jawline is the mumps pattern, and mumps means 5 days from the onset of swelling. Glandular fever swells the neck glands and carries no exclusion. Ordinary reactive glands with a cold carry no exclusion either. Mumps swelling is usually in front of and below the ear, and makes chewing hurt. Worth a GP call today.",
      watch: "Severe headache, neck stiffness or abdominal pain.",
      back: "If mumps: 5 days after the swelling started.",
      src: QLD,
    });
  }

  if (has("jaundice")) f.push({
    v: "red",
    name: "Yellow skin or eyes",
    rule: "Jaundice isn't a wait-and-see symptom. It's the presenting sign of hepatitis A, which is excluded and notifiable, and of other things that need looking at. See a doctor today rather than deciding about school.",
    watch: "Dark urine, pale stools, or abdominal pain.",
    back: "A doctor and your public health unit decide.",
    src: QLD,
  });

  if (has("lice")) f.push({
    v: is("l_tx", "l_done") || is("l_tx", "l_tonight") ? "green" : "amber",
    name: "Head lice",
    rule: (is("l_tx", "l_done") || is("l_tx", "l_tonight"))
      ? "Not excluded, because effective treatment starts before the next school day. That condition is what makes this a green, not the lice themselves."
      : "Head lice aren't excluded — but the rule has a condition: effective treatment must start before the next attendance day. Until you've started it, the condition isn't met. A child found to have lice at school also doesn't need sending home immediately.",
    watch: null,
    back: "Same day, once effective treatment has started.",
    src: QLD,
  });

  if (has("bottom")) f.push({
    v: "green",
    name: "Itchy bottom at night",
    rule: "The usual cause is threadworms, and intestinal worms carry no exclusion. Treat the whole household, but school is fine.",
    watch: null, back: "No exclusion applies.", src: QLD,
  });

  if (has("off")) f.push({
    v: "amber",
    name: "Not themselves",
    rule: "No exclusion rule covers this on its own, and no app can call it. But the guidance does tell staff to assess general wellness as well as specific symptoms, so it isn't nothing — and 'not themselves' is the signal parents read most accurately.",
    watch: "Anything new appearing over the next few hours.",
    back: null,
    src: `${SH} Managing infections.`,
  });

  /* Anything unmatched falls to amber. Never to green. */
  if (f.length === 0) f.push({
    v: "amber",
    name: "This combination",
    rule: "Nothing you've ticked maps onto a rule in the national guidance, and that isn't the same as a green light. Judge it on whether they can get through a normal day, and ring 13 HEALTH if you want a nurse's read on it.",
    watch: "Anything new appearing over the next few hours.",
    back: null, src: null,
  });

  const note = ageMonths === null
    ? "Add an age at the top — several of these rules split on it."
    : ageMonths < 60
    ? "These rules come from Staying Healthy, which is written for early childhood education and care. At this age they apply fairly directly, though your service can still set a stricter policy."
    : "Staying Healthy is written for early childhood services, not schools. At school age these rules are the national infection-control baseline; actual exclusion is set by state law and your school's own policy, which may be stricter.";

  const worst = f.reduce((acc, x) => (VERDICT[x.v].rank > VERDICT[acc].rank ? x.v : acc), "green");
  return { verdict: worst, findings: f, note };
}

function Check({ on, size = 13 }) {
  if (!on) return null;
  return (
    <svg width={size} height={size * 0.77} viewBox="0 0 13 10" fill="none">
      <path d="M1 5.2L4.6 8.6L12 1.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Row({ on, label, onToggle }) {
  return (
    <button type="button" className="st-item" data-on={on} aria-pressed={on} onClick={onToggle}>
      <span className="st-box" aria-hidden="true"><Check on={on} /></span>
      <span>{label}</span>
    </button>
  );
}

function Sub({ spec, value, onChange }) {
  if (spec.kind === "toggle") {
    const on = value === true;
    return (
      <div className="st-subq">
        <button type="button" className="st-subtoggle" data-on={on} aria-pressed={on} onClick={() => onChange(on ? undefined : true)}>
          <span className="st-subbox" aria-hidden="true"><Check on={on} size={11} /></span>
          <span>{spec.q}</span>
        </button>
      </div>
    );
  }

  if (spec.kind === "date") {
    return (
      <div className="st-subq">
        <p className="st-subq-label">{spec.q}</p>
        <input
          type="date" className="st-date" max={todayISO()}
          value={value || ""} aria-label={spec.q}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </div>
    );
  }

  const selected = spec.kind === "multi" ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="st-subq" role="group" aria-label={spec.q}>
      <p className="st-subq-label">{spec.q}</p>
      <div className="st-chips">
        {spec.options.map(([id, label]) => {
          const on = spec.kind === "multi" ? selected.includes(id) : selected === id;
          return (
            <button
              key={id} type="button" className="st-chip" data-on={on} aria-pressed={on}
              onClick={() => {
                if (spec.kind === "multi") {
                  const next = on ? selected.filter((x) => x !== id) : [...selected, id];
                  onChange(next.length ? next : undefined);
                } else {
                  onChange(on ? undefined : id);
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SchoolToday() {
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [picked, setPicked] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [detail, setDetail] = useState({});
  const [open, setOpen] = useState(false);

  const toggleIn = (setter) => (id) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setSub = (id, v) =>
    setDetail((prev) => {
      const next = { ...prev };
      if (v === undefined) delete next[id]; else next[id] = v;
      return next;
    });

  const ageMonths = useMemo(() => {
    if (years === "") return null;
    const y = Number(years);
    if (!Number.isFinite(y) || y < 0) return null;
    const m = months === "" ? 0 : Number(months);
    return y * 12 + (Number.isFinite(m) && m >= 0 ? m : 0);
  }, [years, months]);

  /* Only answers belonging to a currently ticked symptom count. */
  const live = useMemo(() => {
    const out = {};
    SYMPTOMS.filter((s) => picked.includes(s.id)).forEach((s) =>
      s.subs.forEach((q) => { if (shown(q, detail) && detail[q.id] !== undefined) out[q.id] = detail[q.id]; })
    );
    return out;
  }, [picked, detail]);

  const result = useMemo(() => evaluate(ageMonths, picked, flagged, live), [ageMonths, picked, flagged, live]);
  const v = VERDICT[result.verdict];
  const canOpen = result.verdict !== "none";

  /* Verdict colour only. No symptoms, conditions or age leave the device. */
  const openResult = () => {
    if (!canOpen) return;
    track("Result viewed", { verdict: result.verdict });
    setOpen(true);
  };

  return (
    <div className="st-root">
      <style>{STYLES}</style>
      <div className="st-wrap">
        <h1 className="st-title">Can I send my child to school today?</h1>
        <p className="st-sub">
          Three steps. Your answer shows in the bar at the bottom and updates as you
          go. Tap it to see the rule behind it and where it comes from.
        </p>

        <p className="st-section-head"><span className="st-step">1</span>How old is your child?</p>
        <p className="st-section-note st-stepped">Some rules depend on age.</p>
        <div className="st-age">
          <div className="st-field">
            <label className="st-field-label" htmlFor="st-years">Age in years</label>
            <input
              id="st-years" className="st-num" type="number" min="0" max="18" inputMode="numeric"
              value={years} onChange={(e) => setYears(e.target.value)}
            />
          </div>
          {years === "0" && (
            <div className="st-field">
              <label className="st-field-label" htmlFor="st-months">and months</label>
              <input
                id="st-months" className="st-num" type="number" min="0" max="11" inputMode="numeric"
                value={months} onChange={(e) => setMonths(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="st-flags">
          <p className="st-flags-head"><span className="st-step">2</span>Check these first</p>
          <p className="st-flags-note st-stepped">
            If any of these are true, stop here. School isn't the question today.
          </p>
          <div className="st-list">
            {FLAGS.map((x) => (
              <div className="st-entry" key={x.id}>
                <Row label={x.label} on={flagged.includes(x.id)} onToggle={() => toggleIn(setFlagged)(x.id)} />
              </div>
            ))}
          </div>
        </div>

        <div className="st-group">
          <p className="st-section-head"><span className="st-step">3</span>What are you seeing?</p>
          <p className="st-section-note st-stepped">
            Tick each symptom, then answer the questions that open underneath.
          </p>
          <div className="st-list">
            {SYMPTOMS.map((s) => {
              const on = picked.includes(s.id);
              return (
                <div className="st-entry" key={s.id}>
                  <Row label={s.label} on={on} onToggle={() => toggleIn(setPicked)(s.id)} />
                  {on && s.subs.length > 0 && (
                    <div className="st-subs">
                      {s.subs.filter((q) => shown(q, detail)).map((q) => (
                        <Sub key={q.id} spec={q} value={detail[q.id]} onChange={(nv) => setSub(q.id, nv)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="st-foot">
          Prototype. Rules checked September 2026 against Queensland Health's Time Out
          poster (January 2026) and the NHMRC Staying Healthy 6th edition fact sheets;
          where those two conflict, Time Out is used. This isn't medical advice and it
          can't examine your child. If you're worried, ring your GP or 13&nbsp;HEALTH on
          13&nbsp;43&nbsp;25&nbsp;84. If it's an emergency, call 000.
        </p>
      </div>

      <button
        type="button" className="st-bar" style={{ background: v.bg }}
        onClick={openResult} aria-disabled={!canOpen}
      >
        <span className="st-bar-inner">
          <span>
            <span className="st-bar-word">{v.word}</span>
            {canOpen && <span className="st-bar-hint" style={{ display: "block" }}>Tap to see the rule</span>}
          </span>
        </span>
      </button>

      {open && (
        <>
          <button type="button" className="st-scrim" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="st-sheet" role="dialog" aria-modal="true" aria-label="Result">
            <div className="st-sheet-inner">
              <div className="st-sheet-top" style={{ background: v.bg }}>
                <p className="st-sheet-word">{v.word}</p>
                <p className="st-sheet-say">{v.say}</p>
              </div>
              <div className="st-body">
                {result.findings.map((x, i) => (
                  <div className="st-finding" key={i}>
                    <p className="st-finding-name">{x.name}</p>
                    <p className="st-rule">{x.rule}</p>
                    {x.watch && <p className="st-meta"><b>Watch for:</b> {x.watch}</p>}
                    {x.back && <p className="st-meta"><b>Back at school:</b> {x.back}</p>}
                    {x.src && <p className="st-src">{x.src}</p>}
                  </div>
                ))}
                {result.note && <p className="st-note">{result.note}</p>}
              </div>
              <button type="button" className="st-close" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
