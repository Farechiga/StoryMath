import { describe, it, expect } from "vitest";
import {
  backwardCheckReconciles,
  buildBackwardCheck,
  buildBackwardChecks,
  getStep,
  isBackwardCheckCorrect,
  loadProblem,
} from "../../src/domain";

const problem = loadProblem();
const step1 = getStep(problem, "find_tuesday_distance");
const step2 = getStep(problem, "find_two_day_total");

describe("backward check construction (step 1)", () => {
  const frame = buildBackwardCheck(problem, step1);

  it("builds smaller + difference = bigger (256 + 128 = 384)", () => {
    expect(frame.equationFormId).toBe("smaller_plus_difference_equals_bigger");
    expect(frame.leftQuantityId).toBe("tuesday_distance");
    expect(frame.operator).toBe("+");
    expect(frame.rightQuantityId).toBe("tuesday_difference");
    expect(frame.resultQuantityId).toBe("monday_distance");
    expect(frame.expectedResult).toBe(384);
  });

  it("accepts 384 and rejects other numbers", () => {
    expect(isBackwardCheckCorrect(frame, 384)).toBe(true);
    expect(isBackwardCheckCorrect(frame, 383)).toBe(false);
  });

  it("reconciles against the stored quantity value", () => {
    expect(backwardCheckReconciles(problem, frame)).toBe(true);
  });
});

describe("backward check construction (step 2)", () => {
  const frames = buildBackwardChecks(problem, step2);

  it("offers only the check that lands on the original Monday value (640 − 256 = 384)", () => {
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      leftQuantityId: "two_day_total",
      operator: "-",
      rightQuantityId: "tuesday_distance",
      resultQuantityId: "monday_distance",
      expectedResult: 384,
    });
  });

  it("the check reconciles with computed values", () => {
    expect(backwardCheckReconciles(problem, frames[0]!)).toBe(true);
  });
});
