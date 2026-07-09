// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { loadProblemSpec } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import mars from "../../data/problems/mars-rover-versatility-dust-storm.json";

afterEach(cleanup);

type U = ReturnType<typeof userEvent.setup>;
const digit = (user: U, name: string, place: string, value: string) =>
  user.type(screen.getByRole("textbox", { name: new RegExp(`${name}.*${place} place`, "i") }), value);

/**
 * A new add/subtract pack runs through the same App with zero component edits.
 * Mars step 1 is a part-part-whole step: the builder appears straight after the
 * brief (no relationship-choice stage) and an addition solves it (171 + 79 = 250).
 */
describe("mars dust-storm pack plays on the shared App", () => {
  const problem = loadProblemSpec(mars as unknown as ProblemSpec);

  it("models the daily photo target by combining the parts", async () => {
    const user = userEvent.setup();
    render(<App problem={problem} />);

    expect(screen.getByText(/Rover field note/i)).toBeTruthy(); // storyChrome
    expect(screen.getByText(/Dust-Storm Photo Target/i)).toBeTruthy(); // title
    // Story prose is field-merged from tokens (171 morning photos), no NASA rover chrome.
    expect(screen.getByText(/171 photos/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Open the rover log/i }));

    // Straight to the builder — no "Combine them" relationship-choice step.
    expect(screen.queryByRole("button", { name: /Combine them/i })).toBeNull();

    // Addition fits: 171 + 79 = 250.
    await user.click(await screen.findByRole("button", { name: "Try +" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*photo target", "hundreds", "2");
    await digit(user, "Answer for .*photo target", "tens", "5");
    await digit(user, "Answer for .*photo target", "ones", "0");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Check your work/i })).toBeTruthy();
  });
});
