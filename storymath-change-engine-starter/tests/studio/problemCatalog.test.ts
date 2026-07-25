import { describe, expect, it } from "vitest";
import { orderProblemSpecs, PROBLEMS } from "../../src/studio/problemCatalog";
import type { ProblemSpec } from "../../src/domain";

function spec(id: string, metadata: Partial<ProblemSpec["metadata"]> = {}): ProblemSpec {
  return {
    id,
    metadata: {
      title: id,
      theme: "test",
      gradeBand: "3-4",
      tags: [],
      ...metadata,
    },
    dimension: {
      kind: "count",
      increaseLabel: "More",
      decreaseLabel: "Fewer",
      sameLabel: "Same",
    },
    storyChrome: {
      openingEyebrow: "test",
      startCta: "start",
      finishCta: "finish",
    },
    story: {
      briefTemplate: "test",
    },
    quantities: [],
    steps: [],
    operatorExperiments: [],
    recap: {
      headline: "test",
      causalChain: [],
      calcFromStepId: "step",
      dataQuestion: {
        prompt: "test",
        correctQuantityId: "q",
        distractorQuantityIds: [],
        correctFeedback: "yes",
        incorrectFeedback: "no",
      },
    },
  } as ProblemSpec;
}

describe("orderProblemSpecs", () => {
  it("puts higher catalogOrder first", () => {
    const ordered = orderProblemSpecs([
      spec("older", { catalogOrder: 10 }),
      spec("newer", { catalogOrder: 20 }),
    ]);

    expect(ordered.map((s) => s.id)).toEqual(["newer", "older"]);
  });

  it("groups grade 3-4 problems before grade 2-3 problems", () => {
    const ordered = orderProblemSpecs([
      spec("addition", { gradeBand: "2-3", catalogOrder: 99 }),
      spec("multiplication", { gradeBand: "3-4", catalogOrder: 1 }),
    ]);

    expect(ordered.map((s) => s.id)).toEqual(["multiplication", "addition"]);
  });

  it("uses publishedAt newest-first when catalogOrder is absent", () => {
    const ordered = orderProblemSpecs([
      spec("january", { publishedAt: "2026-01-01" }),
      spec("march", { publishedAt: "2026-03-01" }),
    ]);

    expect(ordered.map((s) => s.id)).toEqual(["march", "january"]);
  });
});

describe("PROBLEMS catalog", () => {
  it("auto-loads every JSON problem pack in data/problems", () => {
    const files = Object.values(
      import.meta.glob("../../data/problems/*.json", {
        eager: true,
        import: "default",
      }),
    ) as ProblemSpec[];
    const fileIds = files.map((spec) => spec.id).sort();
    const catalogIds = PROBLEMS.map((problem) => problem.id).sort();

    expect(catalogIds).toEqual(fileIds);
  });

  it("lists grade 3-4 problem packs before grade 2-3 packs", () => {
    const firstTwoThree = PROBLEMS.findIndex((p) => p.gradeBand === "2-3");

    expect(firstTwoThree).toBeGreaterThan(0);
    expect(PROBLEMS.slice(0, firstTwoThree).every((p) => p.gradeBand === "3-4")).toBe(true);
    expect(PROBLEMS.slice(firstTwoThree).every((p) => p.gradeBand === "2-3")).toBe(true);
    expect(PROBLEMS.slice(0, 6).map((p) => p.id)).toEqual([
      "canine-feline-spirit-day-showdown-v1",
      "planning-pudding-treats-v1",
      "mini-wooden-racers-v1",
      "little-men-reading-clock-v1",
      "fashion_show_fundraiser_frenzy-v1",
      "animation-lab-eyebrows-v1",
    ]);
  });
});
