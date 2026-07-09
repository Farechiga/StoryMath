import { applyOperator } from "../model/formulaEvaluator";
import type { Operator } from "./types";

/** Arithmetic is centralized in the formula evaluator; re-exported here. */
export { applyOperator, formatNumber, numbersEqual } from "../model/formulaEvaluator";

/** Back-compat alias used across the engine and tests. */
export function calculate(operator: Operator, left: number, right: number): number {
  return applyOperator(left, operator, right);
}

/** Whether two quantities can be combined (same unit). */
export function unitsCompatible(unitA: string, unitB: string): boolean {
  return unitA.trim().toLowerCase() === unitB.trim().toLowerCase();
}
