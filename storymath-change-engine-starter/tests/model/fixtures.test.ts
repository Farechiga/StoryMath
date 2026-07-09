import { describe, it, expect } from "vitest";
import {
  actualOperatorFor,
  getQuantity,
  getRelationshipTemplate,
  loadProblemSpec,
  numbersEqual,
  runOperatorExperiment,
} from "../../src/domain";
import type { ProblemSpec, VisualModelType } from "../../src/domain";
import nasa from "../../data/problems/nasa-perseverance-wheel-slip.json";
import birding from "../../data/problems/minnesota-birding.json";
import puppy from "../../data/problems/puppy-rescue-biscuits.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";

const FIXTURES: Array<[string, ProblemSpec]> = [
  ["nasa", nasa as unknown as ProblemSpec],
  ["birding", birding as unknown as ProblemSpec],
  ["puppy", puppy as unknown as ProblemSpec],
  ["animation", animation as unknown as ProblemSpec],
];

const EXPECTED_MODEL: Record<string, VisualModelType> = {
  additive_comparison: "comparison_gap_bar",
  part_part_whole: "part_whole_bar",
  start_change_end: "before_change_after_bridge",
  multiplication_division: "repeated_groups_grid",
};

/**
 * Proves the whole fixture family is generic: every acceptance story runs on the
 * same engine with zero component edits — derived values compute, story prose
 * re-renders on a number change, operator experiments compute from operands, the
 * correct visual model is selected per relationship family, and the recap is
 * data-driven.
 */
describe.each(FIXTURES)("fixture: %s", (_name, spec) => {
  const problem = loadProblemSpec(spec);

  it("computes every quantity to a finite number", () => {
    for (const q of problem.quantities) {
      expect(Number.isFinite(q.value)).toBe(true);
    }
  });

  it("each step's fitting operator computes its goal value", () => {
    for (const step of problem.steps) {
      const op = actualOperatorFor(problem, step)!;
      const goal = getQuantity(problem, step.goalQuantityId).value;
      expect(numbersEqual(runOperatorExperiment(problem, step, op).computed, goal)).toBe(true);
    }
  });

  it("selects the registry visual model that matches each step's family", () => {
    for (const step of problem.steps) {
      const template = getRelationshipTemplate(step.relationshipTemplateId);
      expect(template.defaultVisualModels[0]).toBe(EXPECTED_MODEL[template.family]);
    }
  });

  it("has a data-driven recap referencing real quantities", () => {
    const dq = problem.recap.dataQuestion;
    for (const id of [dq.correctQuantityId, ...dq.distractorQuantityIds]) {
      expect(problem.quantities.some((q) => q.id === id)).toBe(true);
    }
    expect(problem.steps.some((s) => s.id === problem.recap.calcFromStepId)).toBe(true);
  });

  it("re-renders story prose and re-computes goals when one input changes", () => {
    const before = problem.story.brief;
    const swapped: ProblemSpec = JSON.parse(JSON.stringify(spec));
    const firstGiven = swapped.quantities.find((q) => !q.derived)!;
    firstGiven.value = (firstGiven.value as number) + 100;
    for (const q of swapped.quantities) delete q.expectedValueForFixture;

    const next = loadProblemSpec(swapped);
    expect(next.story.brief).not.toEqual(before); // prose followed the value
    for (const step of next.steps) {
      const op = actualOperatorFor(next, step)!;
      const goal = getQuantity(next, step.goalQuantityId).value;
      expect(numbersEqual(runOperatorExperiment(next, step, op).computed, goal)).toBe(true);
    }
  });
});
