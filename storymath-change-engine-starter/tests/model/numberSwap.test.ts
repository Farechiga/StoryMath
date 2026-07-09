import { describe, it, expect } from "vitest";
import {
  evaluateEquation,
  getQuantity,
  getStep,
  loadProblemSpec,
  runOperatorExperiment,
} from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import nasaJson from "../../data/problems/nasa-perseverance-wheel-slip.json";

const base = nasaJson as unknown as ProblemSpec;

/**
 * The framework's core promise: change ONLY the two given inputs and everything
 * downstream (derived values, story prose, equations, grading) follows — no
 * component or stale literal to update.
 */
describe("number swap propagates through the whole model", () => {
  const swapped: ProblemSpec = JSON.parse(JSON.stringify(base));
  const monday = swapped.quantities.find((q) => q.id === "monday_distance")!;
  const diff = swapped.quantities.find((q) => q.id === "tuesday_difference")!;
  const tue = swapped.quantities.find((q) => q.id === "tuesday_distance")!;
  const total = swapped.quantities.find((q) => q.id === "two_day_total")!;
  monday.value = 500;
  diff.value = 175;
  // An author who changes inputs updates the fixture expectations too.
  tue.expectedValueForFixture = 325; // 500 - 175
  total.expectedValueForFixture = 825; // 500 + 325

  const problem = loadProblemSpec(swapped);
  const step1 = getStep(problem, "find_tuesday_distance");
  const step2 = getStep(problem, "find_two_day_total");

  it("recomputes derived quantities from the formula", () => {
    expect(getQuantity(problem, "tuesday_distance").value).toBe(325);
    expect(getQuantity(problem, "two_day_total").value).toBe(825);
  });

  it("re-renders the story brief with the new values (no stale literals)", () => {
    expect(problem.story.brief).toContain("500 meters");
    expect(problem.story.brief).toContain("175 fewer meters");
    expect(problem.story.brief).not.toContain("384");
    expect(problem.story.brief).not.toContain("128");
  });

  it("computes operator experiments from the new operands", () => {
    expect(runOperatorExperiment(problem, step1, "-").computed).toBe(325);
    expect(runOperatorExperiment(problem, step1, "×").computed).toBe(500 * 175);
    expect(runOperatorExperiment(problem, step2, "+").computed).toBe(825);
  });

  it("grades the child against the computed answer", () => {
    const right = evaluateEquation(problem, step1, {
      leftQuantityId: "monday_distance",
      operator: "-",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
      typedAnswer: 325,
    });
    expect(right.answerCorrect).toBe(true);
    const stale = evaluateEquation(problem, step1, {
      leftQuantityId: "monday_distance",
      operator: "-",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
      typedAnswer: 256, // the OLD answer must now be wrong
    });
    expect(stale.answerCorrect).toBe(false);
  });
});
