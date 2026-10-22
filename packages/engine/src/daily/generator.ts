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

function hash32(seedText: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index++) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function rng(seed: string) {
  let rngState = hash32(seed) || 1;
  const next = () => {
    rngState = (rngState + 0x6d2b79f5) | 0;
    let mixed = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => Math.floor(next() * max);
  const shuffle = <T>(items: T[]): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = int(index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
    }
    return copy;
  };
  return {
    next,
    int,
    shuffle,
    pick: <T>(items: T[]): T => items[int(items.length)]!,
  };
}

// ------------------------------------------------------------------ permutations + bitsets

function permutations(size: number): number[][] {
  if (size === 1) return [[0]];
  const out: number[][] = [];
  for (const smaller of permutations(size - 1))
    for (let index = 0; index <= smaller.length; index++)
      out.push([...smaller.slice(0, index), size - 1, ...smaller.slice(index)]);
  return out;
}

type Assignment = { place: number[]; object: number[] }; // index = suspect
type Bits = Uint32Array;

const space = new Map<number, Assignment[]>();
function allAssignments(size: number): Assignment[] {
  let cached = space.get(size);
  if (!cached) {
    const perms = permutations(size);
    cached = [];
    for (const place of perms)
      for (const object of perms) cached.push({ place, object });
    space.set(size, cached);
  }
  return cached;
}

const words = (size: number) => Math.ceil(size / 32);
function bitsFrom(
  size: number,
  pred: (assignment: Assignment) => boolean,
): Bits {
  const all = allAssignments(size);
  const bitset = new Uint32Array(words(all.length));
  all.forEach((assignment, index) => {
    if (pred(assignment)) bitset[index >>> 5]! |= 1 << (index & 31);
  });
  return bitset;
}
function andAll(wordCount: number, sets: Bits[]): Bits {
  const size = words(allAssignments(wordCount).length);
  const out = bitsFrom(wordCount, () => true); // all real assignments (no padding bits)
  for (const bitset of sets)
    for (let wordIndex = 0; wordIndex < size; wordIndex++)
      out[wordIndex]! &= bitset[wordIndex]!;
  return out;
}
function popcount(bitset: Bits, limit: number): number {
  let count = 0;
  for (let wordIndex = 0; wordIndex < bitset.length; wordIndex++) {
    let bits = bitset[wordIndex]!;
    while (bits) {
      bits &= bits - 1;
      count++;
    }
  }
  return Math.min(count, limit);
}
function firstIndex(bitset: Bits): number {
  for (let wordIndex = 0; wordIndex < bitset.length; wordIndex++)
    if (bitset[wordIndex])
      return (
        wordIndex * 32 +
        (31 - Math.clz32(bitset[wordIndex]! & -bitset[wordIndex]!))
      ); // lowest set bit
  return -1;
}

// ------------------------------------------------------------------ clues

export type ClueKind =
  | 'isPlace'
  | 'notPlace'
  | 'isObject'
  | 'notObject'
  | 'placeHasObject'
  | 'placeLacksObject'
  | 'eitherPlace';
export type Clue =
  | { kind: 'isPlace' | 'notPlace'; suspect: number; place: number }
  | { kind: 'isObject' | 'notObject'; suspect: number; object: number }
  | {
      kind: 'placeHasObject' | 'placeLacksObject';
      place: number;
      object: number;
    }
  | { kind: 'eitherPlace'; suspect: number; place: number; otherPlace: number };

export function holds(clue: Clue, assignment: Assignment): boolean {
  switch (clue.kind) {
    case 'isPlace':
      return assignment.place[clue.suspect] === clue.place;
    case 'notPlace':
      return assignment.place[clue.suspect] !== clue.place;
    case 'isObject':
      return assignment.object[clue.suspect] === clue.object;
    case 'notObject':
      return assignment.object[clue.suspect] !== clue.object;
    case 'placeHasObject':
      return (
        assignment.object[assignment.place.indexOf(clue.place)] === clue.object
      );
    case 'placeLacksObject':
      return (
        assignment.object[assignment.place.indexOf(clue.place)] !== clue.object
      );
    case 'eitherPlace':
      return (
        assignment.place[clue.suspect] === clue.place ||
        assignment.place[clue.suspect] === clue.otherPlace
      );
  }
}

function truePool(size: number, sol: Assignment): Clue[] {
  const pool: Clue[] = [];
  const indices = [...Array(size).keys()];
  for (const suspect of indices)
    for (const place of indices) {
      pool.push({
        kind: sol.place[suspect] === place ? 'isPlace' : 'notPlace',
        suspect,
        place,
      });
      for (const otherPlace of indices)
        if (
          otherPlace > place &&
          (sol.place[suspect] === place || sol.place[suspect] === otherPlace)
        )
          pool.push({ kind: 'eitherPlace', suspect, place, otherPlace });
    }
  for (const suspect of indices)
    for (const object of indices)
      pool.push({
        kind: sol.object[suspect] === object ? 'isObject' : 'notObject',
        suspect,
        object,
      });
  for (const place of indices)
    for (const object of indices)
      pool.push({
        kind:
          sol.object[sol.place.indexOf(place)] === object
            ? 'placeHasObject'
            : 'placeLacksObject',
        place,
        object,
      });
  return pool;
}

// ------------------------------------------------------------------ difficulty

export type Difficulty = 'rookie' | 'detective' | 'inspector' | 'chief';
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  rookie: 'Rookie',
  detective: 'Detective',
  inspector: 'Inspector',
  chief: 'Chief',
};

/** Mon rookie · Tue–Thu detective · Fri inspector · Sat–Sun chief (UTC weekday). */
export function difficultyFor(dateISO: string): Difficulty {
  const day = new Date(`${dateISO}T00:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat
  if (day === 1) return 'rookie';
  if (day >= 2 && day <= 4) return 'detective';
  if (day === 5) return 'inspector';
  return 'chief';
}

const RULES: Record<
  Difficulty,
  {
    size: number;
    maxDirect: number;
    weights: Partial<Record<ClueKind, number>>;
  }
> = {
  rookie: {
    size: 3,
    maxDirect: 2,
    weights: {
      isPlace: 2,
      isObject: 2,
      notPlace: 3,
      notObject: 3,
      placeHasObject: 2,
      placeLacksObject: 1,
      eitherPlace: 1,
    },
  },
  detective: {
    size: 4,
    maxDirect: 1,
    weights: {
      isPlace: 1,
      isObject: 1,
      notPlace: 3,
      notObject: 3,
      placeHasObject: 2,
      placeLacksObject: 2,
      eitherPlace: 2,
    },
  },
  inspector: {
    size: 4,
    maxDirect: 0,
    weights: {
      notPlace: 3,
      notObject: 3,
      placeHasObject: 2,
      placeLacksObject: 3,
      eitherPlace: 3,
    },
  },
  chief: {
    size: 4,
    maxDirect: 0,
    weights: {
      notPlace: 2,
      notObject: 2,
      placeHasObject: 1,
      placeLacksObject: 4,
      eitherPlace: 4,
    },
  },
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
export type DailySolution = {
  place: number[];
  object: number[];
  culprit: number;
};

export const DAILY_EPOCH = '2026-10-01';
export function dailyNumber(dateISO: string): number {
  return (
    Math.round(
      (Date.parse(`${dateISO}T00:00:00Z`) -
        Date.parse(`${DAILY_EPOCH}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}

function weightedOrder(
  pool: Clue[],
  weights: Partial<Record<ClueKind, number>>,
  random: ReturnType<typeof rng>,
): Clue[] {
  const keyed = pool
    .filter((clue) => (weights[clue.kind] ?? 0) > 0)
    .map((clue) => ({
      clue,
      weight: Math.pow(random.next(), 1 / (weights[clue.kind] ?? 1)),
    })); // weighted shuffle
  return keyed
    .sort((first, second) => second.weight - first.weight)
    .map((keyedClue) => keyedClue.clue);
}

/** Core generator, independent of text. Returns clues that pin down exactly one solution. */
export function generateLogic(seed: string, difficulty: Difficulty) {
  const random = rng(seed);
  const { size, maxDirect, weights } = RULES[difficulty];
  const perm = () => random.shuffle([...Array(size).keys()]);
  const sol: Assignment = { place: perm(), object: perm() };
  const bitsOf = (clue: Clue) =>
    bitsFrom(size, (assignment) => holds(clue, assignment));

  const chosen: Clue[] = [];
  const chosenBits: Bits[] = [];
  let direct = 0;
  for (const clue of weightedOrder(truePool(size, sol), weights, random)) {
    if (DIRECT.includes(clue.kind) && direct >= maxDirect) continue;
    const bitset = bitsOf(clue);
    const before = popcount(andAll(size, chosenBits), Infinity);
    const after = popcount(andAll(size, [...chosenBits, bitset]), Infinity);
    if (after === before) continue; // adds nothing
    chosen.push(clue);
    chosenBits.push(bitset);
    if (DIRECT.includes(clue.kind)) direct++;
    if (after === 1) break;
  }
  // Prune clues that aren't needed (try removing each, latest first).
  for (let index = chosen.length - 1; index >= 0; index--) {
    const rest = chosenBits.filter((_, otherIndex) => otherIndex !== index);
    if (popcount(andAll(size, rest), 2) === 1) {
      chosen.splice(index, 1);
      chosenBits.splice(index, 1);
    }
  }
  const remaining = andAll(size, chosenBits);
  const count = popcount(remaining, 2);
  const found = allAssignments(size)[firstIndex(remaining)];
  return {
    size,
    sol,
    clues: random.shuffle(chosen),
    unique: count === 1 && found !== undefined && sameAssignment(found, sol),
  };
}

const sameAssignment = (
  firstAssignment: Assignment,
  secondAssignment: Assignment,
) =>
  firstAssignment.place.every(
    (value, index) => value === secondAssignment.place[index],
  ) &&
  firstAssignment.object.every(
    (value, index) => value === secondAssignment.object[index],
  );

/** Counts solutions of a clue set by brute force (used by tests as an independent check). */
export function countSolutions(size: number, clues: Clue[]): number {
  return allAssignments(size).filter((assignment) =>
    clues.every((clue) => holds(clue, assignment)),
  ).length;
}

// ------------------------------------------------------------------ text

const pickTemplate = (random: ReturnType<typeof rng>, templates: string[]) =>
  random.pick(templates);

function clueText(
  clue: Clue,
  names: { suspects: string[]; places: string[]; objects: string[] },
  random: ReturnType<typeof rng>,
): string {
  const suspectName = (index: number) => names.suspects[index]!;
  const placeName = (index: number) => names.places[index]!;
  const objectName = (index: number) => names.objects[index]!;
  const was = (index: number) => (isPlural(objectName(index)) ? 'were' : 'was');
  switch (clue.kind) {
    case 'isPlace':
      return pickTemplate(random, [
        `RECEIPT · ${suspectName(clue.suspect)} paid by card at ${placeName(clue.place)}.`,
        `CCTV · ${suspectName(clue.suspect)} is clearly visible at ${placeName(clue.place)}.`,
      ]);
    case 'notPlace':
      return pickTemplate(random, [
        `WITNESS · "${suspectName(clue.suspect)}? Never came near ${placeName(clue.place)} tonight."`,
        `PHONE DATA · ${suspectName(clue.suspect)}'s phone never connected near ${placeName(clue.place)}.`,
      ]);
    case 'isObject':
      return pickTemplate(random, [
        `PHOTO · ${suspectName(clue.suspect)} is holding the ${objectName(clue.object)}.`,
        `CHECKROOM TICKET · The ${objectName(clue.object)} ${was(clue.object)} signed out to ${suspectName(clue.suspect)}.`,
      ]);
    case 'notObject':
      return pickTemplate(random, [
        `FINGERPRINTS · ${suspectName(clue.suspect)}'s prints are not on the ${objectName(clue.object)}.`,
        `BAG SEARCH · ${suspectName(clue.suspect)} did not have the ${objectName(clue.object)}.`,
      ]);
    case 'placeHasObject':
      return pickTemplate(random, [
        `PHOTO · The ${objectName(clue.object)} ${was(clue.object)} photographed at ${placeName(clue.place)}.`,
        `STAFF LOG · Whoever was at ${placeName(clue.place)} had the ${objectName(clue.object)}.`,
      ]);
    case 'placeLacksObject':
      return pickTemplate(random, [
        `STAFF LOG · Nobody at ${placeName(clue.place)} had the ${objectName(clue.object)}.`,
        `CCTV · The ${objectName(clue.object)} ${isPlural(objectName(clue.object)) ? 'do' : 'does'} not appear anywhere in the footage from ${placeName(clue.place)}.`,
      ]);
    case 'eitherPlace':
      return `LOCATION PING · ${suspectName(clue.suspect)} was either at ${placeName(clue.place)} or at ${placeName(clue.otherPlace)}.`;
  }
}

/** The puzzle for a date (YYYY-MM-DD, UTC). Deterministic: everyone in the world gets the same one. */
export function generateDaily(
  dateISO: string,
  salt = 'unsealed',
): { puzzle: DailyPuzzle; solution: DailySolution } {
  const difficulty = difficultyFor(dateISO);
  for (let attempt = 0; attempt < 50; attempt++) {
    const seed = `${salt}:${dateISO}:${attempt}`;
    const logic = generateLogic(seed, difficulty);
    if (!logic.unique) continue;
    const random = rng(`${seed}:text`);
    const pack: CityPack = random.pick(CITY_PACKS);
    const suspects = random.shuffle(pack.names).slice(0, logic.size);
    const places = random.shuffle(pack.places).slice(0, logic.size);
    const objects = random.shuffle(pack.objects).slice(0, logic.size);
    const target = random.int(logic.size);
    const culprit = logic.sol.object.indexOf(target);
    const names = { suspects, places, objects };
    const puzzle: DailyPuzzle = {
      id: dateISO,
      number: dailyNumber(dateISO),
      difficulty,
      city: pack.city,
      country: pack.country,
      title: `Who took the ${objects[target]}?`,
      intro: `${pack.city}, tonight. ${logic.size} friends, ${logic.size} places, ${logic.size} things. Each friend was in exactly one place and had exactly one thing. The ${objects[target]} ${isPlural(objects[target]!) ? 'have' : 'has'} gone missing. Every clue below is true.`,
      suspects,
      places,
      objects,
      target,
      clues: logic.clues.map((clue) => ({
        kind: clue.kind,
        text: clueText(clue, names, random),
      })),
    };
    return {
      puzzle,
      solution: { place: logic.sol.place, object: logic.sol.object, culprit },
    };
  }
  throw new Error(`Could not generate a unique daily for ${dateISO}`);
}

/** Correct when the player names the culprit AND where they were. */
export function checkDailyAnswer(
  sol: DailySolution,
  answer: { suspect: number; place: number },
): boolean {
  return (
    answer.suspect === sol.culprit && answer.place === sol.place[sol.culprit]
  );
}
