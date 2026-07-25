// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RepeatedGroupsModel } from "../../src/components/RepeatedGroupsModel";

describe("RepeatedGroupsModel", () => {
  it("shows actual lassoed unit groups when the product is at most 200", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={11} groupSize={3} total={33} unit="design sketches" groupNoun="model" hideTotal />,
    );

    expect(screen.getByRole("img", { name: /11 groups of 3 design sketches/i })).toBeTruthy();
    expect(container.querySelectorAll(".groups__lasso")).toHaveLength(11);
    expect(container.querySelectorAll(".groups__grid--lassoed .groups__unit")).toHaveLength(33);
    expect(container.querySelector(".groups__total")?.textContent?.replace(/\s+/g, " ")).toContain(
      "11 groups × 3 design sketches = ? design sketches",
    );
  });

  it("shows a zoomed block key and compressed groups for products over 200", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={384} groupSize={128} total={49152} unit="meters" groupNoun="drive" hideTotal />,
    );

    expect(screen.getByRole("img", { name: /384 blocks, each one 128 meters drive/i })).toBeTruthy();
    expect(container.querySelectorAll(".groups__lasso")).toHaveLength(0);
    expect(container.querySelector(".groups__zoom-key")).toBeTruthy();
    expect(container.querySelectorAll(".groups__zoom-tile .groups__zoom-unit")).toHaveLength(128);
    expect(container.querySelectorAll(".groups__unit")).toHaveLength(301);
    expect(screen.getByText(/\+84 more/i)).toBeTruthy();
  });

  it("uses clean factor arrays in the zoomed block key", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={6} groupSize={48} total={288} unit="arrowroots" groupNoun="batch" />,
    );

    expect(container.querySelectorAll(".groups__zoom-tile .groups__zoom-unit")).toHaveLength(48);
    expect((container.querySelector(".groups__zoom-tile") as HTMLElement).style.gridTemplateColumns).toBe("repeat(8, 16px)");
  });

  it("does not abridge a large zoomed block key", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={46} groupSize={232} total={10672} unit="seats" groupNoun="row" />,
    );

    expect(container.querySelectorAll(".groups__zoom-tile .groups__zoom-unit")).toHaveLength(232);
    expect((container.querySelector(".groups__zoom-tile") as HTMLElement).style.gridTemplateColumns).toBe("repeat(29, 16px)");
    expect(screen.queryByText(/\+32/i)).toBeNull();
  });

  it("matches the connector base height to the zoomed array pill height", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={46} groupSize={232} total={10672} unit="seats" groupNoun="row" />,
    );
    const fan = container.querySelector(".groups__zoom-fan") as SVGElement;
    const tile = container.querySelector(".groups__zoom-tile") as HTMLElement;
    const lines = fan.querySelectorAll("line");

    expect(fan.getAttribute("viewBox")).toBe("0 0 100 143");
    expect(fan.style.height).toBe("143px");
    expect(tile.style.minHeight).toBe("143px");
    expect(lines[0]?.getAttribute("y2")).toBe("0");
    expect(lines[1]?.getAttribute("y2")).toBe("143");
  });
});
