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
import { accusationsLeft, availableLeads, isVisible, isWordAvailable, newSession, visibleEvidence } from '../src/state';
import { pub, sol } from './fixtures';

const fresh = () => newSession(pub);
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as ActionError).code;
  }
  return 'no-error';
};

describe('visibility and reading', () => {
  it('starts with only ungated evidence visible', () => {
    const vis = visibleEvidence(pub, fresh()).map((e) => e.id);
    expect(vis).toContain('E-01');
    expect(vis).not.toContain('E-17'); // search-gated
    expect(vis).not.toContain('E-18'); // lead-gated
    expect(vis).toHaveLength(15);
  });

  it('reads visible evidence once and rejects hidden evidence', () => {
    let s = readEvidence(pub, fresh(), 'E-04');
    s = readEvidence(pub, s, 'E-04');
    expect(s.read).toEqual(['E-04']);
    expect(code(() => readEvidence(pub, fresh(), 'E-17'))).toBe('not_visible');
  });

  it('pins and unpins', () => {
    let s = togglePin(pub, fresh(), 'E-02');
    expect(s.pinned).toEqual(['E-02']);
    s = togglePin(pub, s, 'E-02');
    expect(s.pinned).toEqual([]);
    expect(code(() => togglePin(pub, fresh(), 'E-24'))).toBe('not_visible');
  });
});

describe('leads (FR-LEAD-01/02)', () => {
  it('costs hours and unlocks evidence', () => {
    const r = followLead(pub, fresh(), 'L2');
    expect(r.state.clockMinutes).toBe(120);
    expect(r.unlockedEvidence.map((e) => e.id)).toEqual(['E-18']);
    expect(code(() => followLead(pub, r.state, 'L2'))).toBe('lead_done');
  });

  it('keeps gated leads locked until their breakthrough', () => {
    expect(availableLeads(pub, fresh()).map((l) => l.id)).not.toContain('L5');
    expect(code(() => followLead(pub, fresh(), 'L5'))).toBe('lead_locked');
    expect(code(() => followLead(pub, fresh(), 'L99'))).toBe('unknown_lead');
    const s = checkString(pub, sol, fresh(), 'E-02', 'E-05', 'contradiction').state;
    expect(availableLeads(pub, s).map((l) => l.id)).toContain('L5');
  });
});

describe('red string (FR-BOARD-05..08)', () => {
  it('validates a true breakthrough in either order and charges 10 min', () => {
    const r = checkString(pub, sol, fresh(), 'E-05', 'E-02', 'contradiction');
    expect(r.valid).toBe(true);
    expect(r.state.breakthroughs).toEqual(['BT-1']);
    expect(r.state.clockMinutes).toBe(10);
    expect(r.state.unlocked).toContain('breakthrough:BT-1');
  });

  it('marks wrong relation or pair invalid but still charges', () => {
    const r = checkString(pub, sol, fresh(), 'E-02', 'E-05', 'corroboration');
    expect(r.valid).toBe(false);
    expect(r.state.clockMinutes).toBe(10);
    expect(r.state.breakthroughs).toEqual([]);
  });

  it('never double-charges the same check', () => {
    const a = checkString(pub, sol, fresh(), 'E-01', 'E-03', 'link');
    const b = checkString(pub, sol, a.state, 'E-03', 'E-01', 'link');
    expect(b.duplicate).toBe(true);
    expect(b.state.clockMinutes).toBe(10);
  });

  it('unlocks breakthrough-gated evidence', () => {
    const r = checkString(pub, sol, fresh(), 'E-11', 'E-04', 'corroboration');
    expect(r.unlockedEvidence.map((e) => e.id)).toEqual(['E-22']);
  });

  it('rejects same card and hidden cards', () => {
    expect(code(() => checkString(pub, sol, fresh(), 'E-02', 'E-02', 'link'))).toBe('same_card');
    expect(code(() => checkString(pub, sol, fresh(), 'E-17', 'E-04', 'corroboration'))).toBe('not_visible');
  });
});

describe('confront (FR-STMT-01/02)', () => {
  it('reveals new lines and unlocks evidence for free when valid', () => {
    const s0 = followLead(pub, fresh(), 'L2').state;
    const r = confront(pub, sol, s0, 'E-09', 4, 'E-18');
    expect(r.valid).toBe(true);
    expect(r.revealLines[0]?.n).toBe('4a');
    expect(r.state.clockMinutes).toBe(s0.clockMinutes);
    expect(r.unlockedEvidence.map((e) => e.id)).toEqual(['E-24']);
    const again = confront(pub, sol, r.state, 'E-09', 4, 'E-18');
    expect(again.duplicate).toBe(true);
  });

  it('charges 10 min for a wrong confrontation', () => {
    const r = confront(pub, sol, fresh(), 'E-09', 1, 'E-02');
    expect(r.valid).toBe(false);
    expect(r.state.clockMinutes).toBe(10);
  });

  it('does not re-reward a confrontation done with other evidence', () => {
    const s = confront(pub, sol, fresh(), 'E-09', 4, 'E-13').state;
    const s2 = followLead(pub, s, 'L2').state;
    const r = confront(pub, sol, s2, 'E-09', 4, 'E-18');
    expect(r.state.confrontations).toEqual(['C-1']);
    expect(r.state.clockMinutes).toBe(s2.clockMinutes);
  });

  it('rejects non-statements, bad lines and hidden items', () => {
    expect(code(() => confront(pub, sol, fresh(), 'E-04', 1, 'E-02'))).toBe('not_statement');
    expect(code(() => confront(pub, sol, fresh(), 'E-09', 99, 'E-02'))).toBe('bad_line');
    expect(code(() => confront(pub, sol, fresh(), 'E-09', 4, 'E-18'))).toBe('not_visible');
  });
});

describe('archive search (FR-ARCH-01..04)', () => {
  it('normalises terms', () => {
    expect(normalizeTerm('  CA 412–778! ')).toBe('ca 412 778');
    expect(normalizeTerm('Café')).toBe('cafe');
  });

  it('finds exact whole terms only, free of charge', () => {
    const hit = searchArchive(pub, sol, fresh(), 'vt');
    expect(hit.results.map((e) => e.id)).toEqual(['E-17']);
    expect(hit.state.clockMinutes).toBe(0);
    expect(isVisible(pub, hit.state, 'E-17')).toBe(true);
    expect(searchArchive(pub, sol, fresh(), 'voice').results).toEqual([]);
    expect(searchArchive(pub, sol, fresh(), 'CA 412-778').results.map((e) => e.id)).toEqual(['E-23']);
  });

  it('rejects one-character queries', () => {
    expect(code(() => searchArchive(pub, sol, fresh(), 'v'))).toBe('query_too_short');
  });
});

describe('hints (FR-HINT-01/02)', () => {
  it('follows the lowest unfound essential breakthrough', () => {
    expect(currentStuckPoint(sol, fresh())).toBe('BT-1');
    const n = getHint(pub, sol, fresh(), 'nudge');
    expect(n.text).toMatch(/when she died/);
    expect(n.scoreCost).toBe(10);
    expect(n.state.hints.nudge).toBe(1);
    expect(getHint(pub, sol, fresh(), 'pointer').text).toMatch(/\(2\)/);
    expect(getHint(pub, sol, fresh(), 'reveal').scoreCost).toBe(75);
  });

  it('says so when every essential breakthrough is found', () => {
    const s = { ...fresh(), breakthroughs: ['BT-1', 'BT-2', 'BT-3', 'BT-4'] };
    expect(currentStuckPoint(sol, s)).toBeNull();
    expect(getHint(pub, sol, s, 'nudge').text).toMatch(/every essential/);
  });
});

describe('verdict (FR-VERD-01..06)', () => {
  const ready = () => {
    // Make every answer word and proof item available.
    let s = followLead(pub, fresh(), 'L2').state;
    s = searchArchive(pub, sol, s, 'VT').state;
    s = confront(pub, sol, s, 'E-09', 4, 'E-18').state;
    for (const id of ['E-02', 'E-03', 'E-05', 'E-08', 'E-11', 'E-12', 'E-14', 'E-17', 'E-18', 'E-24', 'E-01'])
      s = readEvidence(pub, s, id);
    return s;
  };
  const wrong = (): VerdictAnswer => ({ ...correctAnswer(pub, sol), who: { killer: 'daniel' } });

  it('solves with the correct answer', () => {
    const r = submitVerdict(pub, sol, ready(), correctAnswer(pub, sol));
    expect(r.correctSections).toBe(4);
    expect(r.status).toBe('solved');
  });

  it('reports only a count, never which sections', () => {
    const ans = correctAnswer(pub, sol);
    const r = submitVerdict(pub, sol, ready(), { ...ans, who: { killer: 'daniel' }, why: { motive: 'y-slot' } });
    expect(r.correctSections).toBe(2);
    expect(Object.keys(r).sort()).toEqual(['accusationsLeft', 'correctSections', 'state', 'status']);
    expect(r.accusationsLeft).toBe(2);
  });

  it('goes cold after three wrong accusations and then refuses actions', () => {
    let s = ready();
    for (let i = 0; i < 3; i++) s = submitVerdict(pub, sol, s, wrong()).state;
    expect(s.status).toBe('cold');
    expect(accusationsLeft(s)).toBe(0);
    expect(code(() => submitVerdict(pub, sol, s, correctAnswer(pub, sol)))).toBe('case_closed');
    expect(code(() => followLead(pub, s, 'L1'))).toBe('case_closed');
  });

  it('validates the answer shape', () => {
    const s = ready();
    const ok = correctAnswer(pub, sol);
    expect(code(() => submitVerdict(pub, sol, s, { ...ok, who: {} }))).toBe('incomplete');
    expect(code(() => submitVerdict(pub, sol, s, { ...ok, how: { ...ok.how, method: '' } }))).toBe('incomplete');
    expect(code(() => submitVerdict(pub, sol, s, { ...ok, how: { ...ok.how, method: 't-0030' } }))).toBe('bad_word');
    expect(code(() => submitVerdict(pub, sol, fresh(), ok))).toBe('word_locked');
    expect(code(() => submitVerdict(pub, sol, s, { ...ok, proof: ['E-04', 'E-04', 'E-17'] }))).toBe('proof_count');
    expect(code(() => submitVerdict(pub, sol, s, { ...ok, proof: ['E-04', 'E-17', 'E-21'] }))).toBe('not_visible');
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
    const s = checkString(pub, sol, fresh(), 'E-06', 'E-07', 'contradiction').state;
    expect(isWordAvailable(pub, s, 'k-vt')).toBe(true);
    expect(isWordAvailable(pub, fresh(), 'nope')).toBe(false);
  });
});
