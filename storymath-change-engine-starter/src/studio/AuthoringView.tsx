import { useMemo, useState } from "react";
import { BrandMark } from "../components/BrandMark";
import type { ProblemSpec } from "../model/problemSpec";
import { useStudio } from "./StudioContext";
import { AUTHORING_PROBLEM_SPECS } from "./problemCatalog";

const PASSCODE = "0511";
const AUTHORING_DRAFT_KEY = "storymath_authoring_draft_v1";

const RELATIONSHIPS = [
  {
    id: "additive_comparison_decrease",
    title: "Compare, find gap",
    operation: "-",
    roles: "bigger, difference, smaller",
    formula: "bigger - smaller = difference",
    visual: "Comparison gap bar",
  },
  {
    id: "additive_comparison_increase",
    title: "Compare, build bigger",
    operation: "+",
    roles: "smaller, difference, bigger",
    formula: "smaller + difference = bigger",
    visual: "Comparison gap bar",
  },
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

type RelationshipId = typeof RELATIONSHIPS[number]["id"];
type QuantityDraft = {
  id: string;
  child: string;
  compact: string;
  lowercase: string;
  unit: string;
  unitSingular: string;
  unitPlural: string;
};
type StepDraft = {
  id: string;
  prompt: string;
  reasoningPrompt: string;
  backwardPrompt: string;
};
type RecapDraft = {
  headline: string;
  causalChain: string;
  dataQuestionPrompt: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cloneSpec(spec: ProblemSpec): ProblemSpec {
  return JSON.parse(JSON.stringify(spec)) as ProblemSpec;
}

function relationshipFor(id: string) {
  return RELATIONSHIPS.find((item) => item.id === id) ?? RELATIONSHIPS[0];
}

function quantityDraftsFor(spec: ProblemSpec): QuantityDraft[] {
  return spec.quantities.map((quantity) => ({
    id: quantity.id,
    child: quantity.label.child,
    compact: quantity.label.compact,
    lowercase: quantity.label.lowercase ?? quantity.label.compact.toLowerCase(),
    unit: quantity.unit,
    unitSingular: quantity.unitSingular ?? quantity.unit,
    unitPlural: quantity.unitPlural ?? quantity.unit,
  }));
}

function stepDraftsFor(spec: ProblemSpec): StepDraft[] {
  return spec.steps.map((step) => ({
    id: step.id,
    prompt: step.prompt,
    reasoningPrompt: step.reasoningPrompt,
    backwardPrompt: step.backwardCheck.prompt,
  }));
}

function recapDraftFor(spec: ProblemSpec): RecapDraft {
  return {
    headline: spec.recap.headline,
    causalChain: spec.recap.causalChain.join("\n"),
    dataQuestionPrompt: spec.recap.dataQuestion.prompt,
    correctFeedback: spec.recap.dataQuestion.correctFeedback,
    incorrectFeedback: spec.recap.dataQuestion.incorrectFeedback,
  };
}

export function AuthoringView() {
  const { openMenu } = useStudio();
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [baseSpec, setBaseSpec] = useState<ProblemSpec | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [title, setTitle] = useState("New StoryMath problem");
  const [theme, setTheme] = useState("Classroom story");
  const [problemParagraph, setProblemParagraph] = useState(
    "Write the full word problem paragraph here. Use tokens like {quantity:items_given} for every modeled number.",
  );
  const [gradeBand, setGradeBand] = useState("3-4");
  const [storyNoun, setStoryNoun] = useState("items");
  const [singularNoun, setSingularNoun] = useState("item");
  const [genericUnit, setGenericUnit] = useState("items");
  const [relationshipIds, setRelationshipIds] = useState<RelationshipId[]>(["start_change_end_decrease"]);
  const [quantityDrafts, setQuantityDrafts] = useState<QuantityDraft[]>([]);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);
  const [recapDraft, setRecapDraft] = useState<RecapDraft>({
    headline: "Why the answer works",
    causalChain: "Use field-merge tokens here.",
    dataQuestionPrompt: "Ask what one modeled number represents.",
    correctFeedback: "Right.",
    incorrectFeedback: "Look back at the model.",
  });
  const [selectedProblemId, setSelectedProblemId] = useState(AUTHORING_PROBLEM_SPECS[0]?.id ?? "");

  const primaryRelationship = relationshipFor(relationshipIds[0] ?? "start_change_end_decrease");
  const selectedProblem = AUTHORING_PROBLEM_SPECS.find((spec) => spec.id === selectedProblemId);
  const problemId = slugify(title) || "new_storymath_problem";
  const quantityStem = slugify(storyNoun) || "items";
  const today = new Date().toISOString().slice(0, 10);
  const applySpecToEditor = (spec: ProblemSpec, message: string) => {
    const firstQuantity = spec.quantities[0];

    setBaseSpec(cloneSpec(spec));
    setTitle(spec.metadata.title);
    setTheme(spec.metadata.theme);
    setGradeBand(spec.metadata.gradeBand);
    setProblemParagraph(spec.story.briefTemplate);
    setStoryNoun(firstQuantity?.unitPlural ?? firstQuantity?.unit ?? "items");
    setSingularNoun(firstQuantity?.unitSingular ?? "item");
    setGenericUnit(firstQuantity?.unit ?? "items");
    setQuantityDrafts(quantityDraftsFor(spec));
    setStepDrafts(stepDraftsFor(spec));
    setRecapDraft(recapDraftFor(spec));
    setRelationshipIds(
      spec.steps.map((step) => relationshipFor(step.relationshipTemplateId).id),
    );
    setSaveMessage(message);
  };
  const loadSelectedProblem = () => {
    if (!selectedProblem) return;
    applySpecToEditor(selectedProblem, "Loaded existing problem wording.");
  };

  const editedSpec = useMemo(
    () => {
      if (baseSpec) {
        const spec = cloneSpec(baseSpec);
        spec.metadata.title = title;
        spec.metadata.theme = theme;
        spec.metadata.gradeBand = gradeBand;
        spec.story.briefTemplate =
          problemParagraph.trim() || "Write the story with quantity tokens.";
        spec.storyChrome.groupNoun = singularNoun;
        const quantityDraftById = new Map(quantityDrafts.map((draft) => [draft.id, draft]));
        spec.quantities = spec.quantities.map((quantity, index) => {
          const draft = quantityDraftById.get(quantity.id);
          const firstQuantityFallback =
            index === 0
              ? {
                  unit: genericUnit,
                  unitSingular: singularNoun,
                  unitPlural: storyNoun,
                }
              : {};
          if (!draft) return { ...quantity, ...firstQuantityFallback };
          return {
            ...quantity,
            label: {
              child: draft.child,
              compact: draft.compact,
              lowercase: draft.lowercase,
            },
            unit: draft.unit,
            unitSingular: draft.unitSingular,
            unitPlural: draft.unitPlural,
            ...firstQuantityFallback,
          };
        });
        const stepDraftById = new Map(stepDrafts.map((draft) => [draft.id, draft]));
        spec.steps = spec.steps.map((step, index) => ({
          ...step,
          ...(stepDraftById.get(step.id)
            ? {
                prompt: stepDraftById.get(step.id)!.prompt,
                reasoningPrompt: stepDraftById.get(step.id)!.reasoningPrompt,
                backwardCheck: {
                  ...step.backwardCheck,
                  prompt: stepDraftById.get(step.id)!.backwardPrompt,
                },
              }
            : {}),
          relationshipTemplateId: relationshipFor(relationshipIds[index] ?? step.relationshipTemplateId).id,
        }));
        spec.recap = {
          ...spec.recap,
          headline: recapDraft.headline,
          causalChain: recapDraft.causalChain
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          dataQuestion: {
            ...spec.recap.dataQuestion,
            prompt: recapDraft.dataQuestionPrompt,
            correctFeedback: recapDraft.correctFeedback,
            incorrectFeedback: recapDraft.incorrectFeedback,
          },
        };
        return spec;
      }

      const relationship = primaryRelationship;
      return {
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
      } as unknown as ProblemSpec;
    },
    [baseSpec, genericUnit, gradeBand, primaryRelationship, problemId, problemParagraph, quantityDrafts, quantityStem, recapDraft, relationshipIds, singularNoun, stepDrafts, storyNoun, theme, title, today],
  );
  const editedJson = useMemo(() => JSON.stringify(editedSpec, null, 2), [editedSpec]);
  const downloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(`${editedJson}\n`)}`;
  const downloadName = `${baseSpec?.id ?? editedSpec.id}.json`;
  const saveDraft = () => {
    localStorage.setItem(AUTHORING_DRAFT_KEY, editedJson);
    setSaveMessage("Browser draft saved. Download JSON to update the repository.");
  };
  const loadDraft = () => {
    const raw = localStorage.getItem(AUTHORING_DRAFT_KEY);
    if (!raw) {
      setSaveMessage("No saved draft found.");
      return;
    }
    try {
      applySpecToEditor(JSON.parse(raw) as ProblemSpec, "Loaded saved draft.");
    } catch {
      setSaveMessage("Saved draft could not be read.");
    }
  };
  const setStepRelationship = (index: number, id: RelationshipId) => {
    setRelationshipIds((current) => current.map((value, i) => (i === index ? id : value)));
  };
  const updateQuantityDraft = (id: string, field: keyof Omit<QuantityDraft, "id">, value: string) => {
    setQuantityDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };
  const updateStepDraft = (id: string, field: keyof Omit<StepDraft, "id">, value: string) => {
    setStepDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };

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

      <section className="panel authoring-panel authoring-loader" aria-label="Load an existing problem">
        <h2 className="authoring-title">Load existing wording</h2>
        <label className="authoring-field">
          <span>Existing problem</span>
          <select
            className="text-input"
            value={selectedProblemId}
            onChange={(event) => setSelectedProblemId(event.target.value)}
          >
            {AUTHORING_PROBLEM_SPECS.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.metadata.title}
              </option>
            ))}
          </select>
        </label>
        {selectedProblem && (
          <p className="authoring-help">
            {selectedProblem.metadata.theme} · {selectedProblem.metadata.gradeBand}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={loadSelectedProblem}>
            Load wording
          </button>
          <button type="button" className="btn btn--ghost" onClick={loadDraft}>
            Load saved draft
          </button>
        </div>
        {saveMessage && <p className="authoring-save">{saveMessage}</p>}
      </section>

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
          <h2 className="authoring-title">Step sequence</h2>
          <div className="authoring-steps">
            {editedSpec.steps.map((step, index) => {
              const relationship = relationshipFor(relationshipIds[index] ?? step.relationshipTemplateId);
              const stepDraft = stepDrafts.find((draft) => draft.id === step.id);
              return (
                <section className="authoring-step" key={step.id}>
                  <h3 className="authoring-step__title">Step {index + 1}</h3>
                  {stepDraft ? (
                    <>
                      <label className="authoring-field">
                        <span>Question prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.prompt}
                          onChange={(event) => updateStepDraft(step.id, "prompt", event.target.value)}
                        />
                      </label>
                      <label className="authoring-field">
                        <span>Reasoning prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.reasoningPrompt}
                          onChange={(event) => updateStepDraft(step.id, "reasoningPrompt", event.target.value)}
                        />
                      </label>
                      <label className="authoring-field">
                        <span>Backward check prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.backwardPrompt}
                          onChange={(event) => updateStepDraft(step.id, "backwardPrompt", event.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <p className="authoring-step__prompt">{step.prompt}</p>
                  )}
                  <label className="authoring-field">
                    <span>Relationship</span>
                    <select
                      className="text-input"
                      value={relationship.id}
                      onChange={(event) => setStepRelationship(index, event.target.value as RelationshipId)}
                    >
                      {RELATIONSHIPS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} ({item.operation})
                        </option>
                      ))}
                    </select>
                  </label>
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
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Quantity wording</h2>
          {quantityDrafts.length === 0 ? (
            <p className="authoring-help">Load an existing problem to edit all quantity labels.</p>
          ) : (
            <div className="authoring-steps">
              {quantityDrafts.map((quantity) => (
                <section className="authoring-step" key={quantity.id}>
                  <h3 className="authoring-step__title">{quantity.id}</h3>
                  <label className="authoring-field">
                    <span>Answer choice label</span>
                    <input
                      className="text-input"
                      value={quantity.child}
                      onChange={(event) => updateQuantityDraft(quantity.id, "child", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Short label</span>
                    <input
                      className="text-input"
                      value={quantity.compact}
                      onChange={(event) => updateQuantityDraft(quantity.id, "compact", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Sentence label</span>
                    <input
                      className="text-input"
                      value={quantity.lowercase}
                      onChange={(event) => updateQuantityDraft(quantity.id, "lowercase", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Quantity arithmetic unit</span>
                    <input
                      className="text-input"
                      value={quantity.unit}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unit", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Singular display noun</span>
                    <input
                      className="text-input"
                      value={quantity.unitSingular}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unitSingular", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Plural display noun</span>
                    <input
                      className="text-input"
                      value={quantity.unitPlural}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unitPlural", event.target.value)}
                    />
                  </label>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="panel authoring-panel">
          <h2 className="authoring-title">Recap wording</h2>
          <label className="authoring-field">
            <span>Recap headline</span>
            <input
              className="text-input"
              value={recapDraft.headline}
              onChange={(event) => setRecapDraft((current) => ({ ...current, headline: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Causal chain</span>
            <span className="authoring-help">One recap bubble per line. Use tokens for quantities and labels.</span>
            <textarea
              className="text-input authoring-textarea"
              value={recapDraft.causalChain}
              onChange={(event) => setRecapDraft((current) => ({ ...current, causalChain: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Data question</span>
            <input
              className="text-input"
              value={recapDraft.dataQuestionPrompt}
              onChange={(event) => setRecapDraft((current) => ({ ...current, dataQuestionPrompt: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Correct feedback</span>
            <input
              className="text-input"
              value={recapDraft.correctFeedback}
              onChange={(event) => setRecapDraft((current) => ({ ...current, correctFeedback: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Try-again feedback</span>
            <input
              className="text-input"
              value={recapDraft.incorrectFeedback}
              onChange={(event) => setRecapDraft((current) => ({ ...current, incorrectFeedback: event.target.value }))}
            />
          </label>
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
          <h2 className="authoring-title">Updated problem JSON</h2>
          <p className="authoring-help">
            Browser drafts stay on this device. To update the live game, download this JSON and replace the matching file in data/problems before committing.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={saveDraft}>
              Save browser draft
            </button>
            <a className="btn btn--ghost" href={downloadHref} download={downloadName}>
              Download JSON for repo
            </a>
          </div>
          <pre className="authoring-json">{editedJson}</pre>
        </div>
      </section>
    </main>
  );
}
