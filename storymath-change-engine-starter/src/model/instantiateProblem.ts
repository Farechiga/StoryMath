// src/model/instantiateProblem.ts
//
// Turns an authored ProblemSpec into a frozen InstantiatedProblem: derived
// quantities are COMPUTED (never graded against an authored literal), and
// curated prose is field-merged against the computed values. This is the only
// place values enter the app.

import { EQUATION_FORMS } from "./relationshipRegistry";
import { numbersEqual, resolveEquationFromRoles } from "./formulaEvaluator";
import { resolveTemplate, type MergeQuantity } from "./fieldMerge";
import type {
  InstantiatedProblem,
  ProblemSpec,
  Quantity,
  QuantitySpec,
} from "./problemSpec";

function computeValues(quantities: QuantitySpec[]): Record<string, number> {
  const values: Record<string, number> = {};
  const pending: QuantitySpec[] = [];

  // Seed givens.
  for (const q of quantities) {
    if (q.derived) {
      pending.push(q);
    } else if (typeof q.value === "number") {
      values[q.id] = q.value;
    } else {
      throw new Error(`Quantity "${q.id}" has no value and no derived formula.`);
    }
  }

  // Resolve derived quantities in dependency order.
  let guard = pending.length + 1;
  while (pending.length > 0 && guard-- > 0) {
    let progressed = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i]!;
      const d = q.derived!;
      const form = EQUATION_FORMS[d.formulaId];
      if (!form) throw new Error(`Quantity "${q.id}" uses unknown formulaId "${d.formulaId}".`);

      const operandIds = Object.values(d.operands);
      if (!operandIds.every((id) => values[id] !== undefined)) continue; // deps not ready

      const roleToQuantityId = { ...d.operands, [form.resultRole]: q.id };
      const { resultValue } = resolveEquationFromRoles({
        formulaId: d.formulaId,
        roleToQuantityId,
        quantityValues: values,
      });
      values[q.id] = resultValue;

      if (q.expectedValueForFixture !== undefined && !numbersEqual(resultValue, q.expectedValueForFixture)) {
        throw new Error(
          `Derived "${q.id}" computed ${resultValue} but expectedValueForFixture is ${q.expectedValueForFixture}.`,
        );
      }
      pending.splice(i, 1);
      progressed = true;
    }
    if (!progressed) break;
  }

  if (pending.length > 0) {
    throw new Error(
      `Could not resolve derived quantities (cycle or missing dependency): ${pending
        .map((q) => q.id)
        .join(", ")}.`,
    );
  }
  return values;
}

export function instantiateProblem(spec: ProblemSpec): InstantiatedProblem {
  const values = computeValues(spec.quantities);

  const quantities: Quantity[] = spec.quantities.map((q) => ({
    id: q.id,
    label: q.label,
    unit: q.unit,
    ...(q.unitSingular ? { unitSingular: q.unitSingular } : {}),
    ...(q.unitPlural ? { unitPlural: q.unitPlural } : {}),
    value: values[q.id]!,
    ...(q.semanticRole ? { semanticRole: q.semanticRole } : {}),
    visibility: q.visibility,
  }));

  const mergeMap: Record<string, MergeQuantity> = {};
  for (const q of quantities) {
    mergeMap[q.id] = {
      value: q.value,
      unit: q.unit,
      ...(q.unitSingular ? { unitSingular: q.unitSingular } : {}),
      ...(q.unitPlural ? { unitPlural: q.unitPlural } : {}),
      label: q.label,
    };
  }

  const merge = (t: string) => resolveTemplate(t, mergeMap);

  const brief = merge(spec.story.briefTemplate);
  const closingNote = spec.story.closingNoteTemplate ? merge(spec.story.closingNoteTemplate) : undefined;

  // Recap prose is field-merged too, so a recap question can reference model
  // labels/values without freezing a literal.
  const recap = {
    ...spec.recap,
    headline: merge(spec.recap.headline),
    causalChain: spec.recap.causalChain.map(merge),
    dataQuestion: {
      ...spec.recap.dataQuestion,
      prompt: merge(spec.recap.dataQuestion.prompt),
      correctFeedback: merge(spec.recap.dataQuestion.correctFeedback),
      incorrectFeedback: merge(spec.recap.dataQuestion.incorrectFeedback),
    },
  };

  return {
    id: spec.id,
    metadata: spec.metadata,
    dimension: spec.dimension,
    storyChrome: spec.storyChrome,
    story: {
      brief,
      ...(spec.story.causalEvent ? { causalEvent: spec.story.causalEvent } : {}),
      ...(closingNote ? { closingNote } : {}),
    },
    quantities,
    steps: spec.steps,
    operatorExperiments: spec.operatorExperiments,
    recap,
    quantityValues: values,
  };
}
