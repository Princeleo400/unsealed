import { describe, expect, it } from 'vitest';
import {
  ActionError,
  checkString,
  confront,
  currentStuckPoint,
  followLead,
  getHint,
  isProofCorrect,
  normalizeTerm,
  readEvidence,
  searchArchive,
  submitVerdict,
  togglePin,
  type VerdictAnswer,
} from '../src/actions';
import { correctAnswer } from '../src/golden';
import {
  accusationsLeft,
  availableLeads,
  isVisible,
  isWordAvailable,
  newSession,
  visibleEvidence,
} from '../src/state';
import { pub, sol } from './fixtures';

const fresh = () => newSession(pub);
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ActionError).code;
  }
  return 'no-error';
};

describe('visibility and reading', () => {
  it('starts with only ungated evidence visible', () => {
    const vis = visibleEvidence(pub, fresh()).map((evidence) => evidence.id);
    expect(vis).toContain('E-01');
    expect(vis).not.toContain('E-17'); // search-gated
    expect(vis).not.toContain('E-18'); // lead-gated
    expect(vis).toHaveLength(15);
  });

  it('reads visible evidence once and rejects hidden evidence', () => {
    let sessionState = readEvidence(pub, fresh(), 'E-04');
    sessionState = readEvidence(pub, sessionState, 'E-04');
    expect(sessionState.read).toEqual(['E-04']);
    expect(code(() => readEvidence(pub, fresh(), 'E-17'))).toBe('not_visible');
  });

  it('pins and unpins', () => {
    let sessionState = togglePin(pub, fresh(), 'E-02');
    expect(sessionState.pinned).toEqual(['E-02']);
    sessionState = togglePin(pub, sessionState, 'E-02');
    expect(sessionState.pinned).toEqual([]);
    expect(code(() => togglePin(pub, fresh(), 'E-24'))).toBe('not_visible');
  });
});

describe('leads (FR-LEAD-01/02)', () => {
  it('costs hours and unlocks evidence', () => {
    const outcome = followLead(pub, fresh(), 'L2');
    expect(outcome.state.clockMinutes).toBe(120);
    expect(outcome.unlockedEvidence.map((evidence) => evidence.id)).toEqual([
      'E-18',
    ]);
    expect(code(() => followLead(pub, outcome.state, 'L2'))).toBe('lead_done');
  });

  it('keeps gated leads locked until their breakthrough', () => {
    expect(availableLeads(pub, fresh()).map((lead) => lead.id)).not.toContain(
      'L5',
    );
    expect(code(() => followLead(pub, fresh(), 'L5'))).toBe('lead_locked');
    expect(code(() => followLead(pub, fresh(), 'L99'))).toBe('unknown_lead');
    const sessionState = checkString(
      pub,
      sol,
      fresh(),
      'E-02',
      'E-05',
      'contradiction',
    ).state;
    expect(availableLeads(pub, sessionState).map((lead) => lead.id)).toContain(
      'L5',
    );
  });
});

describe('red string (FR-BOARD-05..08)', () => {
  it('validates a true breakthrough in either order and charges 10 min', () => {
    const outcome = checkString(
      pub,
      sol,
      fresh(),
      'E-05',
      'E-02',
      'contradiction',
    );
    expect(outcome.valid).toBe(true);
    expect(outcome.state.breakthroughs).toEqual(['BT-1']);
    expect(outcome.state.clockMinutes).toBe(10);
    expect(outcome.state.unlocked).toContain('breakthrough:BT-1');
  });

  it('marks wrong relation or pair invalid but still charges', () => {
    const outcome = checkString(
      pub,
      sol,
      fresh(),
      'E-02',
      'E-05',
      'corroboration',
    );
    expect(outcome.valid).toBe(false);
    expect(outcome.state.clockMinutes).toBe(10);
    expect(outcome.state.breakthroughs).toEqual([]);
  });

  it('never double-charges the same check', () => {
    const outcome = checkString(pub, sol, fresh(), 'E-01', 'E-03', 'link');
    const repeatOutcome = checkString(
      pub,
      sol,
      outcome.state,
      'E-03',
      'E-01',
      'link',
    );
    expect(repeatOutcome.duplicate).toBe(true);
    expect(repeatOutcome.state.clockMinutes).toBe(10);
  });

  it('unlocks breakthrough-gated evidence', () => {
    const outcome = checkString(
      pub,
      sol,
      fresh(),
      'E-11',
      'E-04',
      'corroboration',
    );
    expect(outcome.unlockedEvidence.map((evidence) => evidence.id)).toEqual([
      'E-22',
    ]);
  });

  it('rejects same card and hidden cards', () => {
    expect(
      code(() => checkString(pub, sol, fresh(), 'E-02', 'E-02', 'link')),
    ).toBe('same_card');
    expect(
      code(() =>
        checkString(pub, sol, fresh(), 'E-17', 'E-04', 'corroboration'),
      ),
    ).toBe('not_visible');
  });
});

describe('confront (FR-STMT-01/02)', () => {
  it('reveals new lines and unlocks evidence for free when valid', () => {
    const s0 = followLead(pub, fresh(), 'L2').state;
    const outcome = confront(pub, sol, s0, 'E-09', 4, 'E-18');
    expect(outcome.valid).toBe(true);
    expect(outcome.revealLines[0]?.n).toBe('4a');
    expect(outcome.state.clockMinutes).toBe(s0.clockMinutes);
    expect(outcome.unlockedEvidence.map((evidence) => evidence.id)).toEqual([
      'E-24',
    ]);
    const again = confront(pub, sol, outcome.state, 'E-09', 4, 'E-18');
    expect(again.duplicate).toBe(true);
  });

  it('charges 10 min for a wrong confrontation', () => {
    const outcome = confront(pub, sol, fresh(), 'E-09', 1, 'E-02');
    expect(outcome.valid).toBe(false);
    expect(outcome.state.clockMinutes).toBe(10);
  });

  it('does not re-reward a confrontation done with other evidence', () => {
    const sessionState = confront(pub, sol, fresh(), 'E-09', 4, 'E-13').state;
    const s2 = followLead(pub, sessionState, 'L2').state;
    const outcome = confront(pub, sol, s2, 'E-09', 4, 'E-18');
    expect(outcome.state.confrontations).toEqual(['C-1']);
    expect(outcome.state.clockMinutes).toBe(s2.clockMinutes);
  });

  it('rejects non-statements, bad lines and hidden items', () => {
    expect(code(() => confront(pub, sol, fresh(), 'E-04', 1, 'E-02'))).toBe(
      'not_statement',
    );
    expect(code(() => confront(pub, sol, fresh(), 'E-09', 99, 'E-02'))).toBe(
      'bad_line',
    );
    expect(code(() => confront(pub, sol, fresh(), 'E-09', 4, 'E-18'))).toBe(
      'not_visible',
    );
  });
});

describe('archive search (FR-ARCH-01..04)', () => {
  it('normalises terms', () => {
    expect(normalizeTerm('  CA 412–778! ')).toBe('ca 412 778');
    expect(normalizeTerm('Café')).toBe('cafe');
  });

  it('finds exact whole terms only, free of charge', () => {
    const hit = searchArchive(pub, sol, fresh(), 'vt');
    expect(hit.results.map((evidence) => evidence.id)).toEqual(['E-17']);
    expect(hit.state.clockMinutes).toBe(0);
    expect(isVisible(pub, hit.state, 'E-17')).toBe(true);
    expect(searchArchive(pub, sol, fresh(), 'voice').results).toEqual([]);
    expect(
      searchArchive(pub, sol, fresh(), 'CA 412-778').results.map(
        (evidence) => evidence.id,
      ),
    ).toEqual(['E-23']);
  });

  it('rejects one-character queries', () => {
    expect(code(() => searchArchive(pub, sol, fresh(), 'v'))).toBe(
      'query_too_short',
    );
  });
});

describe('hints (FR-HINT-01/02)', () => {
  it('follows the lowest unfound essential breakthrough', () => {
    expect(currentStuckPoint(sol, fresh())).toBe('BT-1');
    const nudge = getHint(pub, sol, fresh(), 'nudge');
    expect(nudge.text).toMatch(/when she died/);
    expect(nudge.scoreCost).toBe(10);
    expect(nudge.state.hints.nudge).toBe(1);
    expect(getHint(pub, sol, fresh(), 'pointer').text).toMatch(/\(2\)/);
    expect(getHint(pub, sol, fresh(), 'reveal').scoreCost).toBe(75);
  });

  it('says so when every essential breakthrough is found', () => {
    const solvedState = {
      ...fresh(),
      breakthroughs: ['BT-1', 'BT-2', 'BT-3', 'BT-4'],
    };
    expect(currentStuckPoint(sol, solvedState)).toBeNull();
    expect(getHint(pub, sol, solvedState, 'nudge').text).toMatch(
      /every essential/,
    );
  });
});

describe('verdict (FR-VERD-01..06)', () => {
  const ready = () => {
    // Make every answer word and proof item available.
    let sessionState = followLead(pub, fresh(), 'L2').state;
    sessionState = searchArchive(pub, sol, sessionState, 'VT').state;
    sessionState = confront(pub, sol, sessionState, 'E-09', 4, 'E-18').state;
    for (const id of [
      'E-02',
      'E-03',
      'E-05',
      'E-08',
      'E-11',
      'E-12',
      'E-14',
      'E-17',
      'E-18',
      'E-24',
      'E-01',
    ])
      sessionState = readEvidence(pub, sessionState, id);
    return sessionState;
  };
  const wrong = (): VerdictAnswer => ({
    ...correctAnswer(pub, sol),
    who: { killer: 'daniel' },
  });

  it('solves with the correct answer', () => {
    const outcome = submitVerdict(pub, sol, ready(), correctAnswer(pub, sol));
    expect(outcome.correctSections).toBe(4);
    expect(outcome.status).toBe('solved');
  });

  it('reports only a count, never which sections', () => {
    const ans = correctAnswer(pub, sol);
    const outcome = submitVerdict(pub, sol, ready(), {
      ...ans,
      who: { killer: 'daniel' },
      why: { motive: 'y-slot' },
    });
    expect(outcome.correctSections).toBe(2);
    expect(Object.keys(outcome).sort()).toEqual([
      'accusationsLeft',
      'correctSections',
      'state',
      'status',
    ]);
    expect(outcome.accusationsLeft).toBe(2);
  });

  it('goes cold after three wrong accusations and then refuses actions', () => {
    let sessionState = ready();
    for (let index = 0; index < 3; index++)
      sessionState = submitVerdict(pub, sol, sessionState, wrong()).state;
    expect(sessionState.status).toBe('cold');
    expect(accusationsLeft(sessionState)).toBe(0);
    expect(
      code(() =>
        submitVerdict(pub, sol, sessionState, correctAnswer(pub, sol)),
      ),
    ).toBe('case_closed');
    expect(code(() => followLead(pub, sessionState, 'L1'))).toBe('case_closed');
  });

  it('validates the answer shape', () => {
    const sessionState = ready();
    const ok = correctAnswer(pub, sol);
    expect(
      code(() => submitVerdict(pub, sol, sessionState, { ...ok, who: {} })),
    ).toBe('incomplete');
    expect(
      code(() =>
        submitVerdict(pub, sol, sessionState, {
          ...ok,
          how: { ...ok.how, method: '' },
        }),
      ),
    ).toBe('incomplete');
    expect(
      code(() =>
        submitVerdict(pub, sol, sessionState, {
          ...ok,
          how: { ...ok.how, method: 't-0030' },
        }),
      ),
    ).toBe('bad_word');
    expect(code(() => submitVerdict(pub, sol, fresh(), ok))).toBe(
      'word_locked',
    );
    expect(
      code(() =>
        submitVerdict(pub, sol, sessionState, {
          ...ok,
          proof: ['E-04', 'E-04', 'E-17'],
        }),
      ),
    ).toBe('proof_count');
    expect(
      code(() =>
        submitVerdict(pub, sol, sessionState, {
          ...ok,
          proof: ['E-04', 'E-17', 'E-21'],
        }),
      ),
    ).toBe('not_visible');
  });

  it('accepts any valid proof set and rejects sets missing a core item', () => {
    expect(isProofCorrect(sol, ['E-17', 'E-04', 'E-09'])).toBe(true);
    expect(isProofCorrect(sol, ['E-04', 'E-17', 'E-24'])).toBe(true);
    expect(isProofCorrect(sol, ['E-04', 'E-09', 'E-24'])).toBe(false);
    expect(isProofCorrect(sol, ['E-17', 'E-04', 'E-10'])).toBe(false);
    expect(isProofCorrect(sol, ['E-17', 'E-04'])).toBe(false);
  });

  it('gates verdict words behind discovery', () => {
    expect(isWordAvailable(pub, fresh(), 'k-vt')).toBe(false);
    const sessionState = checkString(
      pub,
      sol,
      fresh(),
      'E-06',
      'E-07',
      'contradiction',
    ).state;
    expect(isWordAvailable(pub, sessionState, 'k-vt')).toBe(true);
    expect(isWordAvailable(pub, fresh(), 'nope')).toBe(false);
  });
});
