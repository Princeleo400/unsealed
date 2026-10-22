import { normalizeTerm } from './actions';
import {
  CasePublicSchema,
  CaseSolutionSchema,
  type CasePublic,
  type CaseSolution,
  type Gate,
} from './schema';
import { gateKey } from './state';

export type LintIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
};

/** Text a player can actually read in an evidence item (used to check search terms are discoverable). */
export function evidenceText(evidence: CasePublic['evidence'][number]): string {
  return normalizeTerm(
    `${evidence.title} ${evidence.source} ${JSON.stringify(evidence.body)}`,
  );
}

const containsTerm = (haystack: string, term: string) => {
  const normalized = normalizeTerm(term);
  return new RegExp(
    `(^|[^a-z0-9])${normalized.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}($|[^a-z0-9])`,
  ).test(haystack);
};

/**
 * Explores everything an ideal player could reach (every lead, every discoverable search term,
 * every valid string and confrontation) until nothing new opens. Returns the reachable sets.
 */
export function explore(pub: CasePublic, sol: CaseSolution) {
  const unlocked = new Set<string>();
  const isOpen = (gate?: Gate) =>
    gate === undefined || unlocked.has(gateKey(gate));
  const visible = () =>
    new Set(
      pub.evidence
        .filter((evidence) => isOpen(evidence.gate))
        .map((evidence) => evidence.id),
    );
  const found = new Set<string>();
  const searchedTerms = new Set<string>();
  let changed = true;
  let rounds = 0;
  while (changed && rounds < 100) {
    changed = false;
    rounds++;
    const vis = visible();
    for (const lead of pub.leads) {
      if (isOpen(lead.gate) && !unlocked.has(`lead:${lead.id}`)) {
        unlocked.add(`lead:${lead.id}`);
        changed = true;
      }
    }
    const visText = pub.evidence
      .filter((evidence) => vis.has(evidence.id))
      .map(evidenceText)
      .join(' | ');
    for (const entry of sol.archiveIndex) {
      if (unlocked.has(`search:${entry.evidenceId}`)) continue;
      const term = entry.terms.find((term) => containsTerm(visText, term));
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
    for (const confrontation of sol.confrontations) {
      if (
        !unlocked.has(`confront:${confrontation.id}`) &&
        vis.has(confrontation.statementId) &&
        confrontation.evidenceIds.some((id) => vis.has(id))
      ) {
        unlocked.add(`confront:${confrontation.id}`);
        changed = true;
      }
    }
  }
  return { visible: visible(), breakthroughs: found, unlocked, searchedTerms };
}

export function lintCase(
  pubRaw: unknown,
  solRaw: unknown,
): { issues: LintIssue[]; pub?: CasePublic; sol?: CaseSolution } {
  const issues: LintIssue[] = [];
  const err = (code: string, message: string) =>
    issues.push({ level: 'error', code, message });
  const warn = (code: string, message: string) =>
    issues.push({ level: 'warning', code, message });

  const publicParse = CasePublicSchema.safeParse(pubRaw);
  const solutionParse = CaseSolutionSchema.safeParse(solRaw);
  if (!publicParse.success)
    for (const issue of publicParse.error.issues)
      err('schema_public', `${issue.path.join('.')}: ${issue.message}`);
  if (!solutionParse.success)
    for (const issue of solutionParse.error.issues)
      err('schema_solution', `${issue.path.join('.')}: ${issue.message}`);
  if (!publicParse.success || !solutionParse.success) return { issues };
  const pub = publicParse.data;
  const sol = solutionParse.data;

  if (pub.id !== sol.caseId)
    err(
      'id_mismatch',
      `case.json id ${pub.id} ≠ solution caseId ${sol.caseId}`,
    );
  if (pub.version !== sol.version)
    err(
      'version_mismatch',
      `case.json v${pub.version} ≠ solution v${sol.version}`,
    );

  // --- ids resolve and are unique
  const evIds = pub.evidence.map((evidence) => evidence.id);
  const dup = evIds.filter((id, index) => evIds.indexOf(id) !== index);
  if (dup.length)
    err('dup_evidence', `Duplicate evidence ids: ${dup.join(', ')}`);
  const numbers = pub.evidence.map((evidence) => evidence.number);
  if (new Set(numbers).size !== numbers.length)
    err('dup_number', 'Two evidence items share a display number.');
  const ev = new Set(evIds);
  const suspects = new Set(pub.suspects.map((suspect) => suspect.id));
  const leads = new Set(pub.leads.map((lead) => lead.id));
  const bts = new Set(sol.breakthroughs.map((breakthrough) => breakthrough.id));
  const confs = new Set(
    sol.confrontations.map((confrontation) => confrontation.id),
  );
  const words = new Set(pub.words.map((word) => word.id));

  const checkGate = (where: string, gate?: Gate) => {
    if (!gate) return;
    const ok =
      (gate.kind === 'lead' && leads.has(gate.id)) ||
      (gate.kind === 'breakthrough' && bts.has(gate.id)) ||
      (gate.kind === 'confront' && confs.has(gate.id)) ||
      (gate.kind === 'search' && ev.has(gate.id));
    if (!ok)
      err(
        'bad_gate',
        `${where}: gate ${gate.kind}:${gate.id} does not resolve.`,
      );
  };
  pub.evidence.forEach((evidence) => checkGate(evidence.id, evidence.gate));
  pub.leads.forEach((lead) => checkGate(`lead ${lead.id}`, lead.gate));

  for (const evidence of pub.evidence) {
    if (evidence.gate?.kind === 'search' && evidence.gate.id !== evidence.id)
      err(
        'search_gate',
        `${evidence.id}: a search gate must name the item itself.`,
      );
    if (
      evidence.gate?.kind === 'search' &&
      !sol.archiveIndex.some(
        (archiveEntry) => archiveEntry.evidenceId === evidence.id,
      )
    )
      err(
        'search_unindexed',
        `${evidence.id} is search-gated but has no archive terms.`,
      );
    for (const timestamp of evidence.timestamps)
      for (const sid of timestamp.suspectIds ?? [])
        if (!suspects.has(sid))
          err('bad_suspect', `${evidence.id}: unknown suspect ${sid}`);
    if (
      evidence.body.type === 'statement' &&
      !suspects.has(evidence.body.suspectId)
    )
      err(
        'bad_suspect',
        `${evidence.id}: unknown suspect ${evidence.body.suspectId}`,
      );
  }
  // The evidence viewer renders paragraphs, line breaks, bold/italic and "- " lists only.
  for (const evidence of pub.evidence)
    if (
      evidence.body.type === 'document' &&
      /^\s*\|.*\|\s*$/m.test(evidence.body.markdown)
    )
      err(
        'unsupported_markdown',
        `${evidence.id}: markdown tables are not supported by the viewer; use lines or a log item.`,
      );
  for (const breakthrough of sol.breakthroughs) {
    if (!ev.has(breakthrough.a) || !ev.has(breakthrough.b))
      err(
        'bad_breakthrough',
        `${breakthrough.id} references unknown evidence.`,
      );
    if (breakthrough.a === breakthrough.b)
      err('bad_breakthrough', `${breakthrough.id} links an item to itself.`);
  }
  for (const confrontation of sol.confrontations) {
    const st = pub.evidence.find(
      (evidence) => evidence.id === confrontation.statementId,
    );
    if (!st || st.body.type !== 'statement')
      err(
        'bad_confront',
        `${confrontation.id}: ${confrontation.statementId} is not a statement.`,
      );
    else if (!st.body.lines.some((line) => line.n === confrontation.line))
      err(
        'bad_confront',
        `${confrontation.id}: statement has no line ${confrontation.line}.`,
      );
    for (const id of confrontation.evidenceIds)
      if (!ev.has(id))
        err('bad_confront', `${confrontation.id}: unknown evidence ${id}.`);
  }
  for (const word of pub.words)
    for (const revealerId of word.revealedBy)
      if (!ev.has(revealerId) && !bts.has(revealerId))
        err('bad_word', `word ${word.id}: revealedBy ${revealerId} unknown.`);
  for (const blank of [...pub.verdict.how, ...pub.verdict.why])
    for (const wordId of blank.wordIds)
      if (!words.has(wordId))
        err('bad_word', `${blank.blankId}: unknown word ${wordId}`);
  for (const [blank, sid] of Object.entries(sol.verdict.who)) {
    if (!pub.verdict.who.some((whoBlank) => whoBlank.blankId === blank))
      err('bad_verdict', `who blank ${blank} not in case.json`);
    if (!suspects.has(sid))
      err('bad_verdict', `who answer ${sid} is not a suspect`);
  }
  for (const [section, blanks] of [
    ['how', pub.verdict.how],
    ['why', pub.verdict.why],
  ] as const) {
    const answers = sol.verdict[section];
    for (const blank of blanks) {
      const ok = answers[blank.blankId];
      if (!ok) err('bad_verdict', `${section}.${blank.blankId} has no answer.`);
      else
        for (const wordId of ok)
          if (!blank.wordIds.includes(wordId))
            err(
              'bad_verdict',
              `${section}.${blank.blankId}: answer ${wordId} not among options.`,
            );
    }
  }
  const { core, support } = sol.verdict.proof;
  for (const id of [...core, ...support])
    if (!ev.has(id)) err('bad_proof', `proof item ${id} unknown.`);
  if (core.length > pub.verdict.proofCount)
    err('bad_proof', 'More core proof items than proof slots.');
  if (
    core.length < pub.verdict.proofCount &&
    support.length < pub.verdict.proofCount - core.length
  )
    err('bad_proof', 'Not enough support items to complete a proof set.');

  // --- reachability (an ideal player can get everything that matters)
  const reach = explore(pub, sol);
  for (const evidence of pub.evidence)
    if (!reach.visible.has(evidence.id))
      err(
        'unreachable_evidence',
        `${evidence.id} "${evidence.title}" can never be unlocked.`,
      );
  for (const breakthrough of sol.breakthroughs)
    if (!reach.breakthroughs.has(breakthrough.id))
      err('unreachable_breakthrough', `${breakthrough.id} can never be found.`);
  for (const [section, answers] of [
    ['how', sol.verdict.how],
    ['why', sol.verdict.why],
  ] as const) {
    for (const [blank, ok] of Object.entries(answers)) {
      const reachable = ok.some((wordId) => {
        const word = pub.words.find((word) => word.id === wordId);
        return (
          word &&
          (word.revealedBy.length === 0 ||
            word.revealedBy.some(
              (revealerId) =>
                reach.visible.has(revealerId) ||
                reach.breakthroughs.has(revealerId),
            ))
        );
      });
      if (!reachable)
        err(
          'unreachable_word',
          `${section}.${blank}: no correct word can be discovered.`,
        );
    }
  }
  // Every correct answer word should need discovery (else it is guessable from the start).
  for (const [section, answers] of [
    ['how', sol.verdict.how],
    ['why', sol.verdict.why],
  ] as const)
    for (const ok of Object.values(answers))
      for (const wordId of ok)
        if (
          pub.words.find((word) => word.id === wordId)?.revealedBy.length === 0
        )
          warn(
            'free_answer',
            `${section}: answer word ${wordId} is available without discovery.`,
          );

  // --- search terms should appear in >= 2 visible places (authoring guide §5)
  for (const entry of sol.archiveIndex) {
    const places = pub.evidence.filter(
      (evidence) =>
        evidence.id !== entry.evidenceId &&
        entry.terms.some((term) => containsTerm(evidenceText(evidence), term)),
    );
    if (places.length === 0)
      err(
        'search_undiscoverable',
        `${entry.evidenceId}: none of its terms appear in any other evidence.`,
      );
    else if (places.length < 2)
      warn(
        'search_single_source',
        `${entry.evidenceId}: terms appear in only one other item (${places[0]!.id}).`,
      );
  }

  // --- hints and nudges for every essential breakthrough
  for (const breakthrough of sol.breakthroughs.filter(
    (breakthrough) => breakthrough.essential,
  )) {
    if (!pub.nudges.some((nudge) => nudge.stuckPointId === breakthrough.id))
      err('missing_hint', `${breakthrough.id}: no nudge.`);
    if (!sol.hints.some((hint) => hint.stuckPointId === breakthrough.id))
      err('missing_hint', `${breakthrough.id}: no pointer/reveal.`);
  }

  // --- leaks: solution text must not be in the public file
  const pubText = JSON.stringify(pub).toLowerCase();
  for (const breakthrough of sol.breakthroughs)
    if (
      breakthrough.insight.length > 20 &&
      pubText.includes(breakthrough.insight.toLowerCase())
    )
      err('leak', `${breakthrough.id} insight appears in case.json`);

  return { issues, pub, sol };
}
