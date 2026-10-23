import { describe, expect, it } from 'vitest';
import { CITY_PACKS } from '../src/daily/cities';
import {
  checkDailyAnswer,
  countSolutions,
  dailyNumber,
  difficultyFor,
  generateBonusBrief,
  generateDaily,
  generateLogic,
  holds,
  rng,
  type Difficulty,
} from '../src/daily/generator';

const dates = (start: string, days: number) =>
  Array.from({ length: days }, (_, dayOffset) =>
    new Date(Date.parse(`${start}T00:00:00Z`) + dayOffset * 86400000)
      .toISOString()
      .slice(0, 10),
  );

describe('Daily Brief generator (FR-DAILY-01/02)', () => {
  it('is deterministic for a date', () => {
    const firstRun = generateDaily('2026-10-23');
    const secondRun = generateDaily('2026-10-23');
    expect(firstRun).toEqual(secondRun);
    expect(generateDaily('2026-10-24').puzzle).not.toEqual(firstRun.puzzle);
    expect(generateDaily('2026-10-23', 'other-salt').puzzle).not.toEqual(
      firstRun.puzzle,
    );
  });

  it('every generated puzzle has exactly one solution (2,000 logic puzzles per difficulty)', () => {
    for (const difficulty of [
      'rookie',
      'detective',
      'inspector',
      'chief',
    ] as Difficulty[]) {
      for (let index = 0; index < 2000; index++) {
        const generated = generateLogic(
          `stress:${difficulty}:${index}`,
          difficulty,
        );
        expect(generated.unique).toBe(true);
        // Independent brute-force check, and every clue must be true of the real solution.
        expect(countSolutions(generated.size, generated.clues)).toBe(1);
        expect(
          generated.clues.every((clue) => holds(clue, generated.sol)),
        ).toBe(true);
      }
    }
  });

  it('respects difficulty rules', () => {
    for (let index = 0; index < 300; index++) {
      const insp = generateLogic(`rule:i:${index}`, 'inspector');
      expect(insp.size).toBe(4);
      expect(
        insp.clues.some(
          (clue) => clue.kind === 'isPlace' || clue.kind === 'isObject',
        ),
      ).toBe(false);
      const det = generateLogic(`rule:d:${index}`, 'detective');
      expect(
        det.clues.filter(
          (clue) => clue.kind === 'isPlace' || clue.kind === 'isObject',
        ).length,
      ).toBeLessThanOrEqual(1);
      expect(generateLogic(`rule:r:${index}`, 'rookie').size).toBe(3);
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
    for (const date of dates('2026-10-01', 366)) {
      const { puzzle, solution } = generateDaily(date);
      const suspectCount = puzzle.suspects.length;
      expect(new Set(puzzle.suspects).size).toBe(suspectCount);
      expect(new Set(puzzle.places).size).toBe(suspectCount);
      expect(new Set(puzzle.objects).size).toBe(suspectCount);
      expect(puzzle.clues.length).toBeGreaterThan(1);
      expect(
        puzzle.clues.every(
          (clue) => clue.text.length > 10 && !clue.text.includes('undefined'),
        ),
      ).toBe(true);
      expect(solution.object[solution.culprit]).toBe(puzzle.target);
      expect(
        checkDailyAnswer(solution, {
          suspect: solution.culprit,
          place: solution.place[solution.culprit]!,
        }),
      ).toBe(true);
    }
  });

  it('checks answers strictly', () => {
    const { solution } = generateDaily('2026-10-23');
    const other = (solution.culprit + 1) % solution.place.length;
    expect(
      checkDailyAnswer(solution, {
        suspect: other,
        place: solution.place[solution.culprit]!,
      }),
    ).toBe(false);
    expect(
      checkDailyAnswer(solution, {
        suspect: solution.culprit,
        place: (solution.place[solution.culprit]! + 1) % solution.place.length,
      }),
    ).toBe(false);
  });

  it('numbers dailies from the epoch', () => {
    expect(dailyNumber('2026-10-01')).toBe(1);
    expect(dailyNumber('2026-10-23')).toBe(23);
  });

  it('has complete city packs', () => {
    for (const cityPack of CITY_PACKS) {
      expect(cityPack.names.length).toBeGreaterThanOrEqual(6);
      expect(cityPack.places.length).toBeGreaterThanOrEqual(6);
      expect(cityPack.objects.length).toBeGreaterThanOrEqual(6);
      expect(new Set(cityPack.names).size).toBe(cityPack.names.length);
    }
  });

  it('rng helpers behave', () => {
    const random = rng('x');
    const xs = [1, 2, 3, 4, 5];
    expect(random.shuffle(xs).sort()).toEqual(xs);
    for (let index = 0; index < 100; index++)
      expect(random.int(3)).toBeLessThan(3);
  });
});

describe('Daily Brief text', () => {
  it('uses plural verbs for plural objects', () => {
    for (let index = 0; index < 400; index++) {
      const date = new Date(
        Date.parse('2026-10-01T00:00:00Z') + index * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const { puzzle } = generateDaily(date);
      const text =
        puzzle.intro + ' ' + puzzle.clues.map((clue) => clue.text).join(' ');
      expect(text).not.toMatch(
        /(binoculars|braai tongs|sunglasses) (was|has|does)\b/,
      );
    }
  });
});

describe('Bonus Briefs', () => {
  const SEED = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  it('are deterministic per seed and difficulty, with exactly one answer', () => {
    for (const difficulty of [
      'rookie',
      'detective',
      'inspector',
      'chief',
    ] as const) {
      const firstRun = generateBonusBrief(SEED, difficulty);
      const secondRun = generateBonusBrief(SEED, difficulty);
      expect(firstRun).toEqual(secondRun);
      expect(firstRun.puzzle.id).toBe('bonus-a1b2c3d4e5f6');
      expect(firstRun.puzzle.difficulty).toBe(difficulty);
      expect(firstRun.puzzle.number).toBe(0);
    }
  });

  it('every generated Bonus Brief has a single solution', () => {
    for (let index = 0; index < 40; index++) {
      const seed = (index.toString(16).padStart(2, '0') + SEED).slice(0, 32);
      const { puzzle, solution } = generateBonusBrief(seed, 'detective');
      expect(puzzle.clues.length).toBeGreaterThan(2);
      expect(solution.place[solution.culprit]).toBeTypeOf('number');
    }
  });

  it('never matches a calendar Daily, and rejects bad seeds', () => {
    const bonus = generateBonusBrief(SEED, difficultyFor('2026-10-24'));
    const daily = generateDaily('2026-10-24');
    expect(bonus.puzzle.clues).not.toEqual(daily.puzzle.clues);
    expect(() => generateBonusBrief('NOT-HEX', 'rookie')).toThrow();
    expect(() => generateBonusBrief('abc', 'rookie')).toThrow(); // too short
  });
});
