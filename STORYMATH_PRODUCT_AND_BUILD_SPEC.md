<!-- BEGIN README.md -->

# StoryMath Change Engine
## A model-building game for vivid, causal multi-step word problems

> **Children do not merely choose an operation. They build a model of what changed in a world, test the operation that model implies, and check whether the result reconciles with the story.**

This repository is a documentation-first starter for a small web app aimed initially at an eight-year-old who is learning multi-step addition/subtraction word problems. It is designed to scale into a broader model-building curriculum: multiplication/division, data visualization, graphs, variables, scientific models, and systems thinking.

The first playable version should feel like this:

```text
Story world
  → What happened?
  → Should the quantity become bigger, smaller, or stay the same?
  → Build a named relationship from quantity cards
  → Try +, −, ×, or ÷
  → See the numerical and visual consequence
  → Decide whether that consequence matches this story
  → Solve and check backward
  → Read a simple bar model or chart
```

The first implementation target is deliberately narrow:

- Addition/subtraction fact-family logic
- Two-step problems
- Guided drag-and-drop equation construction
- Typed answers and optional reasoning notes
- Immediate, non-punitive operator experiments
- A simple bar-model visualization
- A deterministic JSON problem library
- One rich NASA rover example as the reference implementation

## Why this is not a themed worksheet

A themed worksheet replaces “ribbon” with “a rocket” but keeps the same generic problem underneath. This project instead starts with a causal world:

```text
Character + place + goal + event + consequence
                                      ↓
                              quantity changes
                                      ↓
                              relationship
                                      ↓
                                equation
```

For example:

```text
Perseverance is mapping an ancient Martian river delta.
A wheel slips in soft sand.
The rover has less time to drive.
Tuesday's distance is smaller than Monday's distance.
Tuesday = Monday − difference.
```

If the child tries addition, the app does not say “wrong.” It shows the counterfactual world that addition would describe:

```text
Monday: 384 meters
Try + 128
Tuesday: 512 meters

That would fit a different story: perhaps Perseverance found smoother ground
or had more available battery power. But this story says the wheel slipped
and Tuesday's distance was shorter.
```

The attempted operation is a hypothesis. The preview is evidence. Revision is successful reasoning.

## Repository map

```text
README.md
CLAUDE.md
docs/
  01-product-spec.md
  02-data-framework.md
  03-interface-and-gameplay.md
  04-story-authoring.md
  05-engine-and-implementation.md
data/
  problem-schema.json
  catalogs/
    relationship-templates.json
  problems/
    nasa-perseverance-wheel-slip.json
prompts/
  claude-code-kickoff.md
```

## Read these in order

1. [`docs/01-product-spec.md`](docs/01-product-spec.md) — vision, pedagogical rules, MVP boundaries.
2. [`docs/02-data-framework.md`](docs/02-data-framework.md) — scalable content/data architecture.
3. [`docs/03-interface-and-gameplay.md`](docs/03-interface-and-gameplay.md) — actual game flow and screen behavior.
4. [`docs/04-story-authoring.md`](docs/04-story-authoring.md) — how to create rich stories without making custom code.
5. [`docs/05-engine-and-implementation.md`](docs/05-engine-and-implementation.md) — implementation plan, state machine, tests, and milestones.
6. [`data/problems/nasa-perseverance-wheel-slip.json`](data/problems/nasa-perseverance-wheel-slip.json) — the canonical working example.
7. [`prompts/claude-code-kickoff.md`](prompts/claude-code-kickoff.md) — a first task prompt for Claude Code.

## Non-negotiable product principles

1. **Relationships, not keywords.** “Fewer” does not automatically mean subtract; the target quantity and relationship determine the needed equation.
2. **Cause before calculation.** Each problem says what happened in the world and what quantity changed.
3. **Wrong operators create alternate worlds, not red Xs.**
4. **A child chooses the operator.** The app may nudge, but it must not silently choose for her.
5. **Every completed step receives a backward check.**
6. **Numbers must remain attached to named quantities and units.**
7. **Rich stories must be short and purposeful.** Detail is used to create motive, causal sense, and memory—not padding.
8. **No custom code per story.** New content should be JSON plus assets, not a new React component.
9. **Facts are either vetted or explicitly fictionalized.** Do not present invented mission logs as historical NASA reporting.
10. **The app rewards model revision.** A child who predicts, tests, notices a mismatch, and revises has demonstrated meaningful success.

## Scope boundary for the first playable slice

Do build:

- One visual world: Mars rover mission
- One two-step additive problem
- Semantic quantity cards
- An operator picker with `+`, `−`, `×`, `÷`
- Counterfactual feedback for each attempted operation
- Bar model for comparison and total
- Typed numerical answer
- One backward-check step
- A local JSON problem loader

Do not build yet:

- User accounts
- AI-generated runtime stories
- Open-ended natural-language parsing
- Voice recognition
- Custom character animation
- Adaptive learning algorithm
- Full curriculum progression
- Multi-user classroom dashboards

The point is to prove the core loop: **story → model → hypothesis → result → reconciliation**.


<!-- END README.md -->

<!-- BEGIN docs/01-product-spec.md -->

# Product Specification
## StoryMath Change Engine — MVP

## 1. Product statement

**StoryMath Change Engine is a model-building game in which a child uses mathematics to describe what happened in a vivid world.**

The first version teaches multi-step addition/subtraction word problems. The child does not simply identify an answer. She:

- names the quantities;
- identifies a relationship;
- predicts direction of change;
- chooses an operation;
- observes the numerical consequence;
- compares that consequence with the story;
- revises when needed;
- checks backward.

The experience is built on a simple causal chain:

```text
World → Event → Change → Relationship → Equation → Check
```

The child-facing question is not merely, “Which operation?”

It is:

> **What happened in this world, and what did that make the number do?**

## 2. Pedagogical thesis

### 2.1 The mathematical object is a relationship

The app should teach that addition and subtraction are different views of the same additive relationship.

For a comparison:

```text
Smaller + Difference = Bigger
Bigger − Difference = Smaller
Bigger − Smaller = Difference
```

For part-part-whole:

```text
Part A + Part B = Whole
Whole − Part A = Part B
Whole − Part B = Part A
```

For a change over time:

```text
Start + Change = End
End − Change = Start
End − Start = Change
```

The words can change. The relationship stays coherent.

### 2.2 A keyword is not a model

The app must never encode “fewer means subtract” as its instructional rule.

Example:

> Ben has 88 fewer marbles than Alice. How many marbles does Alice have?

The word *fewer* appears, yet the correct operation may be addition if the child knows Ben’s amount and seeks Alice’s larger amount.

The workflow should ask:

```text
Who has more?
What amount are we trying to find?
What difference connects the two amounts?
What equation gives that missing amount?
```

### 2.3 An attempted operation is a hypothesis

When a child chooses `+`, `−`, `×`, or `÷`, the app should calculate what that choice implies.

The response pattern:

```text
You tried: Monday distance + distance difference
384 + 128 = 512

That makes Tuesday farther than Monday.

A story in which that fits:
Perseverance found a smoother route or had more battery available.

Our story says the wheel slipped in sand and Tuesday was shorter.
Which operation makes the story smaller instead?
```

No red X. No loss of points. No shame.

### 2.4 The backward check is a reconciliation, not an afterthought

Every completed step has an inverse or complementary check.

For:

```text
384 − 128 = 256
```

the app asks the child to reconstruct:

```text
256 + 128 = 384
```

Then it names the relationship:

> Tuesday’s distance plus the amount it was shorter equals Monday’s distance.

This makes the fact family visible.

## 3. MVP learning objectives

By the end of a small set of problems, the child should increasingly be able to:

1. Distinguish **what is known** from **what is being found**.
2. Name quantities with units and context.
3. Tell whether an answer should be larger, smaller, or a total.
4. Choose and articulate an operation.
5. Notice when an operation produces a result that contradicts the story.
6. Use a bar model to see comparison, difference, and total.
7. Use a backward/inverse equation to verify a result.
8. Understand that alternate equations may describe alternate worlds or alternate questions.

## 4. Initial content scope

### Included in MVP

- Multi-step problems with exactly two required arithmetic steps.
- Additive relationships:
  - comparison;
  - part-part-whole;
  - start/change/end.
- Whole-number values.
- One consistent unit per problem step.
- Operator experimentation with all four symbols available, while only addition/subtraction is formally taught in this first unit.
- Simple bar charts/bar models.
- Typed answer field plus click/tap/drag construction.
- Story “why” that is causally relevant.

### Deferred but architected for

- Multiplication/division learning packs.
- Equal groups, arrays, scaling, sharing, and measurement division.
- Fractions/decimals.
- More than two steps.
- Student-generated stories.
- Voice narration and speech-to-text.
- Longitudinal learner model.
- Content authoring UI.
- Adaptive practice plans.

## 5. Core loop

```text
1. Mission Brief
2. Predict the direction of change
3. Name the target quantity
4. Build one relationship from quantity cards
5. Choose an operator
6. Observe the numerical and visual result
7. Reconcile result against the story
8. Solve the step
9. Repeat for the next step
10. Check backward
11. Read the graph / causal recap
```

The important pacing rule:

> **One relationship at a time.**

The child should never face a full multi-step algebraic chain at the beginning.

## 6. Product principles

### Principle A — Vivid specificity

Every problem includes:

- character;
- place;
- goal;
- conflict, opportunity, or event;
- numerical consequence.

Generic:

> A rover traveled 384 meters Monday.

Rich:

> Perseverance was mapping pale layers of rock near an ancient Martian river delta. On Monday it drove 384 meters. Overnight, one wheel slipped into soft sand, so on Tuesday it drove 128 fewer meters while engineers chose a safer path.

The numbers belong to an event.

### Principle B — The “why” must matter

The cause is not decorative flavor. It predicts the direction of numerical change.

```text
Wheel slips → less usable driving time → less distance
Extra helper → more hands working → more tasks completed
Donation → fewer supplies left → smaller inventory
```

### Principle C — Counterfactuals are productive

Wrong operator preview:

```text
Actual story: wheel slips → distance decreases.
Try +: distance increases.
Alternate story: smoother route / extra power → distance increases.
Conclusion: addition describes a possible different world, not this world.
```

### Principle D — Strong scaffold, real agency

The child chooses:

- direction;
- target quantity;
- relationship cards;
- operator;
- numerical answer;
- backward-check arrangement.

The app provides:

- predefined semantic quantity cards;
- one equation frame at a time;
- clear numerical calculations;
- graph feedback;
- optional hint/narration;
- no requirement for open-ended writing to progress.

### Principle E — Rich language without comprehension overload

Stories should be two to four concise sentences. Every detail must do at least one of the following:

- establish a character/place;
- explain a causal change;
- create a memorable visual;
- supply a required quantity;
- reward curiosity with a small true or explicitly fictionalized fact.

Do not use decorative prose that hides the mathematical relationships.

## 7. Fact-family catalog

### 7.1 Additive comparison

```text
Smaller + Difference = Bigger
Bigger − Difference = Smaller
Bigger − Smaller = Difference
```

Story language examples:

```text
Tuesday traveled 128 fewer meters than Monday.
The owl spotted 18 more mice than the fox.
Alice read 42 fewer pages than Jo.
```

### 7.2 Part-part-whole

```text
Part A + Part B = Whole
Whole − Part A = Part B
Whole − Part B = Part A
```

Story language examples:

```text
Monday’s distance plus Tuesday’s distance equals the two-day total.
Red maple leaves plus yellow maple leaves equal all collected leaves.
Puppies in kennel A plus puppies in kennel B equal all puppies at the shelter.
```

### 7.3 Start-change-end

```text
Start + Change = End
End − Change = Start
End − Start = Change
```

Story language examples:

```text
The shelter started with 48 food bowls and donated 17.
A book began with 327 pages; 184 pages have been read.
An ice skater practiced 126 minutes, then added 24 more minutes.
```

### 7.4 Future multiplicative families

These are documented now because the counterfactual preview can expose their intuition early.

```text
Equal groups:
groups × in each group = total

Sharing / partition:
total ÷ groups = in each group

Measurement division:
total ÷ size of each group = number of groups

Scaling / rate:
one unit amount × number of units = total
```

The multiplication/division unit should distinguish *repeated groups*, *equal sharing*, and *how many groups fit*, rather than treating `×` and `÷` as generic “big” or “small” buttons.

## 8. Definition of success for MVP

A successful child session looks like this:

```text
Child predicts Tuesday should be smaller.
Child initially tries +.
App shows 512 meters and a longer bar.
Child says/chooses that this does not match “wheel slipped.”
Child changes to −.
Child solves 384 − 128 = 256.
Child then adds 384 + 256 = 640.
Child checks 256 + 128 = 384.
Child reads the final bar model and can say why Tuesday was shorter.
```

The child should leave not thinking:

> “I got subtraction right.”

But rather:

> “The wheel problem made Tuesday shorter, so I had to take away the amount it was shorter.”


<!-- END docs/01-product-spec.md -->

<!-- BEGIN docs/02-data-framework.md -->

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


<!-- END docs/02-data-framework.md -->

<!-- BEGIN docs/03-interface-and-gameplay.md -->

# Problem-Solving Stages and User Interface
## Guided semantic construction without turning the game into a form

## 1. Interaction design goal

The app should make a multi-step word problem feel like a sequence of small, meaningful choices.

Avoid this:

```text
Read a paragraph.
Choose an operation.
Type an answer.
```

Build this:

```text
Read a mission.
Predict a change.
Name one target.
Construct one relationship.
Test an operation.
Observe the result.
Decide whether it matches the story.
Check backward.
```

## 2. Main screen anatomy

Use one page with a stable layout. The child should not feel as though she is navigating through a school portal.

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Story / Mission Brief                                                 │
│ Character, place, goal, event, givens                                 │
├───────────────────────┬───────────────────────────────────────────────┤
│ Quantity Tray         │ Model Workspace                               │
│ draggable cards       │ one guided relationship frame                 │
│                       │ operator picker + number row                  │
├───────────────────────┴───────────────────────────────────────────────┤
│ Story Check + Bar Model                                                │
│ “Does this world match?” and simple visual consequence                │
├───────────────────────────────────────────────────────────────────────┤
│ Optional Detective Note / Hint / Continue                             │
└───────────────────────────────────────────────────────────────────────┘
```

On a narrow display, stack sections in this order:

```text
Story → Target → Quantity tray → Equation builder → Preview → Bar model → Check
```

## 3. Stage-by-stage flow

## Stage 0 — Mission Brief

Purpose: make the world worth entering.

Example:

> **Mission Brief: Perseverance’s Sandy Tuesday**  
> Perseverance was mapping pale layers of rock near an ancient Martian river delta. On Monday it drove **384 meters**. Overnight, one wheel slipped into soft sand, so on Tuesday it drove **128 fewer meters** while engineers chose a safer path.  
>
> First, find the distance Perseverance traveled on Tuesday.

Under the story, highlight or optionally tap:

```text
Monday: 384 meters
Tuesday: 128 fewer meters than Monday
Find: Tuesday’s distance
```

Do not highlight the operation word as a clue. Highlight quantities and relationships.

## Stage 1 — Direction prediction

Prompt:

> **After the wheel slipped, should Tuesday’s distance be…**

```text
[ Farther ]   [ Shorter ]   [ The same ]   [ I’m not sure ]
```

Expected choice: `Shorter`.

Feedback:

```text
Shorter makes sense: the wheel problem gave the rover less useful driving time.
Now let’s build the relationship that can show “shorter.”
```

If child selects `Farther`:

```text
Interesting. What kind of event would usually make a rover travel farther?
A smoother route or extra battery could do that.
Let’s keep reading our mission: does a wheel slipping sound like farther or shorter?
```

This is a nudge, not a grade.

## Stage 2 — Target card

Prompt:

> **What are we trying to find first?**

Only offer the relevant target(s) in the first MVP:

```text
[ Distance traveled on Tuesday ]
```

Later, when appropriate, allow multiple intermediate targets. Keep it obvious at first.

## Stage 3 — Name the relationship

Show three quantity cards:

```text
[ Distance traveled on Monday ]
          384 meters

[ How much shorter Tuesday was than Monday ]
          128 meters

[ Distance traveled on Tuesday ]
          ? meters
```

Then offer a relationship shape appropriate to the additive level:

```text
[ Bigger amount ] [ operation ] [ difference ] = [ smaller amount ]
```

The child drags/taps cards into semantic slots:

```text
[ Monday distance ] [ − ] [ Tuesday-shorter amount ] = [ Tuesday distance ]
```

The UI should call the slots by their story meaning before it calls them algebraic variables.

## Stage 4 — Operator experiment

The child selects the operator. This is required. Do not auto-fill it.

```text
[ + ] [ − ] [ × ] [ ÷ ]
```

### Correct choice: subtraction

```text
384 − 128 = [ type answer ]
```

The bar preview shrinks:

```text
Monday     ████████████████████ 384 m
Tuesday    █████████████        ? m
Difference ██████               128 m
```

Prompt:

> The story says Tuesday was shorter. Does subtraction make the missing bar smaller?

### Attempted addition

```text
384 + 128 = 512
```

Show a light “alternate world” card:

> **What this equation would describe**  
> Tuesday becomes **512 meters**, which is farther than Monday. That might fit a different mission where Perseverance found smoother ground or had more battery power.  
>
> **Does that match this mission?**  
> The wheel slipped in sand, so this story needs Tuesday to be shorter.

Then allow:

```text
[ Try another operation ]  [ I’m not sure ]  [ Explain with the bars ]
```

### Attempted multiplication

```text
384 × 128 = 49,152
```

Show:

> That makes a much, much larger amount. Multiplication would make sense in a different question about repeated equal drives—for example, 128 identical 384-meter drives. This story is about one Tuesday being shorter than one Monday.

### Attempted division

```text
384 ÷ 128 = 3
```

Show:

> This creates a number of equal 128-meter sections that fit into Monday’s distance. It could answer, “How many 128-meter sections fit into 384 meters?” But it does not tell us Tuesday’s travel distance.

The app should say “different question” where appropriate. Not every attempted operator needs an alternate event; sometimes it describes a different mathematical question rather than a different causal event.

## Stage 5 — Work the arithmetic

After the operator fits the story, the child types the numerical answer.

For the initial build, support:

```text
[ 2 ][ 5 ][ 6 ] or keyboard typing
```

Optional tools:

```text
[ Open scratchpad ]
[ Show place-value blocks ]
[ Read the quantities aloud ]
```

These are helpers, not a second mandatory curriculum.

If numerical answer is incorrect but operation/relationship is correct:

```text
Your model fits the story. Let’s check the calculation together.
384 − 128 should give a number smaller than 384 and larger than 0.
Try using the scratchpad or regrouping helper.
```

Separate **model correctness** from **calculation correctness** in UI and data.

## Stage 6 — Commit the step

Once the child has:

- target;
- relationship cards;
- operator;
- correct numerical result;

show a compact “Model Card”:

```text
Tuesday’s distance = Monday’s distance − amount Tuesday was shorter

256 meters = 384 meters − 128 meters
```

The order can remain conventional left-to-right in the live equation:

```text
384 − 128 = 256
```

Use clear verbal rendering below it.

## Stage 7 — Next relationship

Prompt:

> **Now what can we find?**

The app reveals the new known card:

```text
[ Distance traveled on Tuesday ]
          256 meters
```

Then asks:

> Perseverance traveled on Monday and Tuesday. What relationship gives the two-day total?

Child assembles:

```text
[ Monday distance ] [ + ] [ Tuesday distance ] = [ Two-day total ]
384 + 256 = 640
```

The visual shifts from comparison to combined total:

```text
Monday  ████████████████████ 384 m
Tuesday █████████████        256 m
Total   █████████████████████████████████ 640 m
```

## Stage 8 — Backward check

This must be interactive, not merely displayed.

Prompt:

> **Can you prove Tuesday’s distance fits the story?**

Give the child a relation frame:

```text
[ Tuesday distance ] [ + ] [ amount shorter ] = [ Monday distance ]
256 + 128 = 384
```

Then verbal confirmation:

> Tuesday’s 256 meters plus the 128 meters it was shorter equals Monday’s 384 meters. The story and the math agree.

For the total:

```text
640 − 256 = 384
```

or

```text
640 − 384 = 256
```

Allow either valid check if the relationship configuration supports it.

## Stage 9 — Causal recap and graph read

Display the “why” as a concise chain:

```text
Wheel slipped in soft sand
        ↓
Less driving time
        ↓
Tuesday traveled 128 fewer meters
        ↓
384 − 128 = 256
```

Then ask one light data-literacy question:

> **What does the 128-meter gap between the bars mean?**

Options:

```text
[ The amount Tuesday was shorter than Monday ]
[ The total distance over both days ]
[ The number of wheels on the rover ]
```

This reinforces reading the visualization without adding a new full task.

## 4. Quantity-card design

### 4.1 Card requirements

Every card has:

```text
Plain-language label
Unit
Context / time
Number or ?
Optional semantic chip display
```

Example:

```text
Distance traveled
on Monday
384 meters
```

Difference card:

```text
How much shorter Tuesday was
than Monday
128 meters
```

### 4.2 Semantic chips

The user’s instinct is correct: the child can build the names of quantities through modular language.

Use a guided approach:

```text
[ distance traveled ] [ on Tuesday ]
[ amount shorter ] [ Tuesday than Monday ]
```

The app should preassemble most cards, then let the child expand a card with an **“Explain this number”** affordance:

```text
What is 128?
[ amount shorter ] [ Tuesday than Monday ] [ meters ]
```

This gives semantic construction without making every step a slow typing task.

### 4.3 Why not fully free-form labels in MVP?

Free-form typing is valuable for expression but not reliable for data evaluation. Use both:

```text
Structured cards: scored and engine-readable
Optional Detective Note: child-written and unscored
```

The child can write:

> “The wheel got stuck so I subtract.”

The app preserves it as a meaningful note without pretending it can perfectly parse or grade it.

## 5. Feedback tone

Preferred language:

```text
“Interesting experiment.”
“That result became larger. Does that fit this story?”
“That equation would make sense in a different question.”
“Your relationship is strong; now let’s check the arithmetic.”
“Let’s use the bars to see the change.”
“You revised your model after seeing new evidence.”
```

Avoid:

```text
“Wrong operation.”
“Incorrect.”
“Try again.”
“Oops!”
```

The UI can still clearly distinguish story fit, numerical correctness, and backward-check completion.

## 6. Accessibility and input flexibility

The initial app must support three ways to manipulate quantity cards:

```text
1. Drag and drop
2. Click/tap a card, then click/tap a slot
3. Keyboard focus and selection
```

The child may search-and-peck type. Let that be an asset:

- allow typed answers;
- allow optional one-sentence reasoning;
- never require long writing for progress;
- keep controls large;
- show quantity labels in readable language;
- offer read-aloud in later iterations.

## 7. Component inventory for implementation

```text
StoryBrief
DirectionPrediction
TargetPicker
QuantityTray
QuantityCard
EquationBuilder
SemanticSlot
OperatorPicker
OperatorExperimentPanel
ArithmeticAnswerField
BarModel
ModelCard
BackwardCheckBuilder
CausalRecap
DetectiveNote
HintPanel
ProgressRail
```

All content-sensitive text should come from problem data, not component conditionals.


<!-- END docs/03-interface-and-gameplay.md -->

<!-- BEGIN docs/04-story-authoring.md -->

# Story Building and Content Authoring
## How to make a math problem feel like a world worth modeling

## 1. The five essential story elements

Every story should contain:

1. **Character** — who or what we care about.
2. **Place** — a specific setting that can be pictured.
3. **Goal** — what the character is trying to do.
4. **Conflict or opportunity** — what changes conditions.
5. **Consequence** — how the event changes a quantity.

The canonical pattern:

```text
Character + Place + Goal + Event + Quantity consequence
```

## 2. NASA rover reference example

### 2.1 World

```text
Character: Perseverance
Place: a fictionalized field log near an ancient Martian river delta
Goal: map pale layers of rock
```

### 2.2 Event

```text
Conflict: one wheel slips into soft sand
Causal effect: less useful driving time
Expected quantity effect: Tuesday distance decreases
```

### 2.3 Quantity relationships

```text
Monday distance = 384 meters
Tuesday was shorter by = 128 meters
Tuesday distance = 256 meters
Two-day total = 640 meters
```

### 2.4 Child-facing story

> **Perseverance’s Sandy Tuesday**  
> Perseverance was mapping pale layers of rock near an ancient Martian river delta. On Monday it drove **384 meters**. Overnight, one wheel slipped into soft sand, so on Tuesday it drove **128 fewer meters** while engineers chose a safer path.  
>
> How far did Perseverance travel on Tuesday? Then how far did it travel over both days?

### 2.5 Why it works

```text
Character: Perseverance
Place: ancient river delta on Mars
Goal: map unusual rocks
Conflict: wheel slips into soft sand
Consequence: Tuesday distance decreases
```

The conflict makes the word “fewer” meaningful. The number is no longer a detached instruction.

### 2.6 Important factual status rule

This should be labeled internally as:

```text
fictionalized / inspired_by
```

The real-world setting can inspire wonder, but the specific daily distances and wheel incident should not be presented as a factual mission log unless independently sourced and verified.

## 3. The “why” design rule

A good “why” has three properties:

```text
Plausible
Directionally meaningful
Brief
```

### Strong examples

```text
A wheel slipped in soft sand → less travel.
A storm knocked ripe apples down → more apples collected.
A puppy was adopted → fewer puppies remain at the shelter.
An extra animator joined the team → more frames can be checked.
A lost library book was found → more books are back on the shelf.
```

### Weak examples

```text
The owl was happy.
The rover saw something interesting.
The dog was fluffy.
The book was old.
```

Those may be charming, but they do not explain the numerical relationship.

## 4. Story writing formula

Use this fillable authoring form:

```text
TITLE:
WORLD / THEME:
FACTUAL STATUS: verified | fictionalized | inspired_by

CHARACTER:
PLACE:
GOAL:

ACTUAL EVENT:
WHY IT MATTERS:
EXPECTED DIRECTION: increase | decrease | combine | split | scale

GIVEN QUANTITY 1:
GIVEN QUANTITY 2:
FIND QUANTITY 1:
FIND QUANTITY 2:

RELATIONSHIP 1:
RELATIONSHIP 2:

ACTUAL OPERATOR FOR STEP 1:
ACTUAL OPERATOR FOR STEP 2:

COUNTERFACTUAL IF +:
COUNTERFACTUAL IF −:
COUNTERFACTUAL IF ×:
COUNTERFACTUAL IF ÷:

BACKWARD CHECK:
VISUALIZATION TYPE:
ONE-LINE “DID YOU KNOW?” OR FICTIONAL WORLD DETAIL:
```

## 5. Operator packs belong to the story

The content generator must tie different attempted operators to different worlds or different questions.

### NASA operator pack

| Attempt | Result | What that would mean |
|---|---:|---|
| `384 + 128` | `512` | Tuesday went farther. This could fit smoother ground or more available battery power. |
| `384 − 128` | `256` | Tuesday went shorter. This matches the wheel slipping into soft sand. |
| `384 × 128` | `49,152` | This would fit a repeated-group question, such as 128 identical 384-meter drives—not one Tuesday. |
| `384 ÷ 128` | `3` | This asks how many 128-meter sections fit into Monday’s distance—not Tuesday’s distance. |

This is not a choose-your-own-adventure quiz with three arbitrary explanations. The child’s chosen operation is the hypothesis. The content pack supplies the coherent consequence of that hypothesis.

## 6. Story detail checklist

Before approving a story, ask:

```text
Can a child picture the character?
Can she picture where it is happening?
Does the event explain why a number changes?
Does the event point toward bigger, smaller, total, equal groups, or sharing?
Are the units natural to this world?
Are the values believable enough for the imagined context?
Would the wrong-operator previews still produce a coherent alternate world or question?
Is the prose short enough that the math remains visible?
```

## 7. Domain-specific content patterns

### 7.1 Minnesota forests and wildlife

```text
Character: great gray owl, chickadee, red fox, monarch butterfly
Place: red pine forest, marsh edge, snow-covered field, prairie restoration
Goal: find food, count sightings, reach nest, tag birds
Event: windstorm, snowdrift, migration, restoration work, hidden vole
Natural quantities: sightings, feet flown, nests counted, seeds planted, miles tracked
```

Example:

> A great gray owl glided 142 feet before plunging into snow for a hidden vole. Later it flew 87 fewer feet because the wind became stronger. How far did it fly later? How far did it fly altogether?

### 7.2 Books and classic literature

```text
Character: Jo March, a reader, a librarian, a book club
Place: attic, library, train ride, porch during rain
Goal: finish a chapter, organize a shelf, prepare a reading list
Event: bookmark lost, extra reading time, a chapter was shared aloud, a book returned
Natural quantities: pages, chapters, bookmarks, books
```

Example:

> A young reader planned to finish a chapter of *Little Women* before lunch. She read 84 pages in the morning, then read 26 fewer pages during a noisy car ride. How many pages did she read in the car? How many pages did she read altogether?

### 7.3 Aikido, gymnastics, and skating

```text
Character: student athlete, coach, practice partner
Place: dojo mat, ice rink, gym floor
Goal: complete practice challenge
Event: a slippery patch, extra practice round, partner switch, long rest break
Natural quantities: rolls, inches, minutes, laps, turns
```

### 7.4 Pets and animal rescue

```text
Character: puppy, cat, shelter volunteer, family dog
Place: shelter, kitchen, park, vet clinic
Goal: feed, exercise, prepare adoption event
Event: adoption, spilled kibble, extra visitor, heat wave
Natural quantities: ounces of water, cups of food, puppies, minutes walked
```

### 7.5 Cooking

```text
Character: child baker, family cook, imaginary café
Place: kitchen, farmers market, picnic
Goal: bake, share, prepare recipe
Event: spilled flour, extra guests, doubled recipe, shared equally
Natural quantities: ounces, cups, cookies, servings
```

Cooking becomes especially useful once multiplication/division arrives.

### 7.6 Pixar, creative production, and GitHub

```text
Character: animator, design team, robot helper, code library
Place: animation studio, game jam, “Sticker Factory” repository
Goal: finish frames, sort stickers, publish a feature
Event: extra computer, missing file, helper bot, duplicate batch
Natural quantities: frames, sketches, files, stickers, pull requests
```

The story should remain child-friendly and specific without pretending to describe proprietary real workflow data.

## 8. Content anti-patterns

Avoid:

```text
Generic noun swaps:
“A rover has 12 apples.”
```

Avoid:

```text
Decorative but causally irrelevant detail:
“An adorable rover with sparkly wheels traveled 384 meters.”
```

Avoid:

```text
Contradictory story logic:
“A wheel broke, so the rover traveled 128 more meters.”
```

Avoid:

```text
Overloaded prose:
Six unrelated facts, three characters, two locations, and two unknowns in one early-grade problem.
```

Avoid:

```text
Pretending invented details are factual:
“NASA reported that Perseverance drove 384 meters after a wheel slip,”
unless this is sourced and actually true.
```

## 9. Authoring quality standard

A strong StoryMath problem should earn a “yes” to each statement:

```text
The story makes me curious before I calculate.
I can explain why the quantity should grow, shrink, combine, split, or scale.
The numbers have names and units.
The correct equation is a faithful model of the story.
A different operator creates a recognizable different world or different question.
The backward check returns me to the original relationship.
The graph tells the same story as the words and equation.
```


<!-- END docs/04-story-authoring.md -->

<!-- BEGIN docs/05-engine-and-implementation.md -->

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


<!-- END docs/05-engine-and-implementation.md -->

<!-- BEGIN CLAUDE.md -->

# Claude Code Instructions — StoryMath Change Engine

## Product source of truth

Before changing code, read:

1. `README.md`
2. `docs/01-product-spec.md`
3. `docs/02-data-framework.md`
4. `docs/03-interface-and-gameplay.md`
5. `docs/05-engine-and-implementation.md`
6. `data/problems/nasa-perseverance-wheel-slip.json`

Treat those documents as the product contract unless a later issue explicitly changes them.

## Product thesis

This app is not a worksheet with themes. It is a model-building game.

The child should:

1. Understand a causal story.
2. Predict whether a quantity grows, shrinks, or stays the same.
3. Construct a relationship from named quantity cards.
4. Choose an operator herself.
5. See what that operator would do numerically and visually.
6. Decide whether the new world matches the story.
7. Solve and verify through an inverse/backward check.

A wrong operator is a counterfactual model, not a failure state.

## Implementation rules

- Use TypeScript throughout.
- Keep the domain engine independent from the UI framework.
- Make every problem load from JSON that conforms to `data/problem-schema.json`.
- Do not put story-specific `if (problem.id === ...)` logic in UI components.
- Keep values attached to units and quantity IDs; avoid passing raw numbers around without context.
- Do not rely on keyword matching such as `"fewer" => subtract`.
- Validate equations semantically: role assignment, operator, operand quantities, and result—not only the final numerical answer.
- Preserve equivalent valid fact-family equations where the problem configuration allows them.
- Render a bar model with SVG or a light chart component; do not make the initial version depend on custom animation.
- Build accessible drag-and-drop alternatives: click/tap selection must work without drag.
- Use calm, affirming language. Never label an attempted operator “wrong” in the child UI.
- Make the UI mobile/tablet-friendly but optimize the initial build for desktop browser development.
- Add unit tests before expanding beyond the NASA example.

## Key UX rules

- The child chooses the arithmetic operator.
- The first question is often directional: `Will this amount be bigger, smaller, or the same?`
- Give one guided equation frame at a time; do not ask the child to construct the entire multi-step chain at once.
- Quantity cards should have child-readable labels:
  - `Distance traveled on Monday`
  - `How much shorter Tuesday was than Monday`
  - `Distance traveled on Tuesday`
- A quantity card may display semantic chips internally, but the canonical ID—not child typography—is the source of truth.
- For an alternate operator, calculate the attempted result immediately, then show:
  1. number effect,
  2. bar-model effect,
  3. “a world where this would fit,”
  4. why it does or does not match the actual story.

## First implementation milestone

Implement the single problem in `data/problems/nasa-perseverance-wheel-slip.json` end to end:

- Mission Brief
- Direction prediction
- Step 1 equation builder
- Operator experiment
- Correct subtraction path
- Step 2 part-plus-part total
- Backward check
- Final bar model and causal recap

Do not generalize prematurely. Generalize only after this reference problem uses only generic components and domain logic.

## Required test categories

1. Derived quantity calculations.
2. Relationship-template validation.
3. Alternate operator calculations.
4. Backward-check generation.
5. Unit compatibility checks.
6. Story-problem configuration validation.
7. UI state transitions for the NASA reference problem.

## Decision constraints

When a request conflicts with smooth pedagogy, prioritize:
1. child understanding of relationships;
2. truthful model behavior;
3. ability to scale content without custom code;
4. visual polish.

Do not add gamification points, streaks, or timers unless explicitly requested later.


<!-- END CLAUDE.md -->

<!-- BEGIN prompts/claude-code-kickoff.md -->

# Claude Code Kickoff Prompt

Copy this prompt into Claude Code from the root of the repository.

---

Read `README.md`, `CLAUDE.md`, and every document in `docs/` before writing code. Then implement only the first vertical slice of StoryMath Change Engine.

## Goal

Build a local React + TypeScript prototype for the canonical problem:

`data/problems/nasa-perseverance-wheel-slip.json`

The experience must prove this core loop:

```text
Mission brief
→ direction prediction
→ semantic quantity cards
→ child chooses operator
→ immediate numerical / bar-model preview
→ counterfactual explanation for non-matching operators
→ correct subtraction route
→ typed answer
→ backward check
```

## Required behavior

1. Render the NASA story and mark it as fictionalized/inspired, not a factual mission log.
2. Ask whether Tuesday should be farther, shorter, the same, or “I’m not sure.”
3. Present quantity cards for Monday distance, Tuesday-shorter difference, and Tuesday distance.
4. Let the child put cards into one equation frame:
   `[quantity] [operator] [quantity] = [quantity]`.
5. Let the child choose `+`, `−`, `×`, or `÷`.
6. Immediately compute and display the attempted result.
7. For `+`, `×`, and `÷`, show the matching content-defined counterfactual/different-question explanation from JSON. Do not call it “wrong.”
8. For `−`, show that the model fits the actual story and allow the child to type `256`.
9. Show a comparison bar model.
10. Require an interactive backward check:
    `256 + 128 = 384`.
11. Keep domain logic generic. Do not use a story-ID conditional in a component.
12. Add unit tests for the arithmetic, experiment selection, and backward-check construction.

## Implementation constraints

- Use TypeScript.
- Build click/tap card placement first; drag-and-drop can be a second pass.
- Keep all content in JSON.
- Use a domain module that loads problem data and evaluates the equation.
- Do not add accounts, database, AI calls, score points, timers, or other features.
- Use calm, non-punitive feedback copy.
- Provide a short `IMPLEMENTATION_NOTES.md` after completion that lists:
  - files created;
  - how to run the app;
  - what is complete;
  - what remains before Milestone 2;
  - any design decision that needs owner input.

Before making broad changes, present a brief implementation plan and wait for confirmation only if a decision materially conflicts with the documentation. Otherwise proceed.

---


<!-- END prompts/claude-code-kickoff.md -->