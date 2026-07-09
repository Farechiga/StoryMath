// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EqualSharesModel } from "../../src/components/EqualSharesModel";

afterEach(cleanup);

const bins = (c: HTMLElement) => c.querySelectorAll(".shares__bin");
const blocksIn = (el: Element) => el.querySelectorAll(".groups__unit").length;

describe("EqualSharesModel — division as full groups + remainder", () => {
  it("384 in groups of 128 → 3 full-group bins, no remainder, generic 'groups'", () => {
    const { container } = render(
      <EqualSharesModel dividend={384} divisor={128} unit="meters" />,
    );
    expect(bins(container)).toHaveLength(3);
    expect(blocksIn(bins(container)[0]!)).toBe(128);
    expect(screen.queryByText(/remainder/i)).toBeNull();
    // Groups are described generically, never with a story noun.
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      /384 meters in groups of 128: 3 full groups\./i,
    );
  });

  it("8 in groups of 12 → no full group, all 8 land in the remainder", () => {
    const { container } = render(
      <EqualSharesModel dividend={8} divisor={12} unit="expressions" tone="wrong" />,
    );
    expect(bins(container)).toHaveLength(0);
    expect(screen.getByText(/remainder = 8/i)).toBeTruthy();
    expect(container.querySelectorAll(".shares__loose .groups__unit")).toHaveLength(8);
    // A wrong operator flags the groups red via the wrong-tone class.
    expect(container.querySelector(".shares--wrong")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/with some left over\./i);
  });

  it("50 in groups of 12 → 4 full-group bins and a remainder of 2", () => {
    const { container } = render(
      <EqualSharesModel dividend={50} divisor={12} unit="cookies" />,
    );
    expect(bins(container)).toHaveLength(4);
    expect(blocksIn(bins(container)[0]!)).toBe(12);
    expect(screen.getByText(/remainder = 2/i)).toBeTruthy();
  });
});
