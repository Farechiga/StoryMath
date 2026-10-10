import type { ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import draftProblemHandler from "../../api/draft-problem";
import libraryProblem from "../../data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json";
import theatreProblem from "../../data/problems/tilly_s_theatre_bookmark_fundraiser-v1.json";
import { validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/model/problemSpec";

type ResponseDouble = ServerResponse & {
  bodyText?: string;
};

function responseDouble(): ResponseDouble {
  return {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(function end(this: ResponseDouble, payload?: unknown) {
      this.bodyText = String(payload ?? "");
    }),
  } as unknown as ResponseDouble;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Vercel OpenAI draft API", () => {
  it("validates the authoring secret and requests structured StoryMath JSON from OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    vi.stubEnv("STORYMATH_DRAFTER_MODEL", "gpt-test-drafter");

    const modelSpec = {
      ...(libraryProblem as ProblemSpec),
      metadata: {
        ...(libraryProblem as ProblemSpec).metadata,
        curiosityNote: null,
      },
      story: {
        ...(libraryProblem as ProblemSpec).story,
        closingNoteTemplate: null,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(modelSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          fallbackTitle: "Underlibrary carts",
          rawProblem:
            "Tilly and Oskar received 8 boxes of classics. Each box has 30 books. The carts can hold 50 books each. Will 5 carts be enough?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe("openai");
    expect(payload.model).toBe("gpt-test-drafter");
    expect(payload.spec.id).toBe((libraryProblem as ProblemSpec).id);
    expect(payload.spec.metadata.curiosityNote).toBeUndefined();
    expect(payload.spec.story.closingNoteTemplate).toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.openai.com/v1/responses");
    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(request.method).toBe("POST");
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer sk-storymath-test");
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe("gpt-test-drafter");
    expect(body.reasoning.effort).toBe("minimal");
    expect(body.max_output_tokens).toBe(5000);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.name).toBe("storymath_problem_spec");
    expect(body.input[1].content).toContain("Will 5 carts be enough?");
  });

  it("rejects requests with the wrong authoring secret before calling OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "wrong",
          rawProblem: "A test problem",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.bodyText ?? "{}").error).toMatch(/secret/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repairs common model draft omissions before returning the problem spec", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");

    const brokenSpec = JSON.parse(JSON.stringify(theatreProblem)) as ProblemSpec;
    brokenSpec.metadata.title = "New StoryMath problem";
    brokenSpec.metadata.theme = "library";
    for (const step of brokenSpec.steps) {
      if (step.relationshipTemplateId !== "multiplication_equal_groups") continue;
      step.roleToQuantityId = {
        groups: step.roleToQuantityId.groups!,
        items: step.roleToQuantityId.itemsPerGroup!,
        total: step.roleToQuantityId.total!,
      };
    }
    for (const quantity of brokenSpec.quantities) {
      if (quantity.derived?.formulaId !== "groups_times_items_equals_total") continue;
      quantity.derived.operands = {
        groups: quantity.derived.operands.groups!,
        items: quantity.derived.operands.itemsPerGroup!,
      };
    }
    brokenSpec.operatorExperiments = brokenSpec.operatorExperiments.filter(
      (experiment) => experiment.narrativeFit === "actual",
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(brokenSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          rawProblem:
            "Tilly and Oskar were offered an internship at the Underlibrary. They received 8 boxes of classics. Each box has 30 books. The book carts can hold 50 books each. Will 5 carts be enough to move all the boxes?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    const repaired = payload.spec as ProblemSpec;
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes("itemsPerGroup"))).toBe(true);
    expect(repaired.metadata.title).not.toBe("New StoryMath problem");
    expect(repaired.metadata.theme).toBe("Will the carts be enough?");
    expect(repaired.steps.every((step) => step.roleToQuantityId.itemsPerGroup)).toBe(true);
    expect(
      repaired.quantities
        .filter((quantity) => quantity.derived?.formulaId === "groups_times_items_equals_total")
        .every((quantity) => quantity.derived?.operands.itemsPerGroup),
    ).toBe(true);
    for (const step of repaired.steps) {
      expect(repaired.operatorExperiments.filter((experiment) => experiment.stepId === step.id)).toHaveLength(4);
    }
    expect(validateProblem(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("repairs model drafts that leave a comparison result unmapped and underived", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");

    const brokenSpec = JSON.parse(JSON.stringify(theatreProblem)) as ProblemSpec;
    brokenSpec.quantities.push({
      id: "pack_suffices",
      label: {
        child: "Extra money after buying the theatre package",
        compact: "Extra money",
        lowercase: "extra money",
      },
      unit: "pounds",
      unitSingular: "pound",
      unitPlural: "pounds",
      value: null,
      visibility: "find",
    });
    brokenSpec.steps.push({
      id: "step3_compare_pack",
      order: 3,
      prompt: "How much money is left after Tilly pays for the theatre package?",
      reasoningPrompt: "Compare the bookmark revenue with the theatre package cost.",
      relationshipTemplateId: "additive_comparison_decrease",
      roleToQuantityId: {
        bigger: "bookmark_revenue",
        difference: "package_cost",
      },
      goalQuantityId: "pack_suffices",
      acceptedEquationFormIds: ["bigger_minus_difference_equals_smaller"],
      preferredEquationFormId: "bigger_minus_difference_equals_smaller",
      expectedDirection: "decrease",
      operatorOptions: ["+", "-", "×", "÷"],
      backwardCheck: {
        prompt: "How can you check the comparison?",
        acceptedEquationFormIds: ["smaller_plus_difference_equals_bigger"],
      },
    });
    brokenSpec.operatorExperiments = brokenSpec.operatorExperiments.filter(
      (experiment) => experiment.narrativeFit === "actual",
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(brokenSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          rawProblem:
            "Tilly makes bookmarks to raise money for a theatre package. The bookmarks earn £300 and the package costs £289. Will the money be enough?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    const repaired = payload.spec as ProblemSpec;
    const comparisonStep = repaired.steps.find((step) => step.id === "step3_compare_pack")!;
    const packSuffices = repaired.quantities.find((quantity) => quantity.id === "pack_suffices")!;

    expect(comparisonStep.roleToQuantityId.smaller).toBe("pack_suffices");
    expect(packSuffices.derived).toEqual({
      formulaId: "bigger_minus_difference_equals_smaller",
      operands: {
        bigger: "bookmark_revenue",
        difference: "package_cost",
      },
    });
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes("used the goal quantity as smaller"))).toBe(true);
    expect(validateProblem(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("repairs start-change-end drafts that omit the needed amount as change", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");

    const brokenSpec = JSON.parse(JSON.stringify(theatreProblem)) as ProblemSpec;
    brokenSpec.quantities.push(
      {
        id: "pack_stickers",
        label: {
          child: "Flower stickers in one pack",
          compact: "Pack stickers",
          lowercase: "flower stickers in one pack",
        },
        unit: "stickers",
        unitSingular: "sticker",
        unitPlural: "stickers",
        value: 150,
        visibility: "given",
      },
      {
        id: "stickers_needed",
        label: {
          child: "Flower stickers needed for the project",
          compact: "Stickers needed",
          lowercase: "flower stickers needed",
        },
        unit: "stickers",
        unitSingular: "sticker",
        unitPlural: "stickers",
        value: 180,
        visibility: "revealed_after_step",
      },
      {
        id: "stickers_remaining",
        label: {
          child: "Flower stickers left after the project",
          compact: "Stickers left",
          lowercase: "flower stickers left",
        },
        unit: "stickers",
        unitSingular: "sticker",
        unitPlural: "stickers",
        value: -30,
        visibility: "find",
      },
    );
    brokenSpec.steps.push({
      id: "step3",
      order: 3,
      prompt: "Will one pack of flower stickers be enough?",
      reasoningPrompt: "Compare the pack size with the stickers needed for the collage.",
      relationshipTemplateId: "start_change_end_decrease",
      roleToQuantityId: {
        start: "pack_stickers",
        end: "stickers_remaining",
      },
      goalQuantityId: "stickers_remaining",
      acceptedEquationFormIds: ["start_minus_change_equals_end"],
      preferredEquationFormId: "start_minus_change_equals_end",
      expectedDirection: "decrease",
      operatorOptions: ["+", "-", "×", "÷"],
      backwardCheck: {
        prompt: "How can you check the remaining stickers?",
        acceptedEquationFormIds: ["end_plus_change_equals_start"],
      },
    });
    brokenSpec.operatorExperiments = brokenSpec.operatorExperiments.filter(
      (experiment) => experiment.narrativeFit === "actual",
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(brokenSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          rawProblem:
            "Seraphina was making a multimedia art collage depicting St. Terese as a child playing in the garden of her family home. The gesso board was 12 inches tall by 5 inches wide and Seraphina wanted to add 3 colorful flower stickers per square inch. Hint: you can find the total square inches of a surface by multiplying the height by the width. Will one pack of 150 flower stickers be enough for Seraphina's project?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    const repaired = payload.spec as ProblemSpec;
    const enoughStep = repaired.steps.find((step) => step.id === "step3")!;

    expect(enoughStep.roleToQuantityId.change).toBe("stickers_needed");
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes("inferred change from stickers_needed"))).toBe(true);
    expect(validateProblem(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("repairs drafts that use broad template names and omit operator experiments", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");

    const brokenSpec = JSON.parse(JSON.stringify(libraryProblem)) as ProblemSpec;
    brokenSpec.steps[0]!.relationshipTemplateId = "multiplication" as ProblemSpec["steps"][number]["relationshipTemplateId"];
    brokenSpec.steps[1]!.relationshipTemplateId = "division" as ProblemSpec["steps"][number]["relationshipTemplateId"];
    brokenSpec.operatorExperiments = [];

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(brokenSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          rawProblem:
            "Paxten and Aubrey need 3 yards of fabric at $20 per yard. Their parents pay $5 for every Spanish song they memorize. How many Spanish songs would they need to learn to purchase the fabric?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    const repaired = payload.spec as ProblemSpec;

    expect(repaired.steps[0]!.relationshipTemplateId).toBe("multiplication_equal_groups");
    expect(repaired.steps[1]!.relationshipTemplateId).toBe("division_equal_sharing");
    for (const step of repaired.steps) {
      expect(repaired.operatorExperiments.filter((experiment) => experiment.stepId === step.id)).toHaveLength(4);
    }
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes("relationship template"))).toBe(true);
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes("operator experiment"))).toBe(true);
    expect(validateProblem(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("repairs branch-height multiplication drafts with story-specific operand names", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");

    const brokenSpec = JSON.parse(JSON.stringify(libraryProblem)) as ProblemSpec;
    brokenSpec.id = "tree_height_from_branches";
    brokenSpec.metadata.title = "Tree height from branches";
    brokenSpec.metadata.theme = "Estimating a tree by branch spacing";
    delete brokenSpec.story.causalEvent;
    delete brokenSpec.story.closingNoteTemplate;
    brokenSpec.story.briefTemplate =
      "Mario, Jayden, and Seraphina estimate a tree by counting {quantity:branch_count}. Each branch is about {quantity:branch_spacing}. What is the approximate height of the tree?";
    brokenSpec.quantities = [
      {
        id: "branch_count",
        label: { child: "evenly spaced branches", compact: "branches", lowercase: "branches" },
        unit: "branches",
        unitSingular: "branch",
        unitPlural: "branches",
        value: 11,
        visibility: "given",
      },
      {
        id: "branch_spacing",
        label: { child: "height for each branch", compact: "feet per branch", lowercase: "feet per branch" },
        unit: "feet",
        unitSingular: "foot",
        unitPlural: "feet",
        value: 4,
        visibility: "given",
      },
      {
        id: "tree_height",
        label: { child: "approximate tree height", compact: "tree height", lowercase: "tree height" },
        unit: "feet",
        unitSingular: "foot",
        unitPlural: "feet",
        value: null,
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            branches: "branch_count",
            height: "branch_spacing",
          },
        },
        visibility: "find",
      },
    ];
    brokenSpec.steps = [
      {
        id: "step1",
        order: 1,
        prompt: "What is the approximate height of the tree?",
        reasoningPrompt: "Use the number of branches and the height for each branch.",
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          branches: "branch_count",
          height: "branch_spacing",
          total: "tree_height",
        },
        goalQuantityId: "tree_height",
        acceptedEquationFormIds: ["groups_times_items_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: "How could you check the estimate?",
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
    ];
    brokenSpec.operatorExperiments = [];
    brokenSpec.recap = {
      headline: "The tree is about 44 feet tall.",
      causalChain: ["{quantity:branch_count} × {quantity:branch_spacing} = {quantity:tree_height}."],
      calcFromStepId: "step1",
      dataQuestion: {
        prompt: "What is the approximate tree height?",
        correctQuantityId: "tree_height",
        distractorQuantityIds: ["branch_count", "branch_spacing"],
        correctFeedback: "Yes, multiply branches by feet per branch.",
        incorrectFeedback: "Use branches times feet per branch.",
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(brokenSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          rawProblem:
            "Mario, Jayden, and Seraphina are doing a back-of-the-envelope calculation, estimating how high a tree is by counting evenly spaced branches. Two of the branches are as tall as little Aiden, who is 4 feet tall. How far up is each branch? Altogether they count 11 branches. What is the approximate height of the tree?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    const repaired = payload.spec as ProblemSpec;
    const step = repaired.steps[0]!;
    const treeHeight = repaired.quantities.find((quantity) => quantity.id === "tree_height")!;

    expect(step.roleToQuantityId.groups).toBe("branch_count");
    expect(step.roleToQuantityId.itemsPerGroup).toBe("branch_spacing");
    expect(treeHeight.derived?.operands.groups).toBe("branch_count");
    expect(treeHeight.derived?.operands.itemsPerGroup).toBe("branch_spacing");
    expect(payload.issues.some((issue: { message?: string }) => issue.message?.includes('operand "branches"'))).toBe(true);
    expect(validateProblem(repaired).filter((issue) => issue.severity === "error")).toEqual([]);
  });
});
