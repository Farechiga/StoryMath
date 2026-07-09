/**
 * Deterministic seeded randomness for the ornament layer.
 *
 * The whole point of the ornament system is that the same page always draws the
 * same figure: a given (storyId, screenId) pair must hash to one fixed stream of
 * numbers so the atmosphere is stable across renders and reloads. We therefore
 * never touch Math.random — the seed string is hashed (xmur3) into a 32-bit
 * state and advanced by a small, fast PRNG (mulberry32).
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** A uniformly chosen element. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
  /** A signed jitter in [-amount, +amount). */
  jitter(amount: number): number;
}

/** xmur3 string hash → a function yielding successive 32-bit seed values. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 — a compact, well-distributed 32-bit PRNG. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a deterministic Rng from any seed string. */
export function makeRng(seed: string): Rng {
  const nextSeed = xmur3(seed);
  const next = mulberry32(nextSeed());
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (p) => next() < p,
    jitter: (amount) => (next() * 2 - 1) * amount,
  };
}
