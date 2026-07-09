import { describe, expect, it } from "vitest";
import { makeRng } from "../../src/ornament/rng";
import {
  ACCEPT,
  generateCubeCluster,
  MAX_CUBES,
  scoreComposition,
  SIZE_ORDER,
  TUNING,
  type PlacedCube,
  type SizeTier,
} from "../../src/ornament/cubeCluster";
import { cubeBounds, cubeGeometry, project } from "../../src/ornament/isometric";
import { getVariant, variantForTheme } from "../../src/ornament/variants";

const TIERS: SizeTier[] = ["small", "medium", "large", "hero"];
const seeds = Array.from({ length: 48 }, (_, i) => `seed-${i}`);

/** The lattice planes a cube occupies on each axis (near + far face). */
const planes = (c: PlacedCube, axis: "gx" | "gy" | "gz") => [c[axis], c[axis] + c.edge];
const overlap = (a: number[], b: number[]) => a.some((v) => b.includes(v));
/** Two cubes are "aligned" when a face-plane coincides on any axis. */
const sharePlane = (a: PlacedCube, b: PlacedCube) =>
  overlap(planes(a, "gx"), planes(b, "gx")) ||
  overlap(planes(a, "gy"), planes(b, "gy")) ||
  overlap(planes(a, "gz"), planes(b, "gz"));

describe("seeded RNG determinism", () => {
  it("same seed → same stream, different seeds diverge", () => {
    expect(Array.from({ length: 6 }, () => makeRng("s").next())).toEqual(
      Array.from({ length: 6 }, () => makeRng("s").next()),
    );
    expect(new Set(Array.from({ length: 8 }, (_, i) => makeRng(`k${i}`).next())).size).toBeGreaterThan(1);
  });
});

describe("size bins", () => {
  it("has 4 tiers with an obvious (≥33%) jump between adjacent bins", () => {
    expect(SIZE_ORDER.length).toBe(4);
    for (let i = 1; i < SIZE_ORDER.length; i++) {
      expect(TUNING.sizeBins[SIZE_ORDER[i]!] / TUNING.sizeBins[SIZE_ORDER[i - 1]!]).toBeGreaterThanOrEqual(1.33);
    }
  });
});

describe("cube cluster generation", () => {
  it("is deterministic for a fixed seed", () => {
    expect(generateCubeCluster("fixed", { density: "medium" })).toEqual(
      generateCubeCluster("fixed", { density: "medium" }),
    );
  });

  it("produces noticeably different arrangements across seeds", () => {
    const sigs = seeds.slice(0, 12).map((s) =>
      JSON.stringify(generateCubeCluster(s, { density: "medium" }).cubes.map((c) => [c.gx, c.gy, c.gz, c.edge])),
    );
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("never exceeds 17 cubes and honours a lower maxCubes", () => {
    for (const seed of seeds) {
      const full = generateCubeCluster(seed, { density: "medium" });
      expect(full.cubes.length).toBeGreaterThan(0);
      expect(full.cubes.length).toBeLessThanOrEqual(MAX_CUBES);
      expect(generateCubeCluster(seed, { density: "medium", maxCubes: 5 }).cubes.length).toBeLessThanOrEqual(5);
    }
  });

  it("keeps a modest total count (≤17), scaling with density", () => {
    for (const seed of seeds) {
      const low = generateCubeCluster(seed, { density: "low" }).cubes.length;
      const med = generateCubeCluster(seed, { density: "medium" }).cubes.length;
      expect(low).toBeGreaterThanOrEqual(6);
      expect(low).toBeLessThanOrEqual(MAX_CUBES);
      expect(med).toBeGreaterThanOrEqual(8);
      expect(med).toBeLessThanOrEqual(MAX_CUBES);
    }
  });

  it("is an archipelago: one dominant cluster + 1–2 smaller islands whose size AND count differ", () => {
    for (const seed of seeds) {
      const { cubes } = generateCubeCluster(seed, { density: "medium" });
      const groups = new Map<number, PlacedCube[]>();
      for (const c of cubes) {
        if (c.group < 0) continue;
        if (!groups.has(c.group)) groups.set(c.group, []);
        groups.get(c.group)!.push(c);
      }

      expect(groups.size).toBeGreaterThanOrEqual(2); // dominant + at least one island
      expect(groups.size).toBeLessThanOrEqual(3);

      // Dominant (group 0) has the most cubes AND the largest cube of any cluster.
      const counts = [...groups.entries()].map(([g, cs]) => ({ g, n: cs.length, maxEdge: Math.max(...cs.map((c) => c.edge)) }));
      const dom = counts.find((c) => c.g === 0)!;
      const others = counts.filter((c) => c.g !== 0);
      for (const o of others) {
        // Count differs by ≥33% (dominant has meaningfully more cubes)…
        expect(dom.n / o.n).toBeGreaterThanOrEqual(1.33);
        // …and scale differs (dominant's biggest cube is larger).
        expect(dom.maxEdge).toBeGreaterThan(o.maxEdge);
      }
      // No two islands are the same size AND count (avoid twin clumps).
      if (others.length === 2) {
        const same = others[0]!.n === others[1]!.n && others[0]!.maxEdge === others[1]!.maxEdge;
        expect(same).toBe(false);
      }
    }
  });

  it("includes 3–4 well-spaced stray satellites (group -1)", () => {
    for (const seed of seeds) {
      const strays = generateCubeCluster(seed, { density: "medium" }).cubes.filter((c) => c.group === -1);
      expect(strays.length).toBeGreaterThanOrEqual(3);
      expect(strays.length).toBeLessThanOrEqual(4);
    }
  });

  it("ACCEPTANCE: every seed is tall, structured, non-tiny, and no giant blob", () => {
    for (const seed of seeds) {
      const m = scoreComposition(generateCubeCluster(seed, { density: "medium" }).cubes);
      expect(m.aspect).toBeGreaterThanOrEqual(1.5); // tall column dominates width
      expect(m.clusters).toBeGreaterThanOrEqual(2); // dominant + 1–2 islands
      expect(m.clusters).toBeLessThanOrEqual(3);
      expect(m.strays).toBeGreaterThanOrEqual(3);
      expect(m.strays).toBeLessThanOrEqual(4);
      expect(m.height).toBeGreaterThanOrEqual(ACCEPT.heightMin); // not compressed
      expect(m.dominantShare).toBeLessThanOrEqual(ACCEPT.dominantMaxShare); // no giant blob
    }
  });

  it("ACCEPTANCE: the vast majority of seeds fully PASS all hard rules", () => {
    const passed = seeds.filter((s) => scoreComposition(generateCubeCluster(s, { density: "medium" }).cubes).pass).length;
    expect(passed / seeds.length).toBeGreaterThanOrEqual(0.9);
  });

  it("uses valid tiers with at most one hero, and edges match the bins", () => {
    for (const seed of seeds) {
      const { cubes } = generateCubeCluster(seed, { density: "medium" });
      for (const c of cubes) {
        expect(TIERS).toContain(c.tier);
        expect(c.edge).toBe(TUNING.sizeBins[c.tier]);
      }
      expect(cubes.filter((c) => c.tier === "hero").length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps frosted opacity in [0.30, 0.70] and tone in [0, 1]", () => {
    for (const seed of seeds) {
      for (const c of generateCubeCluster(seed, { density: "medium" }).cubes) {
        expect(c.glassAlpha).toBeGreaterThanOrEqual(0.3);
        expect(c.glassAlpha).toBeLessThanOrEqual(0.7);
        expect(c.tone).toBeGreaterThanOrEqual(0);
        expect(c.tone).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ALIGNMENT DISCIPLINE: every cube is on the integer lattice", () => {
    for (const seed of seeds) {
      for (const c of generateCubeCluster(seed, { density: "medium" }).cubes) {
        expect(Number.isInteger(c.gx)).toBe(true);
        expect(Number.isInteger(c.gy)).toBe(true);
        expect(Number.isInteger(c.gz)).toBe(true);
        expect(Number.isInteger(c.edge)).toBe(true);
      }
    }
  });

  it("ALIGNMENT DISCIPLINE: within a cluster, every cube shares a face-plane with a clustermate", () => {
    for (const seed of seeds) {
      const { cubes } = generateCubeCluster(seed, { density: "medium" });
      for (const g of new Set(cubes.map((c) => c.group))) {
        if (g < 0) continue; // strays are deliberately free satellites
        const members = cubes.filter((c) => c.group === g);
        if (members.length < 2) continue;
        for (const c of members) {
          expect(members.some((o) => o !== c && sharePlane(c, o))).toBe(true);
        }
      }
    }
  });

  it("is never a vertical line: a real 2D cluster with lateral AND vertical extent", () => {
    for (const seed of seeds) {
      const { cubes } = generateCubeCluster(seed, { density: "medium" });
      if (cubes.length < 3) continue;
      // Distinct screen columns/rows (rounded centres). A vertical line collapses
      // to a single column (all centre-x equal) — this forbids that outright.
      const cols = new Set(cubes.map((c) => Math.round(c.x)));
      const rows = new Set(cubes.map((c) => Math.round(c.y)));
      expect(cols.size).toBeGreaterThanOrEqual(2); // lateral extent → not a column
      expect(rows.size).toBeGreaterThanOrEqual(2); // vertical extent → not a row
      const xSpan = Math.max(...cubes.map((c) => c.x)) - Math.min(...cubes.map((c) => c.x));
      const maxEdge = Math.max(...cubes.map((c) => c.edge));
      expect(xSpan).toBeGreaterThan(maxEdge * 0.4); // meaningful sideways spread
    }
  });
});

describe("isometric geometry", () => {
  it("projects the space-diagonal ends to the same point (true isometric)", () => {
    const a = project(0, 0, 0);
    const b = project(1, 1, 1);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  });

  it("emits three closed face quads, a silhouette, and a single wire path", () => {
    const g = cubeGeometry({ x: 3, y: 4 }, 20);
    for (const face of [g.faces.top, g.faces.right, g.faces.left]) {
      expect(face.startsWith("M")).toBe(true);
      expect(face.trim().endsWith("Z")).toBe(true);
    }
    expect(g.hexagon.startsWith("M")).toBe(true);
    expect((g.wire.match(/M/g) ?? []).length).toBe(4);
  });

  it("bounds span one cube edge vertically and √3·edge horizontally", () => {
    const bb = cubeBounds({ x: 0, y: 0 }, 0.8);
    expect(bb.maxY - bb.minY).toBeCloseTo(1.6, 6);
    expect(bb.maxX - bb.minX).toBeCloseTo(Math.sqrt(3) * 0.8, 6);
  });
});

describe("variant mapping", () => {
  it("infers a variant from theme keywords, else default", () => {
    expect(variantForTheme("An imaginary Mars rover mission")).toBe("rover");
    expect(variantForTheme("Winter birding by the frozen wetland")).toBe("forest");
    expect(variantForTheme("Animation studio eyebrow rig")).toBe("studio");
    expect(variantForTheme("counting biscuits in the kitchen")).toBe("default");
    expect(variantForTheme(undefined)).toBe("default");
  });

  it("uses a translucent periwinkle (#6886EC family) with light > dark endpoints", () => {
    for (const name of ["default", "rover", "forest", "studio"] as const) {
      const v = getVariant(name);
      expect(v.glassDark).toHaveLength(3);
      expect(v.glassLight).toHaveLength(3);
      // Periwinkle: blue is the dominant channel at both ends (not gray, not warm).
      for (const [r, g, b] of [v.glassDark, v.glassLight]) {
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
      }
      // Lighter endpoint really is lighter.
      expect(v.glassLight[0] + v.glassLight[1] + v.glassLight[2]).toBeGreaterThan(
        v.glassDark[0] + v.glassDark[1] + v.glassDark[2],
      );
      expect(["low", "medium"]).toContain(v.density);
      expect(v.intensity).toBeGreaterThan(0);
    }
  });
});
