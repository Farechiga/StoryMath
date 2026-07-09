import problemJson from "../../data/problems/nasa-perseverance-wheel-slip.json";
import { instantiateProblem } from "../model/instantiateProblem";
import {
  getEquationForm,
  getRelationshipTemplate,
  type RelationshipTemplate,
} from "../model/relationshipRegistry";
import type { ProblemSpec } from "../model/problemSpec";
import type { ProblemInstance, ProblemStep, Quantity } from "./types";

/**
 * Loads and instantiates the canonical problem: derived quantities are computed
 * and story templates are field-merged (see instantiateProblem). No component
 * ever sees the raw spec.
 */
export function loadProblem(): ProblemInstance {
  return instantiateProblem(problemJson as unknown as ProblemSpec);
}

/** Instantiate an arbitrary spec (used by fixtures/tests). */
export function loadProblemSpec(spec: ProblemSpec): ProblemInstance {
  return instantiateProblem(spec);
}

export function quantitiesById(problem: ProblemInstance): Map<string, Quantity> {
  return new Map(problem.quantities.map((q) => [q.id, q]));
}

export function getQuantity(problem: ProblemInstance, id: string): Quantity {
  const q = problem.quantities.find((quantity) => quantity.id === id);
  if (!q) throw new Error(`Quantity not found: ${id}`);
  return q;
}

/** id -> computed value. */
export function valueMap(problem: ProblemInstance): Record<string, number> {
  return problem.quantityValues;
}

export function getStep(problem: ProblemInstance, stepId: string): ProblemStep {
  const step = problem.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Step not found: ${stepId}`);
  return step;
}

export function getStepTemplate(
  _problem: ProblemInstance,
  step: ProblemStep,
): RelationshipTemplate {
  return getRelationshipTemplate(step.relationshipTemplateId);
}

/** The role → quantity id mapping is now explicit on each step. */
export function roleToQuantityId(step: ProblemStep): Record<string, string> {
  return step.roleToQuantityId;
}

/** The two operand quantities of a step (its preferred form's operands). */
export function stepOperandIds(step: ProblemStep): [string, string] {
  const form = getEquationForm(step.preferredEquationFormId);
  return [step.roleToQuantityId[form.leftRole]!, step.roleToQuantityId[form.rightRole]!];
}
