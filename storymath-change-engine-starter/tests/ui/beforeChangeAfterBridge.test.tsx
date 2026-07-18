// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BeforeChangeAfterBridge } from "../../src/components/BeforeChangeAfterBridge";

afterEach(cleanup);

describe("BeforeChangeAfterBridge", () => {
  it("renders subtraction as a full reference span over remaining and removed parts", () => {
    const { container } = render(
      <BeforeChangeAfterBridge
        startValue={232}
        changeValue={46}
        endValue={186}
        operator="-"
        unit="seats"
        startCaption="Planned folding chairs"
        changeCaption="Chairs locked away"
        endCaption="Available folding chairs"
      />,
    );

    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      /232 seats is the full starting amount\. 186 seats remain and 46 seats are removed\./i,
    );
    expect(container.textContent).not.toContain("= 232");

    const rects = Array.from(container.querySelectorAll("rect"));
    expect(rects).toHaveLength(3);
    expect(rects[0]?.getAttribute("width")).toBe("600");

    const remainingWidth = Number(rects[1]?.getAttribute("width"));
    const removedWidth = Number(rects[2]?.getAttribute("width"));
    expect(remainingWidth + removedWidth).toBeCloseTo(600, 5);
  });
});
