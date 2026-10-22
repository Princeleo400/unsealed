# 06 — Case Authoring Guide

How to write an UNSEALED case that is **hard, fair and fun**. Content is the product and the moat, so every case follows this guide.

Related: [02-GDD](02-GDD.md) · [04-TECH-ARCHITECTURE](04-TECH-ARCHITECTURE.md) §3 (file format) · [07-PILOT-CASE-001](07-PILOT-CASE-001.md) (worked example)

---

## 1. The fair-play contract

1. **Everything needed to solve the case is reachable in the file.** Nothing comes from outside knowledge, unless that knowledge is *also* in the file (a travel-time map, a tram timetable, a dictionary page).
2. **The killer is introduced early.** They're in the suspect list from the briefing.
3. **There's one solution.** Every alternative suspect is *eliminated by evidence*, not just "less likely".
4. **No lying narrator.** Official documents (police reports, logs, receipts) are true. People lie; documents don't, unless a document is *shown* to be forged and the forgery itself is detectable.
5. **Every essential deduction has at least two routes**, so one missed item doesn't make the case unsolvable.

## 2. Build order (write in this order, not page by page)

1. **The truth.** Write a 1-page "what really happened": who, how, why, and the exact minute-by-minute timeline of the night for *every* character.
2. **The cover-up.** What did the killer do to hide it? This creates the **false story** the police first believed ("it was a fall").
3. **The cracks.** List 4–7 places where the false story and the truth disagree. Each crack becomes a **Breakthrough** (two items that can't both be true).
4. **The red herrings.** Give every other suspect a **motive**, an **opportunity window** and a **suspicious act**, plus one piece of evidence that clears them (their alibi proof). Herrings must be fair, not random.
5. **The evidence list.** Turn the truth, the cracks and the herrings into 22–32 items. Tag each item `core` (needed), `support` (second route) or `colour` (atmosphere / herring).
6. **Gates.** Decide what's in the initial file (about 60%) and what sits behind Leads, Search, Breakthroughs and Confrontations (about 40%).
7. **The verdict.** Write the blanks and the word bank, and decide which evidence reveals each word.
8. **Hints.** For each essential Breakthrough, write a Nudge, a Pointer and a Reveal.
9. **Debrief.** A 6–10 step illustrated reconstruction.
10. **Polish voice.** Every character texts and writes differently: age, region, education, mood.

## 3. Case sizing

| Size | Evidence | Breakthroughs (essential / total) | Leads | Suspects | Play time | Par |
|---|---|---|---|---|---|---|
| Short | 15–20 | 3 / 4–5 | 3–4 | 4 | 25–40 min | 3 h |
| Standard | 22–30 | 4 / 6–8 | 5–7 | 5–6 | 45–75 min | 5 h |
| Long / Episode set | 35–45 | 6 / 10–12 | 8–10 | 6–7 | 90–150 min | 8 h |

## 4. Evidence-writing rules

- **Show timestamps everywhere.** They feed the Timeline, and time is the best source of contradictions.
- **One fact per contradiction.** A crack should hinge on one specific detail (a time, a colour, a number), not a vague vibe.
- **Hide in plain sight.** The key detail sits in the *middle* of an item, surrounded by normal detail, never in its title.
- **Herring evidence must be resolvable.** If Tobi's text sounds threatening, something else must prove he left (e.g. a taxi receipt).
- **Local colour is a clue source, explained fairly.** If a clue depends on "this market closes at 18:00 on Sundays", put the market's opening-hours sign in the file.
- **Vary formats** so reading stays fun: no more than 3 plain documents in a row.
- **Keep text tight.** 30–180 words per item. Long reports get headings.

## 5. Mechanic recipes

| Mechanic | Good pattern | Avoid |
|---|---|---|
| Breakthrough (Contradiction) | Statement "I left at 22:00" × door log "exit 23:41" | Pairs that need a third hidden fact |
| Breakthrough (Corroboration) | Two independent sources confirm a time that matters | Confirming trivia |
| Breakthrough (Link) | Same card ending "4471" on a receipt and in a wallet photo | Links that only work with outside knowledge |
| Confrontation | A suspect's line contradicted by one *specific* item → they admit a smaller lie | A confession of the murder (that's the verdict's job) |
| Search-gated item | A term (plate number, file ID, nickname) that appears in **≥2** places in the file | A term that only appears once in tiny text |
| Lead | Logical next step a detective would take ("pull the taxi records") | Leads that only exist to pad the clock |

## 6. Verdict design

- **Who:** pick a suspect, plus an optional accomplice blank.
- **How:** 2–3 blanks, for example *method* ("struck with the award plaque"), *time of death* (a choice of 4 time windows), *trick* ("played a pre-recorded voice track").
- **Why:** 1–2 blanks (motive and trigger).
- **Proof:** 3 items. Mark 1–2 as `core` (must include) and list 3–5 `support` items, any of which complete the set.
- **Distractor words:** each How/Why blank needs 3–5 plausible options taken from the herrings.

## 7. Quality gates (a case can't ship until all are ticked)

- [ ] Truth doc and minute-by-minute timeline for every character
- [ ] Linter passes: all IDs resolve; every essential Breakthrough, verdict word and proof item is reachable
- [ ] Golden-path test passes (automated solve)
- [ ] Every non-killer suspect is cleared by at least one piece of evidence
- [ ] Each essential deduction has 2 routes
- [ ] Hint tiers written for each essential Breakthrough
- [ ] Sensitivity / culture review for the setting
- [ ] Content notes written; meets 12+ standard
- [ ] **5+ blind playtests** (people who haven't seen the case): ≥60% solve within 3 accusations, median time inside the estimate, "felt fair" ≥4/5
- [ ] Copy edit (spelling, consistent names, times and currency)

## 8. Playtest protocol

1. The tester plays on a preview build with analytics on (no help given).
2. Record: time to first Breakthrough, which suspect was accused first, where they got stuck, which hints were used.
3. 5-question survey afterwards: fun (1–5), fair (1–5), difficulty (1–5), "the moment it clicked", "what felt cheap".
4. Fix every "felt cheap" comment that more than one tester mentions.

## 9. Writing with AI assistance (rules)

- AI can draft **evidence prose, character voices and herring variants**. A human writes the **truth, the cracks and the verdict**, and checks every timestamp.
- Never paste in copyrighted mystery text as "style reference".
- Log the source of every AI-generated image and keep the prompts (licensing audit trail).
- Run the linter and the golden-path test after every AI-assisted edit. AI often breaks timestamps silently.
