# Scalable Data Framework
## Author once, generate many coherent problems

## 1. Architectural claim

New story content should require configuration, not custom application code.

A content author should be able to create a new scenario by defining:

```text
World + causal event + relationship family + named quantities + numeric constraints + operator previews
```

The engine should then:

1. generate valid numeric values;
2. calculate derived quantities;
3. render story text;
4. create guided equation steps;
5. create counterfactual previews for attempted operators;
6. create backward checks;
7. render the right bar model;
8. record the child’s reasoning path.

## 2. Separate template from instance

### Story template

A **template** contains the reusable story logic and causal structure.

```text
Perseverance travels a base distance on Monday.
A wheel slips into sand.
Tuesday is a specified amount shorter.
Find Tuesday distance, then total two-day distance.
```

### Problem instance

An **instance** contains actual values that satisfy the template’s constraints.

```text
Monday = 384 meters
Difference = 128 meters
Tuesday = 256 meters
Total = 640 meters
```

This separation means the same story can generate many numerically valid versions:

```text
Monday = 350, difference = 70, Tuesday = 280, total = 630
Monday = 480, difference = 160, Tuesday = 320, total = 800
Monday = 624, difference = 156, Tuesday = 468, total = 1092
```

Do not randomize blindly. Every generated instance must pass pedagogical constraints: whole numbers, desired difficulty, answer range, clean operator-preview behavior, and no negative quantities.

## 3. Canonical domain objects

```text
StoryWorld
CausalEvent
Quantity
RelationshipTemplate
ProblemStep
OperatorExperiment
BackwardCheck
VisualizationSpec
ProblemTemplate
ProblemInstance
LearnerAttempt
```

### 3.1 StoryWorld

Represents the narrative environment.

```ts
type StoryWorld = {
  id: string;
  theme: string;                 // "mars_rover"
  title: string;                 // "Mars Field Log"
  characterIds: string[];
  place: string;
  shortFact?: {
    text: string;
    factualStatus: "verified" | "fictionalized" | "inspired_by";
    sourceNote?: string;
  };
};
```

### 3.2 CausalEvent

Represents what changed and why.

```ts
type CausalEvent = {
  id: string;
  actual: true;
  title: string;                 // "Wheel slips in soft sand"
  description: string;
  causalChain: string[];         // ["wheel slips", "less driving time", "less distance"]
  expectedEffect: "increase" | "decrease" | "combine" | "split" | "scale";
  affectsQuantityIds: string[];
};
```

### 3.3 Quantity

A number must never travel through the engine as a bare number. It needs a name, a unit, and a role in the story.

```ts
type Quantity = {
  id: string;
  semanticRole:
    | "smaller"
    | "bigger"
    | "difference"
    | "part"
    | "whole"
    | "start"
    | "change"
    | "end"
    | "groups"
    | "items_per_group";
  entity: string;                // "rover"
  measure: string;               // "distance traveled"
  unit: string;                  // "meters"
  context: {
    time?: string;               // "Monday"
    comparisonTo?: string;       // quantity ID
    condition?: string;          // "after wheel slip"
  };
  label: {
    child: string;               // "Distance traveled on Monday"
    compact: string;             // "Monday distance"
    semanticChips: string[];     // ["distance traveled", "on Monday"]
  };
  value: number | null;          // null when hidden for the child
  derivedFrom?: string;          // formula identifier
  visibility: "given" | "find" | "revealed_after_step";
};
```

### 3.4 RelationshipTemplate

A relationship template supplies semantic roles and all valid equation forms.

```ts
type RelationshipTemplate = {
  id: string;
  family: "additive_comparison" | "part_part_whole" | "start_change_end"
        | "equal_groups" | "sharing" | "measurement_division" | "scale";
  roles: string[];
  equationForms: Array<{
    id: string;
    lhs: [string, "+" | "-" | "×" | "÷", string];
    rhs: string;
    semanticReading: string;
    inverseCheckFormIds: string[];
  }>;
  primaryVisualization: "comparison_bar" | "part_whole_bar" | "change_bar";
};
```

### 3.5 ProblemStep

A two-step problem contains two focused decisions rather than one giant expression.

```ts
type ProblemStep = {
  id: string;
  order: number;
  goalQuantityId: string;
  relationshipTemplateId: string;
  acceptedEquationFormIds: string[];
  preferredEquationFormId: string;
  availableQuantityIds: string[];
  operatorOptions: Array<"+" | "-" | "×" | "÷">;
  expectedDirection: "increase" | "decrease" | "combine" | "split" | "scale";
  prompt: string;
  reasoningPrompt: string;
  backwardCheck: {
    required: true;
    equationFormId: string;
    prompt: string;
  };
};
```

### 3.6 OperatorExperiment

This is the critical structure that prevents generic feedback.

Each **story template** carries its own operator packs. The child’s attempted operation selects an alternate causal interpretation tied to that story.

```ts
type OperatorExperiment = {
  operator: "+" | "-" | "×" | "÷";
  operandQuantityIds: [string, string];
  hypotheticalTargetQuantityId: string;
  resultRule: string;            // "left + right"
  narrativeFit: "actual" | "counterfactual" | "different_question";
  directionProduced: "increase" | "decrease" | "scale" | "split";
  headline: string;
  explanation: string;
  worldIfTrue: string;
  storyMismatchQuestion?: string;
  pedagogicalNote?: string;
};
```

The engine must not invent these at runtime using generic text. For high-quality content, the author defines them in the template.

### 3.7 LearnerAttempt

Store the child’s reasoning, not only final correctness.

```ts
type LearnerAttempt = {
  problemId: string;
  stepId: string;
  timestamp: string;
  predictedDirection?: "increase" | "decrease" | "same" | "not_sure";
  selectedQuantityIds?: string[];
  selectedOperator?: "+" | "-" | "×" | "÷";
  generatedResult?: number;
  storyFitResponse?: "matches" | "does_not_match" | "not_sure";
  typedAnswer?: string;
  equationFormId?: string;
  isSemanticallyCorrect?: boolean;
  isNumericallyCorrect?: boolean;
  backwardCheckCorrect?: boolean;
  hintUsed?: boolean;
};
```

This makes later “data literacy” and adaptive coaching possible without being necessary for the MVP.

## 4. Parameterized number generation

Each template should define variables, formulas, and constraints.

```ts
type NumericVariable = {
  id: string;
  kind: "given" | "derived";
  min?: number;
  max?: number;
  step?: number;
  formula?: string;
  constraints?: string[];
};
```

Example:

```text
mondayDistance: 320–600, divisible by 8
distanceLost: 64–160, divisible by 8
tuesdayDistance = mondayDistance − distanceLost
twoDayTotal = mondayDistance + tuesdayDistance
```

### Recommended constraints for the NASA comparison template

```text
- All values are whole numbers.
- Tuesday distance remains positive.
- Difference is smaller than Monday distance.
- Division preview should be clean when possible:
  MondayDistance ÷ Difference is an integer.
- Total remains below a chosen visual ceiling, such as 1,200.
- Values should require meaningful computation but remain appropriate for the learner’s current skill level.
```

The canonical sample uses:

```text
Monday = 384
Difference = 128
Tuesday = 256
Total = 640
```

That gives:

```text
384 − 128 = 256
256 + 128 = 384
384 + 256 = 640
384 ÷ 128 = 3
```

The clean division result makes the exploratory division preview comprehensible even though division is not the intended operation.

## 5. Semantic equation construction

The UI should not depend on free-form natural-language parsing.

Instead, a child builds equations from structured quantity cards.

### Card construction

```text
[distance traveled] [on Monday]
[amount Tuesday was shorter] [than Monday]
[distance traveled] [on Tuesday]
```

These are rendered from `Quantity.label.semanticChips`, but the engine stores a canonical `quantity.id`.

### Equation frame

```text
[ Quantity Card ] [ Operator Picker ] [ Quantity Card ] = [ Quantity Card ]
[      384      ] [        −         ] [      128      ] = [      256      ]
```

The child can see and, later, edit semantic chips. The evaluation engine does not need to parse whatever she typed.

### Why this matters

This satisfies two goals at once:

1. The child names what each number means.
2. The app remains scalable and robust because it evaluates semantic IDs rather than prose.

Optional typed note:

```text
“I used subtraction because Tuesday was shorter after the wheel got stuck.”
```

This note is never required to progress and is not graded by the MVP.

## 6. Problem instance structure

A problem instance has:

```text
metadata
story
quantities
relationships
steps
operatorExperiments
visualizations
validation
```

See `data/problems/nasa-perseverance-wheel-slip.json` for the full reference shape.

## 7. Relationship catalog

The initial relationship catalog is intentionally small.

```text
additive_comparison
part_part_whole
start_change_end
```

Do not create a unique relationship type for every story wording. A wolf, rover, book, puppy, recipe, and Aikido practice can all use the same small family of mathematical structures.

## 8. Content scalability workflow

To add a new problem family:

```text
1. Choose a world.
2. Define a recurring character or object.
3. Define a causal event pack.
4. Select a relationship template.
5. Define quantity labels and units.
6. Define numeric variable constraints.
7. Write actual-story text.
8. Write operator-specific counterfactual explanations.
9. Define backward check.
10. Define bar-model labels.
11. Run validation.
```

No new interface component should be needed.

## 9. Data validation requirements

Before a problem can ship, validate:

```text
- IDs are unique.
- All referenced quantity IDs exist.
- Quantity units are compatible within each equation.
- Derived values equal formulas.
- Every step has at least one valid equation form.
- Every step includes a backward check.
- Every operator experiment has valid operands.
- The actual operator’s computed result equals the target quantity value.
- Counterfactual explanations are not marked as actual facts.
- Story text names all givens in a comprehensible way.
- The visual specification references valid quantities.
```

## 10. Future multiplicative extension

The data framework already supports multiplication and division; do not merge them conceptually into addition/subtraction.

Examples:

```text
Animal shelter:
6 kennels × 8 puppies each = 48 puppies

Pixar render farm:
4 render machines × 240 frames each = 960 frames

Cookie sharing:
48 cookies ÷ 6 tables = 8 cookies per table

Trail sections:
384 meters ÷ 128 meters per section = 3 sections
```

The same operator experiment framework applies:

```text
Try ×:
What repeated-group world would this describe?

Try ÷:
What equal-sharing or “how many groups fit?” question would this describe?
```
