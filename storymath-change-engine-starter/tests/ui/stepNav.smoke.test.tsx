// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

afterEach(cleanup);

type U = ReturnType<typeof userEvent.setup>;
const digit = (user: U, name: string, place: string, value: string) =>
  user.type(screen.getByRole("textbox", { name: new RegExp(`${name}.*${place} place`, "i") }), value);

/**
 * Within-problem navigation: once the child reaches step 2, a Back button jumps
 * to the beginning to review earlier steps and a Forward button returns to the
 * current step. Forward never reaches a step the child has not yet reached.
 */
describe("within-problem step navigation (NASA pack)", () => {
  it("reviews the first step and returns to the current one", async () => {
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

    // Step 2 is active: the builder is showing and nav is available.
    expect(await screen.findByRole("button", { name: "Try +" })).toBeTruthy();
    const back = screen.getByRole("button", { name: /back to the beginning/i }) as HTMLButtonElement;
    const fwd = screen.getByRole("button", { name: /forward to your current step/i }) as HTMLButtonElement;
    expect(back.disabled).toBe(false);
    expect(fwd.disabled).toBe(true); // already at the furthest step

    // Go back to the beginning → step 1 review; the step-2 builder is hidden.
    await user.click(back);
    expect(screen.getByText(/Reviewing Step 1 of 2/i)).toBeTruthy();
    expect(screen.getByText(/How far did Perseverance travel on Tuesday/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try +" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: /back to the beginning/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    // Forward returns to the current step → the builder is back.
    await user.click(screen.getByRole("button", { name: /forward to your current step/i }));
    expect(await screen.findByRole("button", { name: "Try +" })).toBeTruthy();
    expect(screen.queryByText(/Reviewing Step/i)).toBeNull();
  });
});
