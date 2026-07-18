import { describe, it, expect } from "vitest";
import { isProblemValid, validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import nasaJson from "../../data/problems/nasa-perseverance-wheel-slip.json";
import animationJson from "../../data/problems/animation-lab-eyebrows.json";

const spec = nasaJson as unknown as ProblemSpec;
const clone = (): ProblemSpec => JSON.parse(JSON.stringify(spec)) as ProblemSpec;
const animationSpec = animationJson as unknown as ProblemSpec;
const cloneAnimation = (): ProblemSpec => JSON.parse(JSON.stringify(animationSpec)) as ProblemSpec;

describe("validateProblem (canonical NASA spec)", () => {
  it("has no validation errors", () => {
    const errors = validateProblem(spec).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(isProblemValid(spec)).toBe(true);
  });

  it("allows multiplication as an actual authored operation", () => {
    const errors = validateProblem(animationSpec).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(isProblemValid(animationSpec)).toBe(true);
  });
});

describe("validateProblem (mutations)", () => {
  it("flags a role mapped to an unknown quantity", () => {
    const bad = clone();
    bad.steps[0]!.roleToQuantityId.bigger = "ghost_quantity";
    const errors = validateProblem(bad).filter((i) => i.severity === "error");
    expect(errors.some((e) => e.message.includes("ghost_quantity"))).toBe(true);
  });

  it("flags a derived value that no longer matches its fixture expectation", () => {
    const bad = clone();
    // Change an input so the derived Tuesday distance (256) no longer computes.
    bad.quantities.find((q) => q.id === "monday_distance")!.value = 999;
    const errors = validateProblem(bad).filter((i) => i.severity === "error");
    expect(errors.some((e) => e.message.includes("Instantiation failed"))).toBe(true);
  });

  it("flags an offered operator that has no authored experiment", () => {
    const bad = clone();
    bad.operatorExperiments = bad.operatorExperiments.filter(
      (e) => !(e.stepId === "find_tuesday_distance" && e.operator === "×"),
    );
    const errors = validateProblem(bad).filter((i) => i.severity === "error");
    expect(errors.some((e) => e.message.includes("no authored experiment"))).toBe(true);
  });

  it("warns when child-facing prose bakes a bare modeled literal", () => {
    const bad = clone();
    bad.story.briefTemplate = "It drove 384 meters on Monday.";
    const warnings = validateProblem(bad).filter((i) => i.severity === "warning");
    expect(warnings.some((w) => w.message.includes("bare modeled literal"))).toBe(true);
  });

  it("allows division as an actual operation with different operand units", () => {
    const divided = cloneAnimation();
    const step = divided.steps[0]!;
    step.relationshipTemplateId = "division_equal_sharing";
    step.roleToQuantityId = {
      total: "eye_eyebrow_expressions",
      groups: "eye_shapes",
      itemsPerGroup: "eyebrow_shapes",
    };
    step.goalQuantityId = "eyebrow_shapes";
    step.acceptedEquationFormIds = ["total_divided_by_groups_equals_items"];
    step.preferredEquationFormId = "total_divided_by_groups_equals_items";
    step.expectedDirection = "split";
    step.backwardCheck.acceptedEquationFormIds = ["groups_times_items_equals_total"];
    divided.quantities.find((q) => q.id === "eye_eyebrow_expressions")!.unit = "expressions";
    divided.quantities.find((q) => q.id === "eye_shapes")!.unit = "eye-shape groups";

    for (const exp of divided.operatorExperiments.filter((e) => e.stepId === step.id)) {
      exp.narrativeFit = exp.operator === "÷" ? "actual" : "different_question";
    }

    const errors = validateProblem(divided).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(isProblemValid(divided)).toBe(true);
  });
});
