// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioProvider, useStudio } from "../../src/studio/StudioContext";
import { AuthoringView } from "../../src/studio/AuthoringView";
import { MenuView } from "../../src/studio/MenuView";
import { validateProblem } from "../../src/domain";

afterEach(cleanup);
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

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
    expect(screen.getAllByText(/Generated a two-step parameterized draft/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));
    const saved = JSON.parse(localStorage.getItem("storymath_authoring_draft_v1") ?? "{}");
    expect(saved.story.briefTemplate).toContain("{quantity:models_to_design_for}");
    expect(saved.story.briefTemplate).toContain("{quantity:sketches_per_model}");
    expect(saved.story.briefTemplate).toContain("{quantity:top_sketches}");
    expect(saved.quantities.find((q: { id: string }) => q.id === "total_sketches").expectedValueForFixture).toBe(33);
    expect(saved.quantities.find((q: { id: string }) => q.id === "eliminated_sketches").expectedValueForFixture).toBe(28);
  });

  it("analyzes a monthly sales affordability story into two multiplication steps and a yes/no decision", async () => {
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
          "Grandpa gave Tilly an opportunity to create special edition Pages & Co bookmarks to raise money to buy a season package of theatre tickets. They will sell for £5 each and since they had the press and materials she could keep all the money. She wanted to make a design for each of the months, and do a limited run of 5 each. If they all sell, how much will she have left after buying a £289 theatre package?",
      },
    });
    await user.click(screen.getByRole("button", { name: /Analyze and prefill draft/i }));

    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe(
      "Tilly's theatre bookmark fundraiser",
    );
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("multiplication_equal_groups");
    expect(screen.getAllByText(/Generated a two-step parameterized draft/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Decision question/i), {
      target: { value: "Can Tilly buy the theatre package?" },
    });

    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));
    const saved = JSON.parse(localStorage.getItem("storymath_authoring_draft_v1") ?? "{}");
    expect(saved.story.briefTemplate).toContain("{value:bookmarks_per_month}");
    expect(saved.story.briefTemplate).toContain("£{value:price_per_bookmark}");
    expect(saved.story.briefTemplate).toContain("£{value:package_cost}");
    expect(saved.quantities.find((q: { id: string }) => q.id === "calendar_months").value).toBe(12);
    expect(saved.quantities.find((q: { id: string }) => q.id === "total_bookmarks").expectedValueForFixture).toBe(60);
    expect(saved.quantities.find((q: { id: string }) => q.id === "bookmark_revenue").expectedValueForFixture).toBe(300);
    expect(saved.recap.decisionQuestion.correctAnswer).toBe("yes");
    expect(saved.recap.decisionQuestion.prompt).toBe("Can Tilly buy the theatre package?");
    expect(validateProblem(saved).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("analyzes a shelf book search story into multiplication then equal sharing", async () => {
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
          "Tilly and Oscar learned that is a secret message in one of the books at the Library of Congress. They know which floor and specific bookcase the book is on, but they don’t know the title. There are 6 shelves, each with about 20 books. If they were unlucky enough to find the clue in the last book, approximately how many books did each friend need to search?",
      },
    });
    await user.click(screen.getByRole("button", { name: /Analyze and prefill draft/i }));

    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe(
      "Tilly and Oscar's Library of Congress search",
    );
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("division_equal_sharing");

    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));
    const saved = JSON.parse(localStorage.getItem("storymath_authoring_draft_v1") ?? "{}");
    expect(saved.story.briefTemplate).toContain("{quantity:library_shelves}");
    expect(saved.story.briefTemplate).toContain("approximately {quantity:books_per_shelf}");
    expect(saved.steps[0].backwardCheck.prompt).toBe(
      "Now let's divide the approximate total books on the bookcase by the number of shelves. Do we get the approximate number of books on each shelf?",
    );
    expect(saved.quantities.find((q: { id: string }) => q.id === "library_shelves").value).toBe(6);
    expect(saved.quantities.find((q: { id: string }) => q.id === "books_per_shelf").value).toBe(20);
    expect(saved.quantities.find((q: { id: string }) => q.id === "searching_friends").value).toBe(2);
    expect(saved.quantities.find((q: { id: string }) => q.id === "total_books").expectedValueForFixture).toBe(120);
    expect(saved.quantities.find((q: { id: string }) => q.id === "books_per_friend").expectedValueForFixture).toBe(60);
    expect(validateProblem(saved).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("analyzes a train-car book trade story into multiplication then subtraction", async () => {
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
          "The Quip had 10 train cars, with each car classified into a book section such as fiction, science, and art. Each section has approximately 380 books. During a stop in Venice, Horatio traded 240 of the books on the Quip. Approximately how many total books were left on the Quip after Venice?",
      },
    });
    await user.click(screen.getByRole("button", { name: /Analyze and prefill draft/i }));

    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe("Quip book trade in Venice");
    const relationships = screen.getAllByRole("combobox", { name: /^Relationship$/i }) as HTMLSelectElement[];
    expect(relationships).toHaveLength(2);
    expect(relationships[0]!.value).toBe("multiplication_equal_groups");
    expect(relationships[1]!.value).toBe("start_change_end_decrease");

    await user.click(screen.getByRole("button", { name: /Save browser draft/i }));
    const saved = JSON.parse(localStorage.getItem("storymath_authoring_draft_v1") ?? "{}");
    expect(saved.story.briefTemplate).toContain("{quantity:train_cars}");
    expect(saved.story.briefTemplate).toContain("{quantity:books_per_section}");
    expect(saved.story.briefTemplate).toContain("{quantity:traded_books}");
    expect(saved.steps[0].backwardCheck.prompt).toBe(
      "Now let's divide the total books before Venice by the number of train cars. Do we get the approximate number of books in each section?",
    );
    expect(saved.quantities.find((q: { id: string }) => q.id === "train_cars").value).toBe(10);
    expect(saved.quantities.find((q: { id: string }) => q.id === "books_per_section").value).toBe(380);
    expect(saved.quantities.find((q: { id: string }) => q.id === "traded_books").value).toBe(240);
    expect(saved.quantities.find((q: { id: string }) => q.id === "books_before_venice").expectedValueForFixture).toBe(3800);
    expect(saved.quantities.find((q: { id: string }) => q.id === "books_left_after_venice").expectedValueForFixture).toBe(3560);
    expect(validateProblem(saved).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("posts the edited draft JSON to the local repo save endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, path: "data/problems/tillys_theatre_bookmark_fundraiser-v1.json", issues: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

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
          "Grandpa gave Tilly an opportunity to create special edition Pages & Co bookmarks to raise money to buy a season package of theatre tickets. They will sell for £5 each and since they had the press and materials she could keep all the money. She wanted to make a design for each of the months, and do a limited run of 5 each. If they all sell, how much will she have left after buying a £289 theatre package?",
      },
    });
    await user.click(screen.getByRole("button", { name: /Analyze and prefill draft/i }));
    fireEvent.change(screen.getByLabelText(/Decision question/i), {
      target: { value: "Can Tilly buy the theatre package?" },
    });

    await user.click(screen.getByRole("button", { name: /Save JSON to repo/i }));

    expect(await screen.findAllByText(/Saved to data\/problems\/tillys_theatre_bookmark_fundraiser-v1\.json/i)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "/__storymath_authoring/problems",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    const posted = JSON.parse(String(request.body));
    expect(posted.story.briefTemplate).toContain("£{value:price_per_bookmark}");
    expect(posted.recap.decisionQuestion.prompt).toBe("Can Tilly buy the theatre package?");
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
    expect(screen.getAllByText(/Browser draft saved/i).length).toBeGreaterThan(0);
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
