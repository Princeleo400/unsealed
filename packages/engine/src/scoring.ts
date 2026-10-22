import { HINT_COST } from './actions';
import type { CaseSolution } from './schema';
import type { SessionState } from './state';

export const SCORE = {
  solved: 600,
  accusationBonus: [200, 100, 0] as const,
  parBonus: 200,
  perHourOverPar: 20,
  perBreakthrough: 5,
  max: 1000,
} as const;

export type Badge = 'sharp' | 'swift' | 'unassisted' | 'weaver';

export type ScoreBreakdown = {
  total: number;
  solved: number;
  accusation: number;
  time: number;
  hints: number;
  breakthroughs: number;
  badges: Badge[];
};

export function computeScore(
  state: SessionState,
  sol: CaseSolution,
  parHours: number,
): ScoreBreakdown {
  const breakthroughs = state.breakthroughs.length * SCORE.perBreakthrough;
  const allFound =
    sol.breakthroughs.length > 0 &&
    sol.breakthroughs.every((breakthrough) =>
      state.breakthroughs.includes(breakthrough.id),
    );

  if (state.status !== 'solved') {
    const total = Math.min(SCORE.max, breakthroughs);
    return {
      total,
      solved: 0,
      accusation: 0,
      time: 0,
      hints: 0,
      breakthroughs,
      badges: [],
    };
  }

  const solvedOn = state.accusations.length; // 1-based index of the winning accusation
  const accusation = SCORE.accusationBonus[solvedOn - 1] ?? 0;
  const parMinutes = parHours * 60;
  const overHours = Math.max(
    0,
    Math.ceil((state.clockMinutes - parMinutes) / 60),
  );
  const time = Math.max(0, SCORE.parBonus - overHours * SCORE.perHourOverPar);
  const hints = -(
    state.hints.nudge * HINT_COST.nudge +
    state.hints.pointer * HINT_COST.pointer +
    state.hints.reveal * HINT_COST.reveal
  );
  const raw = SCORE.solved + accusation + time + hints + breakthroughs;
  const total = Math.max(0, Math.min(SCORE.max, raw));

  const badges: Badge[] = [];
  if (solvedOn === 1) badges.push('sharp');
  if (state.clockMinutes <= parMinutes) badges.push('swift');
  if (state.hints.nudge + state.hints.pointer + state.hints.reveal === 0)
    badges.push('unassisted');
  if (allFound) badges.push('weaver');

  return {
    total,
    solved: SCORE.solved,
    accusation,
    time,
    hints,
    breakthroughs,
    badges,
  };
}

export const RANKS = [
  { name: 'Rookie', xp: 0 },
  { name: 'Constable', xp: 500 },
  { name: 'Sergeant', xp: 1500 },
  { name: 'Inspector', xp: 4000 },
  { name: 'Chief Inspector', xp: 9000 },
  { name: 'Superintendent', xp: 18000 },
  { name: 'Legend', xp: 35000 },
] as const;

export function rankFor(xp: number): (typeof RANKS)[number]['name'] {
  let current: (typeof RANKS)[number]['name'] = RANKS[0].name;
  for (const rank of RANKS) if (xp >= rank.xp) current = rank.name;
  return current;
}
