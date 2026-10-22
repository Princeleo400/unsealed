import { normalizeTerm } from './actions';
import { CasePublicSchema, CaseSolutionSchema, type CasePublic, type CaseSolution, type Gate } from './schema';
import { gateKey } from './state';

export type LintIssue = { level: 'error' | 'warning'; code: string; message: string };

/** Text a player can actually read in an evidence item (used to check search terms are discoverable). */
export function evidenceText(e: CasePublic['evidence'][number]): string {
  return normalizeTerm(`${e.title} ${e.source} ${JSON.stringify(e.body)}`);
}

const containsTerm = (haystack: string, term: string) => {
  const t = normalizeTerm(term);
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}($|[^a-z0-9])`).test(haystack);
};

/**
 * Explores everything an ideal player could reach (every lead, every discoverable search term,
 * every valid string and confrontation) until nothing new opens. Returns the reachable sets.
 */
export function explore(pub: CasePublic, sol: CaseSolution) {
  const unlocked = new Set<string>();
  const isOpen = (g?: Gate) => g === undefined || unlocked.has(gateKey(g));
  const visible = () => new Set(pub.evidence.filter((e) => isOpen(e.gate)).map((e) => e.id));
  const found = new Set<string>();
  const searchedTerms = new Set<string>();
  let changed = true;
  let rounds = 0;
  while (changed && rounds < 100) {
    changed = false;
    rounds++;
    const vis = visible();
    for (const l of pub.leads) {
      if (isOpen(l.gate) && !unlocked.has(`lead:${l.id}`)) {
        unlocked.add(`lead:${l.id}`);
        changed = true;
      }
    }
    const visText = pub.evidence.filter((e) => vis.has(e.id)).map(evidenceText).join(' | ');
    for (const entry of sol.archiveIndex) {
      if (unlocked.has(`search:${entry.evidenceId}`)) continue;
      const term = entry.terms.find((t) => containsTerm(visText, t));
      if (term) {
        unlocked.add(`search:${entry.evidenceId}`);
        searchedTerms.add(normalizeTerm(term));
        changed = true;
      }
    }
    for (const bt of sol.breakthroughs) {
      if (!found.has(bt.id) && vis.has(bt.a) && vis.has(bt.b)) {
        found.add(bt.id);
        unlocked.add(`breakthrough:${bt.id}`);
        changed = true;
      }
    }
    for (const c of sol.confrontations) {
      if (!unlocked.has(`confront:${c.id}`) && vis.has(c.statementId) && c.evidenceIds.some((id) => vis.has(id))) {
        unlocked.add(`confront:${c.id}`);
        changed = true;
      }
    }
  }
  return { visible: visible(), breakthroughs: found, unlocked, searchedTerms };
}

export function lintCase(pubRaw: unknown, solRaw: unknown): { issues: LintIssue[]; pub?: CasePublic; sol?: CaseSolution } {
  const issues: LintIssue[] = [];
  const err = (code: string, message: string) => issues.push({ level: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ level: 'warning', code, message });

  const p = CasePublicSchema.safeParse(pubRaw);
  const s = CaseSolutionSchema.safeParse(solRaw);
  if (!p.success) for (const i of p.error.issues) err('schema_public', `${i.path.join('.')}: ${i.message}`);
  if (!s.success) for (const i of s.error.issues) err('schema_solution', `${i.path.join('.')}: ${i.message}`);
  if (!p.success || !s.success) return { issues };
  const pub = p.data;
  const sol = s.data;

  if (pub.id !== sol.caseId) err('id_mismatch', `case.json id ${pub.id} ≠ solution caseId ${sol.caseId}`);
  if (pub.version !== sol.version) err('version_mismatch', `case.json v${pub.version} ≠ solution v${sol.version}`);

  // --- ids resolve and are unique
  const evIds = pub.evidence.map((e) => e.id);
  const dup = evIds.filter((id, i) => evIds.indexOf(id) !== i);
  if (dup.length) err('dup_evidence', `Duplicate evidence ids: ${dup.join(', ')}`);
  const numbers = pub.evidence.map((e) => e.number);
  if (new Set(numbers).size !== numbers.length) err('dup_number', 'Two evidence items share a display number.');
  const ev = new Set(evIds);
  const suspects = new Set(pub.suspects.map((x) => x.id));
  const leads = new Set(pub.leads.map((l) => l.id));
  const bts = new Set(sol.breakthroughs.map((b) => b.id));
  const confs = new Set(sol.confrontations.map((c) => c.id));
  const words = new Set(pub.words.map((w) => w.id));

  const checkGate = (where: string, g?: Gate) => {
    if (!g) return;
    const ok =
      (g.kind === 'lead' && leads.has(g.id)) ||
      (g.kind === 'breakthrough' && bts.has(g.id)) ||
      (g.kind === 'confront' && confs.has(g.id)) ||
      (g.kind === 'search' && ev.has(g.id));
    if (!ok) err('bad_gate', `${where}: gate ${g.kind}:${g.id} does not resolve.`);
  };
  pub.evidence.forEach((e) => checkGate(e.id, e.gate));
  pub.leads.forEach((l) => checkGate(`lead ${l.id}`, l.gate));

  for (const e of pub.evidence) {
    if (e.gate?.kind === 'search' && e.gate.id !== e.id) err('search_gate', `${e.id}: a search gate must name the item itself.`);
    if (e.gate?.kind === 'search' && !sol.archiveIndex.some((a) => a.evidenceId === e.id))
      err('search_unindexed', `${e.id} is search-gated but has no archive terms.`);
    for (const t of e.timestamps) for (const sid of t.suspectIds ?? []) if (!suspects.has(sid)) err('bad_suspect', `${e.id}: unknown suspect ${sid}`);
    if (e.body.type === 'statement' && !suspects.has(e.body.suspectId)) err('bad_suspect', `${e.id}: unknown suspect ${e.body.suspectId}`);
  }
  // The evidence viewer renders paragraphs, line breaks, bold/italic and "- " lists only.
  for (const e of pub.evidence)
    if (e.body.type === 'document' && /^\s*\|.*\|\s*$/m.test(e.body.markdown))
      err('unsupported_markdown', `${e.id}: markdown tables are not supported by the viewer; use lines or a log item.`);
  for (const b of sol.breakthroughs) {
    if (!ev.has(b.a) || !ev.has(b.b)) err('bad_breakthrough', `${b.id} references unknown evidence.`);
    if (b.a === b.b) err('bad_breakthrough', `${b.id} links an item to itself.`);
  }
  for (const c of sol.confrontations) {
    const st = pub.evidence.find((e) => e.id === c.statementId);
    if (!st || st.body.type !== 'statement') err('bad_confront', `${c.id}: ${c.statementId} is not a statement.`);
    else if (!st.body.lines.some((l) => l.n === c.line)) err('bad_confront', `${c.id}: statement has no line ${c.line}.`);
    for (const id of c.evidenceIds) if (!ev.has(id)) err('bad_confront', `${c.id}: unknown evidence ${id}.`);
  }
  for (const w of pub.words) for (const r of w.revealedBy) if (!ev.has(r) && !bts.has(r)) err('bad_word', `word ${w.id}: revealedBy ${r} unknown.`);
  for (const b of [...pub.verdict.how, ...pub.verdict.why]) for (const w of b.wordIds) if (!words.has(w)) err('bad_word', `${b.blankId}: unknown word ${w}`);
  for (const [blank, sid] of Object.entries(sol.verdict.who)) {
    if (!pub.verdict.who.some((b) => b.blankId === blank)) err('bad_verdict', `who blank ${blank} not in case.json`);
    if (!suspects.has(sid)) err('bad_verdict', `who answer ${sid} is not a suspect`);
  }
  for (const [section, blanks] of [['how', pub.verdict.how], ['why', pub.verdict.why]] as const) {
    const answers = sol.verdict[section];
    for (const b of blanks) {
      const ok = answers[b.blankId];
      if (!ok) err('bad_verdict', `${section}.${b.blankId} has no answer.`);
      else for (const w of ok) if (!b.wordIds.includes(w)) err('bad_verdict', `${section}.${b.blankId}: answer ${w} not among options.`);
    }
  }
  const { core, support } = sol.verdict.proof;
  for (const id of [...core, ...support]) if (!ev.has(id)) err('bad_proof', `proof item ${id} unknown.`);
  if (core.length > pub.verdict.proofCount) err('bad_proof', 'More core proof items than proof slots.');
  if (core.length < pub.verdict.proofCount && support.length < pub.verdict.proofCount - core.length)
    err('bad_proof', 'Not enough support items to complete a proof set.');

  // --- reachability (an ideal player can get everything that matters)
  const reach = explore(pub, sol);
  for (const e of pub.evidence) if (!reach.visible.has(e.id)) err('unreachable_evidence', `${e.id} "${e.title}" can never be unlocked.`);
  for (const b of sol.breakthroughs) if (!reach.breakthroughs.has(b.id)) err('unreachable_breakthrough', `${b.id} can never be found.`);
  for (const [section, answers] of [['how', sol.verdict.how], ['why', sol.verdict.why]] as const) {
    for (const [blank, ok] of Object.entries(answers)) {
      const reachable = ok.some((w) => {
        const word = pub.words.find((x) => x.id === w);
        return word && (word.revealedBy.length === 0 || word.revealedBy.some((r) => reach.visible.has(r) || reach.breakthroughs.has(r)));
      });
      if (!reachable) err('unreachable_word', `${section}.${blank}: no correct word can be discovered.`);
    }
  }
  // Every correct answer word should need discovery (else it is guessable from the start).
  for (const [section, answers] of [['how', sol.verdict.how], ['why', sol.verdict.why]] as const)
    for (const ok of Object.values(answers))
      for (const w of ok) if (pub.words.find((x) => x.id === w)?.revealedBy.length === 0) warn('free_answer', `${section}: answer word ${w} is available without discovery.`);

  // --- search terms should appear in >= 2 visible places (authoring guide §5)
  for (const entry of sol.archiveIndex) {
    const places = pub.evidence.filter((e) => e.id !== entry.evidenceId && entry.terms.some((t) => containsTerm(evidenceText(e), t)));
    if (places.length === 0) err('search_undiscoverable', `${entry.evidenceId}: none of its terms appear in any other evidence.`);
    else if (places.length < 2) warn('search_single_source', `${entry.evidenceId}: terms appear in only one other item (${places[0]!.id}).`);
  }

  // --- hints and nudges for every essential breakthrough
  for (const b of sol.breakthroughs.filter((x) => x.essential)) {
    if (!pub.nudges.some((n) => n.stuckPointId === b.id)) err('missing_hint', `${b.id}: no nudge.`);
    if (!sol.hints.some((h) => h.stuckPointId === b.id)) err('missing_hint', `${b.id}: no pointer/reveal.`);
  }

  // --- leaks: solution text must not be in the public file
  const pubText = JSON.stringify(pub).toLowerCase();
  for (const b of sol.breakthroughs) if (b.insight.length > 20 && pubText.includes(b.insight.toLowerCase())) err('leak', `${b.id} insight appears in case.json`);

  return { issues, pub, sol };
}
