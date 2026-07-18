import { describe, it, expect } from "vitest";
import { isProblemValid, loadProblemSpec, validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import owl from "../../data/problems/minnesota-owl-snow-tracks.json";
import women from "../../data/problems/little-women-storm-reading.json";
import aikido from "../../data/problems/aikido-sliding-mat-rolls.json";
import lunar from "../../data/problems/lunar-cookie-constellation.json";
import mars from "../../data/problems/mars-rover-versatility-dust-storm.json";
import monarchs from "../../data/problems/monarch-prairie-citizen-science.json";
import tidePool from "../../data/problems/tide-pool-rising-water.json";
import sourdough from "../../data/problems/sourdough-armadillo-rolls.json";
import carol from "../../data/problems/christmas-carol-seat-crisis.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";

/**
 * The authored operation packs. Proves each one loads, validates, computes
 * its derived values to the authored expectations, exposes exactly one "actual"
 * operator experiment per step with full operator coverage, and never bakes a
 * modeled number into field-merged prose.
 */
const PACKS: Array<[string, ProblemSpec]> = [
  ["minnesota-owl-snow-tracks", owl as unknown as ProblemSpec],
  ["little-women-storm-reading", women as unknown as ProblemSpec],
  ["aikido-sliding-mat-rolls", aikido as unknown as ProblemSpec],
  ["lunar-cookie-constellation", lunar as unknown as ProblemSpec],
  ["mars-rover-versatility-dust-storm", mars as unknown as ProblemSpec],
  ["monarch-prairie-citizen-science", monarchs as unknown as ProblemSpec],
  ["tide-pool-rising-water", tidePool as unknown as ProblemSpec],
  ["sourdough-armadillo-rolls", sourdough as unknown as ProblemSpec],
  ["christmas-carol-seat-crisis", carol as unknown as ProblemSpec],
  ["animation-lab-eyebrows", animation as unknown as ProblemSpec],
];

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

  it("never bakes a modeled number into field-merged prose (tokens only)", () => {
    for (const text of mergedProse(spec)) {
      const withoutTokens = text.replace(/\{[^}]+\}/g, "");
      expect(withoutTokens).not.toMatch(/\d/);
    }
  });
});
