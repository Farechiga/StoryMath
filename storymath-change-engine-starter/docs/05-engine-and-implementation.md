# Engine and Implementation Plan
## Build the relationship engine, not a custom game per story

## 1. Recommended technical shape

Use a small, separable architecture:

```text
JSON problem data
      ↓
Domain engine
      ↓
UI state machine
      ↓
Reusable React components
      ↓
Interaction log
```

The domain engine must not depend on rendering components.

## 2. Suggested folder structure after scaffold

```text
src/
  app/
  components/
    StoryBrief.tsx
    DirectionPrediction.tsx
    QuantityTray.tsx
    EquationBuilder.tsx
    OperatorExperimentPanel.tsx
    BarModel.tsx
    BackwardCheckBuilder.tsx
    CausalRecap.tsx
  domain/
    types.ts
    relationships.ts
    instantiateProblem.ts
    evaluateEquation.ts
    operatorExperiment.ts
    backwardCheck.ts
    validateProblem.ts
  state/
    gameMachine.ts
  data/
    loadProblem.ts
  styles/
tests/
  domain/
  components/
data/
```

A lightweight React + TypeScript client is sufficient for the initial app. Render bar models using SVG or a small chart abstraction. Do not make the first prototype depend on elaborate animation.

## 3. Domain engine responsibilities

### 3.1 Instantiate a problem

Input:

```text
ProblemTemplate + deterministic seed
```

Output:

```text
ProblemInstance with:
- given values
- derived values
- rendered story text
- valid steps
- previews
- checks
```

For the first app, load a static instance from JSON. Introduce parameter generation only after the static NASA instance works.

### 3.2 Evaluate a semantic equation

The evaluator receives:

```ts
type StudentEquation = {
  leftQuantityId: string;
  operator: "+" | "-" | "×" | "÷";
  rightQuantityId: string;
  resultQuantityId: string;
  typedAnswer?: number;
};
```

It returns separate results:

```ts
type EquationEvaluation = {
  semanticMatch: boolean;
  numericModelResult: number | null;
  answerCorrect: boolean | null;
  storyEffect: "increase" | "decrease" | "scale" | "split";
  acceptedEquationFormId?: string;
  feedbackMode: "actual" | "counterfactual" | "different_question";
};
```

Do not conflate these conditions:

```text
A. The relationship form is valid.
B. The operator fits the actual story.
C. The arithmetic is correct.
D. The answer is in the right unit.
E. The backward check reconciles.
```

A child can have a good model but an arithmetic slip. The feedback must recognize that.

### 3.3 Generate an operator experiment

Pseudocode:

```ts
function runOperatorExperiment(step, selectedOperator, quantityValues) {
  const experiment = step.operatorExperiments[selectedOperator];
  const [leftId, rightId] = experiment.operandQuantityIds;

  const left = quantityValues[leftId];
  const right = quantityValues[rightId];
  const computed = calculate(selectedOperator, left, right);

  return {
    computed,
    narrativeFit: experiment.narrativeFit,
    headline: experiment.headline,
    explanation: experiment.explanation,
    worldIfTrue: experiment.worldIfTrue,
    visualEffect: experiment.directionProduced
  };
}
```

### 3.4 Create a backward check

The backward check is selected from the relationship template, not hand-coded by story ID.

```ts
function buildBackwardCheck(problem, completedStep) {
  // Find one permitted inverse equation form.
  // Populate semantic cards and values.
  // Return an interactive equation frame.
}
```

For a comparison step:

```text
Bigger − Difference = Smaller
```

possible backward form:

```text
Smaller + Difference = Bigger
```

For a part-whole step:

```text
Part A + Part B = Whole
```

possible checks:

```text
Whole − Part A = Part B
Whole − Part B = Part A
```

## 4. State machine

Use explicit state rather than a growing collection of booleans.

```ts
type GamePhase =
  | "brief"
  | "direction_prediction"
  | "target_selection"
  | "relationship_building"
  | "operator_experiment"
  | "arithmetic_entry"
  | "step_confirmed"
  | "backward_check"
  | "causal_recap"
  | "complete";
```

Suggested state shape:

```ts
type GameState = {
  problemId: string;
  currentStepIndex: number;
  phase: GamePhase;
  directionPrediction?: "increase" | "decrease" | "same" | "not_sure";
  selectedQuantityIds: string[];
  selectedOperator?: "+" | "-" | "×" | "÷";
  attemptedExperiments: Array<{
    stepId: string;
    operator: "+" | "-" | "×" | "÷";
    result: number;
    narrativeFit: string;
  }>;
  completedSteps: Record<string, {
    equationFormId: string;
    operator: string;
    answer: number;
    semanticCorrect: boolean;
    numericalCorrect: boolean;
  }>;
  backwardChecks: Record<string, boolean>;
  detectiveNotes: Record<string, string>;
};
```

## 5. Algorithmic rules

### Rule 1 — Direction check comes before answer calculation

The UI asks whether the target should be larger, smaller, same, combined, split, or scaled before the child commits an operation.

This gives the app a useful comparison:

```text
Predicted effect vs selected operation effect vs story’s actual effect
```

### Rule 2 — Every problem step has one target

Never ask a child to build both steps’ equations at once.

### Rule 3 — The data owns the story behavior

The engine does not infer a rover-specific explanation. It reads the appropriate `operatorExperiments` pack from the problem.

### Rule 4 — Visual output is derived from quantities

The bar model is configured by semantic roles and quantity IDs:

```text
comparison:
  bigger, smaller, difference

part-part-whole:
  partA, partB, whole

change:
  start, change, end
```

### Rule 5 — Preserve equivalent equations

If the learner constructs a valid equivalent relationship and the answer is correct, accept it when it is in the step’s `acceptedEquationFormIds`.

Do not force one wording merely because it was the author’s preferred path.

## 6. Bar-model rendering

### Comparison model

For the NASA step:

```text
Monday      [────────────────────────────] 384 m
Tuesday     [───────────────────]          256 m
Difference                    [─────────] 128 m
```

Implementation notes:

- Use a consistent scale across bars within a view.
- Clearly label the numbers.
- The difference should visually align to the extra segment of the longer bar.
- When an attempted operator creates 512 or 49,152, cap the visual display intelligently:
  - retain proportional meaning where practical;
  - use a “far larger than this scale” indicator for huge multiplication previews;
  - never make the correct values unreadable because of a wild counterfactual result.

### Total model

```text
Monday + Tuesday = total

[ Monday 384 ][ Tuesday 256 ] = [ Total 640 ]
```

Use segmentation, not only separate bars.

## 7. Test plan

### 7.1 Unit tests

```text
calculate(+ − × ÷)
instantiate valid numeric values
reject negative derived distance
recognize accepted comparison equation forms
recognize accepted part-part-whole forms
build correct backward check
calculate alternate operator preview
verify unit compatibility
validate all JSON references
```

### 7.2 NASA scenario tests

```text
Direction “decrease” matches actual causal event.
384 − 128 produces 256.
384 + 128 produces 512 and counterfactual mode.
384 × 128 produces 49,152 and different-question mode.
384 ÷ 128 produces 3 and different-question mode.
256 + 128 = 384 is accepted as a backward check.
384 + 256 = 640 completes second step.
640 − 256 = 384 and 640 − 384 = 256 are valid final checks.
```

### 7.3 UI tests

```text
Child can select cards with click/tap.
Child can select cards by drag and drop.
Child can change operator after an experiment.
No “wrong” label appears for counterfactual attempts.
Step 2 stays locked until Step 1 is confirmed.
Backward check stays required before final completion.
Bar model updates after experiment.
Typed numerical input accepts valid whole number.
```

## 8. Build milestones

### Milestone 0 — Documentation and static data

Deliver:

```text
- repository scaffold
- product docs
- NASA JSON instance
- relationship catalog
- domain type definitions
```

### Milestone 1 — Single-problem vertical slice

Deliver:

```text
- render NASA story
- direction prediction
- quantity cards
- one equation builder
- operator experiment panel
- subtraction answer input
- comparison bar model
```

### Milestone 2 — Two-step completion

Deliver:

```text
- reveal Tuesday as known
- second part-part-whole equation
- total bar model
- backward check
- causal recap
```

### Milestone 3 — Domain hardening

Deliver:

```text
- JSON schema validation
- reusable relationship catalog
- operator-pack validation
- unit tests
- deterministic instance generator prototype
```

### Milestone 4 — Add three story worlds

Deliver:

```text
- Minnesota wildlife
- books / reading
- puppy or cooking
```

The goal is to prove that content changes without new interaction components.

### Milestone 5 — Early multiplication/division preview refinement

Deliver:

```text
- improve “different question” feedback
- introduce one actual equal-groups story
- retain clear separation between additive and multiplicative families
```

## 9. Definition of “scales gracefully”

The architecture passes the scale test when a new author can add:

```text
one JSON problem template
one set of numeric constraints
one operator pack
one optional small illustration
```

and receive:

```text
story display
quantity cards
guided equation frames
operator experiments
backward checks
bar model
reasoning log
```

without editing core UI logic.

## 10. First Claude Code task

Use `prompts/claude-code-kickoff.md` unchanged for the first implementation pass. It is intentionally narrow: build the NASA vertical slice and report what is missing rather than improvising an entire platform.
