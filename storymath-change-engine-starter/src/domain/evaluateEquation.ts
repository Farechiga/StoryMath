import { applyOperator, numbersEqual } from "../model/formulaEvaluator";
import {
  getEquationForm,
  getRelationshipTemplate,
} from "../model/relationshipRegistry";
import { getQuantity } from "./loadProblem";
import { findExperiment } from "./operatorExperiment";
import type {
  EquationEvaluation,
  Operator,
  ProblemInstance,
  ProblemStep,
  StudentEquation,
} from "./types";

const COMMUTATIVE: ReadonlySet<Operator> = new Set<Operator>(["+", "×"]);

interface ConcreteForm {
  formId: string;
  leftQuantityId: string;
  operator: Operator;
  rightQuantityId: string;
  resultQuantityId: string;
}

/** Expand a step's accepted equation forms into concrete quantity ids. */
export function acceptedConcreteForms(
  _problem: ProblemInstance,
  step: ProblemStep,
): ConcreteForm[] {
  return step.acceptedEquationFormIds.map((formId) => {
    const form = getEquationForm(formId);
    return {
      formId,
      leftQuantityId: step.roleToQuantityId[form.leftRole]!,
      operator: form.operator,
      rightQuantityId: step.roleToQuantityId[form.rightRole]!,
      resultQuantityId: step.roleToQuantityId[form.resultRole]!,
    };
  });
}

function equationsMatch(a: ConcreteForm, b: StudentEquation): boolean {
  if (a.operator !== b.operator) return false;
  if (a.resultQuantityId !== b.resultQuantityId) return false;
  const sameOrder =
    a.leftQuantityId === b.leftQuantityId && a.rightQuantityId === b.rightQuantityId;
  if (sameOrder) return true;
  if (COMMUTATIVE.has(a.operator)) {
    return a.leftQuantityId === b.rightQuantityId && a.rightQuantityId === b.leftQuantityId;
  }
  return false;
}

/** Direction the attempted operator produces, from the registry experiment form. */
function directionForOperator(step: ProblemStep, operator: Operator) {
  const template = getRelationshipTemplate(step.relationshipTemplateId);
  const formId = template.experimentForms[operator];
  return formId ? getEquationForm(formId).directionProduced : step.expectedDirection;
}

export function evaluateEquation(
  problem: ProblemInstance,
  step: ProblemStep,
  equation: StudentEquation,
): EquationEvaluation {
  const matched = acceptedConcreteForms(problem, step).find((form) =>
    equationsMatch(form, equation),
  );

  const left = getQuantity(problem, equation.leftQuantityId).value;
  const right = getQuantity(problem, equation.rightQuantityId).value;
  const numericModelResult = applyOperator(left, equation.operator, right);

  const experiment = findExperiment(problem, step.id, equation.operator);
  const feedbackMode = experiment?.narrativeFit ?? "different_question";
  const operatorFitsStory = experiment?.narrativeFit === "actual";
  const storyEffect = directionForOperator(step, equation.operator);

  const goal = getQuantity(problem, step.goalQuantityId);
  const answerCorrect =
    equation.typedAnswer === undefined ? null : numbersEqual(equation.typedAnswer, goal.value);

  return {
    semanticMatch: matched !== undefined,
    ...(matched ? { matchedEquationFormId: matched.formId } : {}),
    numericModelResult,
    operatorFitsStory,
    answerCorrect,
    storyEffect,
    feedbackMode,
  };
}
