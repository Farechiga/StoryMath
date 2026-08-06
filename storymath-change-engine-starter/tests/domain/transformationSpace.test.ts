import { describe, expect, it } from "vitest";
import multiplicationSpec from "../../data/problems/animation-lab-eyebrows.json";
import chairsSpec from "../../data/problems/christmas-carol-seat-crisis.json";
import legosSpec from "../../data/problems/lego-architects-periwinkle-blueprint.json";
import divisionSpec from "../../data/problems/planning-pudding-treats.json";
import underlibrarySpec from "../../data/problems/underlibrary_carts_capacity.json";
import {
  compileTransformationSpace,
  loadProblemSpec,
  verifyDivisionGeometry,
  verifyEqualGroupsGeometry,
  verifyPartWholeGeometry,
  verifySubtractionGeometry,
} from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";

describe("transformation space compiler", () => {
  it("compiles the folding-chair subtraction as one remove-from-whole span", () => {
    const problem = loadProblemSpec(chairsSpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem, {
      stepIds: ["find_available_folding_chairs"],
    });

    expect(space.steps).toHaveLength(1);
    expect(space.steps[0]).toMatchObject({
      id: "find_available_folding_chairs",
      relationshipType: "remove-from-whole",
      operator: "-",
      inputQuantityIds: ["planned_folding_chairs", "inaccessible_chairs"],
      outputQuantityId: "available_folding_chairs",
      visualModel: "subtraction_span",
      equation: "232 - 46 = 186",
    });
    expect(space.maxStateIndex).toBe(0);
    expect(space.states.map((state) => state.phase)).toEqual([
      "result",
    ]);
    expect(space.quantities.slice(0, 3).map((q) => q.color)).toEqual([
      "#4C63D7",
      "#427EA5",
      "#9562D1",
    ]);
    expect(space.steps[0]!.referenceWhole).toMatchObject({
      wholeQuantityId: "planned_folding_chairs",
      removedQuantityId: "inaccessible_chairs",
      remainderQuantityId: "available_folding_chairs",
      wholeValue: 232,
      removedValue: 46,
      remainderValue: 186,
      invariant: "232 = 186 + 46",
    });
    expect(verifySubtractionGeometry(space)).toBe(true);
  });

  it("compiles the full folding-chair problem as subtraction followed by addition", () => {
    const problem = loadProblemSpec(chairsSpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem, {
      stepIds: ["find_available_folding_chairs", "find_total_available_seats"],
    });

    expect(space.steps.map((step) => step.equation)).toEqual([
      "232 - 46 = 186",
      "186 + 38 = 224",
    ]);
    expect(space.steps.map((step) => step.relationshipType)).toEqual([
      "remove-from-whole",
      "combine",
    ]);
    expect(space.steps.map((step) => step.stateRange)).toEqual([
      { reference: 0, result: 0 },
      { reference: 1, result: 1 },
    ]);
    expect(space.steps[1]!.partWhole).toMatchObject({
      wholeQuantityId: "total_available_seats",
      partQuantityIds: ["available_folding_chairs", "bucket_stools"],
      wholeValue: 224,
      partValues: [186, 38],
      invariant: "224 = 186 + 38",
    });
    expect(space.maxStateIndex).toBe(1);
    expect(space.quantities.find((q) => q.id === "total_available_seats")?.firstVisibleState).toBe(1);
    expect(Object.fromEntries(space.quantities.map((q) => [q.id, q.color]))).toMatchObject({
      planned_folding_chairs: "#4C63D7",
      inaccessible_chairs: "#427EA5",
      available_folding_chairs: "#9562D1",
      bucket_stools: "#92B6A0",
      total_available_seats: "#374F89",
    });
    expect(verifySubtractionGeometry(space)).toBe(true);
    expect(verifyPartWholeGeometry(space)).toBe(true);
  });

  it("uses the same color path for a single step as it does for the full recap", () => {
    const problem = loadProblemSpec(chairsSpec as unknown as ProblemSpec);
    const full = compileTransformationSpace(problem);
    const singleStep = compileTransformationSpace(problem, {
      stepIds: ["find_total_available_seats"],
    });

    const fullColors = Object.fromEntries(full.quantities.map((q) => [q.id, q.color]));
    const singleStepColors = Object.fromEntries(singleStep.quantities.map((q) => [q.id, q.color]));

    expect(singleStepColors.available_folding_chairs).toBe(fullColors.available_folding_chairs);
    expect(singleStepColors.bucket_stools).toBe(fullColors.bucket_stools);
    expect(singleStepColors.total_available_seats).toBe(fullColors.total_available_seats);
    expect(singleStepColors).toMatchObject({
      available_folding_chairs: "#9562D1",
      bucket_stools: "#92B6A0",
      total_available_seats: "#374F89",
    });
  });

  it("preserves both periwinkle LEGO subtraction invariants", () => {
    const problem = loadProblemSpec(legosSpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem, {
      stepIds: ["find_available_periwinkle_pieces", "find_extra_periwinkle_pieces"],
    });

    expect(space.steps.map((step) => step.equation)).toEqual([
      "208 - 132 = 76",
      "76 - 60 = 16",
    ]);
    expect(space.steps.map((step) => step.referenceWhole?.invariant)).toEqual([
      "208 = 76 + 132",
      "76 = 16 + 60",
    ]);
    expect(space.steps.map((step) => step.stateRange)).toEqual([
      { reference: 0, result: 0 },
      { reference: 1, result: 1 },
    ]);
    expect(space.maxStateIndex).toBe(1);
    expect(space.quantities.find((q) => q.id === "available_periwinkle_pieces")?.firstVisibleState).toBe(0);
    expect(space.quantities.find((q) => q.id === "extra_periwinkle_pieces")?.firstVisibleState).toBe(1);
    expect(Object.fromEntries(space.quantities.map((q) => [q.id, q.color]))).toMatchObject({
      lego_set_total_pieces: "#4C63D7",
      not_periwinkle_pieces: "#427EA5",
      available_periwinkle_pieces: "#9562D1",
      library_lab_periwinkle_pieces: "#92B6A0",
      extra_periwinkle_pieces: "#964485",
    });
    expect(verifySubtractionGeometry(space)).toBe(true);
  });

  it("compiles multiplication as equal groups with a product invariant", () => {
    const problem = loadProblemSpec(multiplicationSpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem, {
      stepIds: ["find_eye_eyebrow_expressions", "find_total_face_expressions"],
    });

    expect(space.steps.map((step) => step.equation)).toEqual([
      "8 × 12 = 96",
      "96 × 10 = 960",
    ]);
    expect(space.steps.map((step) => step.relationshipType)).toEqual([
      "equal-groups",
      "equal-groups",
    ]);
    expect(space.steps[0]!.equalGroups).toMatchObject({
      groupsQuantityId: "eye_shapes",
      itemsPerGroupQuantityId: "eyebrow_shapes",
      totalQuantityId: "eye_eyebrow_expressions",
      groupsValue: 8,
      itemsPerGroupValue: 12,
      totalValue: 96,
      invariant: "96 = 8 × 12",
    });
    expect(space.steps[0]!.equalGroups?.segments).toHaveLength(8);
    expect(space.steps[1]!.equalGroups).toMatchObject({
      groupsQuantityId: "eye_eyebrow_expressions",
      itemsPerGroupQuantityId: "mouth_shapes",
      totalQuantityId: "total_face_expressions",
      invariant: "960 = 96 × 10",
    });
    expect(verifyEqualGroupsGeometry(space)).toBe(true);
  });

  it("uses the expanded color path for parallel multiply-derived recap totals", () => {
    const problem = loadProblemSpec(underlibrarySpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem);
    const colors = Object.fromEntries(space.quantities.map((q) => [q.id, q.color]));

    expect(colors.total_books).toBe("#3B3598");
    expect(colors.total_cart_capacity).toBe("#D100FF");
  });

  it("compiles division as partitioned equal groups with an inverse invariant", () => {
    const problem = loadProblemSpec(divisionSpec as unknown as ProblemSpec);
    const space = compileTransformationSpace(problem, {
      stepIds: ["find_needed_arrowroots", "find_market_money_cents"],
    });

    expect(space.steps.map((step) => step.equation)).toEqual([
      "48 ÷ 6 = 8",
      "8 × 5 = 40",
    ]);
    expect(space.steps.map((step) => step.relationshipType)).toEqual([
      "partition",
      "equal-groups",
    ]);
    expect(space.steps[0]!.division).toMatchObject({
      totalQuantityId: "needed_blancmange_bowls",
      divisorQuantityId: "bowls_per_arrowroot",
      quotientQuantityId: "needed_arrowroots",
      divisorRole: "itemsPerGroup",
      quotientRole: "groups",
      totalValue: 48,
      divisorValue: 6,
      quotientValue: 8,
      invariant: "48 = 8 × 6",
    });
    expect(space.steps[0]!.division?.segments).toHaveLength(8);
    expect(verifyDivisionGeometry(space)).toBe(true);
    expect(verifyEqualGroupsGeometry(space)).toBe(true);
  });
});
