import { applyOperator, numbersEqual } from "../model/formulaEvaluator";
import { getEquationForm } from "../model/relationshipRegistry";
import { getQuantity } from "./loadProblem";
import type { BackwardCheckFrame, ProblemInstance, ProblemStep } from "./types";

/**
 * Build the interactive backward-check frame(s) for a step. The inverse forms
 * come from the step's backwardCheck spec (registry FormulaIds); operands +
 * operator are fixed and the child reconstructs the reconciling result.
 */
export function buildBackwardChecks(
  problem: ProblemInstance,
  step: ProblemStep,
): BackwardCheckFrame[] {
  return step.backwardCheck.acceptedEquationFormIds.map((formId) => {
    const form = getEquationForm(formId);
    const leftQuantityId = step.roleToQuantityId[form.leftRole]!;
    const rightQuantityId = step.roleToQuantityId[form.rightRole]!;
    const resultQuantityId = step.roleToQuantityId[form.resultRole]!;

    const expectedResult = applyOperator(
      getQuantity(problem, leftQuantityId).value,
      form.operator,
      getQuantity(problem, rightQuantityId).value,
    );

    return {
      equationFormId: formId,
      prompt: step.backwardCheck.prompt,
      leftQuantityId,
      operator: form.operator,
      rightQuantityId,
      resultQuantityId,
      semanticReading: form.childFacingPattern ?? "",
      expectedResult,
    };
  });
}

export function buildBackwardCheck(
  problem: ProblemInstance,
  step: ProblemStep,
): BackwardCheckFrame {
  const first = buildBackwardChecks(problem, step)[0];
  if (!first) throw new Error(`Step "${step.id}" has no backward-check form.`);
  return first;
}

export function isBackwardCheckCorrect(
  frame: BackwardCheckFrame,
  typedResult: number,
): boolean {
  return numbersEqual(typedResult, frame.expectedResult);
}

export function backwardCheckReconciles(
  problem: ProblemInstance,
  frame: BackwardCheckFrame,
): boolean {
  return numbersEqual(getQuantity(problem, frame.resultQuantityId).value, frame.expectedResult);
}
