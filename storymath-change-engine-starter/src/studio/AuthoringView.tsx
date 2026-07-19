import { useMemo, useState } from "react";
import { BrandMark } from "../components/BrandMark";
import { useStudio } from "./StudioContext";

const PASSCODE = "0511";

const RELATIONSHIPS = [
  {
    id: "start_change_end_decrease",
    title: "Start, remove, end",
    operation: "-",
    roles: "start, change, end",
    formula: "start - change = end",
    visual: "Full starting span over remaining + removed parts",
  },
  {
    id: "start_change_end_increase",
    title: "Start, add, end",
    operation: "+",
    roles: "start, change, end",
    formula: "start + change = end",
    visual: "Before/change/after bridge",
  },
  {
    id: "part_part_whole",
    title: "Parts make a whole",
    operation: "+",
    roles: "partA, partB, whole",
    formula: "partA + partB = whole",
    visual: "Part-whole bar",
  },
  {
    id: "multiplication_equal_groups",
    title: "Equal groups",
    operation: "×",
    roles: "groups, itemsPerGroup, total",
    formula: "groups × items = total",
    visual: "Repeated-groups grid",
  },
  {
    id: "division_equal_sharing",
    title: "Equal sharing",
    operation: "÷",
    roles: "total, groups, itemsPerGroup",
    formula: "total ÷ groups = items per group",
    visual: "Equal-shares tray",
  },
] as const;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function AuthoringView() {
  const { openMenu } = useStudio();
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("New StoryMath problem");
  const [theme, setTheme] = useState("Classroom story");
  const [problemParagraph, setProblemParagraph] = useState(
    "Write the full word problem paragraph here. Use tokens like {quantity:items_given} for every modeled number.",
  );
  const [gradeBand, setGradeBand] = useState("3-4");
  const [storyNoun, setStoryNoun] = useState("items");
  const [singularNoun, setSingularNoun] = useState("item");
  const [genericUnit, setGenericUnit] = useState("items");
  const [relationshipId, setRelationshipId] = useState<typeof RELATIONSHIPS[number]["id"]>("start_change_end_decrease");

  const relationship = RELATIONSHIPS.find((r) => r.id === relationshipId)!;
  const problemId = slugify(title) || "new_storymath_problem";
  const quantityStem = slugify(storyNoun) || "items";
  const today = new Date().toISOString().slice(0, 10);

  const scaffold = useMemo(
    () => ({
      id: `${problemId}-v1`,
      metadata: {
        title,
        theme,
        gradeBand,
        factualStatus: "realistic",
        tags: [relationship.operation, relationship.id],
        catalogOrder: 1000,
        publishedAt: today,
      },
      dimension: {
        kind: "count",
        increaseLabel: "More",
        decreaseLabel: "Fewer",
        sameLabel: "The same",
        increaseLabelLower: "more",
        decreaseLabelLower: "fewer",
        sameLabelLower: "the same",
      },
      storyChrome: {
        openingEyebrow: "Author note",
        startCta: "Start the model",
        finishCta: "Close the model",
        stepProgressVerb: "model the story",
        groupNoun: singularNoun,
        learnerRole: "model builder",
      },
      story: {
        briefTemplate:
          problemParagraph.trim() || `Write the story with tokens like {quantity:${quantityStem}_given}.`,
      },
      quantities: [
        {
          id: `${quantityStem}_given`,
          label: {
            child: `Given ${storyNoun}`,
            compact: `Given ${storyNoun}`,
            lowercase: `the given ${storyNoun}`,
          },
          unit: genericUnit,
          unitSingular: singularNoun,
          unitPlural: storyNoun,
          value: 0,
          visibility: "given",
        },
      ],
      steps: [
        {
          id: `find_${quantityStem}`,
          order: 1,
          prompt: "Write one clear question for this step.",
          reasoningPrompt: "Ask what relationship the numbers have without giving away the answer.",
          relationshipTemplateId: relationship.id,
          roleToQuantityId: Object.fromEntries(relationship.roles.split(", ").map((role) => [role, "quantity_id_here"])),
          goalQuantityId: "goal_quantity_id_here",
          acceptedEquationFormIds: ["formula_id_here"],
          preferredEquationFormId: "formula_id_here",
          expectedDirection:
            relationship.operation === "×" ? "scale" : relationship.operation === "÷" ? "split" : relationship.operation === "+" ? "combine" : "decrease",
          operatorOptions: ["+", "-", "×", "÷"],
          backwardCheck: {
            prompt: "Write the inverse check.",
            acceptedEquationFormIds: ["inverse_formula_id_here"],
          },
        },
      ],
      operatorExperiments: ["+", "-", "×", "÷"].map((operator) => ({
        stepId: `find_${quantityStem}`,
        operator,
        narrativeFit: operator === relationship.operation ? "actual" : "different_question",
        alternateWorldTemplate: "Explain whether this operation matches the story.",
      })),
      recap: {
        headline: "Why the answer works",
        causalChain: ["Use field-merge tokens here."],
        calcFromStepId: `find_${quantityStem}`,
        dataQuestion: {
          prompt: "Ask what one modeled number represents.",
          correctQuantityId: `${quantityStem}_given`,
          distractorQuantityIds: [],
          correctFeedback: "Right.",
          incorrectFeedback: "Look back at the model.",
        },
      },
    }),
    [genericUnit, gradeBand, problemId, problemParagraph, quantityStem, relationship, singularNoun, storyNoun, theme, title, today],
  );

  const qaItems = [
    "Every modeled number in prose uses a field-merge token.",
    "Every story-specific noun has unitSingular and unitPlural.",
    "Every step has one goal quantity, preferred equation form, and backward check.",
    "Each offered operator has one operator experiment.",
    "Exactly one operator experiment per step is marked actual.",
    "Derived quantities include expectedValueForFixture.",
    "catalogOrder or publishedAt is set so newest packs can appear first.",
  ];

  if (!unlocked) {
    return (
      <main className="app-shell authoring">
        <header className="masthead">
          <button type="button" className="brand brand--link" onClick={openMenu} aria-label="Back to the problem menu">
            <BrandMark className="brand__mark" />
            <span className="brand__title">StoryMath</span>
          </button>
        </header>
        <section className="authoring-gate panel">
          <p className="eyebrow">Internal authoring</p>
          <h1 className="stage-title">Authoring tool</h1>
          <label className="authoring-field">
            <span>Passcode</span>
            <input
              className="text-input"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const ok = passcode === PASSCODE;
                  setUnlocked(ok);
                  setError(ok ? "" : "Passcode not recognized.");
                }
              }}
              type="password"
              inputMode="numeric"
              aria-label="Authoring passcode"
            />
          </label>
          {error && <p className="authoring-error">{error}</p>}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                const ok = passcode === PASSCODE;
                setUnlocked(ok);
                setError(ok ? "" : "Passcode not recognized.");
              }}
            >
              Unlock
            </button>
            <button type="button" className="btn btn--ghost" onClick={openMenu}>
              Back
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell authoring">
      <header className="masthead">
        <button type="button" className="brand brand--link" onClick={openMenu} aria-label="Back to the problem menu">
          <BrandMark className="brand__mark" />
          <span className="brand__title">StoryMath</span>
        </button>
      </header>

      <p className="eyebrow">Internal authoring</p>
      <h1 className="stage-title">Build a clean problem pack</h1>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Story frame</h2>
          <label className="authoring-field">
            <span>Title</span>
            <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Story theme</span>
            <span className="authoring-help">
              Used as the menu subtitle and to choose the background ornament mood by keyword: space/rover, nature/forest, or design/studio.
            </span>
            <input className="text-input" value={theme} onChange={(event) => setTheme(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Word problem paragraph</span>
            <span className="authoring-help">
              This becomes story.briefTemplate. Replace every modeled number with a quantity token so the interfaces stay parameterized.
            </span>
            <textarea
              className="text-input authoring-textarea"
              value={problemParagraph}
              onChange={(event) => setProblemParagraph(event.target.value)}
            />
          </label>
          <label className="authoring-field">
            <span>Grade band</span>
            <input className="text-input" value={gradeBand} onChange={(event) => setGradeBand(event.target.value)} />
          </label>

          <h2 className="authoring-title">Naming</h2>
          <label className="authoring-field">
            <span>Story plural noun</span>
            <input className="text-input" value={storyNoun} onChange={(event) => setStoryNoun(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Story singular noun</span>
            <input className="text-input" value={singularNoun} onChange={(event) => setSingularNoun(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Arithmetic unit</span>
            <input className="text-input" value={genericUnit} onChange={(event) => setGenericUnit(event.target.value)} />
          </label>
        </div>

        <div className="panel authoring-panel">
          <h2 className="authoring-title">Relationship</h2>
          <div className="relationship-grid" role="group" aria-label="Choose a relationship template">
            {RELATIONSHIPS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`relationship-card${item.id === relationshipId ? " relationship-card--active" : ""}`}
                onClick={() => setRelationshipId(item.id)}
              >
                <span className="relationship-card__title">{item.title}</span>
                <span>{item.formula}</span>
                <span>{item.visual}</span>
              </button>
            ))}
          </div>

          <dl className="authoring-facts">
            <div>
              <dt>Roles</dt>
              <dd>{relationship.roles}</dd>
            </div>
            <div>
              <dt>Actual operation</dt>
              <dd>{relationship.operation}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">QA built into onboarding</h2>
          <ul className="authoring-checks">
            {qaItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Starter spec outline</h2>
          <pre className="authoring-json">{JSON.stringify(scaffold, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
