import { describe, it, expect } from "vitest";
import { getEquationForm, isProblemValid, loadProblemSpec, validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";

/**
 * The authored operation packs. Proves each one loads, validates, computes
 * its derived values to the authored expectations, exposes exactly one "actual"
 * operator experiment per step with full operator coverage, and never bakes a
 * modeled number into field-merged prose.
 */
const PACKS: Array<[string, ProblemSpec]> = Object.entries(
  import.meta.glob("../../data/problems/*.json", {
    eager: true,
    import: "default",
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, spec]) => [path.split("/").pop()!.replace(/\.json$/, ""), spec as ProblemSpec]);

/** Every field the engine field-merges (tokens allowed, raw numbers not). */
function mergedProse(spec: ProblemSpec): string[] {
  const out: string[] = [spec.story.briefTemplate];
  if (spec.story.closingNoteTemplate) out.push(spec.story.closingNoteTemplate);
  out.push(
    spec.recap.headline,
    ...spec.recap.causalChain,
    spec.recap.dataQuestion.prompt,
    spec.recap.dataQuestion.correctFeedback,
    spec.recap.dataQuestion.incorrectFeedback,
  );
  for (const e of spec.operatorExperiments) if (e.alternateWorldTemplate) out.push(e.alternateWorldTemplate);
  return out;
}

describe.each(PACKS)("authored pack: %s", (_name, spec) => {
  it("validates with zero errors and zero warnings", () => {
    const issues = validateProblem(spec);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues.filter((i) => i.severity === "warning")).toEqual([]);
    expect(isProblemValid(spec)).toBe(true);
  });

  it("instantiates and computes every derived value to its expectedValueForFixture", () => {
    const inst = loadProblemSpec(spec);
    for (const q of spec.quantities) {
      if (q.expectedValueForFixture === undefined) continue;
      const computed = inst.quantities.find((x) => x.id === q.id);
      expect(computed?.value).toBe(q.expectedValueForFixture);
    }
    // Every authored step has a goal solved to a finite number.
    expect(spec.steps).toHaveLength(2);
    for (const step of spec.steps) {
      const goal = inst.quantities.find((x) => x.id === step.goalQuantityId);
      expect(Number.isFinite(goal?.value)).toBe(true);
    }
  });

  it("has exactly one actual experiment per step and covers every offered operator", () => {
    for (const step of spec.steps) {
      const exps = spec.operatorExperiments.filter((e) => e.stepId === step.id);
      expect(exps.filter((e) => e.narrativeFit === "actual")).toHaveLength(1);
      const ops = new Set(exps.map((e) => e.operator));
      for (const op of step.operatorOptions) expect(ops.has(op)).toBe(true);
    }
  });

  it("uses grade 3-4 only when the actual model includes multiplication or division", () => {
    const operators = spec.steps.map((step) => getEquationForm(step.preferredEquationFormId).operator);
    const includesMultiplicationOrDivision = operators.some((operator) => operator === "×" || operator === "÷");

    expect(spec.metadata.gradeBand).toBe(includesMultiplicationOrDivision ? "3-4" : "2-3");
  });

  it("never bakes a modeled number into field-merged prose (tokens only)", () => {
    for (const text of mergedProse(spec)) {
      const withoutTokens = text.replace(/\{[^}]+\}/g, "");
      expect(withoutTokens).not.toMatch(/\d/);
    }
  });

  it("does not leak unresolved field-merge tokens into instantiated game text", () => {
    const inst = loadProblemSpec(spec);
    const childFacing = [
      inst.story.brief,
      inst.story.closingNote ?? "",
      ...inst.steps.flatMap((step) => [
        step.prompt,
        step.reasoningPrompt,
        step.backwardCheck.prompt,
      ]),
      inst.recap.headline,
      ...inst.recap.causalChain,
      inst.recap.dataQuestion.prompt,
      inst.recap.dataQuestion.correctFeedback,
      inst.recap.dataQuestion.incorrectFeedback,
      inst.recap.decisionQuestion?.prompt ?? "",
      inst.recap.decisionQuestion?.correctFeedback ?? "",
      inst.recap.decisionQuestion?.incorrectFeedback ?? "",
    ];

    for (const text of childFacing) {
      expect(text).not.toMatch(/\{(?:quantity|value|unit|label):/);
    }
  });
});
