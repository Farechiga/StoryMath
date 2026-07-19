// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PartWholeBarModel } from "../../src/components/BarModel";

afterEach(cleanup);

describe("PartWholeBarModel", () => {
  it("renders the total reference span above its parts", () => {
    const { container } = render(
      <PartWholeBarModel
        whole={{ label: "Total set pieces", value: 208, unit: "pieces" }}
        partA={{ label: "Periwinkle pieces", value: 76, unit: "pieces" }}
        partB={{ label: "Not periwinkle", value: 132, unit: "pieces" }}
      />,
    );

    const rowLabels = Array.from(container.querySelectorAll(".bm-label")).map((label) => label.textContent);
    expect(rowLabels).toEqual(["Total set pieces", "Periwinkle pieces", "Not periwinkle"]);
  });
});
