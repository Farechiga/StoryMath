/**
 * Isometric projection + cube geometry.
 *
 * True isometric (all three axes 120° apart), so a unit cube's silhouette is a
 * regular hexagon and the two ends of its space diagonal project to the same
 * point — the hexagon centre. That single fact is what makes the figure read as
 * exact and architectural rather than approximate.
 *
 * Everything here is pure geometry in a unit space: no colour, no seed, no
 * placement. The component (CubeOrnament) scales/translates the whole group into
 * the page region, so we keep numbers small and clean here.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** cos(30°) — the horizontal half-width of a unit cube's hexagon. */
export const ISO_COS = Math.sqrt(3) / 2;

const r = (v: number) => Math.round(v * 1000) / 1000;
const P = (p: Vec2) => `${r(p.x)} ${r(p.y)}`;

/**
 * Project a grid cell centre to 2D. Grid step is one unit; +gx goes down-right,
 * +gy down-left, +gz straight up. Because the space diagonal collapses, this is
 * both the cell's anchor and the drawn cube's hexagon centre.
 */
export function project(gx: number, gy: number, gz: number): Vec2 {
  return {
    x: (gx - gy) * ISO_COS,
    y: (gx + gy) * 0.5 - gz,
  };
}

export interface CubeGeometry {
  /** The three visible faces, as fillable quad paths (top, right, left). */
  faces: { top: string; right: string; left: string };
  /** The closed hexagon silhouette — filled with paper to occlude cubes behind. */
  hexagon: string;
  /** Hexagon outline + the three internal "Y" seams, as one single-stroke path. */
  wire: string;
}

/**
 * Build a cube of edge `s` centred at `p`. Vertices (A centre, D top, F upper-
 * right, B lower-right, E bottom, C lower-left, G upper-left):
 *
 *            D
 *         G     F
 *            A
 *         C     B
 *            E
 *
 * Faces: top D-F-A-G, right F-B-E-A, left G-A-E-C. The wire draws the hexagon
 * D-F-B-E-C-G once, then the three seams A→F, A→G, A→E — so shared edges are
 * never double-stroked (which would darken the interior at low opacity).
 */
export function cubeGeometry(p: Vec2, s: number): CubeGeometry {
  const hx = ISO_COS * s;
  const hy = 0.5 * s;
  const A = p;
  const D: Vec2 = { x: p.x, y: p.y - s };
  const F: Vec2 = { x: p.x + hx, y: p.y - hy };
  const B: Vec2 = { x: p.x + hx, y: p.y + hy };
  const E: Vec2 = { x: p.x, y: p.y + s };
  const C: Vec2 = { x: p.x - hx, y: p.y + hy };
  const G: Vec2 = { x: p.x - hx, y: p.y - hy };

  const quad = (a: Vec2, b: Vec2, c: Vec2, d: Vec2) => `M ${P(a)} L ${P(b)} L ${P(c)} L ${P(d)} Z`;
  const outline = `M ${P(D)} L ${P(F)} L ${P(B)} L ${P(E)} L ${P(C)} L ${P(G)} Z`;
  const seams = `M ${P(A)} L ${P(F)} M ${P(A)} L ${P(G)} M ${P(A)} L ${P(E)}`;

  return {
    faces: { top: quad(D, F, A, G), right: quad(F, B, E, A), left: quad(G, A, E, C) },
    hexagon: outline,
    wire: `${outline} ${seams}`,
  };
}

/** Axis-aligned bounds of a cube (edge `s`) centred at `p`, in unit space. */
export function cubeBounds(p: Vec2, s: number): { minX: number; maxX: number; minY: number; maxY: number } {
  const hx = ISO_COS * s;
  return { minX: p.x - hx, maxX: p.x + hx, minY: p.y - s, maxY: p.y + s };
}
