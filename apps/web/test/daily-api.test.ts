import { describe, expect, it } from 'vitest';
import { generateDaily } from '@unsealed/engine';
import { dailyView, handleDaily, isOpenDate } from '@/server/daily';
import { streakFrom } from '@/components/daily/DailyBrief';

const NOW = new Date('2026-10-23T09:00:00Z');

describe('Daily Brief API', () => {
  it('opens today and the previous 6 days only', () => {
    expect(isOpenDate('2026-10-23', NOW)).toBe(true);
    expect(isOpenDate('2026-10-17', NOW)).toBe(true);
    expect(isOpenDate('2026-10-16', NOW)).toBe(false);
    expect(isOpenDate('2026-10-24', NOW)).toBe(false); // no peeking at tomorrow
    expect(isOpenDate('2026-09-30', new Date('2026-10-02T00:00:00Z'))).toBe(false); // before launch
    expect(isOpenDate('garbage', NOW)).toBe(false);
    expect(dailyView('2026-10-23', NOW).archive).toHaveLength(7);
  });

  it('never puts the answer in the page data', () => {
    const v = dailyView('2026-10-23', NOW);
    const { solution } = generateDaily('2026-10-23');
    expect(JSON.stringify(v)).not.toMatch(/culprit|"solution"/);
    expect(v).not.toHaveProperty('place');
    expect(solution).toBeTruthy();
  });

  it('grades answers on the server', () => {
    const { solution } = generateDaily('2026-10-23');
    const right = handleDaily({ type: 'answer', date: '2026-10-23', suspect: solution.culprit, place: solution.place[solution.culprit] }, NOW);
    expect(right.json).toMatchObject({ ok: true, correct: true });
    expect(right.json.ok && right.json.solution?.rows).toHaveLength(solution.place.length);
    const wrong = handleDaily({ type: 'answer', date: '2026-10-23', suspect: (solution.culprit + 1) % solution.place.length, place: 0 }, NOW);
    expect(wrong.json).toMatchObject({ ok: true, correct: false });
    expect(wrong.json.ok && wrong.json.solution).toBeUndefined();
  });

  it('rejects closed dates and bad input', () => {
    expect(handleDaily({ type: 'answer', date: '2026-10-24', suspect: 0, place: 0 }, NOW).status).toBe(404);
    expect(handleDaily({ type: 'nope' }, NOW).status).toBe(400);
  });

  it('reveals the solution for players who used their tries', () => {
    const r = handleDaily({ type: 'reveal', date: '2026-10-23' }, NOW);
    expect(r.json.ok && r.json.solution?.culprit).toBeTypeOf('number');
  });

  it('counts streaks of consecutive solved days', () => {
    const h = {
      '2026-10-20': { solved: true, wrong: 0, seconds: 60 },
      '2026-10-21': { solved: true, wrong: 1, seconds: 60 },
      '2026-10-22': { solved: true, wrong: 0, seconds: 60 },
    };
    expect(streakFrom(h, '2026-10-23')).toBe(3); // today not played yet: streak still alive
    expect(streakFrom({ ...h, '2026-10-23': { solved: true, wrong: 0, seconds: 9 } }, '2026-10-23')).toBe(4);
    expect(streakFrom({ ...h, '2026-10-21': { solved: false, wrong: 3, seconds: 9 } }, '2026-10-23')).toBe(1);
    expect(streakFrom({}, '2026-10-23')).toBe(0);
  });
});
