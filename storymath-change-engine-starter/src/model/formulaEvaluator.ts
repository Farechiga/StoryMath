// src/model/formulaEvaluator.ts
//
// The one place arithmetic happens. Everything downstream (derived quantities,
// equation lines, previews, backward checks, grading) resolves through here so
// a value can never drift from an authored literal.

import { EQUATION_FORMS, type FormulaId, type Operator } from "./relationshipRegistry";

export interface ResolvedEquation {
  formulaId: FormulaId;
  operator: Operator;
  leftQuantityId: string;
  rightQuantityId: string;
  resultQuantityId: string;
  leftValue: number;
  rightValue: number;
  resultValue: number;
}

export function applyOperator(left: number, operator: Operator, right: number): number {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "×":
      return left * right;
    case "÷": {
      if (right === 0) throw new Error("Cannot divide by zero.");
      return left / right;
    }
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unknown operator: ${String(exhaustive)}`);
    }
  }
}

export function resolveEquationFromRoles(args: {
  formulaId: FormulaId;
  roleToQuantityId: Record<string, string>;
  quantityValues: Record<string, number>;
}): ResolvedEquation {
  const form = EQUATION_FORMS[args.formulaId];
  if (!form) throw new Error(`Unknown formulaId: ${args.formulaId}`);

  const leftQuantityId = args.roleToQuantityId[form.leftRole];
  const rightQuantityId = args.roleToQuantityId[form.rightRole];
  const resultQuantityId = args.roleToQuantityId[form.resultRole];

  if (!leftQuantityId || !rightQuantityId || !resultQuantityId) {
    throw new Error(
      `Formula ${args.formulaId} cannot resolve all roles (${form.leftRole}/${form.rightRole}/${form.resultRole}).`,
    );
  }

  const leftValue = args.quantityValues[leftQuantityId];
  const rightValue = args.quantityValues[rightQuantityId];
  if (leftValue === undefined || rightValue === undefined) {
    throw new Error(`Formula ${args.formulaId} has unresolved operand values.`);
  }
  const resultValue = applyOperator(leftValue, form.operator, rightValue);

  return {
    formulaId: args.formulaId,
    operator: form.operator,
    leftQuantityId,
    rightQuantityId,
    resultQuantityId,
    leftValue,
    rightValue,
    resultValue,
  };
}

/** Float-tolerant equality so non-integer results (e.g. 1.5) reconcile. */
export function numbersEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Human-readable number formatting shared by every rendered equation. */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return Number(value.toFixed(2)).toLocaleString("en-US");
}
