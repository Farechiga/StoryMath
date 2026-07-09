import { applyOperator } from "../model/formulaEvaluator";
import { resolveTemplate, type MergeQuantity } from "../model/fieldMerge";
import { getEquationForm, getRelationshipTemplate } from "../model/relationshipRegistry";
import { getQuantity, stepOperandIds } from "./loadProblem";
import type {
  Operator,
  OperatorExperimentResult,
  OperatorExperimentSpec,
  ProblemInstance,
  ProblemStep,
} from "./types";

/** Find the authored experiment pack for a (step, operator) pair. */
export function findExperiment(
  problem: ProblemInstance,
  stepId: string,
  operator: Operator,
): OperatorExperimentSpec | undefined {
  return problem.operatorExperiments.find(
    (exp) => exp.stepId === stepId && exp.operator === operator,
  );
}

function mergeMap(problem: ProblemInstance): Record<string, MergeQuantity> {
  const map: Record<string, MergeQuantity> = {};
  for (const q of problem.quantities) {
    map[q.id] = {
      value: q.value,
      unit: q.unit,
      ...(q.unitSingular ? { unitSingular: q.unitSingular } : {}),
      ...(q.unitPlural ? { unitPlural: q.unitPlural } : {}),
      label: q.label,
    };
  }
  return map;
}

/**
 * Run the operator experiment: compute the consequence of the chosen operator
 * over the step's canonical operands, and surface the registry-selected
 * direction + visual model and the field-merged alternate-world sentence.
 */
export function runOperatorExperiment(
  problem: ProblemInstance,
  step: ProblemStep,
  operator: Operator,
): OperatorExperimentResult {
  const experiment = findExperiment(problem, step.id, operator);
  if (!experiment) {
    throw new Error(
      `No operator experiment authored for step "${step.id}" and operator "${operator}".`,
    );
  }

  const [leftId, rightId] = stepOperandIds(step);
  const left = getQuantity(problem, leftId).value;
  const right = getQuantity(problem, rightId).value;
  const computed = applyOperator(left, operator, right);

  const template = getRelationshipTemplate(step.relationshipTemplateId);
  const experimentFormId = template.experimentForms[operator];
  const form = experimentFormId ? getEquationForm(experimentFormId) : undefined;
  const directionProduced = form?.directionProduced ?? step.expectedDirection;
  const visualModel = experiment.visualModel ?? form?.defaultVisualModel ?? "comparison_gap_bar";

  const worldSentence = experiment.alternateWorldTemplate
    ? resolveTemplate(experiment.alternateWorldTemplate, mergeMap(problem))
    : "";
  const groupNoun = experiment.groupNoun ?? problem.storyChrome.groupNoun;

  return {
    operator,
    computed,
    operandValues: [left, right],
    operandQuantityIds: [leftId, rightId],
    narrativeFit: experiment.narrativeFit,
    directionProduced,
    worldSentence,
    ...(experiment.shortReaction ? { shortReaction: experiment.shortReaction } : {}),
    visualModel,
    ...(groupNoun ? { groupNoun } : {}),
    fitsStory: experiment.narrativeFit === "actual",
  };
}

/** The operator whose experiment fits the actual story for this step. */
export function actualOperatorFor(
  problem: ProblemInstance,
  step: ProblemStep,
): Operator | undefined {
  return problem.operatorExperiments.find(
    (exp) => exp.stepId === step.id && exp.narrativeFit === "actual",
  )?.operator;
}
