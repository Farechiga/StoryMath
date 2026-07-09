import type { Direction, DimensionSpec } from "../domain";

/**
 * Presentation-only vocabulary. Comparison-direction labels come from the
 * problem's dimension (distance → Farther/Shorter, temperature → Warmer/Colder,
 * …); combine-family labels are operation-generic. Authored labels are never
 * blindly lowercased — a lowercase variant is used when supplied.
 */

export interface DirectionOption {
  key: string;
  label: string;
  glyph: string;
  direction: Direction | "same" | "not_sure";
  lower: string;
}

export function directionOptionsFor(
  dimension: DimensionSpec,
  expected: Direction,
): DirectionOption[] {
  const combineFamily: DirectionOption[] = [
    { key: "combine", label: "Combine them", glyph: "⊕", direction: "combine", lower: "combine them" },
    { key: "compare", label: "Compare them", glyph: "⇄", direction: "decrease", lower: "compare them" },
    { key: "repeat", label: "Repeat them", glyph: "×", direction: "scale", lower: "repeat them" },
  ];
  const comparisonFamily: DirectionOption[] = [
    {
      key: "increase",
      label: dimension.increaseLabel,
      glyph: "↑",
      direction: "increase",
      lower: dimension.increaseLabelLower ?? dimension.increaseLabel.toLowerCase(),
    },
    {
      key: "decrease",
      label: dimension.decreaseLabel,
      glyph: "↓",
      direction: "decrease",
      lower: dimension.decreaseLabelLower ?? dimension.decreaseLabel.toLowerCase(),
    },
    {
      key: "same",
      label: dimension.sameLabel,
      glyph: "=",
      direction: "same",
      lower: dimension.sameLabelLower ?? dimension.sameLabel.toLowerCase(),
    },
  ];
  return expected === "combine" || expected === "scale" || expected === "split"
    ? combineFamily
    : comparisonFamily;
}
