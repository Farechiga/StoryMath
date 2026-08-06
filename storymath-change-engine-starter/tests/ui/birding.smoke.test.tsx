// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { loadProblemSpec } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import birding from "../../data/problems/minnesota-birding.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";
import readingClock from "../../data/problems/little-men-reading-clock.json";
import pudding from "../../data/problems/planning-pudding-treats.json";

afterEach(cleanup);

type U = ReturnType<typeof userEvent.setup>;
const digit = (user: U, name: string, place: string, value: string) =>
  user.type(screen.getByRole("textbox", { name: new RegExp(`${name}.*${place} place`, "i") }), value);

/**
 * Proves the engine is NOT NASA-specific: a different world (a start-change-end
 * + part-whole birding story, "count" dimension) runs through the SAME App with
 * ZERO component edits — chrome, dimension labels, derived values, and grading
 * all come from the story pack.
 */
describe("non-NASA fixture runs with zero component edits", () => {
  const problem = loadProblemSpec(birding as unknown as ProblemSpec);

  it("renders story-pack chrome, its own dimension labels, and no NASA chrome", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    expect(screen.getByText(/Field recorder note/i)).toBeTruthy(); // storyChrome
    expect(screen.getByText(/Chickadees among frozen cattails/i)).toBeTruthy(); // title
    expect(screen.getByRole("button", { name: /Start the bird log/i })).toBeTruthy();
    // Story prose keeps the story-specific noun: "146 chickadee calls", not "146 calls".
    expect(screen.getByText(/146 chickadee calls/i)).toBeTruthy();
    expect(screen.queryByText(/146 calls\b/i)).toBeNull();
    expect(screen.queryByText(/Perseverance|Rover field note|meters/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Start the bird log/i }));

    // No prediction stage: the builder appears directly, with none of the vague
    // relationship labels (or the More/Fewer prediction buttons).
    expect(
      screen.queryByRole("button", { name: /More|Fewer|Combine them|Repeat them/i }),
    ).toBeNull();

    // The start+change fit is addition; solve the derived total 146 + 78 = 224.
    await user.click(await screen.findByRole("button", { name: "Try +" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*chickadee calls", "hundreds", "2");
    await digit(user, "Answer for .*chickadee calls", "tens", "2");
    await digit(user, "Answer for .*chickadee calls", "ones", "4");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    // Computed answer accepted → step confirmed, no crash, still non-NASA.
    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Check your work/i })).toBeTruthy();
  });
});

describe("multiplication fixture (animation lab) runs on the same App", () => {
  const problem = loadProblemSpec(animation as unknown as ProblemSpec);

  it("solves a product with enough answer columns and confirms with transformation rows", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    expect(screen.getByText(/Animation lab note/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Open the rig/i }));

    // Straight to the builder — no "Repeat them" relationship-choice step.
    expect(screen.queryByRole("button", { name: /Repeat them/i })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Try ×" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));

    // The product 8 × 12 = 96 (eye shapes × eyebrow shapes) needs two answer columns.
    await digit(user, "Answer for .*eyebrow", "tens", "9");
    await digit(user, "Answer for .*eyebrow", "ones", "6");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Equal-groups invariant: 96 = 8 × 12/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Check your work/i }));
    expect(await screen.findByText(/Now let's divide the eye-and-eyebrow combinations by the eye shapes/i)).toBeTruthy();
    expect(screen.getByRole("group", { name: /96 ÷ 8/i })).toBeTruthy();
    expect(screen.queryByRole("img", { name: /minus/i })).toBeNull();
  });

  it("shows division as equal-sharing bins with a leftover remainder", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    await user.click(screen.getByRole("button", { name: /Open the rig/i }));

    // Trying ÷ on 8 and 12: no group of 12 fits into 8, so 8 are left over.
    await user.click(await screen.findByRole("button", { name: "Try ÷" }));

    expect(await screen.findByRole("img", { name: /in groups of .* left over/i })).toBeTruthy();
    expect(screen.getByText(/remainder = 8/i)).toBeTruthy();
    // The calc line reports generic "groups" (never the story unit) and flags the
    // leftover, so it never reads as an even split — and never a decimal.
    expect(document.querySelector(".verdict__calc")?.textContent).toMatch(
      /0 groups with some left over/i,
    );
    expect(screen.queryByText(/0\.67/)).toBeNull();
    // A wrong operator outlines the groups in the shared "does not match" red.
    expect(document.querySelector(".shares--wrong")).toBeTruthy();
  });
});

describe("division fixture carries transformation labels into the real flow", () => {
  const problem = loadProblemSpec(pudding as unknown as ProblemSpec);

  it("shows labeled equal-share rows on the solved step and final recap", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    await user.click(screen.getByRole("button", { name: /Open the market list/i }));
    await user.click(await screen.findByRole("button", { name: "Try ÷" }));
    const rightOperatorPanelText = document.querySelector(".verdict")?.textContent ?? "";
    expect(rightOperatorPanelText.indexOf("This matches the story")).toBeLessThan(
      rightOperatorPanelText.indexOf("48 ÷ 6 = ?"),
    );
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*arrowroots", "ones", "8");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: /48 bowls in groups of 6: 8 full groups/i })).toBeTruthy();
    expect(screen.getByText("Bowls per arrowroot")).toBeTruthy();
    expect(screen.getByText("Arrowroots needed")).toBeTruthy();
    expect(document.querySelector(".shares")?.getAttribute("style")).toContain("--shares-unit-color: #427EA5");
    expect(document.querySelector(".shares")?.getAttribute("style")).toContain("--shares-group-color: #7185DA");

    await user.click(screen.getByRole("button", { name: /Next step/i }));
    await user.click(await screen.findByRole("button", { name: "Try ×" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*market", "tens", "4");
    await digit(user, "Answer for .*market", "ones", "0");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));
    await user.click(await screen.findByRole("button", { name: /See the recap/i }));

    expect(await screen.findByText(/Problem overview/i)).toBeTruthy();
    expect(document.querySelector(".ornament")).toBeNull();
    expect(screen.queryByText(/Step 1,\s*solved/i)).toBeNull();
    expect(screen.queryByText(/Why Jo needs 40 cents/i)).toBeNull();
    expect(screen.getByText(/What does 8 represent in Jo's market model\?/i)).toBeTruthy();
    expect(screen.queryByText(/What does 8 arrowroots represent/i)).toBeNull();
    expect(screen.getAllByText("48 ÷ 6 = 8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8 × 5 = 40").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bowls per arrowroot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arrowroots needed").length).toBeGreaterThan(0);
  });
});

describe("reading clock multiplication visual", () => {
  const problem = loadProblemSpec(readingClock as unknown as ProblemSpec);

  it("shows a labeled factor array before the child solves", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    await user.click(screen.getByRole("button", { name: /Open the reading plan/i }));
    await user.click(await screen.findByRole("button", { name: "Try ×" }));

    expect(
      await screen.findByRole("img", {
        name: /Array model: 9 Pages left by 4 Minutes per page make an unknown number of minutes/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("9 Pages left")).toBeTruthy();
    expect(screen.getByText("4 Minutes per page")).toBeTruthy();
    expect(screen.getByText("? Reading minutes")).toBeTruthy();
  });
});
