# StoryMath Parameterization Cleanup Specification

## Purpose

This document turns the field-parameterization audit and follow-up design decisions into a concrete cleanup plan for Claude Code.

The goal is not merely to replace hardcoded strings. The goal is to make StoryMath a **story-pack-driven mathematical modeling engine**:

> A compelling story pack supplies context, labels, quantities, units, causal events, and relationship templates. The app computes values, renders equations, selects appropriate visual models, and guides the learner without inventing muddy explanatory prose.

The app should preserve the richness of a living world while avoiding brittle authored arithmetic, duplicated values, or generic AI narration.

---

## Key architectural principle

The problem JSON should describe a **causal-mathematical model**, not a pile of prose blocks that happen to mention numbers.

A scenario should scale from this chain:

```text
Story pack
→ quantities
→ derived quantities
→ relationship templates
→ equation forms
→ operator experiments
→ visual model selection
→ backward checks
→ recap/data question
```

Components should render the model. Components should not independently invent explanation text or assume NASA, distance, days, bars, missions, or any one relationship family.

---

## Refined audit categories

The current audit categories are useful but too coarse. A field coming from JSON is not automatically safe. Use these categories going forward.

| Category | Meaning | Swap safety |
|---|---|---|
| `computed` | Derived by engine from quantities, formulas, and relationship forms | Safest; source of truth for answers, equations, charts |
| `template_safe` | Deterministically rendered from structured fields, with no domain assumption | Safe if template only references model fields |
| `curated_prose` | Authored story/world text, allowed to be specific and vivid | Safe if it uses field-merge for model values |
| `story_chrome` | Authored labels that create world feel: brief title, CTA, finish label, group nouns | Safe when supplied by story pack and not baked into components |
| `hardcoded_chrome` | Static app UI: StoryMath, Continue, Check it, aria basics | Usually safe if truly domain-neutral |
| `brittle_authored_prose` | JSON text that embeds literal equations, computed values, units, role assumptions, or relationship claims | Not safe; remove, template, or validate |
| `component_assumption` | Code assumes a relationship family, visual geometry, domain noun, or fixed role | Not safe; replace with registry-driven logic |

### Rule

A JSON field that contains `384`, `128`, `49,152`, `meters`, `drive`, `Tuesday`, or similar model facts is not automatically bad, but it must be classified correctly.

- Fine in story-specific narrative if values are inserted through field merge.
- Fine in rendered equations if computed by the engine.
- Not fine as authored literal arithmetic in an `explanation` field.

---

## Important clarification: equations should absolutely be visible

We do want to show equations such as:

```text
384 × 128 = 49,152 meters
```

The distinction is not whether equations appear. The distinction is **where they come from**.

### Bad

```json
{
  "explanation": "384 × 128 = 49,152. That is far larger than one Tuesday drive."
}
```

This is brittle authored prose. It can drift from the engine.

### Good

```ts
renderEquation({
  leftValue: 384,
  operator: "×",
  rightValue: 128,
  resultValue: 49152,
  unit: "meters"
})
```

The equation is computed, formatted, and rendered by the engine.

Then a story-pack sentence can add meaning:

```text
That would fit a different story: if Perseverance drove Monday’s distance for 128 days, how far would it travel altogether?
```

Even that sentence should prefer field-merge references, not frozen numeric literals.

---

## Derived quantity computation

This is the highest-leverage cleanup. Derived answers must not be stored as grading literals.

### Current risk

A quantity like Tuesday distance may currently be stored as:

```json
{
  "id": "tuesday_distance",
  "value": 256
}
```

If the author changes Monday from `384` to `412`, `256` silently becomes stale. The model, story, bars, answer checking, and backward check can desync.

### Target pattern

```json
{
  "id": "tuesday_distance",
  "unit": "meters",
  "value": null,
  "derived": {
    "formulaId": "bigger_minus_difference_equals_smaller",
    "operands": {
      "bigger": "monday_distance",
      "difference": "tuesday_difference"
    }
  },
  "expectedValueForFixture": 256
}
```

And for the chained total:

```json
{
  "id": "two_day_total",
  "unit": "meters",
  "value": null,
  "derived": {
    "formulaId": "part_a_plus_part_b_equals_whole",
    "operands": {
      "partA": "monday_distance",
      "partB": "tuesday_distance"
    }
  },
  "expectedValueForFixture": 640
}
```

The loader should compute derived quantities in dependency order. `expectedValueForFixture` can exist only for validation and tests, not for grading.

### Required loader behavior

1. Load raw problem JSON.
2. Build a quantity map.
3. Compute any derived quantities whose operands are available.
4. Repeat until all derived quantities resolve or a cycle/missing dependency is found.
5. Freeze the instantiated problem with computed values.
6. Grade, visualize, and check backward only against instantiated computed values.
7. In dev/test mode, assert `expectedValueForFixture === computedValue` when provided.

---

## Story pack chrome should not default to soulless labels

Generic defaults like `Start`, `Finish`, and `Story` are safe but bland. They should exist only as fallbacks.

The normal path should be story-pack-authored chrome that makes each world feel coherent.

### Story pack chrome example

```json
{
  "storyChrome": {
    "eyebrowLabel": "Mars Field Note",
    "startCta": "Start the rover log",
    "finishCta": "Close the rover log",
    "stepProgressVerb": "model the rover problem",
    "groupNoun": "day of driving",
    "learnerRole": "mission modeler"
  }
}
```

For a bakery example:

```json
{
  "storyChrome": {
    "eyebrowLabel": "Rescue Kitchen Note",
    "startCta": "Open the biscuit tray",
    "finishCta": "Pack the last biscuits",
    "stepProgressVerb": "model the tray",
    "groupNoun": "tray",
    "learnerRole": "kitchen helper"
  }
}
```

### Rule

Story chrome is allowed to be flavorful. It is not required to generalize across worlds because it belongs to the story pack.

Component code must not hardcode that flavor.

---

## Safe field-merge templates

Curated prose can remain vivid, but model values must be inserted from the quantity system.

### Recommended format

```json
{
  "story": {
    "briefTemplate": "NASA’s Mars rover Perseverance was mapping pale layers of rock near an ancient Martian river delta. It drove {quantity:monday_distance} on Monday. Overnight, one wheel slipped into soft sand, so on Tuesday it drove {quantity:tuesday_difference} fewer meters while engineers chose a safer path."
  }
}
```

The renderer resolves:

```text
{quantity:monday_distance} → 384 meters
{value:monday_distance} → 384
{unit:monday_distance} → meters
{label:monday_distance.compact} → Monday distance
```

### Validation rule

Child-facing prose should fail validation if it contains bare numeric literals that match modeled values, unless the field is marked:

```json
{
  "allowLiteralNumbers": true,
  "reason": "This number is a non-modeled historical detail."
}
```

---

## Dimension-aware direction labels

Do not hardcode distance labels like `Farther` and `Shorter` in shared code. But do not flatten everything into soulless `More` and `Less` either.

### Problem-level dimension labels

```json
{
  "dimension": {
    "kind": "distance",
    "increaseLabel": "Farther",
    "decreaseLabel": "Shorter",
    "sameLabel": "The same",
    "increaseSentence": "farther than before",
    "decreaseSentence": "shorter than before"
  }
}
```

Other examples:

```json
{
  "dimension": {
    "kind": "count",
    "increaseLabel": "More",
    "decreaseLabel": "Fewer",
    "sameLabel": "The same"
  }
}
```

```json
{
  "dimension": {
    "kind": "temperature",
    "increaseLabel": "Warmer",
    "decreaseLabel": "Colder",
    "sameLabel": "The same"
  }
}
```

```json
{
  "dimension": {
    "kind": "money",
    "increaseLabel": "More money",
    "decreaseLabel": "Less money",
    "sameLabel": "The same"
  }
}
```

### Rule

Never call `.toLowerCase()` on authored direction labels. If a sentence needs lowercase text, add an explicit lowercase field or use a template designed for that label.

---

## Canonical TypeScript registry

The registry below should live in a central location such as:

```text
src/model/relationshipRegistry.ts
```

It is intentionally explicit. Components should not manually know that `bigger - difference = smaller` or `partA + partB = whole`. They should ask the registry.

```ts
// src/model/relationshipRegistry.ts

export type QuantityId = string;

export type Operator = "+" | "-" | "×" | "÷";

export type DirectionKind =
  | "increase"
  | "decrease"
  | "same"
  | "combine"
  | "scale"
  | "split"
  | "unknown";

export type VisualModelType =
  | "comparison_bar_gap"
  | "part_whole_stacked_bar"
  | "start_change_end_bridge"
  | "number_line_jump"
  | "repeated_groups_grid"
  | "equal_sharing_trays"
  | "array_grid"
  | "ratio_strip"
  | "causal_chain_formula"
  | "data_table"
  | "dot_plot"
  | "pictograph"
  | "line_over_time";

export type FormulaId =
  | "bigger_minus_difference_equals_smaller"
  | "smaller_plus_difference_equals_bigger"
  | "bigger_minus_smaller_equals_difference"
  | "part_a_plus_part_b_equals_whole"
  | "whole_minus_part_a_equals_part_b"
  | "whole_minus_part_b_equals_part_a"
  | "start_plus_change_equals_end"
  | "start_minus_change_equals_end"
  | "end_minus_start_equals_change"
  | "groups_times_items_equals_total"
  | "items_times_groups_equals_total"
  | "total_divided_by_groups_equals_items"
  | "total_divided_by_items_equals_groups";

export type RelationshipTemplateId =
  | "additive_comparison_decrease"
  | "additive_comparison_increase"
  | "part_part_whole"
  | "start_change_end_increase"
  | "start_change_end_decrease"
  | "multiplication_equal_groups"
  | "division_equal_sharing";

export interface EquationForm {
  id: FormulaId;
  operator: Operator;
  leftRole: string;
  rightRole: string;
  resultRole: string;
  directionProduced: DirectionKind;
  defaultVisualModel: VisualModelType;
  childFacingPattern?: string;
}

export interface RelationshipTemplate {
  id: RelationshipTemplateId;
  family:
    | "additive_comparison"
    | "part_part_whole"
    | "start_change_end"
    | "multiplication_division";
  roles: string[];
  primaryForms: FormulaId[];
  inverseForms: FormulaId[];
  experimentForms: Partial<Record<Operator, FormulaId>>;
  defaultVisualModels: VisualModelType[];
  recapModelType: VisualModelType;
}

export const EQUATION_FORMS: Record<FormulaId, EquationForm> = {
  bigger_minus_difference_equals_smaller: {
    id: "bigger_minus_difference_equals_smaller",
    operator: "-",
    leftRole: "bigger",
    rightRole: "difference",
    resultRole: "smaller",
    directionProduced: "decrease",
    defaultVisualModel: "comparison_bar_gap",
    childFacingPattern: "Bigger amount − difference = smaller amount"
  },

  smaller_plus_difference_equals_bigger: {
    id: "smaller_plus_difference_equals_bigger",
    operator: "+",
    leftRole: "smaller",
    rightRole: "difference",
    resultRole: "bigger",
    directionProduced: "increase",
    defaultVisualModel: "comparison_bar_gap",
    childFacingPattern: "Smaller amount + difference = bigger amount"
  },

  bigger_minus_smaller_equals_difference: {
    id: "bigger_minus_smaller_equals_difference",
    operator: "-",
    leftRole: "bigger",
    rightRole: "smaller",
    resultRole: "difference",
    directionProduced: "decrease",
    defaultVisualModel: "comparison_bar_gap",
    childFacingPattern: "Bigger amount − smaller amount = difference"
  },

  part_a_plus_part_b_equals_whole: {
    id: "part_a_plus_part_b_equals_whole",
    operator: "+",
    leftRole: "partA",
    rightRole: "partB",
    resultRole: "whole",
    directionProduced: "combine",
    defaultVisualModel: "part_whole_stacked_bar",
    childFacingPattern: "Part + part = whole"
  },

  whole_minus_part_a_equals_part_b: {
    id: "whole_minus_part_a_equals_part_b",
    operator: "-",
    leftRole: "whole",
    rightRole: "partA",
    resultRole: "partB",
    directionProduced: "decrease",
    defaultVisualModel: "part_whole_stacked_bar",
    childFacingPattern: "Whole − one part = other part"
  },

  whole_minus_part_b_equals_part_a: {
    id: "whole_minus_part_b_equals_part_a",
    operator: "-",
    leftRole: "whole",
    rightRole: "partB",
    resultRole: "partA",
    directionProduced: "decrease",
    defaultVisualModel: "part_whole_stacked_bar",
    childFacingPattern: "Whole − one part = other part"
  },

  start_plus_change_equals_end: {
    id: "start_plus_change_equals_end",
    operator: "+",
    leftRole: "start",
    rightRole: "change",
    resultRole: "end",
    directionProduced: "increase",
    defaultVisualModel: "start_change_end_bridge",
    childFacingPattern: "Start + change = end"
  },

  start_minus_change_equals_end: {
    id: "start_minus_change_equals_end",
    operator: "-",
    leftRole: "start",
    rightRole: "change",
    resultRole: "end",
    directionProduced: "decrease",
    defaultVisualModel: "start_change_end_bridge",
    childFacingPattern: "Start − change = end"
  },

  end_minus_start_equals_change: {
    id: "end_minus_start_equals_change",
    operator: "-",
    leftRole: "end",
    rightRole: "start",
    resultRole: "change",
    directionProduced: "decrease",
    defaultVisualModel: "start_change_end_bridge",
    childFacingPattern: "End − start = change"
  },

  groups_times_items_equals_total: {
    id: "groups_times_items_equals_total",
    operator: "×",
    leftRole: "groups",
    rightRole: "itemsPerGroup",
    resultRole: "total",
    directionProduced: "scale",
    defaultVisualModel: "repeated_groups_grid",
    childFacingPattern: "Groups × items in each group = total"
  },

  items_times_groups_equals_total: {
    id: "items_times_groups_equals_total",
    operator: "×",
    leftRole: "itemsPerGroup",
    rightRole: "groups",
    resultRole: "total",
    directionProduced: "scale",
    defaultVisualModel: "repeated_groups_grid",
    childFacingPattern: "Items in each group × groups = total"
  },

  total_divided_by_groups_equals_items: {
    id: "total_divided_by_groups_equals_items",
    operator: "÷",
    leftRole: "total",
    rightRole: "groups",
    resultRole: "itemsPerGroup",
    directionProduced: "split",
    defaultVisualModel: "equal_sharing_trays",
    childFacingPattern: "Total ÷ groups = items in each group"
  },

  total_divided_by_items_equals_groups: {
    id: "total_divided_by_items_equals_groups",
    operator: "÷",
    leftRole: "total",
    rightRole: "itemsPerGroup",
    resultRole: "groups",
    directionProduced: "split",
    defaultVisualModel: "equal_sharing_trays",
    childFacingPattern: "Total ÷ items in each group = groups"
  }
};

export const RELATIONSHIP_TEMPLATES: Record<RelationshipTemplateId, RelationshipTemplate> = {
  additive_comparison_decrease: {
    id: "additive_comparison_decrease",
    family: "additive_comparison",
    roles: ["bigger", "difference", "smaller"],
    primaryForms: ["bigger_minus_difference_equals_smaller"],
    inverseForms: [
      "smaller_plus_difference_equals_bigger",
      "bigger_minus_smaller_equals_difference"
    ],
    experimentForms: {
      "+": "smaller_plus_difference_equals_bigger",
      "-": "bigger_minus_difference_equals_smaller",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["comparison_bar_gap", "number_line_jump"],
    recapModelType: "causal_chain_formula"
  },

  additive_comparison_increase: {
    id: "additive_comparison_increase",
    family: "additive_comparison",
    roles: ["smaller", "difference", "bigger"],
    primaryForms: ["smaller_plus_difference_equals_bigger"],
    inverseForms: [
      "bigger_minus_difference_equals_smaller",
      "bigger_minus_smaller_equals_difference"
    ],
    experimentForms: {
      "+": "smaller_plus_difference_equals_bigger",
      "-": "bigger_minus_difference_equals_smaller",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["comparison_bar_gap", "number_line_jump"],
    recapModelType: "causal_chain_formula"
  },

  part_part_whole: {
    id: "part_part_whole",
    family: "part_part_whole",
    roles: ["partA", "partB", "whole"],
    primaryForms: ["part_a_plus_part_b_equals_whole"],
    inverseForms: [
      "whole_minus_part_a_equals_part_b",
      "whole_minus_part_b_equals_part_a"
    ],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["part_whole_stacked_bar", "pictograph"],
    recapModelType: "causal_chain_formula"
  },

  start_change_end_increase: {
    id: "start_change_end_increase",
    family: "start_change_end",
    roles: ["start", "change", "end"],
    primaryForms: ["start_plus_change_equals_end"],
    inverseForms: ["end_minus_start_equals_change"],
    experimentForms: {
      "+": "start_plus_change_equals_end",
      "-": "start_minus_change_equals_end",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["start_change_end_bridge", "number_line_jump"],
    recapModelType: "causal_chain_formula"
  },

  start_change_end_decrease: {
    id: "start_change_end_decrease",
    family: "start_change_end",
    roles: ["start", "change", "end"],
    primaryForms: ["start_minus_change_equals_end"],
    inverseForms: ["end_plus_change_equals_start" as FormulaId],
    experimentForms: {
      "+": "start_plus_change_equals_end",
      "-": "start_minus_change_equals_end",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["start_change_end_bridge", "number_line_jump"],
    recapModelType: "causal_chain_formula"
  },

  multiplication_equal_groups: {
    id: "multiplication_equal_groups",
    family: "multiplication_division",
    roles: ["groups", "itemsPerGroup", "total"],
    primaryForms: [
      "groups_times_items_equals_total",
      "items_times_groups_equals_total"
    ],
    inverseForms: [
      "total_divided_by_groups_equals_items",
      "total_divided_by_items_equals_groups"
    ],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["repeated_groups_grid", "array_grid"],
    recapModelType: "causal_chain_formula"
  },

  division_equal_sharing: {
    id: "division_equal_sharing",
    family: "multiplication_division",
    roles: ["total", "groups", "itemsPerGroup"],
    primaryForms: ["total_divided_by_groups_equals_items"],
    inverseForms: ["groups_times_items_equals_total"],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items"
    },
    defaultVisualModels: ["equal_sharing_trays", "array_grid"],
    recapModelType: "causal_chain_formula"
  }
};
```

### Note on `end_plus_change_equals_start`

The code above includes a placeholder cast for `end_plus_change_equals_start`. In implementation, add it properly to `FormulaId` and `EQUATION_FORMS` if using start-change-end decrease backward checks.

---

## Formula evaluator

Centralize arithmetic in one place.

```ts
// src/model/formulaEvaluator.ts

import { EQUATION_FORMS, FormulaId, Operator } from "./relationshipRegistry";

export interface ResolvedEquation {
  formulaId: FormulaId;
  operator: Operator;
  leftQuantityId: string;
  rightQuantityId: string;
  resultQuantityId: string;
  leftValue: number;
  rightValue: number;
  resultValue: number;
}

export function applyOperator(left: number, operator: Operator, right: number): number {
  switch (operator) {
    case "+": return left + right;
    case "-": return left - right;
    case "×": return left * right;
    case "÷": {
      if (right === 0) throw new Error("Cannot divide by zero.");
      return left / right;
    }
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unknown operator: ${exhaustive}`);
    }
  }
}

export function resolveEquationFromRoles(args: {
  formulaId: FormulaId;
  roleToQuantityId: Record<string, string>;
  quantityValues: Record<string, number>;
}): ResolvedEquation {
  const form = EQUATION_FORMS[args.formulaId];
  if (!form) throw new Error(`Unknown formulaId: ${args.formulaId}`);

  const leftQuantityId = args.roleToQuantityId[form.leftRole];
  const rightQuantityId = args.roleToQuantityId[form.rightRole];
  const resultQuantityId = args.roleToQuantityId[form.resultRole];

  if (!leftQuantityId || !rightQuantityId || !resultQuantityId) {
    throw new Error(`Formula ${args.formulaId} cannot resolve all roles.`);
  }

  const leftValue = args.quantityValues[leftQuantityId];
  const rightValue = args.quantityValues[rightQuantityId];
  const resultValue = applyOperator(leftValue, form.operator, rightValue);

  return {
    formulaId: args.formulaId,
    operator: form.operator,
    leftQuantityId,
    rightQuantityId,
    resultQuantityId,
    leftValue,
    rightValue,
    resultValue
  };
}
```

---

## Problem schema additions

```ts
export interface DimensionSpec {
  kind: string;
  increaseLabel: string;
  decreaseLabel: string;
  sameLabel: string;
  increaseSentence?: string;
  decreaseSentence?: string;
}

export interface StoryChromeSpec {
  eyebrowLabel: string;
  startCta: string;
  finishCta: string;
  stepProgressVerb?: string;
  groupNoun?: string;
  learnerRole?: string;
}

export interface QuantityLabelSpec {
  child: string;
  compact: string;
  lowercase?: string;
}

export interface DerivedQuantitySpec {
  formulaId: FormulaId;
  operands: Record<string, QuantityId>;
}

export interface QuantitySpec {
  id: QuantityId;
  label: QuantityLabelSpec;
  unit: string;
  value: number | null;
  expectedValueForFixture?: number;
  derived?: DerivedQuantitySpec;
  semanticRole?: string;
  visibility: "given" | "find" | "revealed_after_step";
}

export interface StepSpec {
  id: string;
  order: number;
  prompt: string;
  reasoningPrompt: string;
  relationshipTemplateId: RelationshipTemplateId;
  roleToQuantityId: Record<string, QuantityId>;
  acceptedEquationFormIds: FormulaId[];
  expectedDirection: DirectionKind;
  operatorOptions: Operator[];
  backwardCheck: {
    prompt: string;
    acceptedEquationFormIds: FormulaId[];
  };
}

export interface OperatorExperimentSpec {
  stepId: string;
  operator: Operator;
  narrativeFit: "actual" | "different_story" | "different_question";
  visualModel?: VisualModelType;
  shortReaction?: string;
  alternateWorldTemplate?: string;
  groupNoun?: string;
}

export interface RecapSpec {
  headline: string;
  causalChain: string[];
  calcFromStepId: string;
  dataQuestion: {
    prompt: string;
    correctQuantityId: QuantityId;
    distractorQuantityIds: QuantityId[];
    correctFeedback: string;
    incorrectFeedback: string;
  };
}

export interface ProblemSpec {
  id: string;
  metadata: {
    title: string;
    theme: string;
    gradeBand: string;
    factualStatus?: "fictionalized" | "inspired_by_real_world" | "realistic";
    tags: string[];
  };
  dimension: DimensionSpec;
  storyChrome: StoryChromeSpec;
  story: {
    briefTemplate: string;
    curiosityNote?: string;
    closingNoteTemplate?: string;
  };
  quantities: QuantitySpec[];
  steps: StepSpec[];
  operatorExperiments: OperatorExperimentSpec[];
  recap: RecapSpec;
}
```

---

## Canonical visual model catalog

Bar models are important, but they should not be the whole visual language. The app needs a small set of **exciting but rigorous native SVG/HTML5 mathematical world pictures**.

These are not dashboards. They are visible models of relationships.

| Visual model | Best for | What it teaches | Kid-facing feel |
|---|---|---|---|
| `comparison_bar_gap` | Bigger/smaller/difference | The gap is the difference | Two trails, one shorter; missing segment visible |
| `part_whole_stacked_bar` | Part + part = whole | A whole can be built from parts | Packing crates, trays, shelves, book stacks |
| `start_change_end_bridge` | Start ± change = end | A quantity changes because something happened | Before → change → after |
| `number_line_jump` | Addition/subtraction, distance, money, temperature | Operations move a value along a scale | Leaps forward/back with labeled stops |
| `repeated_groups_grid` | Multiplication | Multiplication means repeated equal groups | Rows of rover-days, biscuit trays, animation expressions |
| `array_grid` | Multiplication and area-like structure | Rows × columns as structure | Neat studio boards, seed trays, sticker sheets |
| `equal_sharing_trays` | Division | Total split into equal groups | Bowls, baskets, kennels, lunch boxes |
| `ratio_strip` | Recipes, unit rates, scaled quantities | Same relationship scaled up/down | Ingredient ribbons, mixing strips |
| `pictograph` | Counts with moderate totals | Units can represent real things | Chickadee icons, biscuit dots, book tokens |
| `dot_plot` | Several observations or repeated attempts | Distribution and comparison | Animal sightings across days |
| `line_over_time` | Sequences across days, travel, temperature | Change over time | Trail path or reading-progress path |
| `causal_chain_formula` | Recap | Cause → change → equation | Field-note causal map |

### Visualization selection rule

The relationship template chooses the default solving visual. The operator experiment can override it when the attempted operator implies a different model.

Examples:

```text
additive_comparison_decrease + accepted subtraction
→ comparison_bar_gap

part_part_whole + accepted addition
→ part_whole_stacked_bar

multiplication_equal_groups + accepted multiplication
→ repeated_groups_grid or array_grid

addition attempted inside a multiplication story
→ part_whole preview, but mark as different question

multiplication attempted inside a comparison story
→ repeated_groups_grid, not a misleading bar comparison
```

### The visual goal

Every visual should answer:

```text
What changed?
What stayed the same?
What does this operation make visible?
Would this model fit this story or a different story?
```

---

## Operator experiment rendering contract

For each attempted operator, render only:

1. The computed equation line.
2. One short reaction.
3. The correct visual model for that attempted operation.
4. One alternate-world sentence if it does not fit.

### Example: wrong multiplication in rover comparison story

```text
384 × 128 = 49,152 meters        That’s much farther than Monday.
```

Visual:

```text
128 copies of Monday’s 384-meter drive
[384] [384] [384] [384] ... ×128
```

Alternate-world sentence:

```text
This would fit a different story: if Perseverance drove Monday’s distance for 128 days, how far would it travel altogether?
```

Do not render:

```text
Multiplication creates a repeated-group question.
A different question.
Tuesday distance runs far past this scale.
Experimenting is good thinking.
```

---

## Recap/data literacy contract

The recap must be data-driven.

```json
{
  "recap": {
    "headline": "Why Tuesday was shorter",
    "causalChain": [
      "Wheel slipped into soft sand",
      "Less useful driving time",
      "Tuesday traveled fewer meters than Monday"
    ],
    "calcFromStepId": "find_tuesday_distance",
    "dataQuestion": {
      "prompt": "What does the gap between the Monday and Tuesday bars mean?",
      "correctQuantityId": "tuesday_difference",
      "distractorQuantityIds": ["monday_distance", "two_day_total"],
      "correctFeedback": "The gap shows how much shorter Tuesday was than Monday.",
      "incorrectFeedback": "The gap is the difference between the two distances."
    }
  }
}
```

For multiplication, the recap question might be:

```json
{
  "prompt": "What does one row in the eyebrow-shape grid represent?",
  "correctQuantityId": "items_per_expression",
  "distractorQuantityIds": ["expression_count", "total_eyebrow_shapes"],
  "correctFeedback": "One row shows the eyebrow shapes needed for one expression.",
  "incorrectFeedback": "Look at one repeated group before looking at the total."
}
```

---

## Copy governance

### Child-facing screen budget

Each screen should have:

- One title or question.
- One active instruction, only if necessary.
- One feedback sentence.
- One alternate-world sentence when an operator does not fit.
- No duplicate statement of the same fact.

### Forbidden patterns

Avoid:

```text
Let’s build it and see what the numbers say.
You can always revise.
Experimenting is good thinking.
Multiplication creates a repeated-group question.
A different question.
Runs far past this scale.
```

### Allowed richness

Story packs should be concrete and memorable:

```text
Perseverance was mapping pale layers of rock near an ancient Martian river delta.
Moose the Great Dane bumped the cooling rack with his enormous tail.
The squirrel needed one eyebrow shape called “I definitely did not steal the acorn.”
```

The richness belongs in the story context and alternate-world examples, not in generic component narration.

---

## Acceptance fixture examples

Use at least three fixtures to prove the framework is generic.

### 1. Addition fixture — Minnesota birding

**Title:** The chickadees found the frozen cattails

**Story brief template**

```text
At a frozen wetland in Minnesota, Seraphina set up a tiny bird recorder near rattling cattails. Before lunch, it counted {quantity:morning_chickadee_calls}. When the sun warmed the cattails, the birds became noisier and the recorder caught {quantity:extra_chickadee_calls} more chickadee calls. Nearby, it also caught {quantity:nuthatch_taps} from nuthatches tapping on a dead birch trunk.
```

**Step 1**

```text
How many chickadee calls did the recorder catch altogether?
146 + 78 = 224
```

**Step 2**

```text
How many bird sounds did it catch altogether, counting chickadee calls and nuthatch taps?
224 + 93 = 317
```

**Relationship templates**

```text
Step 1: start_change_end_increase
Step 2: part_part_whole
```

---

### 2. Subtraction fixture — Puppy rescue kitchen

**Title:** Moose the Great Dane steals the biscuit tray

**Story brief template**

```text
At a puppy-rescue bake sale, the volunteers baked {quantity:pumpkin_biscuits_start} tiny pumpkin dog biscuits. Before the sale opened, Moose the Great Dane bumped the cooling rack with his enormous tail, and {quantity:biscuits_lost} biscuits slid onto the floor. The volunteers saved the clean biscuits and packed them with {quantity:peanut_butter_biscuits} peanut-butter biscuits from another tray.
```

**Step 1**

```text
How many pumpkin biscuits were still sellable?
212 - 47 = 165
```

**Step 2**

```text
How many sellable biscuits did the volunteers have after adding the peanut-butter biscuits?
165 + 36 = 201
```

**Relationship templates**

```text
Step 1: start_change_end_decrease
Step 2: part_part_whole
```

---

### 3. Multiplication fixture — Animation lab

**Title:** The eyebrow rig that made everyone suspicious

**Story brief template**

```text
In a tiny animation lab, an animator was testing a suspicious-looking squirrel character. The squirrel needed {quantity:eyebrow_shapes_per_expression} eyebrow shapes for each expression: curious, worried, heroic, sneaky, delighted, furious, sleepy, and “I definitely did not steal the acorn.” The team built eyebrow shapes for {quantity:expression_count} expressions. Then another animator added {quantity:mouth_shapes} mouth shapes for tiny smirks and gasps.
```

**Step 1**

```text
How many eyebrow shapes did the team build?
8 × 13 = 104
```

**Step 2**

```text
How many face-shape controls did they build altogether, counting eyebrow shapes and mouth shapes?
104 + 27 = 131
```

**Relationship templates**

```text
Step 1: multiplication_equal_groups
Step 2: part_part_whole
```

---

## Copy-paste prompt for Claude Code

```text
Please perform a root-level StoryMath parameterization cleanup based on audit/FIELD_PARAMETERIZATION_AUDIT.md and the architecture below. Do not make cosmetic fixes. Do not patch individual text with display:none. The goal is scenario-swappability: once a story pack supplies context, quantities, units, relationship templates, direction labels, story chrome, and recap data, the explorer should work without component edits.

CORE PRINCIPLE
The JSON defines a causal-mathematical model. Components render that model. Components must not invent explanatory prose, duplicate arithmetic, or assume NASA/distance/two-day wording.

IMPORTANT DISTINCTION
We do want equations such as "384 × 128 = 49,152 meters" to appear. But equations must be computed/rendered from the engine, not authored as literal prose. Remove authored explanation strings that duplicate arithmetic. Keep or create computed equation rendering.

1. RECLASSIFY FIELD SAFETY
Update docs and validation to distinguish: computed, template_safe, curated_prose, story_chrome, hardcoded_chrome, brittle_authored_prose, and component_assumption. A JSON field is not automatically swap-safe. If it contains frozen arithmetic, literal values, literal units, relationship claims, or domain nouns that should come from the model, classify it as brittle until templated or removed.

2. DERIVED QUANTITY COMPUTATION
Replace stored answer literals for derived quantities with formula specs. Compute derived quantities at load time in dependency order. Use expectedValueForFixture only for validation/tests, never for grading. The instantiated problem’s computed values must drive answer checking, equation lines, bars, previews, recap, and backward checks.

Implement formula specs such as:
{
  "id": "tuesday_distance",
  "value": null,
  "derived": {
    "formulaId": "bigger_minus_difference_equals_smaller",
    "operands": {
      "bigger": "monday_distance",
      "difference": "tuesday_difference"
    }
  },
  "expectedValueForFixture": 256
}

Also support chained derived values such as a total depending on a previously derived quantity.

3. RELATIONSHIP TEMPLATE REGISTRY
Create src/model/relationshipRegistry.ts with canonical TypeScript types and registry definitions for:
- additive_comparison_decrease
- additive_comparison_increase
- part_part_whole
- start_change_end_increase
- start_change_end_decrease
- multiplication_equal_groups
- division_equal_sharing

Use FormulaId, RelationshipTemplateId, EquationForm, RelationshipTemplate, and VisualModelType types. Components should ask this registry for equation forms, role mappings, inverse/backward-check forms, directionProduced, and default visual model. Do not hardcode bigger/difference/smaller or partA/partB/whole logic in App.tsx except through the registry.

Use this registry shape:

export type Operator = "+" | "-" | "×" | "÷";
export type DirectionKind = "increase" | "decrease" | "same" | "combine" | "scale" | "split" | "unknown";
export type VisualModelType = "comparison_bar_gap" | "part_whole_stacked_bar" | "start_change_end_bridge" | "number_line_jump" | "repeated_groups_grid" | "equal_sharing_trays" | "array_grid" | "ratio_strip" | "causal_chain_formula" | "data_table" | "dot_plot" | "pictograph" | "line_over_time";
export type FormulaId = "bigger_minus_difference_equals_smaller" | "smaller_plus_difference_equals_bigger" | "bigger_minus_smaller_equals_difference" | "part_a_plus_part_b_equals_whole" | "whole_minus_part_a_equals_part_b" | "whole_minus_part_b_equals_part_a" | "start_plus_change_equals_end" | "start_minus_change_equals_end" | "end_minus_start_equals_change" | "end_plus_change_equals_start" | "groups_times_items_equals_total" | "items_times_groups_equals_total" | "total_divided_by_groups_equals_items" | "total_divided_by_items_equals_groups";
export type RelationshipTemplateId = "additive_comparison_decrease" | "additive_comparison_increase" | "part_part_whole" | "start_change_end_increase" | "start_change_end_decrease" | "multiplication_equal_groups" | "division_equal_sharing";

Implement EQUATION_FORMS and RELATIONSHIP_TEMPLATES following the detailed spec in STORYMATH_PARAMETERIZATION_CLEANUP_SPEC.md.

4. STORY PACK CHROME
Do not replace story flavor with soulless neutral defaults. Neutral labels are fallbacks only. Story pack chrome should supply world-specific labels:
- storyChrome.eyebrowLabel
- storyChrome.startCta
- storyChrome.finishCta
- storyChrome.stepProgressVerb
- storyChrome.groupNoun
- storyChrome.learnerRole

Component code must not hardcode "Imaginary Mission Brief", "Start the investigation", "Finish the mission", "one drive", or "drive". Those belong in the story pack.

5. SAFE FIELD-MERGE TEMPLATES
Change story.brief into story.briefTemplate. Implement tokens such as:
- {quantity:monday_distance} → 384 meters
- {value:monday_distance} → 384
- {unit:monday_distance} → meters
- {label:monday_distance.compact} → Monday distance

Add a validation rule that flags bare numeric literals in child-facing prose unless allowLiteralNumbers is explicitly set with a reason.

6. DIMENSION-AWARE DIRECTION LABELS
Replace hardcoded Farther/Shorter in shared code with problem.dimension or quantity.dimension labels. Do not flatten everything to More/Less unless no story-specific labels exist.

Example:
"dimension": {
  "kind": "distance",
  "increaseLabel": "Farther",
  "decreaseLabel": "Shorter",
  "sameLabel": "The same"
}

Never call .toLowerCase() on authored labels. If lowercase text is needed, add an explicit lowercase label.

7. OPERATOR EXPERIMENT CLEANUP
Remove or stop rendering operatorExperiments.*.headline and operatorExperiments.*.explanation when they duplicate arithmetic. The operator experiment panel should render:
- one computed equation line
- one short reaction
- the correct visual model for the attempted operation
- one alternate-world sentence if the operation does not fit this story

For example, wrong multiplication in the rover story should render:
"384 × 128 = 49,152 meters" and "That’s much farther than Monday."
Then a repeated-groups visual, then:
"This would fit a different story: if Perseverance drove Monday’s distance for 128 days, how far would it travel altogether?"

8. RECAP FULLY DATA-DRIVEN
Replace hardcoded recap calc node, hardcoded difference answer, hardcoded distractors, and hardcoded gap feedback with recap JSON:
- recap.headline
- recap.causalChain
- recap.calcFromStepId
- recap.dataQuestion.prompt
- recap.dataQuestion.correctQuantityId
- recap.dataQuestion.distractorQuantityIds
- recap.dataQuestion.correctFeedback
- recap.dataQuestion.incorrectFeedback

Shuffle answer options. Do not assume difference is correct. Do not assume a two-bar gap.

9. FIX BUGS
Fix BackwardBar subtraction branch: caption must describe the segment actually rendered; subtraction aria should say "{leftValue} {unit} minus {otherValue} {unit} leaves {resultValue} {unit}."

Fix PLACE_NAMES: generate place names beyond ten-thousands; never degrade to "place 5".

10. VISUAL MODEL SELECTION
Do not force all previews into bar charts. Use relationship/operator metadata to select visual models:
- comparison_bar_gap for additive comparison
- part_whole_stacked_bar for part-part-whole
- start_change_end_bridge and number_line_jump for start/change/end
- repeated_groups_grid or array_grid for multiplication
- equal_sharing_trays for division
- ratio_strip for recipes/rates
- pictograph/dot_plot/line_over_time for post-solution data views when appropriate

All visuals must be native HTML/CSS/inline SVG and driven by equation result + relationship template + quantity IDs.

11. COPY GOVERNANCE
Each screen has one main question, one instruction max, one feedback sentence max, one alternate-world sentence max. Remove generic motivational filler and avoid repeated facts. Story richness belongs in curated story context and story-pack chrome, not component-generated narration.

12. ACCEPTANCE FIXTURES
Create at least three fixture problems:
- Minnesota birding addition: start_change_end_increase + part_part_whole
- Puppy rescue subtraction: start_change_end_decrease + part_part_whole
- Animation lab multiplication: multiplication_equal_groups + part_part_whole

For each fixture, tests must prove derived values compute, story templates update when numbers change, operator experiments render computed equations, recap is data-driven, visual model type is selected correctly, and no stale literal arithmetic remains in child-facing text.

After implementation, report changed files, schema changes, removed brittle fields, tests added, and any remaining scenario-swap risks.
```

---

## Suggested implementation order

1. Add registry and formula evaluator.
2. Add derived quantity computation.
3. Convert existing NASA problem to new schema.
4. Remove authored arithmetic from operator experiments.
5. Add story pack chrome and dimension labels.
6. Make recap data-driven.
7. Fix BackwardBar and PLACE_NAMES bugs.
8. Add native SVG visual model selector.
9. Add fixture problems and tests.
10. Run number-swap and scenario-swap validation.

---

## Final product test

The framework is not ready until this works:

1. Change only `monday_distance` and `tuesday_difference` in the NASA problem.
2. The story, equation, answer checking, bars, multiplication preview, backward checks, recap, and finish note all update.
3. Add the puppy story JSON with no component edits.
4. Add the animation multiplication story JSON with no component edits.
5. The UI remains vivid, specific, and child-friendly without generic AI narration.

