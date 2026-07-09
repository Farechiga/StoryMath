// src/model/fieldMerge.ts
//
// Resolves curated prose templates against the quantity model, so story text
// stays vivid but never bakes a value literal that can drift.
//   {quantity:monday_distance}       -> "384 meters"
//   {value:monday_distance}          -> "384"
//   {unit:monday_distance}           -> "meters"
//   {label:monday_distance.compact}  -> "Monday distance"
//   {label:monday_distance.child}    -> "Distance … on Monday"

import { formatNumber } from "./formulaEvaluator";
import type { QuantityLabelSpec } from "./problemSpec";

export interface MergeQuantity {
  value: number;
  unit: string;
  label: QuantityLabelSpec;
}

const TOKEN = /\{(quantity|value|unit|label):([a-zA-Z0-9_]+)(?:\.(child|compact|lowercase))?\}/g;

export function resolveTemplate(
  template: string,
  quantities: Record<string, MergeQuantity>,
): string {
  return template.replace(TOKEN, (whole, kind: string, id: string, sub?: string) => {
    const q = quantities[id];
    if (!q) throw new Error(`field-merge: unknown quantity id "${id}" in token ${whole}`);
    switch (kind) {
      case "quantity":
        return `${formatNumber(q.value)} ${q.unit}`;
      case "value":
        return formatNumber(q.value);
      case "unit":
        return q.unit;
      case "label": {
        if (sub === "child") return q.label.child;
        if (sub === "lowercase") return q.label.lowercase ?? q.label.compact.toLowerCase();
        return q.label.compact; // default + explicit .compact
      }
      default:
        return whole;
    }
  });
}

/**
 * Validation helper: bare integer literals in child-facing prose that match a
 * modeled value are a drift risk (the number should come from a token). Returns
 * the offending literals (empty if clean).
 */
export function bareModeledLiterals(text: string, modeledValues: number[]): number[] {
  const stripped = text.replace(TOKEN, ""); // ignore values inside tokens
  const found = new Set<number>();
  const values = new Set(modeledValues);
  for (const m of stripped.matchAll(/\d[\d,]*/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (values.has(n)) found.add(n);
  }
  return [...found];
}
