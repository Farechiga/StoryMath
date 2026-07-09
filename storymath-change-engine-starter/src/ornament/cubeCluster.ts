/**
 * The seeded cube-cluster generator — a floating, lattice-aligned iso drift, now
 * with strict accept/reject scoring so every result stays in the target family.
 *
 * Discipline first: every cube lives on ONE shared integer isometric lattice
 * (integer corner gx/gy/gz, integer edge in modules). Because all corners and
 * sizes are integers on the same grid, any two cubes' faces are either coplanar
 * (flush) or an exact whole-module apart — near-misses are impossible. Within a
 * cluster, cubes attach flush to a face (flush / centerline alignment).
 *
 * Composition = a TALL archipelago in a vertical column:
 *   • one DOMINANT hero-led cluster (the largest, most cubes),
 *   • 1–2 smaller ISLAND clusters — one biased ABOVE, one BELOW — whose scale
 *     AND cube-count differ from the dominant (and each other) by ≥33%,
 *   • 3–4 stray SATELLITE cubes floating in a narrow tall field, extending the
 *     column and adding asymmetry.
 *
 * Enforcement (see ACCEPT + scoreComposition): candidates are generated with
 * derived seeds and REJECTED unless they are tall (height ≥ 1.7× width), not
 * compressed, not too wide, have the right cluster/stray structure, and have no
 * single oversized blob. The first passing candidate wins; if none pass in
 * ACCEPT.attempts, the best-scoring candidate is used. Deterministic per seed.
 *
 * ── TUNING ─────────────────────────────────────────────────────────────────
 *   sizeBins/opacity/tone   frosted #6886EC treatment (unchanged)
 *   spread                  per-seed fan-out multiplier
 *   dominant/islandCount/islandRatio/islandOffset   cluster structure
 *   strays/strayField       stray count + narrow-tall scatter field
 *   gapFactor/*GapMul       air / whitespace between things
 *   ACCEPT                  the hard acceptance rules (aspect, scale, structure)
 * ─────────────────────────────────────────────────────────────────────────── */

import { ISO_COS, project } from "./isometric";
import { makeRng, type Rng } from "./rng";

export const MAX_CUBES = 17;

export type SizeTier = "small" | "medium" | "large" | "hero";

/** Tier order low→high; used to prove the ≥33% jump between adjacent bins. */
export const SIZE_ORDER: readonly SizeTier[] = ["small", "medium", "large", "hero"];

export const TUNING = {
  maxCubes: MAX_CUBES,
  /** Discrete cube edges in lattice modules. Jumps: +50%, +33%, +50%. */
  sizeBins: { small: 2, medium: 3, large: 4, hero: 6 } as Record<SizeTier, number>,
  /** Frosted-glass translucency band. */
  opacity: { min: 0.3, max: 0.7 },
  /** Tone lightness band (0 = darkest cube, 1 = lightest). */
  tone: { min: 0.12, max: 0.96 },
  /** Per-seed fan-out multiplier. */
  spread: [0.85, 1.4] as [number, number],
  /** Dominant-cluster cube count, per density. */
  dominant: { low: [4, 5] as [number, number], medium: [5, 6] as [number, number] },
  /** Number of island clusters (per density). */
  islandCount: { low: [1, 1] as [number, number], medium: [1, 2] as [number, number] },
  /** An island's cube count as a fraction of the dominant's (kept ≤ 0.62). */
  islandRatio: [0.4, 0.62] as [number, number],
  /** Vertical distance of an island above/below the dominant (× spread). */
  islandOffset: [7, 13] as [number, number],
  /** Stray satellite count. */
  strays: { low: [3, 4] as [number, number], medium: [3, 4] as [number, number] },
  /** Stray scatter: narrow lateral (gx,gy) but tall vertical (gz), × spread. */
  strayField: { lateral: 3, vertical: 18 },
  /** Air between cubes (fraction of combined edge); ×Mul spaces islands/strays. */
  gapFactor: 0.6,
  islandGapMul: 1.15,
  strayGapMul: 1.3,
} as const;

/** Hard acceptance rules — a candidate that fails any of these is rejected. */
export const ACCEPT = {
  attempts: 44,
  /** height ≥ aspectMin × width — the tall-column rule. */
  aspectMin: 1.7,
  /** Minimum overall bounding-box height in modules (not compressed/tiny). */
  heightMin: 22,
  /** Maximum overall width in modules (lateral stays subordinate). */
  widthMax: 26,
  /** Allowed cluster count (1 dominant + 1–2 islands). */
  clusters: [2, 3] as [number, number],
  /** Allowed stray count. */
  strays: [3, 4] as [number, number],
  /** Each island must be a real cluster of at least this many cubes. */
  islandMinCubes: 2,
  /** Dominant must outnumber the smallest island by this factor. */
  dominantVsIsland: 1.33,
  /** Dominant must not be a giant blob — at most this share of all cubes. */
  dominantMaxShare: 0.62,
} as const;

export interface PlacedCube {
  gx: number;
  gy: number;
  gz: number;
  /** Screen centre (module units) — derived from the corner. */
  x: number;
  y: number;
  edge: number;
  tier: SizeTier;
  /** Cluster id: 0 = dominant, 1..n = islands, -1 = stray satellite. */
  group: number;
  depth: number;
  glassAlpha: number;
  tone: number;
}

export interface CubeCluster {
  cubes: PlacedCube[];
}

export type Density = "low" | "medium";

export interface GenerateOptions {
  maxCubes?: number;
  density?: Density;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

interface RawCube {
  gx: number;
  gy: number;
  gz: number;
  k: number;
  tier: SizeTier;
  group: number;
}

const centre = (c: { gx: number; gy: number; gz: number }) => project(c.gx, c.gy, c.gz);

function inFaceOffset(rng: Rng, span: number, k: number): number {
  const opts = [0, span - k];
  if ((span - k) % 2 === 0) opts.push((span - k) / 2);
  return rng.pick(opts);
}

function weightedDir(rng: Rng): Dir {
  return rng.pick(["+x", "+x", "-x", "-x", "+y", "+y", "-y", "-y", "+z", "-z"] as const);
}

function attachFlush(rng: Rng, anchor: RawCube, dir: Dir, k: number): { gx: number; gy: number; gz: number } {
  const off = () => inFaceOffset(rng, anchor.k, k);
  let gx = anchor.gx;
  let gy = anchor.gy;
  let gz = anchor.gz;
  if (dir === "+x") (gx = anchor.gx + anchor.k), (gy += off()), (gz += off());
  else if (dir === "-x") (gx = anchor.gx - k), (gy += off()), (gz += off());
  else if (dir === "+y") (gy = anchor.gy + anchor.k), (gx += off()), (gz += off());
  else if (dir === "-y") (gy = anchor.gy - k), (gx += off()), (gz += off());
  else if (dir === "+z") (gz = anchor.gz + anchor.k), (gx += off()), (gy += off());
  else (gz = anchor.gz - k), (gx += off()), (gy += off());
  return { gx, gy, gz };
}

function hasAir(c: { gx: number; gy: number; gz: number; k: number }, placed: RawCube[], gapMul = 1): boolean {
  const pc = centre(c);
  return placed.every((p) => {
    const pp = centre(p);
    return Math.hypot(pc.x - pp.x, pc.y - pp.y) >= TUNING.gapFactor * gapMul * (c.k + p.k);
  });
}

const ATTACH_POOL: Record<SizeTier, SizeTier[]> = {
  hero: ["medium", "medium", "large", "large", "small"],
  large: ["medium", "medium", "large", "small"],
  medium: ["small", "medium", "medium"],
  small: ["small"],
};

function buildClusterCubes(
  rng: Rng,
  cubes: RawCube[],
  push: (c: RawCube) => boolean,
  cap: number,
  group: number,
  origin: { gx: number; gy: number; gz: number },
  count: number,
  maxTier: SizeTier,
  forceLateral: boolean,
): void {
  const seed: RawCube = { ...origin, k: TUNING.sizeBins[maxTier], tier: maxTier, group };
  if (!push(seed)) return;
  const local = [seed];
  for (let i = 1; i < count && cubes.length < cap; i++) {
    const anchor = local[rng.int(0, local.length - 1)]!;
    const dir: Dir =
      forceLateral && i === 1 ? rng.pick(["+x", "-x"] as const) : forceLateral && i === 2 ? rng.pick(["+y", "-y"] as const) : weightedDir(rng);
    const tier = rng.pick(ATTACH_POOL[maxTier]);
    const corner = attachFlush(rng, anchor, dir, TUNING.sizeBins[tier]);
    const c: RawCube = { ...corner, k: TUNING.sizeBins[tier], tier, group };
    if (push(c)) local.push(c);
  }
}

/** An island origin biased vertically (screen up or down) off the dominant. */
function islandOrigin(rng: Rng, spread: number, dir: "up" | "down", cubes: RawCube[]): { gx: number; gy: number; gz: number } {
  let last = { gx: 0, gy: 0, gz: 0 };
  for (let t = 0; t < 12; t++) {
    const dist = Math.round(rng.int(TUNING.islandOffset[0], TUNING.islandOffset[1]) * spread);
    const lat = rng.int(-2, 2);
    // Screen up = +gz; screen down = +gx,+gy. Lateral is kept tiny (subordinate).
    last = dir === "up" ? { gx: lat, gy: -lat, gz: dist } : { gx: dist + lat, gy: dist - lat, gz: 0 };
    if (hasAir({ ...last, k: TUNING.sizeBins.large }, cubes, TUNING.islandGapMul)) return last;
  }
  return last;
}

/** Scatter strays in a narrow, tall column of empty space (extends the column). */
function placeStrays(rng: Rng, count: number, spread: number, cubes: RawCube[], push: (c: RawCube) => boolean, cap: number): void {
  const L = TUNING.strayField.lateral;
  const V = Math.round(TUNING.strayField.vertical * spread);
  let placed = 0;
  for (let t = 0; t < count * 18 && placed < count && cubes.length < cap; t++) {
    const tier: SizeTier = rng.pick(["small", "small", "medium"] as const);
    const c: RawCube = { gx: rng.int(-L, L), gy: rng.int(-L, L), gz: rng.int(-V, V), k: TUNING.sizeBins[tier], tier, group: -1 };
    if (hasAir(c, cubes, TUNING.strayGapMul) && push(c)) placed++;
  }
}

/** Build the raw archipelago (dominant + vertical islands + strays) on the lattice. */
function buildRaw(rng: Rng, cap: number, density: Density): RawCube[] {
  const spread = rng.range(TUNING.spread[0], TUNING.spread[1]);
  const cubes: RawCube[] = [];
  const seen = new Set<string>();
  const push = (c: RawCube): boolean => {
    if (cubes.length >= cap) return false;
    const key = `${c.gx},${c.gy},${c.gz}`;
    if (seen.has(key)) return false;
    seen.add(key);
    cubes.push(c);
    return true;
  };

  const D = rng.int(TUNING.dominant[density][0], TUNING.dominant[density][1]);
  buildClusterCubes(rng, cubes, push, cap, 0, { gx: 0, gy: 0, gz: 0 }, D, "hero", true);

  const islands = rng.int(TUNING.islandCount[density][0], TUNING.islandCount[density][1]);
  const firstUp = rng.chance(0.5);
  if (islands >= 1 && cubes.length < cap) {
    const c1 = clamp(Math.round(D * rng.range(TUNING.islandRatio[0], TUNING.islandRatio[1])), 2, D - 1);
    buildClusterCubes(rng, cubes, push, cap, 1, islandOrigin(rng, spread, firstUp ? "up" : "down", cubes), c1, rng.pick(["large", "large", "medium"] as const), false);
    if (islands >= 2 && c1 >= 3 && cubes.length < cap) {
      buildClusterCubes(rng, cubes, push, cap, 2, islandOrigin(rng, spread, firstUp ? "down" : "up", cubes), 2, "small", false);
    }
  }

  const strays = rng.int(TUNING.strays[density][0], TUNING.strays[density][1]);
  placeStrays(rng, strays, spread, cubes, push, cap);
  return cubes;
}

/** Sort back-to-front and paint (frosted periwinkle). */
function paint(rng: Rng, raw: RawCube[]): PlacedCube[] {
  const depthOf = (c: RawCube) => c.gx + c.gy + c.gz + 1.5 * c.k;
  raw.sort((a, b) => depthOf(a) - depthOf(b) || a.k - b.k);
  const depths = raw.map(depthOf);
  const dMin = Math.min(...depths);
  const dSpan = Math.max(...depths) - dMin || 1;
  let heroUsed = false;
  return raw.map((c) => {
    let tier = c.tier;
    if (tier === "hero") {
      if (heroUsed) tier = "large";
      else heroUsed = true;
    }
    const depthN = (depthOf(c) - dMin) / dSpan;
    const base = lerp(TUNING.opacity.min + 0.05, TUNING.opacity.max - 0.05, depthN);
    const p = centre(c);
    return {
      gx: c.gx, gy: c.gy, gz: c.gz, x: p.x, y: p.y,
      edge: TUNING.sizeBins[tier], tier, group: c.group, depth: depthN,
      glassAlpha: clamp(base + rng.jitter(0.05), TUNING.opacity.min, TUNING.opacity.max),
      tone: clamp01(rng.range(TUNING.tone.min, TUNING.tone.max)),
    };
  });
}

export interface CompositionMetrics {
  width: number;
  height: number;
  aspect: number;
  clusters: number;
  islands: number;
  strays: number;
  dominantCount: number;
  dominantShare: number;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  structureOk: boolean;
  pass: boolean;
}

/** Measure + validate a composition against the hard acceptance rules. */
export function scoreComposition(cubes: PlacedCube[]): CompositionMetrics {
  const bbox = cubes.reduce(
    (acc, c) => {
      const hw = ISO_COS * c.edge;
      return {
        minX: Math.min(acc.minX, c.x - hw),
        maxX: Math.max(acc.maxX, c.x + hw),
        minY: Math.min(acc.minY, c.y - c.edge),
        maxY: Math.max(acc.maxY, c.y + c.edge),
      };
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const width = bbox.maxX - bbox.minX || 1;
  const height = bbox.maxY - bbox.minY || 1;
  const aspect = height / width;

  const counts = new Map<number, number>();
  for (const c of cubes) counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
  const dominantCount = counts.get(0) ?? 0;
  const islandCounts = [...counts.entries()].filter(([g]) => g >= 1).map(([, n]) => n);
  const strays = counts.get(-1) ?? 0;
  const clusters = 1 + islandCounts.length;
  const dominantShare = dominantCount / (cubes.length || 1);

  const structureOk =
    clusters >= ACCEPT.clusters[0] &&
    clusters <= ACCEPT.clusters[1] &&
    islandCounts.length >= 1 &&
    islandCounts.every((n) => n >= ACCEPT.islandMinCubes && dominantCount >= n) &&
    dominantCount / Math.min(...islandCounts) >= ACCEPT.dominantVsIsland &&
    dominantShare <= ACCEPT.dominantMaxShare &&
    strays >= ACCEPT.strays[0] &&
    strays <= ACCEPT.strays[1];

  const pass = structureOk && aspect >= ACCEPT.aspectMin && height >= ACCEPT.heightMin && width <= ACCEPT.widthMax;

  return { width, height, aspect, clusters, islands: islandCounts.length, strays, dominantCount, dominantShare, bbox, structureOk, pass };
}

/**
 * Generate a deterministic, ACCEPT-valid composition for a seed. Tries derived
 * seeds until one passes every hard rule; if none pass within ACCEPT.attempts,
 * keeps the best-scoring candidate (structure first, then tallest).
 */
export function generateCubeCluster(seed: string, opts: GenerateOptions = {}): CubeCluster {
  const cap = Math.max(1, Math.min(opts.maxCubes ?? MAX_CUBES, MAX_CUBES));
  const density: Density = opts.density ?? "medium";

  let best: PlacedCube[] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < ACCEPT.attempts; i++) {
    const rng = makeRng(`${seed}::v${i}`);
    const cubes = paint(rng, buildRaw(rng, cap, density));
    const m = scoreComposition(cubes);
    if (m.pass) return { cubes };
    const score = (m.structureOk ? 1000 : 0) + m.aspect * 20 + m.height;
    if (score > bestScore) {
      bestScore = score;
      best = cubes;
    }
  }
  return { cubes: best! };
}
