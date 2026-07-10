// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

afterEach(cleanup);

type U = ReturnType<typeof userEvent.setup>;
const digit = (user: U, name: string, place: string, value: string) =>
  user.type(screen.getByRole("textbox", { name: new RegExp(`${name}.*${place} place`, "i") }), value);

const backBtn = () =>
  screen.getByRole("button", { name: /back to the beginning/i }) as HTMLButtonElement;
const fwdBtn = () =>
  screen.getByRole("button", { name: /forward to your current step/i }) as HTMLButtonElement;

/**
 * Within-problem navigation: Back goes to the beginning to re-read the story and
 * review solved steps; Forward returns to the step being worked. Both buttons do
 * something from step 1, and Forward never reveals an unsolved step.
 */
describe("within-problem navigation (NASA pack)", () => {
  it("Back reviews the beginning from step 1, and Forward resumes work", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Start the rover log/i }));

    // Step 1: builder is showing; Back is available, Forward is at the current step.
    expect(await screen.findByRole("button", { name: "Try -" })).toBeTruthy();
    expect(backBtn().disabled).toBe(false);
    expect(fwdBtn().disabled).toBe(true);

    // Back → the beginning: the builder is hidden and the buttons swap availability.
    await user.click(backBtn());
    expect(screen.getByText(/Reviewing the beginning/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try -" })).toBeNull();
    expect(backBtn().disabled).toBe(true);
    expect(fwdBtn().disabled).toBe(false);

    // Forward → resume step 1.
    await user.click(fwdBtn());
    expect(await screen.findByRole("button", { name: "Try -" })).toBeTruthy();
  });

  it("from step 2, Back reviews the already-solved step 1", async () => {
    const user = userEvent.setup();
    render(<App />);
    // Solve step 1 (384 - 128 = 256) and advance to step 2.
    await user.click(screen.getByRole("button", { name: /Start the rover log/i }));
    await user.click(await screen.findByRole("button", { name: "Try -" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*Tuesday", "hundreds", "2");
    await digit(user, "Answer for .*Tuesday", "tens", "5");
    await digit(user, "Answer for .*Tuesday", "ones", "6");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));
    await user.click(await screen.findByRole("button", { name: /Next step/i }));

    expect(await screen.findByRole("button", { name: "Try +" })).toBeTruthy();

    // Back → review shows solved step 1; the step-2 builder is hidden.
    await user.click(backBtn());
    expect(screen.getByText(/Step 1,/i)).toBeTruthy(); // "Step 1, solved"
    expect(screen.getByText(/How far did Perseverance travel on Tuesday/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try +" })).toBeNull();

    // Forward → back to step 2's active work.
    await user.click(fwdBtn());
    expect(await screen.findByRole("button", { name: "Try +" })).toBeTruthy();
  });
});
