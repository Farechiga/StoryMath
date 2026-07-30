// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import multiplicationSpec from "../../data/problems/animation-lab-eyebrows.json";
import chairsSpec from "../../data/problems/christmas-carol-seat-crisis.json";
import legosSpec from "../../data/problems/lego-architects-periwinkle-blueprint.json";
import divisionSpec from "../../data/problems/planning-pudding-treats.json";
import { MathTransformationSpace } from "../../src/components/MathTransformationSpace";
import { compileTransformationSpace, loadProblemSpec } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";

afterEach(cleanup);

function renderPrototype() {
  const chairs = loadProblemSpec(chairsSpec as unknown as ProblemSpec);
  const legos = loadProblemSpec(legosSpec as unknown as ProblemSpec);
  const multiplication = loadProblemSpec(multiplicationSpec as unknown as ProblemSpec);
  const division = loadProblemSpec(divisionSpec as unknown as ProblemSpec);
  return render(
    <MathTransformationSpace
      spaces={[
        compileTransformationSpace(chairs, {
          title: "Folding chairs",
          stepIds: ["find_available_folding_chairs", "find_total_available_seats"],
        }),
        compileTransformationSpace(legos, {
          title: "Periwinkle LEGO",
          stepIds: ["find_available_periwinkle_pieces", "find_extra_periwinkle_pieces"],
        }),
        compileTransformationSpace(multiplication, {
          title: "Multiplication",
          stepIds: ["find_eye_eyebrow_expressions", "find_total_face_expressions"],
        }),
        compileTransformationSpace(division, {
          title: "Division",
          stepIds: ["find_needed_arrowroots", "find_market_money_cents"],
        }),
      ]}
    />,
  );
}

function rect(container: HTMLElement, role: string, quantityId: string): SVGRectElement {
  const item = container.querySelector(
    `[data-bar-role="${role}"][data-quantity-id="${quantityId}"]`,
  );
  if (!item || item.tagName.toLowerCase() !== "rect") {
    throw new Error(`Missing ${role} rect for ${quantityId}.`);
  }
  return item as unknown as SVGRectElement;
}

describe("MathTransformationSpace prototype", () => {
  it("renders the two-step 2D overview with proportional bars and no mode controls", async () => {
    const user = userEvent.setup();
    const { container } = renderPrototype();

    expect(screen.queryByRole("button", { name: "2D" })).toBeNull();
    expect(screen.queryByRole("button", { name: "3D" })).toBeNull();
    expect(screen.queryByRole("slider", { name: /Transformation state/i })).toBeNull();
    expect(screen.getAllByText("232 - 46 = 186").length).toBeGreaterThan(0);
    expect(screen.getAllByText("186 + 38 = 224").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /Reference invariant: 232 = 186 \+ 46/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Part-whole invariant: 224 = 186 \+ 38/i })).toBeTruthy();
    expect(container.querySelectorAll(".mts-svg-value--inside").length).toBeGreaterThan(5);
    expect(container.querySelectorAll(".mts-removed-reference").length).toBe(1);
    expect(container.querySelectorAll(".mts-scale-guide")).toHaveLength(0);

    expect(rect(container, "whole", "planned_folding_chairs").getAttribute("style")).toContain("fill: #4C63D7");
    expect(rect(container, "removed-row", "inaccessible_chairs").getAttribute("style")).toContain("fill: #427EA5");
    expect(rect(container, "remainder", "available_folding_chairs").getAttribute("style")).toContain("fill: #9562D1");
    expect(rect(container, "part-right", "bucket_stools").getAttribute("style")).toContain("fill: #92B6A0");
    expect(rect(container, "combined-whole", "total_available_seats").getAttribute("style")).toContain("fill: #374F89");

    expect(rect(container, "whole", "planned_folding_chairs").getAttribute("x")).toBe(
      rect(container, "remainder", "available_folding_chairs").getAttribute("x"),
    );
    expect(rect(container, "removed-reference", "inaccessible_chairs").getAttribute("x")).toBe(
      rect(container, "removed-row", "inaccessible_chairs").getAttribute("x"),
    );

    await user.click(screen.getByRole("button", { name: /Available folding chairs/i }));
    expect(screen.getByRole("button", { name: /Available folding chairs/i }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches demo problems while keeping the stacked 2D overview", async () => {
    const user = userEvent.setup();
    const { container } = renderPrototype();

    await user.click(screen.getByRole("button", { name: /Periwinkle LEGO/i }));
    expect(screen.getAllByText("208 - 132 = 76").length).toBeGreaterThan(0);
    expect(screen.getAllByText("76 - 60 = 16").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "3D" })).toBeNull();
    expect(screen.getByRole("img", { name: /Reference invariant: 208 = 76 \+ 132/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Reference invariant: 76 = 16 \+ 60/i })).toBeTruthy();
    expect(container.querySelectorAll(".mts-scale-guide")).toHaveLength(0);
    expect(rect(container, "whole", "lego_set_total_pieces").getAttribute("style")).toContain("fill: #4C63D7");
    expect(rect(container, "removed-row", "not_periwinkle_pieces").getAttribute("style")).toContain("fill: #427EA5");
    expect(rect(container, "remainder", "available_periwinkle_pieces").getAttribute("style")).toContain("fill: #9562D1");
    expect(rect(container, "removed-row", "library_lab_periwinkle_pieces").getAttribute("style")).toContain("fill: #92B6A0");
    expect(rect(container, "remainder", "extra_periwinkle_pieces").getAttribute("style")).toContain("fill: #964485");
  });

  it("renders multiplication as an array and division with the existing equal-shares model", async () => {
    const user = userEvent.setup();
    const { container } = renderPrototype();

    await user.click(screen.getByRole("button", { name: /Multiplication/i }));
    expect(screen.getAllByText("8 × 12 = 96").length).toBeGreaterThan(0);
    expect(screen.getAllByText("96 × 10 = 960").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /Equal-groups invariant: 96 = 8 × 12/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Array model: 12 Eyebrow shapes by 8 Eye shapes make 96 expressions/i })).toBeTruthy();
    expect(screen.getAllByText("12 Eyebrow shapes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8 Eye shapes").length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-bar-role="array-cell"][data-quantity-id="eye_eyebrow_expressions"]')).toHaveLength(96);
    expect(container.querySelector('[data-bar-role="array-cell"][data-quantity-id="eye_eyebrow_expressions"]')?.getAttribute("style")).toContain("fill: #3B3598");
    const productCells = Array.from(
      container.querySelectorAll<SVGRectElement>('[data-bar-role="array-cell"][data-quantity-id="eye_eyebrow_expressions"]'),
    );
    const productRightEdge = Math.max(
      ...productCells.map((cell) => Number(cell.getAttribute("x")) + Number(cell.getAttribute("width"))),
    );
    const rowAxis = screen.getByText("8 Eye shapes");
    expect(Number(rowAxis.getAttribute("x"))).toBeGreaterThan(productRightEdge);

    await user.click(screen.getByRole("button", { name: /Division/i }));
    expect(screen.getAllByText("48 ÷ 6 = 8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8 × 5 = 40").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /48 bowls in groups of 6: 8 full groups/i })).toBeTruthy();
    expect(screen.getAllByText("Bowls per arrowroot").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Arrowroots needed").length).toBeGreaterThan(1);
    expect(container.querySelector(".shares")?.getAttribute("style")).toContain("--shares-unit-color: #427EA5");
    expect(container.querySelector(".shares")?.getAttribute("style")).toContain("--shares-group-color: #7185DA");
    expect(container.querySelector('[data-bar-role="division-total"]')).toBeNull();
    expect(container.querySelectorAll(".mts-scale-guide")).toHaveLength(0);
  });

  it("embeds recap timeline beside the transformation overview without demo controls", () => {
    const chairs = loadProblemSpec(chairsSpec as unknown as ProblemSpec);
    render(
      <MathTransformationSpace
        spaces={[
          compileTransformationSpace(chairs, {
            title: "Folding chairs",
            stepIds: ["find_available_folding_chairs", "find_total_available_seats"],
          }),
        ]}
        embedded
        timeline={[
          "The crew planned 232 folding chairs.",
          "The supply closet locked away 46.",
          "The teacher added 38 bucket stools.",
        ]}
      />,
    );

    expect(screen.getByText(/Story timeline/i)).toBeTruthy();
    expect(screen.getByText(/The teacher added 38 bucket stools/i)).toBeTruthy();
    expect(screen.getByText(/Color key/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Available folding chairs/i })).toBeTruthy();
    expect(screen.queryByRole("group", { name: /Problem/i })).toBeNull();
    expect(screen.queryByRole("group", { name: /Render mode/i })).toBeNull();
    expect(screen.queryByRole("group", { name: /Scale/i })).toBeNull();
  });
});
