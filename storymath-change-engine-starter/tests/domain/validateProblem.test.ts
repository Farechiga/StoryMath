import { describe, it, expect } from "vitest";
import { isProblemValid, validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import nasaJson from "../../data/problems/nasa-perseverance-wheel-slip.json";

const spec = nasaJson as unknown as ProblemSpec;
const clone = (): ProblemSpec => JSON.parse(JSON.stringify(spec)) as ProblemSpec;

describe("validateProblem (canonical NASA spec)", () => {
  it("has no validation errors", () => {
    const errors = validateProblem(spec).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(isProblemValid(spec)).toBe(true);
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
});
