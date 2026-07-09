import { describe, it, expect } from "vitest";
import {
  actualOperatorFor,
  findExperiment,
  getStep,
  loadProblem,
  runOperatorExperiment,
  stepOperandIds,
} from "../../src/domain";

const problem = loadProblem();
const step1 = getStep(problem, "find_tuesday_distance");
const step2 = getStep(problem, "find_two_day_total");

describe("operator experiment selection (step 1)", () => {
  it("addition is a different-story world that increases (384 + 128 = 512)", () => {
    const r = runOperatorExperiment(problem, step1, "+");
    expect(r.computed).toBe(512);
    expect(r.narrativeFit).toBe("different_story");
    expect(r.directionProduced).toBe("increase");
    expect(r.fitsStory).toBe(false);
  });

  it("subtraction is the actual story (384 − 128 = 256)", () => {
    const r = runOperatorExperiment(problem, step1, "-");
    expect(r.computed).toBe(256);
    expect(r.narrativeFit).toBe("actual");
    expect(r.fitsStory).toBe(true);
  });

  it("multiplication is a different question (384 × 128 = 49,152)", () => {
    const r = runOperatorExperiment(problem, step1, "×");
    expect(r.computed).toBe(49152);
    expect(r.narrativeFit).toBe("different_question");
  });

  it("division is a different question (384 ÷ 128 = 3)", () => {
    const r = runOperatorExperiment(problem, step1, "÷");
    expect(r.computed).toBe(3);
    expect(r.narrativeFit).toBe("different_question");
  });

  it("resolves the actual operator without any story id", () => {
    expect(actualOperatorFor(problem, step1)).toBe("-");
  });
});

describe("operator experiment selection (step 2)", () => {
  it("addition combines both days (384 + 256 = 640)", () => {
    const r = runOperatorExperiment(problem, step2, "+");
    expect(r.computed).toBe(640);
    expect(r.narrativeFit).toBe("actual");
    expect(r.fitsStory).toBe(true);
  });

  it("subtraction finds the gap, not the total (384 − 256 = 128)", () => {
    const r = runOperatorExperiment(problem, step2, "-");
    expect(r.computed).toBe(128);
    expect(r.narrativeFit).toBe("different_question");
  });

  it("resolves the actual operator as addition", () => {
    expect(actualOperatorFor(problem, step2)).toBe("+");
  });
});

describe("findExperiment", () => {
  it("matches on stepId + operator", () => {
    const exp = findExperiment(problem, "find_tuesday_distance", "-");
    expect(exp?.narrativeFit).toBe("actual");
  });
  it("returns undefined for an unauthored pair", () => {
    expect(findExperiment(problem, "nope", "+")).toBeUndefined();
  });
});

describe("stepOperandIds (canonical operands)", () => {
  it("uses the preferred form's operands via explicit role mapping", () => {
    expect(stepOperandIds(step1)).toEqual(["monday_distance", "tuesday_difference"]);
    expect(stepOperandIds(step2)).toEqual(["monday_distance", "tuesday_distance"]);
  });
});
