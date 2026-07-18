// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioProvider } from "../../src/studio/StudioContext";
import { AuthoringView } from "../../src/studio/AuthoringView";

afterEach(cleanup);

describe("AuthoringView", () => {
  it("requires the internal passcode before showing the problem-pack tool", async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider initialView="authoring">
        <AuthoringView />
      </StudioProvider>,
    );

    expect(screen.getByText("Authoring tool")).toBeTruthy();
    expect(screen.queryByText(/Build a clean problem pack/i)).toBeNull();

    await user.type(screen.getByLabelText(/Authoring passcode/i), "0511");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByText(/Build a clean problem pack/i)).toBeTruthy();
    expect(screen.getByText(/Start, remove, end/i)).toBeTruthy();
    expect(screen.getByText(/QA built into onboarding/i)).toBeTruthy();
    expect(screen.getAllByText(/catalogOrder/i).length).toBeGreaterThan(0);
  });
});
