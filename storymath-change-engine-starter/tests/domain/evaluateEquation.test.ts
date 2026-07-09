import { describe, it, expect } from "vitest";
import {
  acceptedConcreteForms,
  evaluateEquation,
  getStep,
  loadProblem,
} from "../../src/domain";

const problem = loadProblem();
const step1 = getStep(problem, "find_tuesday_distance");
const step2 = getStep(problem, "find_two_day_total");

describe("explicit role mapping", () => {
  it("maps comparison roles from the step", () => {
    expect(step1.roleToQuantityId).toMatchObject({
      bigger: "monday_distance",
      difference: "tuesday_difference",
      smaller: "tuesday_distance",
    });
  });

  it("maps part-whole roles from the step", () => {
    expect(step2.roleToQuantityId).toMatchObject({
      partA: "monday_distance",
      partB: "tuesday_distance",
      whole: "two_day_total",
    });
  });
});

describe("acceptedConcreteForms", () => {
  it("expands the accepted comparison form to quantity ids", () => {
    const forms = acceptedConcreteForms(problem, step1);
    expect(forms).toContainEqual({
      formId: "bigger_minus_difference_equals_smaller",
      leftQuantityId: "monday_distance",
      operator: "-",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
    });
  });
});

describe("evaluateEquation (step 1)", () => {
  it("accepts bigger − difference = smaller as a semantic match that fits the story", () => {
    const evalr = evaluateEquation(problem, step1, {
      leftQuantityId: "monday_distance",
      operator: "-",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
      typedAnswer: 256,
    });
    expect(evalr.semanticMatch).toBe(true);
    expect(evalr.operatorFitsStory).toBe(true);
    expect(evalr.numericModelResult).toBe(256);
    expect(evalr.answerCorrect).toBe(true);
    expect(evalr.feedbackMode).toBe("actual");
  });

  it("treats addition as a valid frame but a counterfactual (not a semantic match here)", () => {
    const evalr = evaluateEquation(problem, step1, {
      leftQuantityId: "monday_distance",
      operator: "+",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
    });
    expect(evalr.semanticMatch).toBe(false);
    expect(evalr.operatorFitsStory).toBe(false);
    expect(evalr.feedbackMode).toBe("different_story");
    expect(evalr.numericModelResult).toBe(512);
  });

  it("separates model correctness from arithmetic: right model, wrong number", () => {
    const evalr = evaluateEquation(problem, step1, {
      leftQuantityId: "monday_distance",
      operator: "-",
      rightQuantityId: "tuesday_difference",
      resultQuantityId: "tuesday_distance",
      typedAnswer: 999,
    });
    expect(evalr.semanticMatch).toBe(true);
    expect(evalr.answerCorrect).toBe(false);
  });
});

describe("evaluateEquation (step 2)", () => {
  it("accepts part + part = whole in either operand order (commutative)", () => {
    const forward = evaluateEquation(problem, step2, {
      leftQuantityId: "monday_distance",
      operator: "+",
      rightQuantityId: "tuesday_distance",
      resultQuantityId: "two_day_total",
      typedAnswer: 640,
    });
    const swapped = evaluateEquation(problem, step2, {
      leftQuantityId: "tuesday_distance",
      operator: "+",
      rightQuantityId: "monday_distance",
      resultQuantityId: "two_day_total",
      typedAnswer: 640,
    });
    expect(forward.semanticMatch).toBe(true);
    expect(swapped.semanticMatch).toBe(true);
    expect(forward.answerCorrect).toBe(true);
  });
});
