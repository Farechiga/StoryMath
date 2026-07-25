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
    expect((screen.getByLabelText(/Story theme/i) as HTMLInputElement).value).toBe(
      "Is there time to finish the book?",
    );
    expect((screen.getByLabelText(/Word problem paragraph/i) as HTMLTextAreaElement).value).toContain(
      "Seraphina is about to start the final chapter",
    );
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("start_change_end_decrease");
  });

  it("analyzes a hand-written equal-groups subtraction story into a two-step draft", async () => {
    const user = userEvent.setup();
    render(
      <StudioProvider initialView="authoring">
        <AuthoringView />
      </StudioProvider>,
    );

    await user.type(screen.getByLabelText(/Authoring passcode/i), "0511");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    fireEvent.change(screen.getByLabelText(/Raw word problem/i), {
      target: {
        value:
          "Fashion Show Fundraiser Frenzy\n\nSeraphina one of three student designers for her school's Fashion Show Fundraiser! After splitting up the school models evenly Seraphina was tasked with making designs for 11 people. She made 3 design sketches for each model. Each designer was asked to pick their top 5 design sketches to be turned into real outfits that would be auctioned off. How many design sketches did Seraphina have to eliminate?",
      },
    });
    await user.click(screen.getByRole("button", { name: /Analyze and prefill draft/i }));

    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe("Fashion Show Fundraiser Frenzy");
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("start_change_end_decrease");
    expect(screen.getByText(/Generated a two-step parameterized draft/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));
    const saved = JSON.parse(localStorage.getItem("storymath_authoring_draft_v1") ?? "{}");
    expect(saved.story.briefTemplate).toContain("{quantity:models_to_design_for}");
    expect(saved.story.briefTemplate).toContain("{quantity:sketches_per_model}");
    expect(saved.story.briefTemplate).toContain("{quantity:top_sketches}");
    expect(saved.quantities.find((q: { id: string }) => q.id === "total_sketches").expectedValueForFixture).toBe(33);
    expect(saved.quantities.find((q: { id: string }) => q.id === "eliminated_sketches").expectedValueForFixture).toBe(28);
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
    fireEvent.change(screen.getByLabelText(/Story plural noun/i), {
      target: { value: "dog-team students" },
    });
    fireEvent.change(screen.getByLabelText(/Story singular noun/i), {
      target: { value: "dog-team student" },
    });
    fireEvent.change(screen.getByLabelText(/^Arithmetic unit$/i), {
      target: { value: "students" },
    });
    fireEvent.change(screen.getAllByLabelText(/Answer choice label/i)[0]!, {
      target: { value: "Kids on Team Dog" },
    });
    fireEvent.change(screen.getAllByLabelText(/Sentence label/i)[0]!, {
      target: { value: "kids on Team Dog" },
    });
    fireEvent.change(screen.getByLabelText(/Recap headline/i), {
      target: { value: "Why Team Dog had {quantity:more_dog_stickers} more" },
    });
    fireEvent.change(screen.getByLabelText(/Causal chain/i), {
      target: {
        value:
          "{quantity:kids_on_team_dog} each brought {quantity:dog_stickers_per_kid}.\nTeam Cat had {quantity:cat_stickers}, so Team Dog had {quantity:more_dog_stickers} more.",
      },
    });
    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));

    const saved = localStorage.getItem("storymath_authoring_draft_v1") ?? "";
    const savedJson = JSON.parse(saved);
    expect(screen.getByText(/Browser draft saved/i)).toBeTruthy();
    expect(saved).toContain("Updated {quantity:cat_stickers} wording.");
    expect(savedJson.quantities[0].unit).toBe("students");
    expect(savedJson.quantities[0].unitSingular).toBe("dog-team student");
    expect(savedJson.quantities[0].unitPlural).toBe("dog-team students");
    expect(savedJson.quantities[0].label.child).toBe("Kids on Team Dog");
    expect(savedJson.quantities[0].label.lowercase).toBe("kids on Team Dog");
    expect(savedJson.recap.headline).toBe("Why Team Dog had {quantity:more_dog_stickers} more");
    expect(savedJson.recap.causalChain).toEqual([
      "{quantity:kids_on_team_dog} each brought {quantity:dog_stickers_per_kid}.",
      "Team Cat had {quantity:cat_stickers}, so Team Dog had {quantity:more_dog_stickers} more.",
    ]);
    expect(screen.getByRole("link", { name: /Download JSON for repo/i }).getAttribute("download")).toBe(
      "canine-feline-spirit-day-showdown-v1.json",
    );
  });
});
