# 07 — Pilot Case 001: "Dead Air" (outline)

> ⚠️ **SPOILERS.** This is the author's file. Don't share it with playtesters.
> Status: outline v0.1. Every name, business and event is fictional. Cape Town is used as a setting only.
>
> **Superseded by the playable content (22 Oct 2026).** The source of truth is now `content/cases/001-dead-air/case.json` and `solution.json`; they pass the linter and the automated solve. Changes from this outline:
> - **BT-7** added (Marguerite's statement vs the guard's log: her white Polo sat in the staff lane 00:20–00:54). This gives "she came back" a second route.
> - Confrontations are now **C-1** (Marguerite line 4 + billing → unlocks the note), **C-2** (Daniel line 3 + voice note → unlocks ride receipts), **C-3** (Sipho line 2 + guard log or CCTV) and **C-4** (Marguerite line 2 + keycard or guard log).
> - Thandi's watch heart rate (in her phone) stops at 00:36, which pins the time of death to "between 00:30 and 00:40".
> - Lead L5 (HR rota) only opens after BT-1.
> - Debrief step 2 is now **23:20**: Marguerite sees the note *before* leaving at 23:30.
> - Proof = 17 + 4 + any one of {2, 6, 9, 13, 18, 24}.

Related: [06-CASE-AUTHORING-GUIDE](06-CASE-AUTHORING-GUIDE.md) · [02-GDD](02-GDD.md) §8

---

## 1. Case card

| Field | Value |
|---|---|
| ID | `001-dead-air` |
| City | Cape Town, South Africa 🇿🇦 |
| Hook | "She was dead by 00:40. So who was talking on air at 01:10?" |
| Size | Standard: 26 evidence items, 6 Breakthroughs (4 essential), 5 Leads, 5 suspects |
| Par | 5 hours |
| Estimated time | 45–75 min |
| Price | **Free** (the flagship demo) |
| Content notes | Death by blunt force (not shown), stalking behaviour, workplace fraud |

## 2. Briefing (player-facing draft)

> **Friday, 6 March 2026.** *After Midnight with Thandi* was the most-loved late show on **Atlantic 99.4 FM**. At 01:31, producer **Sipho Dlamini** found host **Thandi Mokoena (41)** dead on the floor of Studio B. The station's award plaque lay beside her.
>
> Listeners heard Thandi introduce a song at **01:10**. The pathologist puts time of death **between 00:30 and 00:50**.
>
> Someone kept her voice on air after she died. Read everything. Trust nobody. Name the killer, how it was done, why, and pin the three pieces of evidence that prove it.

## 3. Suspects

| ID | Name | Role | Motive (apparent) | Suspicious act |
|---|---|---|---|---|
| S1 | **Sipho Dlamini** | Producer (found the body) | Thandi was about to replace him | Was "on a smoke break" for 25 min |
| S2 | **Marguerite Vos** | Station manager | *(hidden)* Thandi had found her ad-fraud scheme | Petrol receipt 01:12 as an "alibi" |
| S3 | **Daniel Okafor** | Rival host (Nigerian, moved to CT) | Thandi blocked his move to prime time | Heated voice note at 23:58 |
| S4 | **Lena Hartmann** | Sponsor rep (German), Thandi's ex | Painful breakup | Visited the station at 00:15 |
| S5 | **"Jay from Bellville"** (Jason Petersen) | Obsessive regular caller | Fixation on Thandi | Was parked outside at 00:20 |

## 4. The truth (what really happened)

- **Motive:** Marguerite was billing sponsors for ads that never aired. The playout log was edited, and the money went to her shell company "MV Media Solutions". Thandi found the mismatch while preparing an on-air sponsor shout-out, and wrote it down: *"Ads billed ≠ ads played. Ask M on Monday or go to the board."*
- **00:22:** Marguerite arrives back at the station (keycard).
- **00:31–00:36:** Thandi plays a long track ("Long Song", 7 min). During it, Marguerite confronts her in Studio B and strikes her with the plaque at about **00:35**.
- **00:38–00:48:** Marguerite uses the playout system to schedule a **voice-track** file: an old "VT" segment Thandi had recorded weeks earlier for a holiday cover. It's set to play at 01:10, with songs scheduled around it so the show sounds live.
- **00:52:** Marguerite exits (keycard). She drives to a petrol station about **8 min** away and **buys fuel at 01:12** to create an alibi for the "live" 01:10 link.
- **01:10:** The pre-recorded VT plays. It's a link Thandi recorded in February for the Easter-weekend holiday cover, and in it she says *"Happy Easter weekend, Cape Town!"*. Tonight is 6 March, about four weeks before Easter. Listener texts at 01:11 react: "Easter?? lol Thandi you ok?"

> **Author note:** a sports-score version of this clue was considered and dropped because it needs outside sports knowledge. The Easter line is fairer: it's confirmed inside the file by the listener SMS log (item 6), the studio wall calendar (item 7) and the holiday cover rota (item 26).

- **Marguerite's statement** (item 9, line 2) claims: *"I left at about 23:30 and went home. I didn't come back."* The keycard log shows she came back in at 00:22 and left at 00:52.

- **01:31:** Sipho comes back from his break and finds her.

## 5. How each herring is cleared

| Suspect | Cleared by |
|---|---|
| Sipho | CCTV still from a café across the road: Sipho visible 00:28–00:53 (timestamped). A smoke-break text to his girlfriend at 00:41. |
| Daniel | Voice note was sent from home (location in Thandi's phone); a ride-hail receipt shows he was in Sea Point until 01:30. |
| Lena | Keycard: entered 00:15, exited 00:24, *before* the death window. Her text at 00:27 from a restaurant ("still shaking, she's so cold"). |
| Jay | Security guard's log: told Jay to leave at 00:26; ANPR (number-plate camera) shows his plate on the N1 at 00:33. **Search-gated:** search his plate "CA 412-778", which appears on the guard's log. |

## 6. Evidence list (26 items: C = core, S = support, X = colour/herring)

| # | Item | Type | Gate | Tag |
|---|---|---|---|---|
| 1 | Police incident report | document | initial | C |
| 2 | Pathologist summary (TOD 00:30–00:50) | document | initial | C |
| 3 | Crime-scene illustration, Studio B | photo | initial | S |
| 4 | Station keycard log (00:00–02:00) | log | initial | C |
| 5 | Playout log: what aired, by time | log | initial | C |
| 6 | Listener SMS line log (00:55–01:20) | chat | initial | C |
| 7 | Studio wall calendar photo (March 2026) | photo | initial | S |
| 8 | Statement — Sipho | statement | initial | S |
| 9 | Statement — Marguerite | statement | initial | C |
| 10 | Statement — Daniel | statement | initial | X |
| 11 | Statement — Lena | statement | initial | X |
| 12 | Security guard's night log | log | initial | S |
| 13 | Thandi's phone (Messages, Calls, Notes, Health) | phone | initial | C |
| 14 | Daniel's voice note transcript | audio | initial | X |
| 15 | Petrol receipt (01:12) handed in by Marguerite | receipt | initial | C |
| 16 | Map: station → petrol station (8 min drive) | map | Lead L1 "Check Marguerite's alibi route" (1 h) | C |
| 17 | Playout **file metadata** export: `VT_THANDI_EASTER.wav`, recorded 14 Feb, scheduled 00:44 tonight by user `mvos` | log | **Search** "VT" or "voice track" (term in items 5 and 9) | C |
| 18 | Sponsor invoice vs aired-ads report | document | Lead L2 "Request sponsor billing" (2 h) | C (motive) |
| 19 | Company registry: MV Media Solutions, director M. Vos | document | **Search** "MV Media" (on invoice 18) | S |
| 20 | Café CCTV stills (Sipho) | photo | Lead L3 "Canvass nearby businesses" (1 h) | X (clears) |
| 21 | Ride-hail receipt (Daniel) | receipt | Confront Daniel's statement line 3 with item 13 (location) | X (clears) |
| 22 | Lena's restaurant text / bill | chat | Breakthrough BT-5 | X (clears) |
| 23 | ANPR camera hit, plate CA 412-778 | log | **Search** plate (from item 12) | X (clears) |
| 24 | Thandi's draft note: "Ads billed ≠ ads played…" | document | Confront Marguerite line 4 with item 18 | C (motive) |
| 25 | Award plaque lab note (prints wiped; one partial on the base) | document | Lead L4 "Request forensics" (2 h) | S |
| 26 | Holiday cover rota (Easter shows pre-recorded in Feb) | document | Lead L5 "Request HR rota" (1 h) | S |

Leads total 7 h if all are followed. **Par = 5 h** (L1 + L2 + L5 = 4 h, plus about 6 checks × 10 min).

## 7. Breakthroughs

| ID | A | B | Relation | Insight | Essential |
|---|---|---|---|---|---|
| BT-1 | 2 Pathologist (TOD ≤00:50) | 5 Playout log (Thandi "live" 01:10) | Contradiction | "She was dead before her 01:10 link aired." | ✅ |
| BT-2 | 6 SMS log ("Easter?? lol") | 7 Wall calendar (6 March) | Contradiction | "The 01:10 link mentions Easter. It was pre-recorded." | ✅ |
| BT-3 | 17 VT metadata (scheduled 00:44 by `mvos`) | 4 Keycard (Marguerite inside 00:22–00:52) | Corroboration | "Marguerite was in the building when the fake link was scheduled, under her login." | ✅ |
| BT-4 | 9 Marguerite's statement, line 2 ("left 23:30, didn't come back") | 4 Keycard (re-entry 00:22, exit 00:52) | Contradiction | "She came back. She was inside during the death window, and her 01:12 petrol receipt only covers the fake 01:10 link." (Map, item 16, shows the drive takes 8 min.) | ✅ |
| BT-5 | 11 Lena's statement | 4 Keycard (Lena exit 00:24) | Corroboration | "Lena left before the death window." → unlocks 22 | ❌ |
| BT-6 | 18 Invoice vs aired report | 19 Company registry | Link | "The missing ad money went to Marguerite's company." | ❌ (motive route 2) |

## 8. Verdict

- **Who:** Marguerite Vos
- **How:**
  - Method → *struck with the award plaque*
  - Time of death → *00:30–00:40*
  - Trick → *scheduled a pre-recorded voice track to fake that Thandi was alive*
- **Why:** *to stop Thandi exposing her sponsor-billing fraud*
- **Proof:** core = **17** (VT metadata) + **4** (keycard), plus any one of {**2**, **6**, **9**, **18**, **24**}

Distractor words:
- Method: strangled / pushed against the desk / poisoned tea
- Trick: forged the CCTV / changed the clock / asked Sipho to cover
- Motive: jealousy over the breakup / losing his prime-time slot / an obsession / being replaced

## 9. Hints (for the essential Breakthroughs)

| Stuck point | Nudge | Pointer | Reveal |
|---|---|---|---|
| BT-1 | "Compare when she died with when she was heard." | "Item 2 vs Item 5." | Explains BT-1. |
| BT-2 | "Listen to what the listeners noticed." | "Item 6 at 01:11 vs the date." | Explains BT-2. |
| BT-3 | "Who could schedule audio, and were they there?" | "Search the archive for 'VT'." | Explains BT-3. |
| BT-4 | "Does everyone's story match the doors?" | "Marguerite's statement, line 2 vs the keycard log." | Explains BT-4. |

## 10. Debrief reconstruction (8 steps)
1. 23:40, Marguerite finds Thandi's draft note on the shared desk.
2. 00:22, she returns to the station.
3. 00:31, "Long Song" starts.
4. 00:35, the confrontation and the blow.
5. 00:44, she schedules `VT_THANDI_EASTER.wav` for 01:10.
6. 00:52, she exits.
7. 01:10, the fake link airs. At 01:11 listeners laugh about "Easter"… the line that unravelled it.
8. 01:12, she buys fuel to build her alibi.

## 11. Open questions for the writer
- Is a **5-minute** gap (00:31–00:36) believable for the attack plus cleanup? Or extend the song to 9 min?
- Should Sipho have a small secret (selling studio gear) so his herring is stronger?
- Get a Cape Town reader to check slang, the station culture, and plausible petrol-station locations.
