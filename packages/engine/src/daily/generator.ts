/**
 * Daily Brief: a generated logic mystery (docs/02-GDD.md §6).
 *
 * Each of N suspects was at exactly one place and held exactly one object. A solution is two
 * permutations: place[suspect] and object[suspect]. Clues are true statements about the hidden
 * solution; the generator adds clues until exactly ONE solution remains, then removes any clue
 * that isn't needed. Candidate solutions are tracked as bitsets so this stays fast.
 */
import { CITY_PACKS, isPlural, type CityPack } from './cities';

// ------------------------------------------------------------------ seeded randomness

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string) {
  let a = hash32(seed) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number) => Math.floor(next() * n);
  const shuffle = <T>(xs: T[]): T[] => {
    const a2 = [...xs];
    for (let i = a2.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [a2[i], a2[j]] = [a2[j]!, a2[i]!];
    }
    return a2;
  };
  return { next, int, shuffle, pick: <T>(xs: T[]): T => xs[int(xs.length)]! };
}

// ------------------------------------------------------------------ permutations + bitsets

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

type Assignment = { place: number[]; object: number[] }; // index = suspect
type Bits = Uint32Array;

const space = new Map<number, Assignment[]>();
function allAssignments(n: number): Assignment[] {
  let s = space.get(n);
  if (!s) {
    const perms = permutations(n);
    s = [];
    for (const place of perms) for (const object of perms) s.push({ place, object });
    space.set(n, s);
  }
  return s;
}

const words = (size: number) => Math.ceil(size / 32);
function bitsFrom(n: number, pred: (a: Assignment) => boolean): Bits {
  const all = allAssignments(n);
  const b = new Uint32Array(words(all.length));
  all.forEach((a, i) => {
    if (pred(a)) b[i >>> 5]! |= 1 << (i & 31);
  });
  return b;
}
function andAll(n: number, sets: Bits[]): Bits {
  const size = words(allAssignments(n).length);
  const out = bitsFrom(n, () => true); // all real assignments (no padding bits)
  for (const s of sets) for (let w = 0; w < size; w++) out[w]! &= s[w]!;
  return out;
}
function popcount(b: Bits, limit: number): number {
  let c = 0;
  for (let w = 0; w < b.length; w++) {
    let x = b[w]!;
    while (x) {
      x &= x - 1;
      c++;
    }
  }
  return Math.min(c, limit);
}
function firstIndex(b: Bits): number {
  for (let w = 0; w < b.length; w++) if (b[w]) return w * 32 + (31 - Math.clz32(b[w]! & -b[w]!)); // lowest set bit
  return -1;
}

// ------------------------------------------------------------------ clues

export type ClueKind = 'isPlace' | 'notPlace' | 'isObject' | 'notObject' | 'placeHasObject' | 'placeLacksObject' | 'eitherPlace';
export type Clue =
  | { kind: 'isPlace' | 'notPlace'; s: number; p: number }
  | { kind: 'isObject' | 'notObject'; s: number; o: number }
  | { kind: 'placeHasObject' | 'placeLacksObject'; p: number; o: number }
  | { kind: 'eitherPlace'; s: number; p: number; q: number };

export function holds(c: Clue, a: Assignment): boolean {
  switch (c.kind) {
    case 'isPlace': return a.place[c.s] === c.p;
    case 'notPlace': return a.place[c.s] !== c.p;
    case 'isObject': return a.object[c.s] === c.o;
    case 'notObject': return a.object[c.s] !== c.o;
    case 'placeHasObject': return a.object[a.place.indexOf(c.p)] === c.o;
    case 'placeLacksObject': return a.object[a.place.indexOf(c.p)] !== c.o;
    case 'eitherPlace': return a.place[c.s] === c.p || a.place[c.s] === c.q;
  }
}

function truePool(n: number, sol: Assignment): Clue[] {
  const pool: Clue[] = [];
  const r = [...Array(n).keys()];
  for (const s of r)
    for (const p of r) {
      pool.push({ kind: sol.place[s] === p ? 'isPlace' : 'notPlace', s, p });
      for (const q of r) if (q > p && (sol.place[s] === p || sol.place[s] === q)) pool.push({ kind: 'eitherPlace', s, p, q });
    }
  for (const s of r) for (const o of r) pool.push({ kind: sol.object[s] === o ? 'isObject' : 'notObject', s, o });
  for (const p of r)
    for (const o of r) pool.push({ kind: sol.object[sol.place.indexOf(p)] === o ? 'placeHasObject' : 'placeLacksObject', p, o });
  return pool;
}

// ------------------------------------------------------------------ difficulty

export type Difficulty = 'rookie' | 'detective' | 'inspector' | 'chief';
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { rookie: 'Rookie', detective: 'Detective', inspector: 'Inspector', chief: 'Chief' };

/** Mon rookie · Tue–Thu detective · Fri inspector · Sat–Sun chief (UTC weekday). */
export function difficultyFor(dateISO: string): Difficulty {
  const day = new Date(`${dateISO}T00:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat
  if (day === 1) return 'rookie';
  if (day >= 2 && day <= 4) return 'detective';
  if (day === 5) return 'inspector';
  return 'chief';
}

const RULES: Record<Difficulty, { n: number; maxDirect: number; weights: Partial<Record<ClueKind, number>> }> = {
  rookie: { n: 3, maxDirect: 2, weights: { isPlace: 2, isObject: 2, notPlace: 3, notObject: 3, placeHasObject: 2, placeLacksObject: 1, eitherPlace: 1 } },
  detective: { n: 4, maxDirect: 1, weights: { isPlace: 1, isObject: 1, notPlace: 3, notObject: 3, placeHasObject: 2, placeLacksObject: 2, eitherPlace: 2 } },
  inspector: { n: 4, maxDirect: 0, weights: { notPlace: 3, notObject: 3, placeHasObject: 2, placeLacksObject: 3, eitherPlace: 3 } },
  chief: { n: 4, maxDirect: 0, weights: { notPlace: 2, notObject: 2, placeHasObject: 1, placeLacksObject: 4, eitherPlace: 4 } },
};
const DIRECT: ClueKind[] = ['isPlace', 'isObject'];

// ------------------------------------------------------------------ puzzle

export type DailyPuzzle = {
  id: string; // date
  number: number;
  difficulty: Difficulty;
  city: string;
  country: string;
  title: string;
  intro: string;
  suspects: string[];
  places: string[];
  objects: string[];
  target: number; // object index the question is about
  clues: { kind: ClueKind; text: string }[];
};
export type DailySolution = { place: number[]; object: number[]; culprit: number };

export const DAILY_EPOCH = '2026-10-01';
export function dailyNumber(dateISO: string): number {
  return Math.round((Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${DAILY_EPOCH}T00:00:00Z`)) / 86400000) + 1;
}

function weightedOrder(pool: Clue[], weights: Partial<Record<ClueKind, number>>, r: ReturnType<typeof rng>): Clue[] {
  const keyed = pool
    .filter((c) => (weights[c.kind] ?? 0) > 0)
    .map((c) => ({ c, k: Math.pow(r.next(), 1 / (weights[c.kind] ?? 1)) })); // weighted shuffle
  return keyed.sort((a, b) => b.k - a.k).map((x) => x.c);
}

/** Core generator, independent of text. Returns clues that pin down exactly one solution. */
export function generateLogic(seed: string, difficulty: Difficulty) {
  const r = rng(seed);
  const { n, maxDirect, weights } = RULES[difficulty];
  const perm = () => r.shuffle([...Array(n).keys()]);
  const sol: Assignment = { place: perm(), object: perm() };
  const bitsOf = (c: Clue) => bitsFrom(n, (a) => holds(c, a));

  const chosen: Clue[] = [];
  const chosenBits: Bits[] = [];
  let direct = 0;
  for (const c of weightedOrder(truePool(n, sol), weights, r)) {
    if (DIRECT.includes(c.kind) && direct >= maxDirect) continue;
    const b = bitsOf(c);
    const before = popcount(andAll(n, chosenBits), Infinity);
    const after = popcount(andAll(n, [...chosenBits, b]), Infinity);
    if (after === before) continue; // adds nothing
    chosen.push(c);
    chosenBits.push(b);
    if (DIRECT.includes(c.kind)) direct++;
    if (after === 1) break;
  }
  // Prune clues that aren't needed (try removing each, latest first).
  for (let i = chosen.length - 1; i >= 0; i--) {
    const rest = chosenBits.filter((_, j) => j !== i);
    if (popcount(andAll(n, rest), 2) === 1) {
      chosen.splice(i, 1);
      chosenBits.splice(i, 1);
    }
  }
  const remaining = andAll(n, chosenBits);
  const count = popcount(remaining, 2);
  const found = allAssignments(n)[firstIndex(remaining)];
  return { n, sol, clues: r.shuffle(chosen), unique: count === 1 && found !== undefined && sameAssignment(found, sol) };
}

const sameAssignment = (a: Assignment, b: Assignment) => a.place.every((x, i) => x === b.place[i]) && a.object.every((x, i) => x === b.object[i]);

/** Counts solutions of a clue set by brute force (used by tests as an independent check). */
export function countSolutions(n: number, clues: Clue[]): number {
  return allAssignments(n).filter((a) => clues.every((c) => holds(c, a))).length;
}

// ------------------------------------------------------------------ text

const pickT = (r: ReturnType<typeof rng>, ts: string[]) => r.pick(ts);

function clueText(c: Clue, pz: { suspects: string[]; places: string[]; objects: string[] }, r: ReturnType<typeof rng>): string {
  const S = (i: number) => pz.suspects[i]!;
  const P = (i: number) => pz.places[i]!;
  const O = (i: number) => pz.objects[i]!;
  const was = (i: number) => (isPlural(O(i)) ? 'were' : 'was');
  switch (c.kind) {
    case 'isPlace':
      return pickT(r, [`RECEIPT · ${S(c.s)} paid by card at ${P(c.p)}.`, `CCTV · ${S(c.s)} is clearly visible at ${P(c.p)}.`]);
    case 'notPlace':
      return pickT(r, [`WITNESS · "${S(c.s)}? Never came near ${P(c.p)} tonight."`, `PHONE DATA · ${S(c.s)}'s phone never connected near ${P(c.p)}.`]);
    case 'isObject':
      return pickT(r, [`PHOTO · ${S(c.s)} is holding the ${O(c.o)}.`, `CHECKROOM TICKET · The ${O(c.o)} ${was(c.o)} signed out to ${S(c.s)}.`]);
    case 'notObject':
      return pickT(r, [`FINGERPRINTS · ${S(c.s)}'s prints are not on the ${O(c.o)}.`, `BAG SEARCH · ${S(c.s)} did not have the ${O(c.o)}.`]);
    case 'placeHasObject':
      return pickT(r, [`PHOTO · The ${O(c.o)} ${was(c.o)} photographed at ${P(c.p)}.`, `STAFF LOG · Whoever was at ${P(c.p)} had the ${O(c.o)}.`]);
    case 'placeLacksObject':
      return pickT(r, [`STAFF LOG · Nobody at ${P(c.p)} had the ${O(c.o)}.`, `CCTV · The ${O(c.o)} ${isPlural(O(c.o)) ? 'do' : 'does'} not appear anywhere in the footage from ${P(c.p)}.`]);
    case 'eitherPlace':
      return `LOCATION PING · ${S(c.s)} was either at ${P(c.p)} or at ${P(c.q)}.`;
  }
}

/** The puzzle for a date (YYYY-MM-DD, UTC). Deterministic: everyone in the world gets the same one. */
export function generateDaily(dateISO: string, salt = 'unsealed'): { puzzle: DailyPuzzle; solution: DailySolution } {
  const difficulty = difficultyFor(dateISO);
  for (let attempt = 0; attempt < 50; attempt++) {
    const seed = `${salt}:${dateISO}:${attempt}`;
    const logic = generateLogic(seed, difficulty);
    if (!logic.unique) continue;
    const r = rng(`${seed}:text`);
    const pack: CityPack = r.pick(CITY_PACKS);
    const suspects = r.shuffle(pack.names).slice(0, logic.n);
    const places = r.shuffle(pack.places).slice(0, logic.n);
    const objects = r.shuffle(pack.objects).slice(0, logic.n);
    const target = r.int(logic.n);
    const culprit = logic.sol.object.indexOf(target);
    const names = { suspects, places, objects };
    const puzzle: DailyPuzzle = {
      id: dateISO,
      number: dailyNumber(dateISO),
      difficulty,
      city: pack.city,
      country: pack.country,
      title: `Who took the ${objects[target]}?`,
      intro: `${pack.city}, tonight. ${logic.n} friends, ${logic.n} places, ${logic.n} things. Each friend was in exactly one place and had exactly one thing. The ${objects[target]} ${isPlural(objects[target]!) ? 'have' : 'has'} gone missing. Every clue below is true.`,
      suspects,
      places,
      objects,
      target,
      clues: logic.clues.map((c) => ({ kind: c.kind, text: clueText(c, names, r) })),
    };
    return { puzzle, solution: { place: logic.sol.place, object: logic.sol.object, culprit } };
  }
  throw new Error(`Could not generate a unique daily for ${dateISO}`);
}

/** Correct when the player names the culprit AND where they were. */
export function checkDailyAnswer(sol: DailySolution, answer: { suspect: number; place: number }): boolean {
  return answer.suspect === sol.culprit && answer.place === sol.place[sol.culprit];
}
