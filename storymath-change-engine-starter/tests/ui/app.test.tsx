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
 * These assertions protect the PRODUCT PHILOSOPHY, not specific screen text:
 * one question per page, chrome from the story pack, engine-derived equations,
 * the right visual model per operation, and no generic filler.
 */
describe("StoryMath — product philosophy (NASA pack)", () => {
  it("drives all chrome from the story pack and never shows generic filler", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Opening: eyebrow + title + start CTA all come from storyChrome/metadata.
    expect(screen.getByText(/Rover field note/i)).toBeTruthy(); // storyChrome.openingEyebrow
    expect(screen.getByText(/Perseverance’s Sandy Tuesday/i)).toBeTruthy(); // metadata.title
    expect(screen.getByRole("button", { name: /Start the rover log/i })).toBeTruthy(); // storyChrome.startCta
    // One question per page: only step 1's question, never the two-day total.
    expect(screen.getByText(/How far did Perseverance travel on Tuesday\?/i)).toBeTruthy();
    expect(screen.queryByText(/over both days/i)).toBeNull();
    // No component chrome literals leaked through.
    expect(screen.queryByText(/Mission Brief|Imaginary|Start the investigation/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Start the rover log/i }));

    // Prediction: dimension labels from the pack; one status line, no filler.
    await user.click(screen.getByRole("button", { name: "Shorter" }));
    expect(screen.getByText(/Your prediction:/i).textContent).toMatch(/Shorter/);
    expect(screen.queryByText(/good thinking|you can always revise|let’s build/i)).toBeNull();

    // Tiles show compact label + value only — no semantic chips.
    expect(screen.getByText("Monday distance")).toBeTruthy();
    expect(screen.queryByText("distance traveled")).toBeNull();
    expect(screen.queryByText("on Monday")).toBeNull();

    // × experiment: engine-derived equation + repeated-groups visual + one
    // alternate-world sentence; NO generic "different question" heading.
    await user.click(screen.getByRole("button", { name: "Try ×" }));
    expect(await screen.findByText(/384 × 128 = 49,152 meters/)).toBeTruthy();
    expect(screen.getByText(/That’s much farther than Monday\./)).toBeTruthy();
    expect(screen.getByRole("img", { name: /blocks, each one .* drive/i })).toBeTruthy();
    expect(screen.getByText(/if Perseverance drove Monday’s distance for 128 days/i)).toBeTruthy();
    expect(screen.queryByText(/A different question|repeated-group question/i)).toBeNull();

    // + experiment: additive comparison → comparison-gap preview (its SR summary).
    await user.click(screen.getByRole("button", { name: /Try another operation/i }));
    await user.click(screen.getByRole("button", { name: "Try +" }));
    expect(await screen.findByText(/384 \+ 128 = 512 meters/)).toBeTruthy();
    expect(screen.getByText(/Monday distance is 384 meters; Tuesday distance would be 512 meters/i)).toBeTruthy();

    // − fits: answer is hidden (child computes it), never "runs far past this scale".
    await user.click(screen.getByRole("button", { name: /Try another operation/i }));
    await user.click(screen.getByRole("button", { name: "Try -" }));
    const solve = await screen.findByRole("button", { name: /let’s solve it/i });
    expect(screen.queryByText(/384 - 128 = 256/)).toBeNull();
    expect(screen.queryByText(/runs far past this scale/i)).toBeNull();
    await user.click(solve);

    await digit(user, "Answer for .*Tuesday", "hundreds", "2");
    await digit(user, "Answer for .*Tuesday", "tens", "5");
    await digit(user, "Answer for .*Tuesday", "ones", "6");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));

    // Step 1 confirmed → comparison-gap bar model.
    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Comparison bar model/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Check your work/i }));
    await digit(user, "Result: .*Monday", "hundreds", "3");
    await digit(user, "Result: .*Monday", "tens", "8");
    await digit(user, "Result: .*Monday", "ones", "4");
    await user.click(screen.getByRole("button", { name: /Check it/i }));
    await user.click(await screen.findByRole("button", { name: /Continue/i }));

    // Step 2: total step → part-whole visual, combine reaction.
    await user.click(await screen.findByRole("button", { name: "Combine them" }));
    await user.click(screen.getByRole("button", { name: "Try +" }));
    await user.click(await screen.findByRole("button", { name: /let’s solve it/i }));
    await digit(user, "Answer for .*both days", "hundreds", "6");
    await digit(user, "Answer for .*both days", "tens", "4");
    await digit(user, "Answer for .*both days", "ones", "0");
    await user.click(screen.getByRole("button", { name: /Enter answer/i }));
    expect(await screen.findByText(/The math and the story agree/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Part-part-whole bar model/i })).toBeTruthy();

    // Only one step-2 check now: 640 − 256 = 384 (lands on the original Monday).
    await user.click(screen.getByRole("button", { name: /Check your work/i }));
    await digit(user, "Result: .*Monday", "hundreds", "3");
    await digit(user, "Result: .*Monday", "tens", "8");
    await digit(user, "Result: .*Monday", "ones", "4");
    await user.click(screen.getByRole("button", { name: /Check it/i }));
    await user.click(await screen.findByRole("button", { name: /Continue/i }));

    // Recap + completion chrome from the pack.
    expect(await screen.findByText(/Why Tuesday was shorter/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /How much shorter Tuesday was than Monday/i }));
    expect(await screen.findByRole("button", { name: /Close the rover log/i })).toBeTruthy(); // finishCta
    await user.click(screen.getByRole("button", { name: /Close the rover log/i }));
    expect(await screen.findByText(/Rover log closed/i)).toBeTruthy(); // completionTitle
  });
});
