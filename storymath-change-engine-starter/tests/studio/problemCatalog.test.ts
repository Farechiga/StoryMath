import { describe, expect, it } from "vitest";
import { orderProblemSpecs } from "../../src/studio/problemCatalog";
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

  it("uses publishedAt newest-first when catalogOrder is absent", () => {
    const ordered = orderProblemSpecs([
      spec("january", { publishedAt: "2026-01-01" }),
      spec("march", { publishedAt: "2026-03-01" }),
    ]);

    expect(ordered.map((s) => s.id)).toEqual(["march", "january"]);
  });
});
