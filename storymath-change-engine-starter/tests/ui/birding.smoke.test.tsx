// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { loadProblemSpec } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import birding from "../../data/problems/minnesota-birding.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";

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
    expect(screen.getByText(/The chickadees found the frozen cattails/i)).toBeTruthy(); // title
    expect(screen.getByRole("button", { name: /Start the bird log/i })).toBeTruthy();
    // Derived-value story prose rendered (78 morning + 146 noisy afternoon, no NASA nouns).
    expect(screen.getByText(/146 calls/i)).toBeTruthy();
    expect(screen.queryByText(/Perseverance|Rover field note|meters/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Start the bird log/i }));

    // Dimension labels are the pack's "count" labels — not distance words.
    expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fewer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Farther|Shorter/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "More" }));

    // The start+change fit is addition; solve the derived total 146 + 78 = 224.
    await user.click(screen.getByRole("button", { name: "Try +" }));
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

  it("solves a product via the repeated-groups model, with enough answer columns", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    expect(screen.getByText(/Animation lab note/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Open the rig/i }));

    // Multiplication step → "Repeat them" is the fitting prediction family.
    await user.click(screen.getByRole("button", { name: "Repeat them" }));
    await user.click(screen.getByRole("button", { name: "Try ×" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));

    // The product 8 × 12 = 96 (eye shapes × eyebrow shapes) needs two answer columns.
    await digit(user, "Answer for .*eyebrow", "tens", "9");
    await digit(user, "Answer for .*eyebrow", "ones", "6");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    // Step-confirmed visual is the repeated-groups grid, not a bar.
    expect(screen.getByRole("img", { name: /blocks, each one .* expression/i })).toBeTruthy();
  });

  it("shows division as equal-sharing bins with a leftover remainder", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    await user.click(screen.getByRole("button", { name: /Open the rig/i }));
    await user.click(screen.getByRole("button", { name: "Repeat them" }));

    // Trying ÷ on 8 and 12: no group of 12 fits into 8, so 8 are left over.
    await user.click(screen.getByRole("button", { name: "Try ÷" }));

    expect(await screen.findByRole("img", { name: /in groups of .* left over/i })).toBeTruthy();
    expect(screen.getByText(/remainder = 8/i)).toBeTruthy();
    // The calc line shows the whole quotient (0), not a decimal that would
    // contradict the bins.
    expect(screen.queryByText(/0\.67/)).toBeNull();
  });
});
