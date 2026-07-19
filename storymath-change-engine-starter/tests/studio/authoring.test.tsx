// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioProvider, useStudio } from "../../src/studio/StudioContext";
import { AuthoringView } from "../../src/studio/AuthoringView";
import { MenuView } from "../../src/studio/MenuView";

afterEach(cleanup);

function CurrentViewProbe() {
  const { view } = useStudio();
  return <output aria-label="Current view">{view}</output>;
}

describe("AuthoringView", () => {
  it("is reachable from the bottom authoring portal button on the menu", async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider initialView="menu">
        <MenuView />
        <CurrentViewProbe />
      </StudioProvider>,
    );

    const portal = screen.getByRole("button", { name: "Authoring portal" });
    const problemList = screen.getByRole("list");
    expect(problemList.compareDocumentPosition(portal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(portal);
    expect(screen.getByLabelText("Current view").textContent).toBe("authoring");
  });

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
    expect(screen.getByText(/Used as the menu subtitle/i)).toBeTruthy();

    const paragraph = "Seraphina has {quantity:items_given} items to model.";
    fireEvent.change(screen.getByLabelText(/Word problem paragraph/i), { target: { value: paragraph } });

    expect(
      screen
        .getAllByText((_, node) => node?.textContent?.includes(paragraph) ?? false)
        .some((node) => node.classList.contains("authoring-json")),
    ).toBe(true);
    expect(screen.getAllByText(/catalogOrder/i).length).toBeGreaterThan(0);
  });
});
