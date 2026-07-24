// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioProvider, useStudio } from "../../src/studio/StudioContext";
import { AuthoringView } from "../../src/studio/AuthoringView";
import { MenuView } from "../../src/studio/MenuView";

afterEach(cleanup);
afterEach(() => localStorage.clear());

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
    expect(screen.getByText(/Step sequence/i)).toBeTruthy();
    expect(screen.getByText(/QA built into onboarding/i)).toBeTruthy();
    expect(screen.getByText(/Used as the menu subtitle/i)).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Existing problem/i })).toBeTruthy();

    const paragraph = "Seraphina has {quantity:items_given} items to model.";
    fireEvent.change(screen.getByLabelText(/Word problem paragraph/i), { target: { value: paragraph } });

    expect(
      screen
        .getAllByText((_, node) => node?.textContent?.includes(paragraph) ?? false)
        .some((node) => node.classList.contains("authoring-json")),
    ).toBe(true);
    expect(screen.getAllByText(/catalogOrder/i).length).toBeGreaterThan(0);
  });

  it("loads existing problem wording into the editable authoring fields", async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider initialView="authoring">
        <AuthoringView />
      </StudioProvider>,
    );

    await user.type(screen.getByLabelText(/Authoring passcode/i), "0511");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await user.selectOptions(
      screen.getByRole("combobox", { name: /Existing problem/i }),
      "little-men-reading-clock-v1",
    );
    await user.click(screen.getByRole("button", { name: /Load wording/i }));

    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe("Reading against the clock");
    expect((screen.getByLabelText(/Story theme/i) as HTMLInputElement).value).toBe("Drive-time reading plan");
    expect((screen.getByLabelText(/Word problem paragraph/i) as HTMLTextAreaElement).value).toContain(
      "Seraphina is about to start the final chapter",
    );
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("start_change_end_decrease");
  });

  it("saves an edited existing problem draft and exposes updated JSON for download", async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider initialView="authoring">
        <AuthoringView />
      </StudioProvider>,
    );

    await user.type(screen.getByLabelText(/Authoring passcode/i), "0511");
    await user.click(screen.getByRole("button", { name: "Unlock" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Existing problem/i }),
      "canine-feline-spirit-day-showdown-v1",
    );
    await user.click(screen.getByRole("button", { name: /Load wording/i }));

    fireEvent.change(screen.getByLabelText(/Word problem paragraph/i), {
      target: { value: "Updated {quantity:cat_stickers} wording." },
    });
    await user.click(screen.getByRole("button", { name: /Save draft/i }));

    expect(screen.getByText(/Draft saved in this browser/i)).toBeTruthy();
    expect(localStorage.getItem("storymath_authoring_draft_v1")).toContain("Updated {quantity:cat_stickers} wording.");
    expect(screen.getByRole("link", { name: /Download JSON/i }).getAttribute("download")).toBe(
      "canine-feline-spirit-day-showdown-v1.json",
    );
  });
});
