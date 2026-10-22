/**
 * Builds the Phase 0 paper playtest pack for a case, straight from case.json + solution.json:
 *   dist/<slug>/player-pack.html       — what testers get (briefing, rules, initial file, answer sheet, survey)
 *   dist/<slug>/facilitator-pack.html  — SPOILERS: lookup tables, sealed envelopes, solution, debrief
 * Convert to PDF with:  pnpm case:pack -- --pdf
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { lintCase, type CasePublic, type CaseSolution, type Evidence } from '@unsealed/engine';
import { loadCases, CASES_DIR } from './load';
import { PRINT_CSS, esc, md, renderEvidenceCard } from './render-evidence';

const wantPdf = process.argv.includes('--pdf');
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const OUT = resolve(CASES_DIR, '../../dist');

const doc = (title: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`;

function gateLabel(e: Evidence, pub: CasePublic): string {
  const g = e.gate!;
  if (g.kind === 'lead') return `Hand over when the team follows lead ${g.id}: "${pub.leads.find((l) => l.id === g.id)?.title}"`;
  if (g.kind === 'search') return 'Hand over when the team searches one of its archive terms';
  if (g.kind === 'breakthrough') return `Hand over when the team finds breakthrough ${g.id}`;
  return `Hand over when the team makes confrontation ${g.id}`;
}

function playerPack(pub: CasePublic, sol: CaseSolution): string {
  const total = pub.evidence.length;
  const initial = pub.evidence.filter((e) => !e.gate);
  const word = (id: string) => pub.words.find((w) => w.id === id)?.text ?? id;
  const blanks = (bs: CasePublic['verdict']['how']) =>
    bs.map((b) => `<p><b>${esc(b.prompt)}</b></p><p>${b.wordIds.map((w) => `☐ ${esc(word(w))}`).join('<br>')}</p>`).join('');
  const attempt = (n: number) => `<div class="box"><h4>Accusation ${n} of 3</h4>
      <p><b>${esc(pub.verdict.who[0]!.prompt)}</b> ${pub.suspects.map((s) => `☐ ${esc(s.name)}`).join(' &nbsp; ')}</p>
      <div class="grid2"><div>${blanks(pub.verdict.how)}</div><div>${blanks(pub.verdict.why)}
      <p><b>Proof: the 3 evidence numbers that prove it</b><br><span class="blank" style="min-width:12mm"></span> <span class="blank" style="min-width:12mm"></span> <span class="blank" style="min-width:12mm"></span></p>
      <p class="note">Facilitator writes: <b>___ of 4 sections correct</b></p></div></div></div>`;

  return doc(
    `${pub.title} — player pack`,
    `
  <div class="page">
    <span class="stampbox">CASE #001 · PLAYTEST</span>
    <h1>${esc(pub.title)}</h1>
    <p class="mono">${esc(pub.city.name)}, ${esc(pub.city.country)} · ${pub.estMinutes[0]}–${pub.estMinutes[1]} min · ${total} pieces of evidence · Inspector's Par ${pub.parHours} h</p>
    <p><i>${esc(pub.hook)}</i></p>
    <h2>Briefing</h2>${md(pub.briefing)}
    <h2>Suspects</h2>
    ${pub.suspects.map((s) => `<p><b>${esc(s.name)}</b>, ${esc(s.role)}</p>`).join('')}
    <h2>How to play on paper</h2>
    <ol>
      <li>Read the file. You start with ${initial.length} items. More are unlocked as you investigate.</li>
      <li><b>Investigation clock:</b> starts at 0. Your facilitator keeps it.</li>
      <li><b>Leads:</b> say a lead's name to follow it. It adds hours to the clock and the facilitator hands you new evidence.
        <ul>${pub.leads.filter((l) => !l.gate).map((l) => `<li>${esc(l.title)} (${l.costHours} h)</li>`).join('')}<li>More leads may open up as you go.</li></ul></li>
      <li><b>Archive search (free):</b> write a single term on a slip (a name, a code, a plate). If it matches the archive exactly, you get the file.</li>
      <li><b>Red string (+10 min):</b> name two evidence numbers and how they connect: <i>contradiction</i>, <i>corroboration</i> or <i>link</i>. The facilitator says only "breakthrough" or "nothing".</li>
      <li><b>Confront (+10 min if wrong):</b> name a statement, a line number, and the evidence that challenges it.</li>
      <li><b>Hints:</b> ask the facilitator. Each hint costs score (nudge −10, pointer −30, reveal −75).</li>
      <li><b>Accuse:</b> fill in an accusation on the answer sheet. You are told only how many of the 4 sections are correct. Three tries.</li>
    </ol>
    <p class="note">Content notes: ${pub.contentNotes.map(esc).join(' · ')}. A work of fiction.</p>
  </div>
  <div class="page"><h2>Your case file</h2>${initial.map((e) => renderEvidenceCard(e, pub, total)).join('')}</div>
  <div class="page"><h2>Answer sheet</h2>${attempt(1)}${attempt(2)}${attempt(3)}</div>
  <div class="page"><h2>After you finish: 5 quick questions</h2>
    <p>1. How fun was it? (1–5) <span class="blank" style="min-width:20mm"></span></p>
    <p>2. How fair did it feel? (1–5) <span class="blank" style="min-width:20mm"></span></p>
    <p>3. How hard was it? (1 = too easy, 5 = too hard) <span class="blank" style="min-width:20mm"></span></p>
    <p>4. The moment it clicked:</p><div class="box" style="height:30mm"></div>
    <p>5. Anything that felt cheap or unfair:</p><div class="box" style="height:30mm"></div>
  </div>`,
  );
}

function facilitatorPack(pub: CasePublic, sol: CaseSolution): string {
  const total = pub.evidence.length;
  const title = (id: string) => {
    const e = pub.evidence.find((x) => x.id === id);
    return e ? `${e.number} ${e.title}` : id;
  };
  const susp = (id: string) => pub.suspects.find((s) => s.id === id)?.name ?? id;
  const word = (id: string) => pub.words.find((w) => w.id === id)?.text ?? id;
  const gated = pub.evidence.filter((e) => e.gate);
  const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;

  return doc(
    `${pub.title} — facilitator pack`,
    `
  <div class="page">
    <div class="spoiler">FACILITATOR ONLY · CONTAINS THE SOLUTION</div>
    <h1>${esc(pub.title)}</h1>
    <h2>Your job</h2>
    <ol>
      <li>Keep the clock (write it down after every action). Don't explain anything, only answer with what the tables say.</li>
      <li>Note the time of the first breakthrough, who they accuse first, where they got stuck, and every hint used.</li>
      <li>Cut out the sealed envelopes at the back and hand each one over only when its condition is met.</li>
    </ol>
    <h2>Leads</h2>
    <table><thead><tr><th>Lead</th><th>Cost</th><th>Available</th><th>Hand over</th></tr></thead><tbody>
      ${pub.leads.map((l) => row([`${l.id} ${esc(l.title)}`, `${l.costHours} h`, l.gate ? `after ${l.gate.id}` : 'from start', pub.evidence.filter((e) => e.gate?.kind === 'lead' && e.gate.id === l.id).map((e) => esc(title(e.id))).join(', ') || '—'])).join('')}
    </tbody></table>
    <h2>Archive search (exact term match, free)</h2>
    <table><thead><tr><th>Accepted terms</th><th>Hand over</th></tr></thead><tbody>
      ${sol.archiveIndex.map((a) => row([a.terms.map(esc).join(' · '), esc(title(a.evidenceId))])).join('')}
    </tbody></table>
    <p class="note">Anything else: "No records found." (no clock cost)</p>
    <h2>Red string breakthroughs (+10 min per check, right or wrong)</h2>
    <table><thead><tr><th>ID</th><th>Pair</th><th>Relation</th><th>Say</th><th>Unlocks</th></tr></thead><tbody>
      ${sol.breakthroughs.map((b) => row([`${b.id}${b.essential ? ' ★' : ''}`, `${esc(title(b.a))}<br>${esc(title(b.b))}`, b.relation, esc(b.insight), [...pub.evidence.filter((e) => e.gate?.kind === 'breakthrough' && e.gate.id === b.id).map((e) => esc(title(e.id))), ...pub.leads.filter((l) => l.gate?.id === b.id).map((l) => `lead ${l.id}`)].join(', ') || '—'])).join('')}
    </tbody></table>
    <p class="note">★ = essential. Any other pair or relation: "Nothing there." Order of the two items doesn't matter.</p>
  </div>
  <div class="page">
    <h2>Confrontations (+10 min only if wrong)</h2>
    <table><thead><tr><th>Statement · line</th><th>Accepted evidence</th><th>Read out the new line</th><th>Unlocks</th></tr></thead><tbody>
      ${sol.confrontations.map((c) => row([`${esc(title(c.statementId))} · line ${c.line}`, c.evidenceIds.map((x) => esc(title(x))).join('<br>'), c.revealLines.map((l) => `<b>${esc(l.n)}</b> ${esc(l.text)}`).join('<br>'), pub.evidence.filter((e) => e.gate?.kind === 'confront' && e.gate.id === c.id).map((e) => esc(title(e.id))).join(', ') || '—'])).join('')}
    </tbody></table>
    <h2>Hints (give the tier they ask for, for the first ★ breakthrough not yet found)</h2>
    <table><thead><tr><th>Stuck at</th><th>Nudge (−10)</th><th>Pointer (−30)</th><th>Reveal (−75)</th></tr></thead><tbody>
      ${sol.hints.map((h) => row([h.stuckPointId, esc(pub.nudges.find((n) => n.stuckPointId === h.stuckPointId)?.text ?? ''), esc(h.pointer), esc(h.reveal)])).join('')}
    </tbody></table>
    <h2>The solution</h2>
    <div class="box">
      <p><b>Who:</b> ${Object.values(sol.verdict.who).map((s) => esc(susp(s))).join(', ')}</p>
      <p><b>How:</b> ${Object.entries(sol.verdict.how).map(([k, v]) => `${esc(k)}: ${v.map((w) => esc(word(w))).join(' / ')}`).join(' · ')}</p>
      <p><b>Why:</b> ${Object.values(sol.verdict.why).map((v) => v.map((w) => esc(word(w))).join(' / ')).join(' · ')}</p>
      <p><b>Proof:</b> must include ${sol.verdict.proof.core.map((x) => esc(title(x))).join(' + ')}, plus any one of: ${sol.verdict.proof.support.map((x) => esc(title(x))).join(' · ')}</p>
      <p class="note">Grade each of the 4 sections as right/wrong and say only the NUMBER correct. Never say which.</p>
    </div>
    <h2>Debrief: read this aloud at the end</h2>
    ${sol.debrief.map((d) => `<p><b>${esc(d.time)}</b> ${esc(d.text)}</p>`).join('')}
  </div>
  <div class="page">
    <h2>Sealed envelopes (cut along the lines)</h2>
    ${gated.map((e) => `<div style="page-break-inside: avoid"><div class="cut">✂ cut here</div><p class="spoiler" style="font-size:8.5pt;margin:0">ENVELOPE ${esc(e.id)} · ${esc(gateLabel(e, pub))}</p>${renderEvidenceCard(e, pub, total)}</div>`).join('')}
  </div>`,
  );
}

let failures = 0;
for (const c of loadCases(only)) {
  const { issues, pub, sol } = lintCase(c.pub, c.sol);
  if (!pub || !sol || issues.some((i) => i.level === 'error')) {
    console.log(`✗ ${c.slug}: fix lint errors first (pnpm case:lint)`);
    failures++;
    continue;
  }
  const dir = join(OUT, c.slug);
  mkdirSync(dir, { recursive: true });
  const files = { 'player-pack': playerPack(pub, sol), 'facilitator-pack': facilitatorPack(pub, sol) };
  for (const [name, html] of Object.entries(files)) {
    const htmlPath = join(dir, `${name}.html`);
    writeFileSync(htmlPath, html);
    if (wantPdf) {
      const chrome = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
      if (!existsSync(chrome)) throw new Error(`Chrome not found at ${chrome}; set CHROME_PATH`);
      execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${join(dir, `${name}.pdf`)}`, `file://${htmlPath}`], { stdio: 'ignore' });
    }
    console.log(`✓ ${c.slug}/${name}.${wantPdf ? 'pdf' : 'html'}`);
  }
}
process.exit(failures ? 1 : 0);
