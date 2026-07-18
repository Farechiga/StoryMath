import { instantiateProblem } from "../model/instantiateProblem";
import { bareModeledLiterals } from "../model/fieldMerge";
import { unitsCompatible } from "./calculate";
import {
  EQUATION_FORMS,
  RELATIONSHIP_TEMPLATES,
  getEquationForm,
  type FormulaId,
} from "../model/relationshipRegistry";
import type { ProblemSpec } from "../model/problemSpec";

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

/**
 * Validates an authored ProblemSpec: derived values compute (and match any
 * fixture expectation), roles resolve, every offered operator has an
 * experiment, backward forms are valid, recap references exist, and child-facing
 * prose has no bare literals that duplicate modeled values.
 */
export function validateProblem(spec: ProblemSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (m: string) => issues.push({ severity: "error", message: m });
  const warn = (m: string) => issues.push({ severity: "warning", message: m });

  const quantityIds = new Set<string>();
  for (const q of spec.quantities) {
    if (quantityIds.has(q.id)) err(`Duplicate quantity id: ${q.id}`);
    quantityIds.add(q.id);
  }
  const has = (id: string) => quantityIds.has(id);

  // Instantiate: computes derived values + checks expectedValueForFixture.
  let values: Record<string, number> = {};
  try {
    values = instantiateProblem(spec).quantityValues;
  } catch (e) {
    err(`Instantiation failed: ${(e as Error).message}`);
  }
  const modeledValues = Object.values(values);

  const validForm = (id: string): id is FormulaId => id in EQUATION_FORMS;

  for (const step of spec.steps) {
    const template = RELATIONSHIP_TEMPLATES[step.relationshipTemplateId];
    if (!template) {
      err(`Step ${step.id} references unknown relationship template ${step.relationshipTemplateId}.`);
      continue;
    }
    // roleToQuantityId covers every template role and resolves.
    for (const role of template.roles) {
      const qid = step.roleToQuantityId[role];
      if (!qid) err(`Step ${step.id} does not map role "${role}".`);
      else if (!has(qid)) err(`Step ${step.id} maps role "${role}" to unknown quantity ${qid}.`);
    }
    if (!has(step.goalQuantityId)) {
      err(`Step ${step.id} goal quantity ${step.goalQuantityId} does not exist.`);
    }

    // equation forms valid + roles resolvable
    const allFormIds = [
      step.preferredEquationFormId,
      ...step.acceptedEquationFormIds,
      ...step.backwardCheck.acceptedEquationFormIds,
    ];
    for (const fid of allFormIds) {
      if (!validForm(fid)) {
        err(`Step ${step.id} references unknown equation form ${fid}.`);
        continue;
      }
      const form = getEquationForm(fid);
      for (const role of [form.leftRole, form.rightRole, form.resultRole]) {
        if (!step.roleToQuantityId[role]) {
          err(`Step ${step.id}: form ${fid} needs role "${role}" which is not mapped.`);
        }
      }
    }

    // every offered operator has an authored experiment
    for (const op of step.operatorOptions) {
      const exp = spec.operatorExperiments.find((e) => e.stepId === step.id && e.operator === op);
      if (!exp) err(`Step ${step.id} offers operator "${op}" with no authored experiment.`);
    }

    // exactly one actual experiment
    const actuals = spec.operatorExperiments.filter(
      (e) => e.stepId === step.id && e.narrativeFit === "actual",
    );
    if (actuals.length !== 1) {
      err(`Step ${step.id} should have exactly one "actual" operator experiment (has ${actuals.length}).`);
    }

    // Unit compatibility of the preferred operands. Addition and subtraction
    // combine comparable quantities; multiplication and division may relate
    // different units, such as kids × stickers-per-kid or bowls ÷ bowls-per-root.
    if (validForm(step.preferredEquationFormId)) {
      const form = getEquationForm(step.preferredEquationFormId);
      const l = spec.quantities.find((q) => q.id === step.roleToQuantityId[form.leftRole]);
      const r = spec.quantities.find((q) => q.id === step.roleToQuantityId[form.rightRole]);
      if (l && r && (form.operator === "+" || form.operator === "-") && !unitsCompatible(l.unit, r.unit)) {
        err(`Step ${step.id}: operands have incompatible units (${l.unit} vs ${r.unit}).`);
      }
    }
  }

  // operator experiments reference valid steps
  for (const exp of spec.operatorExperiments) {
    if (!spec.steps.some((s) => s.id === exp.stepId)) {
      err(`Operator experiment references unknown step ${exp.stepId}.`);
    }
  }

  // recap references
  if (!spec.steps.some((s) => s.id === spec.recap.calcFromStepId)) {
    err(`recap.calcFromStepId ${spec.recap.calcFromStepId} is not a step.`);
  }
  for (const id of [spec.recap.dataQuestion.correctQuantityId, ...spec.recap.dataQuestion.distractorQuantityIds]) {
    if (!has(id)) err(`recap dataQuestion references unknown quantity ${id}.`);
  }

  // prose lint: bare literals duplicating modeled values
  const proseFields: Array<[string, string | undefined]> = [
    ["story.briefTemplate", spec.story.briefTemplate],
    ["story.closingNoteTemplate", spec.story.closingNoteTemplate],
    ...spec.operatorExperiments.map(
      (e, i): [string, string | undefined] => [`operatorExperiments[${i}].alternateWorldTemplate`, e.alternateWorldTemplate],
    ),
  ];
  for (const [name, text] of proseFields) {
    if (!text) continue;
    const bare = bareModeledLiterals(text, modeledValues);
    if (bare.length) {
      warn(`${name} contains bare modeled literal(s) ${bare.join(", ")} — use a {value:…}/{quantity:…} token.`);
    }
  }

  return issues;
}

export function isProblemValid(spec: ProblemSpec): boolean {
  return validateProblem(spec).every((i) => i.severity !== "error");
}
