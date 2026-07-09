/**
 * The small variant system for the cube ornament.
 *
 * One engine, four moods. The frosted-glass base is periwinkle #6886EC across the
 * board: the look comes from TRANSPARENCY, not saturation. Each cube's `tone`
 * lerps between a deeper and a lighter periwinkle, and the 30-70% opacity band
 * makes it read as a soft blue overlay through the pale field, never a flat
 * opaque block. A variant only nudges the tint slightly and sets density; it
 * never changes geometry, so every story shares one grammar.
 */

import type { Density } from "./cubeCluster";

export type VariantName = "default" | "rover" | "forest" | "studio";

export type RGB = readonly [number, number, number];

export interface CubeVariant {
  /** Deepest glass periwinkle (tone -> 0). */
  glassDark: RGB;
  /** Lightest glass periwinkle (tone -> 1). */
  glassLight: RGB;
  density: Density;
  /** Overall layer opacity multiplier — the final "quietness" knob. */
  intensity: number;
}

// All variants are periwinkle #6886EC = rgb(104,134,236); dark/light are just
// deeper/lighter steps of that hue, so tone + opacity do the work.
export const VARIANTS: Record<VariantName, CubeVariant> = {
  // Neutral periwinkle.
  default: {
    glassDark: [70, 98, 202],
    glassLight: [176, 192, 246],
    density: "low",
    intensity: 0.85,
  },
  // Rover / Mars — the reference #6886EC periwinkle.
  rover: {
    glassDark: [72, 100, 204],
    glassLight: [178, 194, 247],
    density: "medium",
    intensity: 0.88,
  },
  // Forest / wetland — a touch cooler (toward cyan-blue).
  forest: {
    glassDark: [62, 104, 198],
    glassLight: [170, 198, 244],
    density: "medium",
    intensity: 0.85,
  },
  // Studio / animation — a touch toward violet.
  studio: {
    glassDark: [88, 92, 204],
    glassLight: [188, 188, 248],
    density: "medium",
    intensity: 0.86,
  },
};

/** Representative hex for the dev-gallery swatch. */
export function variantSwatch(v: CubeVariant): string {
  const [r, g, b] = v.glassDark;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Map a story's free-text theme to a variant by keyword — keeps story JSON free
 * of a dedicated ornament field. Falls back to the neutral variant.
 */
export function variantForTheme(theme: string | undefined): VariantName {
  const t = (theme ?? "").toLowerCase();
  if (/rover|mars|space|rocket|orbit|planet|launch/.test(t)) return "rover";
  if (/bird|forest|wetland|wild|nature|tree|garden|river|trail|snow/.test(t)) return "forest";
  if (/anim|studio|render|film|frame|draw|cartoon|design/.test(t)) return "studio";
  return "default";
}

export function getVariant(name: VariantName | undefined): CubeVariant {
  return VARIANTS[name ?? "default"] ?? VARIANTS.default;
}
