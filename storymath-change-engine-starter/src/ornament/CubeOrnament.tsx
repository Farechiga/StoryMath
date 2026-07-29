/**
 * CubeOrnament — the one ornamental system for StoryMath pages.
 *
 * A seeded isometric cube cluster that reads as suspended frosted glass: a loose,
 * dispersed vertical drift in the right-hand column, clipped to its region and
 * faded quietly toward the text. Mostly negative space, at most 17 cubes,
 * deterministic from `seed` (compose it from storyId + screenId). It is inert
 * atmosphere: `aria-hidden`, no pointer events, behind all content, and it never
 * encodes lesson data.
 */

import { useMemo, type CSSProperties } from "react";
import { cubeBounds, cubeGeometry } from "./isometric";
import { generateCubeCluster, type Density, type PlacedCube } from "./cubeCluster";
import { makeRng } from "./rng";
import { getVariant, type CubeVariant, type RGB, type VariantName } from "./variants";
import pup1Url from "../assets/PuppyPics/Pup1.png";
import pup2Url from "../assets/PuppyPics/Pup2.png";
import pup3Url from "../assets/PuppyPics/Pup3.png";
import pup4Url from "../assets/PuppyPics/Pup4.png";
import pup5Url from "../assets/PuppyPics/Pup5.png";

/**
 * Tall, narrow design canvas. The ornament's own box (in CSS) is positioned
 * inside the right page column, so the SVG just fits its composition within this
 * canvas with padding on every side (meet, never slice) — the whitespace margin
 * that keeps cubes off the box edges.
 */
export const PAGE_W = 300;
export const PAGE_H = 820;

/** Regions include an internal "center" used only by the dev gallery. */
export type Region = "right" | "top-right" | "bottom-right" | "center";

export interface CubeOrnamentProps {
  seed: string;
  region?: Exclude<Region, "center">;
  maxCubes?: number;
  density?: Density;
  variant?: VariantName;
  width?: number;
  height?: number;
}

/** Padded target rectangles — leave whitespace on all four sides of the cluster. */
const REGION_RECT: Record<Region, { x0: number; x1: number; y0: number; y1: number }> = {
  right: { x0: 0.14, x1: 0.86, y0: 0.08, y1: 0.92 },
  "top-right": { x0: 0.14, x1: 0.86, y0: 0.05, y1: 0.5 },
  "bottom-right": { x0: 0.14, x1: 0.86, y0: 0.5, y1: 0.95 },
  center: { x0: 0.1, x1: 0.9, y0: 0.06, y1: 0.94 },
};

/**
 * Per-face translucency factors. Frosted glass over a pale field reads 3D when
 * the top catches most light (least gray = lowest alpha) and the left is the
 * shadow side (most alpha). The cube's own glassAlpha scales all three, so the
 * darkest face never exceeds the 0.30–0.70 band.
 */
const FACE_ALPHA = { top: 0.72, right: 0.86, left: 1 } as const;

/** Fit-scale guardrails (viewBox px per lattice module): never tiny, never huge. */
const MIN_SCALE = 7;
const MAX_SCALE = 15;
/** Top inset (viewBox units) so the top-anchored composition clears the region edge. */
const TOP_MARGIN = 6;

const round = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sanitizeId = (s: string) => "cube-" + s.replace(/[^a-zA-Z0-9]+/g, "-");

const lerpChannel = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Blend a cube's gray from the variant's dark→light endpoints by its tone. */
function toneRGB(v: CubeVariant, tone: number): RGB {
  return [
    lerpChannel(v.glassDark[0], v.glassLight[0], tone),
    lerpChannel(v.glassDark[1], v.glassLight[1], tone),
    lerpChannel(v.glassDark[2], v.glassLight[2], tone),
  ];
}
const rgb = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

interface RenderedCube {
  cube: PlacedCube;
  geo: ReturnType<typeof cubeGeometry>;
  index: number;
}

type PuppyPlacement = "perched" | "behind";

interface PuppyStickerAsset {
  id: string;
  url: string;
  width: number;
  height: number;
}

interface RenderedPuppy {
  asset: PuppyStickerAsset;
  placement: PuppyPlacement;
  x: number;
  y: number;
  width: number;
  height: number;
  cubeEdge: number;
  anchorGroup: number;
  anchorEdge: number;
  anchorIndex: number;
}

const PUPPY_STICKERS: readonly PuppyStickerAsset[] = [
  { id: "Pup1", url: pup1Url, width: 868, height: 986 },
  { id: "Pup2", url: pup2Url, width: 788, height: 1014 },
  { id: "Pup3", url: pup3Url, width: 860, height: 975 },
  { id: "Pup4", url: pup4Url, width: 868, height: 987 },
  { id: "Pup5", url: pup5Url, width: 906, height: 1073 },
];

type PlacedRenderCube = { cube: PlacedCube; geo: ReturnType<typeof cubeGeometry>; index: number };

function largestCube(placed: PlacedRenderCube[]) {
  return placed.reduce((best, current) => {
    if (current.cube.edge > best.cube.edge) return current;
    if (current.cube.edge === best.cube.edge && current.cube.group === 0 && best.cube.group !== 0) return current;
    return best;
  });
}

function chooseBehindAnchor(
  rng: ReturnType<typeof makeRng>,
  placed: PlacedRenderCube[],
  largest: PlacedRenderCube,
) {
  const islandCubes = placed.filter((p) => p !== largest && p.cube.group > 0);
  const satelliteCubes = placed.filter((p) => p !== largest && p.cube.group === -1);
  const fallbackCubes = placed.filter((p) => p !== largest);
  const candidates = islandCubes.length > 0 ? islandCubes : satelliteCubes.length > 0 ? satelliteCubes : fallbackCubes;

  if (candidates.length === 0) return largest;

  const scored = candidates
    .map((p) => ({
      p,
      distance: Math.hypot(p.cube.x - largest.cube.x, p.cube.y - largest.cube.y),
    }))
    .sort((a, b) => b.distance - a.distance || a.p.cube.edge - b.p.cube.edge);
  const distalPool = scored.slice(0, Math.min(3, scored.length)).map(({ p }) => p);
  return rng.pick(distalPool);
}

function choosePuppy(seed: string, placed: PlacedRenderCube[]): RenderedPuppy | undefined {
  if (placed.length === 0) return undefined;

  const rng = makeRng(`${seed}::puppy`);
  const asset = PUPPY_STICKERS[rng.int(0, PUPPY_STICKERS.length - 1)]!;
  const placement: PuppyPlacement = rng.chance(0.5) ? "perched" : "behind";
  const largest = largestCube(placed);
  const anchor = placement === "behind" ? chooseBehindAnchor(rng, placed, largest) : largest;

  const cubeHeight = largest.cube.edge * 2;
  const height = cubeHeight * 1.04;
  const width = height * (asset.width / asset.height);
  const outward = anchor.cube.x >= largest.cube.x ? 1 : -1;
  const x =
    placement === "behind"
      ? anchor.cube.x - width * (outward > 0 ? 0.34 : 0.66)
      : largest.cube.x - width / 2 + rng.jitter(largest.cube.edge * 0.08);
  const y =
    placement === "perched"
      ? largest.cube.y - largest.cube.edge * 0.12 - height
      : anchor.cube.y + anchor.cube.edge * 1.1 - height;

  return {
    asset,
    placement,
    x,
    y,
    width,
    height,
    cubeEdge: largest.cube.edge,
    anchorGroup: anchor.cube.group,
    anchorEdge: anchor.cube.edge,
    anchorIndex: anchor.index,
  };
}

function PuppySticker({ puppy }: { puppy: RenderedPuppy }) {
  return (
    <image
      className={`ornament__puppy ornament__puppy--${puppy.placement}`}
      href={puppy.asset.url}
      x={round(puppy.x)}
      y={round(puppy.y)}
      width={round(puppy.width)}
      height={round(puppy.height)}
      preserveAspectRatio="xMidYMax meet"
      data-puppy-id={puppy.asset.id}
      data-puppy-placement={puppy.placement}
      data-cube-edge={puppy.cubeEdge}
      data-puppy-anchor-group={puppy.anchorGroup}
      data-puppy-anchor-edge={puppy.anchorEdge}
      data-puppy-anchor-index={puppy.anchorIndex}
    />
  );
}

/** Generate + place + fit the floating cluster into the region rect. */
export function composeCubeScene(
  seed: string,
  region: Region,
  maxCubes: number,
  density: Density | undefined,
  width: number,
  height: number,
) {
  // The generator already returns an ACCEPT-valid (tall, structured) composition.
  const cluster = generateCubeCluster(seed, { maxCubes, density });

  // Cubes are already positioned (x, y) and back-to-front sorted by the
  // generator — no projection lattice; the (x, y) IS the cube's centre.
  const placed = cluster.cubes.map((cube, index) => {
    const c = { x: cube.x, y: cube.y };
    return { cube, geo: cubeGeometry(c, cube.edge), bounds: cubeBounds(c, cube.edge), index };
  });

  const bb = placed.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.bounds.minX),
      maxX: Math.max(acc.maxX, p.bounds.maxX),
      minY: Math.min(acc.minY, p.bounds.minY),
      maxY: Math.max(acc.maxY, p.bounds.maxY),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const bw = bb.maxX - bb.minX || 1;
  const bh = bb.maxY - bb.minY || 1;

  // Fit uniformly into the region rect, leaving breathing room (negative space),
  // then clamp so the ornament is never tiny/timid nor oversized.
  const rect = REGION_RECT[region];
  const tw = (rect.x1 - rect.x0) * width;
  const th = (rect.y1 - rect.y0) * height;
  const k = clamp(Math.min(tw / bw, th / bh) * 0.92, MIN_SCALE, MAX_SCALE);

  // Anchor the TOP of the composition near the region top (sit high, drift down)
  // and centre it horizontally in the column.
  const bcx = (bb.minX + bb.maxX) / 2;
  const tcx = (rect.x0 + rect.x1) * 0.5 * width;
  const tx = tcx - k * bcx;
  const ty = rect.y0 * height + TOP_MARGIN - k * bb.minY;

  return {
    cubes: placed.map(({ cube, geo, index }): RenderedCube => ({ cube, geo, index })),
    puppy: choosePuppy(seed, placed),
    transform: `translate(${round(tx)} ${round(ty)}) scale(${round(k)})`,
  };
}

/**
 * The bare SVG figure. Reused by the page layer and the dev gallery. `fade`
 * applies the right-weighted dissolve; `fit` controls slice (cover) vs meet.
 */
export function CubeField({
  seed,
  variant = "default",
  region = "right",
  maxCubes = 17,
  density,
  width = PAGE_W,
  height = PAGE_H,
  fade = true,
  fit = "slice",
  className,
  style,
}: {
  seed: string;
  variant?: VariantName;
  region?: Region;
  maxCubes?: number;
  density?: Density;
  width?: number;
  height?: number;
  fade?: boolean;
  fit?: "slice" | "meet";
  className?: string;
  style?: CSSProperties;
}) {
  const v = getVariant(variant);
  const effectiveDensity = density ?? v.density;

  const { cubes, puppy, transform } = useMemo(
    () => composeCubeScene(seed, region, maxCubes, effectiveDensity, width, height),
    [seed, region, maxCubes, effectiveDensity, width, height],
  );

  const idBase = sanitizeId(`${seed}-${region}-${variant}`);
  const gradId = `${idBase}-grad`;
  const maskId = `${idBase}-mask`;

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={`xMidYMid ${fit}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* A soft vignette so the cluster dissolves into the page on every side —
            it reads as an embedded ornament, not a pinned object. */}
        <radialGradient id={gradId} cx="0.5" cy="0.5" r="0.62">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.72" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </radialGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width={width} height={height} fill={`url(#${gradId})`} />
        </mask>
      </defs>
      <g {...(fade ? { mask: `url(#${maskId})` } : {})} opacity={v.intensity}>
        <g transform={transform}>
          {cubes.map(({ cube, geo, index }, i) => {
            const face = rgb(toneRGB(v, cube.tone));
            const line = rgb(toneRGB(v, Math.max(0, cube.tone - 0.32)));
            const a = cube.glassAlpha;
            return (
              <g key={i}>
                {puppy?.placement === "behind" && puppy.anchorIndex === index && <PuppySticker puppy={puppy} />}
                {/* Frosted translucent faces (top lightest, left shadow side). */}
                <path d={geo.faces.top} fill={face} fillOpacity={a * FACE_ALPHA.top} stroke="none" />
                <path d={geo.faces.right} fill={face} fillOpacity={a * FACE_ALPHA.right} stroke="none" />
                <path d={geo.faces.left} fill={face} fillOpacity={a * FACE_ALPHA.left} stroke="none" />
                {/* Soft, quiet linework. */}
                <path
                  d={geo.wire}
                  fill="none"
                  stroke={line}
                  strokeOpacity={Math.min(0.72, a * 0.95)}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          {puppy?.placement === "perched" && <PuppySticker puppy={puppy} />}
        </g>
      </g>
    </svg>
  );
}

/**
 * The app-facing atmosphere layer: fixed to the right column, behind all content,
 * inert. Keyed by `seed` so it re-seeds AND re-fades gently per screen —
 * deterministic variation, never a loop.
 */
export function CubeOrnament({
  seed,
  region = "right",
  maxCubes = 17,
  density,
  variant = "default",
}: CubeOrnamentProps) {
  return (
    <div className="ornament" aria-hidden="true">
      <CubeField
        key={seed}
        seed={seed}
        variant={variant}
        region={region}
        maxCubes={maxCubes}
        {...(density ? { density } : {})}
        fit="meet"
        className="ornament__svg"
      />
    </div>
  );
}
