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

  it("caps a zoomed block key at 200 units when one group is very large", () => {
    const { container } = render(
      <RepeatedGroupsModel groupCount={2} groupSize={225} total={450} unit="photos" groupNoun="roll" />,
    );

    expect(container.querySelectorAll(".groups__zoom-tile .groups__zoom-unit")).toHaveLength(200);
    expect(screen.getByText(/\+25/i)).toBeTruthy();
  });
});
