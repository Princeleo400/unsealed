# 02 — Game Design Document (GDD)

**Product:** UNSEALED *(working title)* · **Version:** 0.1 draft · **Date:** 22 Oct 2026
Related: [01-BRD](01-BRD.md) · [03-FRD](03-FRD.md) · [06-CASE-AUTHORING-GUIDE](06-CASE-AUTHORING-GUIDE.md) · [07-PILOT-CASE-001](07-PILOT-CASE-001.md)

---

## 1. The pitch in one paragraph

You're handed a sealed case file. Inside are the reports, photos, text threads, door logs, receipts and a dead person's phone. Somewhere in that pile, someone is lying.

You read and search. You pin clues to your board and tie red string between two facts that can't both be true. You rebuild the night minute by minute, then confront the suspects with what you found until their stories crack. When you're sure, you write the verdict: **who, how, why, and the proof**. You get three tries. Then you see how you ranked against every other detective in the world.

## 2. Design pillars

| Pillar | Meaning | Test for every feature |
|---|---|---|
| **1. Fair play** | Every answer is in the file. No gotchas, no pixel-hunting. | "Could a careful reader deduce this from evidence they can reach?" |
| **2. You are the detective** | The game never tells you what a clue means. It only confirms what you prove. | "Does this feature do the thinking *for* the player?" If yes, cut it. |
| **3. It feels real** | Evidence looks like real documents, phones and logs, written in real voices. | "Would this pass as a prop in a TV crime drama?" |
| **4. Better together** | Mysteries are more fun argued out loud. | "Does this work with two people on a call and five people on a sofa?" |
| **5. Around the world** | Every case is set somewhere specific, and local culture is part of the texture. | "Would a local recognise this place? Is any local knowledge explained fairly in the file?" |

## 3. Core loop

```
 ┌──────────── OPEN CASE ────────────┐
 │  Briefing → initial case file     │
 └───────────────┬───────────────────┘
                 ▼
   READ ──► PIN ──► STRING ──► BREAKTHROUGH
    ▲                              │ (unlocks insight / new lead)
    │                              ▼
  SEARCH ◄── FOLLOW LEADS (costs hours) ◄── CONFRONT statements
    │                              │
    └────────► TIMELINE ◄──────────┘
                 ▼
        VERDICT (Who · How · Why · Proof) — 3 tries
                 ▼
        DEBRIEF → rank, badges, global stats, what you missed
                 ▼
        SHARE → next case / Daily Brief / invite friends
```

The **meta loop** is daily. Players do the Daily Brief (5 min), keep their streak, share the grid, and come back to the current Case (30–90 min) or the weekly episode of a Season.

## 4. Mechanics

Each mechanic is tagged **[NEW]** if it's original to UNSEALED, or **[FROM: X → improved]** if it's adapted from one of the seven reference games (§9).

### 4.1 The Case File (dossier) — [FROM: Hunt A Killer / Unsolved Case Files → improved]
The player's inventory of evidence, grouped by tabs: **Briefing · Documents · Photos · Records · Statements · Phone · Archive**.

Each item has a number (e.g. "Records · 18/29"), a title, a source line and a body. The progress counter ("12/29 read") shows how much of the core file the player has seen.

**Evidence types** (every type is a reusable UI component):

| Type | Example | Special interaction |
|---|---|---|
| Document | Police report, autopsy summary, letter | Highlight a sentence → save it as a "Fact" |
| Photo | Crime-scene illustration | Zoom; numbered evidence markers |
| Chat thread | SMS, WhatsApp-style messages | Timestamps feed the Timeline |
| Log / table | Door keypad log, call log, bank statement | Sort and filter columns |
| Handwriting | Guest book, note, diary page | Ink colour and handwriting are clues |
| Receipt / ticket | Petrol, taxi, restaurant | Timestamp plus location |
| Map | Floor plan, street map with travel times | Measure tool (shows travel time between two points) |
| Statement | A suspect's interview | Can be **Confronted** (§4.6) |
| Audio transcript | Radio broadcast, voicemail, call recording | Timecodes |
| Phone | The victim's phone as a mini-OS (§4.8) | Apps: Messages, Photos, Calls, Health, Notes, Maps |

### 4.2 Pin Board — [FROM: Slim Culture "Detective board" → improved]
Any item or saved Fact can be **pinned** to a cork board. Players can drag cards, add notes and tap suspect chips to cross them off. The board is a thinking space and is never graded. In co-op the board is shared live.

### 4.3 Red String Breakthroughs — [NEW, core differentiator]
The player draws a string between **two pinned cards** and picks what they think connects them:

- **Contradiction** ("these can't both be true")
- **Corroboration** ("this confirms that")
- **Link** ("same person, object or place")

If the pair matches a **Breakthrough** defined by the case author, the string turns gold. A Breakthrough card appears with a one-line insight, e.g. *"Marguerite's petrol receipt is 8 minutes from the studio, but the keycard says she left at 00:52."* Breakthroughs can unlock new Leads, new Statement lines, or Verdict words.

**Anti-brute-force:** each string check costs **10 minutes on the Investigation Clock** (§4.5). Wrong strings stay on the board as red, so the player remembers what they tried, but they don't explain why the pair was wrong.

Why it matters: other games only check your answer at the very end. Breakthroughs give **mid-case "aha!" rewards** that are fair and earned, without hints and without telling the player what to think.

### 4.4 Timeline Reconstruction — [NEW]
Every timestamp in evidence the player has read is automatically placed on a **horizontal timeline** of the case night. The player drags suspect tokens onto time slots ("Where was Daniel at 00:40?"). Gaps glow, and slots where two pieces of evidence claim a suspect is in two places at once flash amber. That's a hint to look closer, not a verdict.

The timeline is a tool, not a test. But the **How** part of the Verdict asks time questions (e.g. "Time of death: ___"), so building it pays off.

### 4.5 Leads and the Investigation Clock — [FROM: Sherlock Holmes Consulting Detective → improved]
Some evidence isn't in the initial file. It's behind **Leads**: "Request the taxi company's trip records", "Interview the night guard", "Pull bank statements". Following a lead costs **hours** on the Investigation Clock. Leads appear from the start, from Breakthroughs, or from Search results.

Each case has an **Inspector's Par**, the fewest hours an ideal detective needs. Finishing at or under par earns the **Swift** badge. There's no hard time limit; the clock only affects score and badges.

In Holmes you read a fixed answer key at the end. Here the par is shown live, and the debrief shows the ideal route.

### 4.6 Confront-by-Evidence — [NEW for this genre on mobile]
A Statement is broken into numbered lines. The player picks a line and **presents an evidence card** against it. If it's a valid contradiction defined by the author, the suspect's statement **updates**: new lines appear ("…Fine. I went back upstairs at 22:30."). This can unlock new evidence or Leads.

A wrong confrontation costs 10 minutes on the clock, the same as a wrong string.

### 4.7 Archive Search — [FROM: Her Story → improved]
Every case has a searchable **Archive**, such as the police records system, the victim's cloud drive, or the station's playout system. The player types a keyword: a name, a plate number, a file ID, a word. Results show matching archive entries. **Some evidence can only be found by searching a term the player spotted elsewhere**, which is the "detective's intuition" moment.

Rules:
- Minimum 2 characters, so short codes like "VT" work. A query must match a whole archive term exactly (case- and accent-insensitive), including author-defined synonyms. Partial words return nothing.
- A search returns at most 5 results, so the player can't dump the whole archive with a single letter.
- Every search is free. Search is the "pure brain" mechanic and shouldn't be taxed.

### 4.8 The Victim's Phone — [FROM: Duskwood → improved]
A mini phone OS rendered inside the phone frame, with Messages, Calls, Photos (with EXIF-style time and place), Notes, Health (steps and heart rate as a graph), and Maps (location history). Some apps are locked behind a **passcode** that has to be deduced from the file (e.g. a birthday mentioned in the guest book).

### 4.9 The Verdict — [FROM: Golden Idol / Obra Dinn / Unsolved Case Files → improved]
The solution is a **fill-in-the-blanks report** in four tabs:

- **Who:** pick the suspect (plus an optional accomplice in some cases).
- **How:** blanks such as method, weapon/means, time of death, and how the alibi was faked.
- **Why:** the motive, chosen from options that are *unlocked as the player discovers them* (the Golden Idol word bank). This stops players guessing a motive they never found.
- **Proof:** pin the 3 pieces of evidence that prove it.

**Grading feedback** (the key fairness rule): after a submission, the player is told **how many sections are fully correct**, but **not which ones**. Example: *"2 of 4 sections are correct."* This is the Golden Idol / Obra Dinn rule that turns a wrong guess into new information. Players get **3 accusations**. After three wrong ones the case "goes cold". They still see the debrief, but at the lowest rank and with no badges.

### 4.10 Hints — 3 tiers, never pay-to-win
1. **Nudge:** "Look closely at times in the Records tab."
2. **Pointer:** "Compare Records 18 with Statement 4, line 3."
3. **Reveal:** names the Breakthrough directly.

Each tier costs score. Free players get **1 free hint per case**. After that, each hint is unlocked by an opt-in **rewarded video**, up to 3 more per case. If no ad is available, the player still gets the hint. Case Pass subscribers get unlimited hints and no ads (hints still cost score). Hints can **never** be bought with money (BRD BR-2).

### 4.11 Debrief — [NEW combination]
After the case is solved or goes cold, the player sees:

1. **The reconstruction:** an illustrated, step-by-step "what really happened" story (like the reveal envelope in Unsolved Case Files).
2. **What you missed:** the evidence that proved it, highlighted against what the player pinned.
3. **Your route vs Inspector's Par**, on the timeline.
4. **Global stats:** "41% of detectives first accused Daniel", solve rate, median time.
5. **Rank and badges**, plus a **share card** that is spoiler-free.
6. **Solvers-only discussion** (later phase).

## 5. Modes

| Mode | Players | Length | Free/Paid | Notes |
|---|---|---|---|---|
| **Case (Solo)** | 1 | 30–90 min, playable across days | Case 001 free; rest paid / Case Pass | The core product. Progress autosaves. |
| **Daily Brief** | 1 | 3–7 min | Free (ads) | A *generated* logic mini-case. The same puzzle worldwide each day, plus streaks and a share grid (§6). |
| **Co-op Room** | 2–6 | Same as Case | Host owns the case; guests free | Shared board, strings, timeline and chat. Verdict needs a team vote: majority, or unanimous if the host chooses. |
| **Split-File Co-op** *(v2)* | 2–4 | Same | Same | **[NEW]** Each detective sees a *different subset* of the evidence and must "present" items in chat to share them. Forces real teamwork, like *Keep Talking and Nobody Explodes*. |
| **Party Mode** | 3–8 on a sofa | 60–90 min | Host needs Party Pass or Case Pass | **[NEW for genre]** Host screen (laptop or TV) shows the board and timeline. Each phone gets a private "beat": a lead or document to read aloud. Group votes on the verdict. Jackbox-style join with a 4-letter code. |
| **Seasons** *(v2)* | 1 / co-op | 4 weekly episodes × 30 min | Case Pass | Serialised story, like Hunt A Killer episodes. A **Living Witness** texts you between episodes via push notification (Duskwood). |
| **Weekend Race** *(v2)* | Teams | 1 case, 48 h | Case Pass | Global leaderboard on fewest hours used and fewest accusations. |
| **Case Variants / Remix** *(v2)* | 1 / co-op | — | Case Pass | **[NEW]** Replay a solved case where a *different suspect* is guilty. Key evidence changes, so it's anti-spoiler and adds replay value. |

**Naming: Case vs Episode.** A *case* is a complete standalone mystery. It's the genre's word, and what players search for in the app stores. *Episodes* only exist inside a *Season*: a serial story released in weekly parts that are played in order. The UI never calls a standalone case an episode.

## 6. Daily Brief (the growth engine)

The Daily Brief is a short logic puzzle generated by code and checked by a solver to have exactly one solution, so it needs no daily writing.

**Format:** 3–4 suspects × 3–4 locations × 3–4 weapons/objects, plus a motive twist on harder days. The player gets 6–10 clue statements written as evidence snippets ("The guest book shows Ayo signed in at the Library") rather than raw logic, plus a small deduction grid.

| Day | Difficulty |
|---|---|
| Mon | Rookie (3×3) |
| Tue–Thu | Detective (4×4) |
| Fri | Inspector (4×4 + a lying witness) |
| Sat | Chief (4×4×4) |
| Sun | Story Brief: a mini handcrafted 10-evidence case from the case writers' backlog |

**The Sunday Brief is a free taste of a premium case**: same art style, links to that week's paid case.

**Share grid** (spoiler-free), Wordle-style:
```
UNSEALED Daily #142 🔎 Inspector
🟩🟩🟨🟩 — solved in 4:12, 1 wrong accusation
Streak: 🔥 9
unsealed.game/d
```

**World flavour:** each Daily is set in a different city from a rotating pool, and names, places and objects come from that locale's word lists. This is cheap to produce and reinforces Pillar 5.

## 7. Progression and scoring

**Case score (max 1,000):**

| Component | Points |
|---|---|
| Solved | +600 |
| Accusations: 1st try / 2nd / 3rd | +200 / +100 / +0 |
| Hours vs par: at par or under / each hour over | +200 / −20 (min 0) |
| Hints: Nudge / Pointer / Reveal | −10 / −30 / −75 each |
| Breakthroughs found (bonus) | +5 each, up to the 1,000 cap |
| Case went cold | Score = Breakthroughs ×5 only |

**Badges per case:** 🎯 **Sharp** (first-try verdict) · ⏱ **Swift** (at or under par) · 🧠 **Unassisted** (no hints) · 🕸 **Weaver** (every Breakthrough found).

**Detective Rank** is lifetime XP from case scores plus Daily Briefs:
Rookie → Constable → Sergeant → Inspector → Chief Inspector → Superintendent → **Legend**.

Rank shows on the profile and in co-op rooms. It's cosmetic only and never affects gameplay.

**Casebook:** a shelf of solved cases (case covers with badges), and a **Detective Profile** with stats such as "Lie-spotting: 82% of confrontations correct", "Fastest solve", "Cities visited 🌍 7".

## 8. World Tour (setting strategy)

Every premium case is set in a **specific real city**, with fictional people and businesses. Local culture becomes clue texture, and **anything a player needs to know is explained inside the file**. Example: a tourist-guide page saying "Lagos traffic on Third Mainland Bridge at 9 pm is ~25 min" appears as evidence if travel time matters.

Launch lineup proposal (4 cases):

| # | Title (working) | City | Hook | Price |
|---|---|---|---|---|
| 001 | **Dead Air** | Cape Town 🇿🇦 | A late-night radio host is killed mid-broadcast, but she's still talking on air 30 minutes later. | **Free** |
| 002 | **The Last Toast** | Lagos 🇳🇬 | A wedding-reception death. The guest list, aso-ebi colours and a MoMo transfer log are clues. | Paid |
| 003 | **Checkout at Room 9** | Lisbon 🇵🇹 | A boutique hotel during a tech conference. Key-card logs, tram timetable, a fado bar receipt. | Paid |
| 004 | **Below Zero** | Seoul 🇰🇷 | A chef found in a restaurant's walk-in freezer. Delivery-app logs, CCTV stills, a KakaoTalk-style chat. | Paid |

Cases 002–004 are concepts. Each needs a full outline using [06-CASE-AUTHORING-GUIDE](06-CASE-AUTHORING-GUIDE.md). Case 001 is outlined in [07-PILOT-CASE-001](07-PILOT-CASE-001.md).

## 9. What we take from each of the 7 reference games

| Game | What it does best | What UNSEALED takes | What we improve |
|---|---|---|---|
| **Hunt A Killer** | Tactile physical evidence; serialised monthly episodes; ~$30/month subscription | Authentic document design; the Seasons format; the subscription habit | Instant digital delivery at about 1/6 the price; co-op over distance; printable kits as an optional extra |
| **Unsolved Case Files** | Standalone "cold case" box; staged objectives with sealed answer envelopes | The Verdict split into objectives; the reveal reconstruction | Partial-correct feedback; mid-case Breakthroughs so players aren't stuck until the end |
| **Duskwood** | Story told through a fake messaging app; characters text you | Victim's-phone mini-OS; Living Witness push messages in Seasons | No energy or wait timers; fair deduction instead of mostly linear story |
| **Murdle** | Bite-sized daily logic mysteries; went viral online; difficulty tiers | The Daily Brief, streaks, difficulty by weekday | Evidence-flavoured clue text; world settings; share grid; Sunday story briefs that lead into premium cases |
| **Her Story** | Search a database by keyword; the player drives discovery | Archive Search; evidence that only appears for the right search term | Results capped and integrated with Leads and Breakthroughs so search feeds the board |
| **Golden Idol / Obra Dinn** | Fill-in-the-blank deduction from frozen scenes; partial-correct feedback; word bank unlocked by discovery | The Verdict form, discovery-gated word bank, "N of 4 correct" feedback | Adds Who/How/Why/**Proof** (cite the evidence) and team voting in co-op |
| **Sherlock Holmes Consulting Detective** | Choose leads; compare your path with Holmes's minimal path | Leads that cost hours; the Inspector's Par | Par shown live; ideal route visualised on the timeline in the debrief |

**Original to UNSEALED:** Red String Breakthroughs, Timeline Reconstruction, Confront-by-Evidence, Split-File co-op, Party Mode with phone "beats", Case Variants, World Tour settings, global solver stats in the debrief, and the B2B Case Studio.

## 10. UX and art direction

**Mood:** "noir paper": warm, dark, tactile. Use the dark-brown/ink-black backgrounds, cream paper and amber highlights seen in the reference promo, but with **our own** design system:

- **Palette:** Ink `#14110F`, Walnut `#2A211B`, Paper `#F3EBDD`, Amber `#E8B83A`, Evidence Red `#C2412D`, Ledger Green `#3F7D5C`. Each needs contrast checking for WCAG AA.
- **Type:** a grotesk for UI (e.g. Inter / Manrope), a typewriter mono for records (e.g. IBM Plex Mono / Courier Prime), and 3–4 handwriting fonts for guest books and notes (with open licences).
- **Illustration:** flat, slightly desaturated vector scenes with numbered evidence markers. Character portraits are silhouettes plus one signature detail each, which keeps art costs down and the look consistent.
- **Sound:** soft paper rustle, pin "thock", string snap, a typewriter tick for the clock, and a low ambient bed per city. Everything is muted by default on web.
- **Motion:** cards slide in, strings tighten with a spring, gold shimmer on a Breakthrough. Respect `prefers-reduced-motion`.

**Phone layout:** a bottom tab bar (File · Board · Timeline · Verdict), with evidence opening in full-screen sheets.

**Desktop layout:** three panes (File list | Evidence viewer | Board/Timeline).

## 11. Accessibility

- All evidence is real text (not images of text), so it's screen-reader friendly and translatable.
- Handwriting has an "Accessible font" toggle that swaps to the UI font.
- Colour is never the only signal. Ink-colour clues carry a text label in accessible mode ("written in purple ink").
- Dyslexia-friendly font option, text size controls, and full keyboard navigation on web.

## 12. Content standards

- Rated 12+ / Teen. Violence is shown through body outlines, reports and aftermath, never as gore.
- No sexual violence, no child victims, no real-world people or tragedies.
- Each case has content notes (e.g. "poisoning, mention of addiction").
- Cultural settings are reviewed by someone from that place before release, wherever possible.
