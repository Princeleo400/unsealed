import { describe, expect, it } from 'vitest';
import { CITY_PACKS } from '../src/daily/cities';
import {
  checkDailyAnswer,
  countSolutions,
  dailyNumber,
  difficultyFor,
  generateDaily,
  generateLogic,
  holds,
  rng,
  type Difficulty,
} from '../src/daily/generator';

const dates = (start: string, days: number) =>
  Array.from({ length: days }, (_, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10));

describe('Daily Brief generator (FR-DAILY-01/02)', () => {
  it('is deterministic for a date', () => {
    const a = generateDaily('2026-10-23');
    const b = generateDaily('2026-10-23');
    expect(a).toEqual(b);
    expect(generateDaily('2026-10-24').puzzle).not.toEqual(a.puzzle);
    expect(generateDaily('2026-10-23', 'other-salt').puzzle).not.toEqual(a.puzzle);
  });

  it('every generated puzzle has exactly one solution (2,000 logic puzzles per difficulty)', () => {
    for (const d of ['rookie', 'detective', 'inspector', 'chief'] as Difficulty[]) {
      for (let i = 0; i < 2000; i++) {
        const g = generateLogic(`stress:${d}:${i}`, d);
        expect(g.unique).toBe(true);
        // Independent brute-force check, and every clue must be true of the real solution.
        expect(countSolutions(g.n, g.clues)).toBe(1);
        expect(g.clues.every((c) => holds(c, g.sol))).toBe(true);
      }
    }
  });

  it('respects difficulty rules', () => {
    for (let i = 0; i < 300; i++) {
      const insp = generateLogic(`rule:i:${i}`, 'inspector');
      expect(insp.n).toBe(4);
      expect(insp.clues.some((c) => c.kind === 'isPlace' || c.kind === 'isObject')).toBe(false);
      const det = generateLogic(`rule:d:${i}`, 'detective');
      expect(det.clues.filter((c) => c.kind === 'isPlace' || c.kind === 'isObject').length).toBeLessThanOrEqual(1);
      expect(generateLogic(`rule:r:${i}`, 'rookie').n).toBe(3);
    }
  });

  it('maps weekdays to difficulty (UTC)', () => {
    expect(difficultyFor('2026-10-26')).toBe('rookie'); // Monday
    expect(difficultyFor('2026-10-27')).toBe('detective');
    expect(difficultyFor('2026-10-29')).toBe('detective');
    expect(difficultyFor('2026-10-30')).toBe('inspector'); // Friday
    expect(difficultyFor('2026-10-31')).toBe('chief');
    expect(difficultyFor('2026-11-01')).toBe('chief'); // Sunday
  });

  it('builds a full year of readable, valid dailies', () => {
    for (const d of dates('2026-10-01', 366)) {
      const { puzzle, solution } = generateDaily(d);
      const n = puzzle.suspects.length;
      expect(new Set(puzzle.suspects).size).toBe(n);
      expect(new Set(puzzle.places).size).toBe(n);
      expect(new Set(puzzle.objects).size).toBe(n);
      expect(puzzle.clues.length).toBeGreaterThan(1);
      expect(puzzle.clues.every((c) => c.text.length > 10 && !c.text.includes('undefined'))).toBe(true);
      expect(solution.object[solution.culprit]).toBe(puzzle.target);
      expect(checkDailyAnswer(solution, { suspect: solution.culprit, place: solution.place[solution.culprit]! })).toBe(true);
    }
  });

  it('checks answers strictly', () => {
    const { solution } = generateDaily('2026-10-23');
    const other = (solution.culprit + 1) % solution.place.length;
    expect(checkDailyAnswer(solution, { suspect: other, place: solution.place[solution.culprit]! })).toBe(false);
    expect(checkDailyAnswer(solution, { suspect: solution.culprit, place: (solution.place[solution.culprit]! + 1) % solution.place.length })).toBe(false);
  });

  it('numbers dailies from the epoch', () => {
    expect(dailyNumber('2026-10-01')).toBe(1);
    expect(dailyNumber('2026-10-23')).toBe(23);
  });

  it('has complete city packs', () => {
    for (const c of CITY_PACKS) {
      expect(c.names.length).toBeGreaterThanOrEqual(6);
      expect(c.places.length).toBeGreaterThanOrEqual(6);
      expect(c.objects.length).toBeGreaterThanOrEqual(6);
      expect(new Set(c.names).size).toBe(c.names.length);
    }
  });

  it('rng helpers behave', () => {
    const r = rng('x');
    const xs = [1, 2, 3, 4, 5];
    expect(r.shuffle(xs).sort()).toEqual(xs);
    for (let i = 0; i < 100; i++) expect(r.int(3)).toBeLessThan(3);
  });
});

describe('Daily Brief text', () => {
  it('uses plural verbs for plural objects', () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.parse('2026-10-01T00:00:00Z') + i * 86400000).toISOString().slice(0, 10);
      const { puzzle } = generateDaily(d);
      const text = puzzle.intro + ' ' + puzzle.clues.map((c) => c.text).join(' ');
      expect(text).not.toMatch(/(binoculars|braai tongs|sunglasses) (was|has|does)\b/);
    }
  });
});
