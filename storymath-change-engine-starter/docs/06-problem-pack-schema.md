# StoryMath Problem Pack — Authoring Schema

> **Author against the TypeScript, not the JSON Schema.** `data/problem-schema.json` is badly stale and disagrees with the current code in many places (full discrepancy list in §11). The source of truth is `src/model/problemSpec.ts` + `src/model/relationshipRegistry.ts` + the four working fixtures under `data/problems/`.

---

## 1. What a problem pack is (mental model)

A **problem pack** is a single JSON object (an exported `ProblemSpec`) that fully describes one multi-step word problem. The engine renders it with **zero component edits**: components never see your raw JSON — `instantiateProblem(spec)` computes every derived number and field-merges your prose into an `InstantiatedProblem`, which the UI reads.

The child experience the pack drives, in order:

1. **Causal story** — a short curated brief sets up a real-world cause (`story.briefTemplate`, `story.causalEvent`).
2. **Predict** — the child guesses a direction on the measured axis (from `dimension`: e.g. *Farther / Shorter / The same*).
3. **Build** — the child assembles the relationship for the current step (from `relationshipTemplateId` + `roleToQuantityId`).
4. **Test the operator** — the child tries operators (`operatorOptions`); each is framed by an authored `operatorExperiment`, and the engine computes the numeric consequence live.
5. **Solve** — the step's `goalQuantityId` is found via the `preferredEquationFormId`.
6. **Backward-check** — the child proves the answer with an inverse form (`backwardCheck`).
7. **Recap** — a closing causal chain plus a comprehension `dataQuestion`.

**The golden rule:** every child-facing number comes from the model via a field-merge token (`{value:id}`, `{quantity:id}`). You never type a modeled literal into prose — the engine grades against computed values, and literals silently drift.

---

## 2. Top-level structure at a glance

```jsonc
{
  "id": "…",                       // unique pack id (string)
  "metadata":    { … },            // title, theme, gradeBand, tags (+ optional factualStatus, curiosityNote)
  "dimension":   { … },            // measured axis + direction words
  "storyChrome": { … },            // world-flavor UI strings
  "story": {
    "briefTemplate": "…",          // required, field-merged
    "causalEvent": "…",            // optional, NOT merged
    "closingNoteTemplate": "…"     // optional, field-merged
  },
  "quantities": [ … ],             // all named amounts (givens + derived)
  "steps": [ … ],                  // ordered solve steps
  "operatorExperiments": [ … ],    // ARRAY — one entry per (step × each operatorOption)
  "recap": {
    "headline": "…",
    "causalChain": [ … ],
    "calcFromStepId": "…",
    "totalVisualStepId": "…",      // optional
    "dataQuestion": { … }
  }
}
```

All **9 top-level keys are TypeScript-required** (only three `story` sub-fields are optional) — always author all nine. Runtime note: omitting `story`, `quantities`, `steps`, `operatorExperiments`, or `recap` throws (`Instantiation failed: …` or an uncaught error), but `metadata`, `dimension`, and `storyChrome` are never read by `instantiateProblem`/`validateProblem`, so omitting *those three* silently passes validation. Author all nine regardless.

---

## 3. Field reference

`?` after a field name = optional in TypeScript. "Default" describes what the engine does when an optional field is omitted.

### 3.1 `metadata` — `ProblemMetadataSpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `title` | `string` | **yes** | Displayed title. Mark fictionalization **here** (e.g. `"Imaginary mission: …"`), never via a UI pill. | — |
| `theme` | `string` | **yes** | Short theme label (`"Mars rover mission"`). Author metadata. | — |
| `gradeBand` | `string` | **yes** | Free-form (`"2–3"`, `"3–4"`). | — |
| `factualStatus` | `"fictionalized" \| "inspired_by_real_world" \| "realistic"` | no | Author metadata only; **not shown in child flow**. Quote one of these three verbatim. | `undefined` (absent) |
| `tags` | `string[]` | **yes** | Free-form tags; may be `[]`. | — |
| `curiosityNote` | `string` | no | Author metadata only; not rendered to children. | absent |

Nothing in `metadata` is validated.

### 3.2 `dimension` — `DimensionSpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `kind` | `string` | **yes** | Measured axis (`"distance"`, `"count"`). | — |
| `increaseLabel` | `string` | **yes** | Capitalized "grew" word (`"Farther"`, `"More"`). | — |
| `decreaseLabel` | `string` | **yes** | (`"Shorter"`, `"Fewer"`). | — |
| `sameLabel` | `string` | **yes** | (`"The same"`). | — |
| `increaseLabelLower` | `string` | no | Explicit lowercase. Engine never `toLowerCase()`s authored labels. | absent |
| `decreaseLabelLower` | `string` | no | Same. | absent |
| `sameLabelLower` | `string` | no | Same. | absent |
| `increaseSentence` | `string` | no | (`"farther than before"`). | absent |
| `decreaseSentence` | `string` | no | (`"shorter than before"`). | absent |

No `sameSentence` field exists. `dimension.*` strings are **not** field-merged. Not validated.

### 3.3 `storyChrome` — `StoryChromeSpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `openingEyebrow` | `string` | **yes** | Kicker/"field notebook" eyebrow. | — |
| `startCta` | `string` | **yes** | Start button label. | — |
| `finishCta` | `string` | **yes** | Finish button label. | — |
| `completionTitle` | `string` | no | Completion-screen headline. | absent |
| `stepProgressVerb` | `string` | no | e.g. `"model the rover problem"`. | absent |
| `groupNoun` | `string` | no | Fallback group noun for operator experiments. | absent |
| `learnerRole` | `string` | no | e.g. `"mission modeler"`. | absent |

Not field-merged; not validated.

### 3.4 `story` (inline object)

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `briefTemplate` | `string` | **yes** | Curated setup prose. **Field-merged** → `story.brief`. Prose-linted for bare literals. | — |
| `causalEvent` | `string` | no | The physical cause. **Passed through verbatim — NOT merged.** Never put tokens here. | absent |
| `closingNoteTemplate` | `string` | no | **Field-merged** → `story.closingNote`. Prose-linted. | absent |

### 3.5 `quantities[]` — `QuantitySpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `id` | `string` (`QuantityId`) | **yes** | Unique within pack; referenced by tokens, roles, recap. The id string itself is unconstrained, **but** a `{…:id}` token requires `[a-zA-Z0-9_]+` (**no hyphens**), and nearly every quantity is token-referenced — so treat that as a rule. Duplicate id → **validation error**. | — |
| `label` | `QuantityLabelSpec` | **yes** | See below. | — |
| `unit` | `string` | **yes** | (`"meters"`, `"muffins"`). Used by `{unit:id}` and unit-compatibility check (case-insensitive, trimmed equality). | — |
| `value` | `number \| null` | **yes (key present)** | Literal for a given. For a **derived** quantity the value is **ignored** (use `null` by convention). A **non-derived** quantity with a non-number value throws. | — |
| `expectedValueForFixture` | `number` | no | Build-time self-check on a **derived** value (float-tolerant, ε=1e-9). Mismatch → instantiation **throws**. Never used for grading. Omit on givens. | no check |
| `derived` | `DerivedQuantitySpec` | no | Present → value is computed. | given (uses `value`) |
| `semanticRole` | `string` | no | Not validated and ignored by the domain engine (grading/derivation), **but read by the EquationBuilder UI** (`accentFor`) to tint the operand tile: `bigger` `smaller` `difference` `whole` → role color, anything else/omitted → default. Set it to the operand's role for colored tiles. | default accent |
| `visibility` | `"given" \| "find" \| "revealed_after_step"` | **yes** | Reveal timing. `given` = shown up front; `find` = the step goal; `revealed_after_step` = shown after its step. | — |
| `allowLiteralNumbers` | `boolean` | no | **Dead field** — declared but read nowhere; inert. | ignored |

**`QuantityLabelSpec`:**

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `child` | `string` | **yes** | Full child-readable name. Used by `{label:id.child}`. | — |
| `compact` | `string` | **yes** | Short chip label. The **default** for `{label:id}`. | — |
| `lowercase` | `string` | no | Sentence-body form for `{label:id.lowercase}`. | `compact.toLowerCase()` |

There is **no `semanticChips`** field (the stale schema invents it).

**`DerivedQuantitySpec`:**

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `formulaId` | `FormulaId` | **yes** | One of the 14 registry forms (§4). Its `resultRole` auto-binds to this quantity. | — |
| `operands` | `Record<string, QuantityId>` | **yes** | Maps the formula's **`leftRole` and `rightRole` only** → quantity ids. **Never include the result role.** | — |

### 3.6 `steps[]` — `StepSpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `id` | `string` | **yes** | Unique step id; referenced by experiments and recap. | — |
| `order` | `number` | **yes** | Sequence (1-based in fixtures). Not validated. | — |
| `prompt` | `string` | **yes** | Step question. **NOT field-merged** — no tokens/numbers. | — |
| `reasoningPrompt` | `string` | **yes** | Directional sub-prompt. **NOT field-merged.** | — |
| `relationshipTemplateId` | `RelationshipTemplateId` | **yes** | One of 7 templates (§4). Its `roles` must be fully covered by `roleToQuantityId`. | — |
| `roleToQuantityId` | `Record<string, QuantityId>` | **yes** | Maps **every role of the template AND every left/right/result role of every referenced form** → an existing quantity. | — |
| `goalQuantityId` | `QuantityId` | **yes** | The unknown this step finds. Must exist. | — |
| `acceptedEquationFormIds` | `FormulaId[]` | **yes** | Valid forward forms (fact-family equivalents allowed). | — |
| `preferredEquationFormId` | `FormulaId` | **yes** | Canonical form. Its `leftRole`/`rightRole` define the two operands used by `stepOperandIds()` **and** by every operator experiment, and the unit-compatibility check. | — |
| `expectedDirection` | `DirectionKind` | **yes** | Set to the preferred form's `directionProduced`. Fallback for an experiment operator with no `experimentForms` mapping. | — |
| `operatorOptions` | `Operator[]` | **yes** | Operators offered (typically all four). **Every entry needs a matching experiment.** | — |
| `backwardCheck` | `BackwardCheckSpec` | **yes** | Inverse-check frame. | — |

**`BackwardCheckSpec`:**

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `prompt` | `string` | **yes** | Inverse-check prompt. **NOT field-merged.** | — |
| `acceptedEquationFormIds` | `FormulaId[]` | **yes** | Inverse forms. The **first** builds the primary frame; each form's roles must be in `roleToQuantityId`. **Must be non-empty** (empty passes validation but crashes at runtime). | — |

There is **no `required` boolean** on `backwardCheck`.

### 3.7 `operatorExperiments[]` — `OperatorExperimentSpec` (a flat ARRAY)

One entry per `(stepId, operator)`. Offering `["+","-","×","÷"]` on both steps of a 2-step problem = **8 experiments**.

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `stepId` | `string` | **yes** | Must match a step id. | — |
| `operator` | `Operator` | **yes** | `(stepId, operator)` is the lookup key. | — |
| `narrativeFit` | `"actual" \| "different_story" \| "different_question"` | **yes** | `fitsStory = (narrativeFit === "actual")`. **Exactly one `"actual"` per step.** Quote verbatim — not `"counterfactual"`. | — |
| `visualModel` | `VisualModelType` | no | Overrides the visual. | `experimentForms[op].defaultVisualModel` → else `"comparison_gap_bar"` |
| `shortReaction` | `string` | no | Brief reaction line. **NOT field-merged.** | absent |
| `alternateWorldTemplate` | `string` | no | "A world where this fits" sentence. **Field-merged at runtime.** Prose-linted. | `""` |
| `groupNoun` | `string` | no | Group noun for this experiment. | `storyChrome.groupNoun`; else omitted |

The engine computes the numeric consequence itself (`applyOperator` over the preferred form's two operands); you supply only narrative/visual framing.

### 3.8 `recap` — `RecapSpec`

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `headline` | `string` | **yes** | Recap headline. **Field-merged.** | — |
| `causalChain` | `string[]` | **yes** | Ordered cause→effect bullets. **Each entry field-merged.** | — |
| `calcFromStepId` | `string` | **yes** | Step the recap centers on. Must be a real step id. | — |
| `totalVisualStepId` | `string` | no | Step whose total drives the recap bar. **Not existence-validated — a typo throws at render.** | absent |
| `dataQuestion` | `DataQuestionSpec` | **yes** | Closing comprehension question. | — |

**`DataQuestionSpec`:**

| Field | Type | Required | Purpose | Default |
|---|---|---|---|---|
| `prompt` | `string` | **yes** | **Field-merged.** | — |
| `correctQuantityId` | `QuantityId` | **yes** | Must exist. | — |
| `distractorQuantityIds` | `QuantityId[]` | **yes** | Each must exist. | — |
| `correctFeedback` | `string` | **yes** | **Field-merged.** | — |
| `incorrectFeedback` | `string` | **yes** | **Field-merged.** | — |

---

## 4. Registry reference (`relationshipRegistry.ts`) — the only allowed ids

Use these verbatim; anything else fails validation.

**`Operator`:** `"+"` `"-"` `"×"` `"÷"` — the multiply/divide are the **Unicode glyphs `×` (U+00D7) and `÷` (U+00F7)**, not ASCII `x` `*` `/`.

**`DirectionKind`:** `increase` `decrease` `same` `combine` `scale` `split` `unknown`.

**`VisualModelType`:** `comparison_gap_bar` `part_whole_bar` `before_change_after_bridge` `number_line_jump` `repeated_groups_grid` `equal_shares_tray` `array_grid` `ratio_strip` `causal_chain_formula` `data_table` `dot_plot` `pictograph` `line_over_time`.

**Role tokens (the keys for `roleToQuantityId` and `derived.operands`):** `bigger` `difference` `smaller` `partA` `partB` `whole` `start` `change` `end` `groups` `itemsPerGroup` `total`.

### `FormulaId` — all 14 forms

| FormulaId | operator | left | right | result | directionProduced | defaultVisualModel |
|---|---|---|---|---|---|---|
| `bigger_minus_difference_equals_smaller` | − | bigger | difference | smaller | decrease | comparison_gap_bar |
| `smaller_plus_difference_equals_bigger` | + | smaller | difference | bigger | increase | comparison_gap_bar |
| `bigger_minus_smaller_equals_difference` | − | bigger | smaller | difference | decrease | comparison_gap_bar |
| `part_a_plus_part_b_equals_whole` | + | partA | partB | whole | combine | part_whole_bar |
| `whole_minus_part_a_equals_part_b` | − | whole | partA | partB | decrease | part_whole_bar |
| `whole_minus_part_b_equals_part_a` | − | whole | partB | partA | decrease | part_whole_bar |
| `start_plus_change_equals_end` | + | start | change | end | increase | before_change_after_bridge |
| `start_minus_change_equals_end` | − | start | change | end | decrease | before_change_after_bridge |
| `end_minus_start_equals_change` | − | end | start | change | decrease | before_change_after_bridge |
| `end_plus_change_equals_start` | + | end | change | start | increase | before_change_after_bridge |
| `groups_times_items_equals_total` | × | groups | itemsPerGroup | total | scale | repeated_groups_grid |
| `items_times_groups_equals_total` | × | itemsPerGroup | groups | total | scale | repeated_groups_grid |
| `total_divided_by_groups_equals_items` | ÷ | total | groups | itemsPerGroup | split | equal_shares_tray |
| `total_divided_by_items_equals_groups` | ÷ | total | itemsPerGroup | groups | split | equal_shares_tray |

### `RelationshipTemplateId` — all 7 templates

`roles` = the exact keys your `roleToQuantityId` must cover. Use `primaryForms` for `preferredEquationFormId`/`acceptedEquationFormIds` and `inverseForms` for `backwardCheck`.

| TemplateId | roles | primaryForms | inverseForms (backward) | default visuals |
|---|---|---|---|---|
| `additive_comparison_decrease` | bigger, difference, smaller | `bigger_minus_difference_equals_smaller` | `smaller_plus_difference_equals_bigger`, `bigger_minus_smaller_equals_difference` | comparison_gap_bar, number_line_jump |
| `additive_comparison_increase` | smaller, difference, bigger | `smaller_plus_difference_equals_bigger` | `bigger_minus_difference_equals_smaller`, `bigger_minus_smaller_equals_difference` | comparison_gap_bar, number_line_jump |
| `part_part_whole` | partA, partB, whole | `part_a_plus_part_b_equals_whole` | `whole_minus_part_a_equals_part_b`, `whole_minus_part_b_equals_part_a` | part_whole_bar, pictograph |
| `start_change_end_increase` | start, change, end | `start_plus_change_equals_end` | `end_minus_start_equals_change` | before_change_after_bridge, number_line_jump |
| `start_change_end_decrease` | start, change, end | `start_minus_change_equals_end` | `end_plus_change_equals_start` | before_change_after_bridge, number_line_jump |
| `multiplication_equal_groups` | groups, itemsPerGroup, total | `groups_times_items_equals_total`, `items_times_groups_equals_total` | `total_divided_by_groups_equals_items`, `total_divided_by_items_equals_groups` | repeated_groups_grid, array_grid |
| `division_equal_sharing` | total, groups, itemsPerGroup | `total_divided_by_groups_equals_items` | `groups_times_items_equals_total` | equal_shares_tray, array_grid |

Each template also carries `experimentForms` (a partial `Operator → FormulaId` map) and `recapModelType` (`causal_chain_formula` for all 7). You reference these by template id; you don't author them. When a child tries a non-actual operator, its shown **direction and visual come from `experimentForms[operator]`**, not from your step.

**How it interlocks:** `preferredEquationFormId` picks the two operands (`stepOperandIds` = its left/right roles' quantities). Every operator experiment computes `applyOperator(left, chosenOp, right)` over **those same two operands**. So choose a preferred form whose operands are the values you want experimented on.

---

## 5. Template token syntax

One resolver (`fieldMerge.ts`). Grammar (verbatim regex):

```
/\{(quantity|value|unit|label):([a-zA-Z0-9_]+)(?:\.(child|compact|lowercase))?\}/g
```

| Token | Resolves to | Example |
|---|---|---|
| `{quantity:id}` | `formatNumber(value) + " " + unit` | `384 meters` |
| `{value:id}` | `formatNumber(value)` | `384` |
| `{unit:id}` | `unit` | `meters` |
| `{label:id}` or `{label:id.compact}` | `label.compact` | `Monday distance` |
| `{label:id.child}` | `label.child` | full child label |
| `{label:id.lowercase}` | `label.lowercase ?? label.compact.toLowerCase()` | `monday distance` |

- `formatNumber`: integers get `en-US` grouping (`1,000`); non-integers round to 2 decimals (`1.5`, `2.33`).
- Quantity ids in tokens are `[a-zA-Z0-9_]+` — **no hyphens**.
- An **unknown quantity id in a token throws** at instantiation.
- Any KIND/VARIANT outside the regex (e.g. `{qty:id}`, `{label:id.formal}`) **does not match and renders literally** — a silent-failure trap.

**Fields that ARE field-merged** (everything else is verbatim):
- `story.briefTemplate`, `story.closingNoteTemplate`
- `recap.headline`, every `recap.causalChain[]`, `recap.dataQuestion.prompt` / `.correctFeedback` / `.incorrectFeedback`
- `operatorExperiments[].alternateWorldTemplate` (merged lazily at runtime)

**NOT merged — never put tokens or modeled numbers here:** `story.causalEvent`, all `steps[].*` strings (`prompt`, `reasoningPrompt`, `backwardCheck.prompt`), `operatorExperiments[].shortReaction`, and everything in `metadata`, `dimension`, `storyChrome`, and `label.*`.

---

## 6. Derived-quantity mechanics + `expectedValueForFixture`

`instantiateProblem.computeValues`:

1. **Seed givens** — every non-derived quantity with a numeric `value` is recorded. A quantity with neither a numeric `value` nor `derived` throws `Quantity "…" has no value and no derived formula.`
2. **Resolve derived iteratively in dependency order** — a derived quantity computes only once *all* its operand values exist. **Array order does not matter**, and a derived quantity may depend on another derived quantity. A cycle or missing dependency throws `Could not resolve derived quantities (cycle or missing dependency): …`.
3. For each derived quantity the engine builds `roleToQuantityId = { ...operands, [form.resultRole]: thisQuantity.id }` and evaluates through `applyOperator`. **`÷` by zero throws.**
4. **`expectedValueForFixture` guard** — if present and the computed result differs (ε=1e-9), instantiation **throws** `Derived "…" computed X but expectedValueForFixture is Y.` It is an author safety net only; the **computed** value is always what the app uses and grades against. Omit it and the check is simply skipped.

**By convention set `value: null` on every derived quantity** and supply `derived` (the value is *ignored* for derived quantities — a non-null value is simply overwritten by the computed result; `null` documents intent). `derived.operands` supplies only the formula's `leftRole`/`rightRole`; the `resultRole` auto-binds to the quantity itself — never list it.

---

## 7. Validation checklist (`validateProblem.ts`)

`isProblemValid` = zero `error`-severity issues (warnings do not block). Must satisfy:

- **Unique quantity ids** — no duplicates.
- **Instantiation succeeds** — every quantity has a value-or-derived; all derived operands resolve (no cycles/missing deps); no ÷0; every `expectedValueForFixture` matches; every `{token}` references a real quantity id. Any failure surfaces as `Instantiation failed: …`.
- **Known template** — each `relationshipTemplateId` is one of the 7.
- **Role coverage** — every role in the template's `roles` is mapped in `roleToQuantityId` to a declared quantity.
- **Goal exists** — `goalQuantityId` is a declared quantity.
- **Valid forms + mapped roles** — every id in `preferredEquationFormId`, `acceptedEquationFormIds`, and `backwardCheck.acceptedEquationFormIds` is a real `FormulaId`, and each such form's left/right/result roles all appear in `roleToQuantityId`.
- **Every offered operator has an experiment** — each `operatorOptions` entry has a matching `(stepId, operator)`.
- **Exactly one `"actual"` experiment per step.**
- **Preferred-form unit compatibility** — the preferred form's two operand quantities have equal `unit` strings (case-insensitive, trimmed). No unit conversion exists. (Only the preferred form's operands are unit-checked.)
- **Experiments reference real steps.**
- **Recap** — `calcFromStepId` is a real step; `dataQuestion.correctQuantityId` and every distractor exist.

**Not validated (author beware):** `recap.totalVisualStepId` (bad id throws at render); an **empty** `backwardCheck.acceptedEquationFormIds` (passes validation, crashes at runtime — always supply ≥1); `visibility`/`order`/`semanticRole`/`expectedDirection` correctness; whether `goalQuantityId` equals the result role.

**Warnings only:** a bare integer literal equal to a modeled value inside `briefTemplate`, `closingNoteTemplate`, or any `alternateWorldTemplate` → "use a token." (Recap prose is not linted.)

### Copy / authoring constraints (from CLAUDE.md)

- **Curated fields only** — never auto-concatenate `metadata`/`theme`/`tags` into child prose.
- **`factualStatus` and `curiosityNote` are author-only** — mark fictionalization in `metadata.title` (e.g. `"Imaginary mission: …"`); no disclaimer pill.
- **Say each thing once** — don't repeat a fact across title/story/label/feedback.
- **No AI narration** — delete filler ("Let's build it and see"); don't echo `narrativeFit` category labels as copy.
- **One question per page** — one `goalQuantityId` per step; don't mention a later step's unknown early.
- **Concrete over abstract labels** — equation slots use `{label:id.compact}`/`{quantity:id}`, not role words like "BIGGER AMOUNT".
- **Right visual, honest scale** — pick a `relationshipTemplateId` whose default visuals match the operation; only override an experiment `visualModel` to another honest model.
- **Never bake a modeled number as a literal** — always use `{value:id}` / `{quantity:id}`.

---

## 8. Complete annotated example (new, non-fiction 2-step subtract → part-whole)

A bakery muffin count. **Step 1** = `start_change_end_decrease` (50 − 30 = 20 left after the rush). **Step 2** = `part_part_whole` (20 leftover + 24 fresh batch = 44 by closing). All units are `muffins` (so the combined operands share an identical unit string).

```jsonc
{
  "id": "corner-bakery-muffin-count-v1",

  "metadata": {
    "title": "The corner bakery's muffin count",
    "theme": "Neighborhood bakery",
    "gradeBand": "2–3",
    "factualStatus": "realistic",          // author metadata only; not shown to child
    "tags": ["baking", "subtraction", "part-whole"],
    "curiosityNote": "A calm counting story about a single shelf across one day."
  },

  "dimension": {
    "kind": "count",
    "increaseLabel": "More",  "decreaseLabel": "Fewer",  "sameLabel": "The same",
    "increaseLabelLower": "more", "decreaseLabelLower": "fewer", "sameLabelLower": "the same",
    "increaseSentence": "more than before", "decreaseSentence": "fewer than before"
  },

  "storyChrome": {
    "openingEyebrow": "Bakery shelf note",
    "startCta": "Open the shelf log",
    "finishCta": "Close the shelf log",
    "completionTitle": "Shelf log closed",
    "stepProgressVerb": "model the shelf problem",
    "groupNoun": "batch",
    "learnerRole": "shelf counter"
  },

  "story": {
    // field-merged — every number is a token, never a literal
    "briefTemplate": "The shelf started the morning with {quantity:morning_start}. During the rush, {value:morning_sold} muffins were sold.",
    "causalEvent": "The morning rush cleared most of the shelf.",   // NOT merged — no tokens
    "closingNoteTemplate": "A fresh {value:afternoon_batch}-muffin batch came out, so the shelf held {value:closing_total} by closing."
  },

  "quantities": [
    {
      "id": "morning_start",
      "label": { "child": "Muffins on the shelf at opening", "compact": "Opening muffins", "lowercase": "opening muffins" },
      "unit": "muffins",
      "value": 50,
      "visibility": "given"
    },
    {
      "id": "morning_sold",
      "label": { "child": "Muffins sold during the morning rush", "compact": "Muffins sold", "lowercase": "muffins sold" },
      "unit": "muffins",
      "value": 30,
      "visibility": "given"
    },
    {
      "id": "morning_leftover",                       // STEP 1 goal (derived, "find")
      "label": { "child": "Muffins left after the morning rush", "compact": "Muffins left", "lowercase": "muffins left" },
      "unit": "muffins",
      "value": null,                                  // derived ⇒ must be null
      "derived": {
        "formulaId": "start_minus_change_equals_end", // start − change = end
        "operands": { "start": "morning_start", "change": "morning_sold" }  // result (end) auto-binds here
      },
      "expectedValueForFixture": 20,                  // self-check: 50 − 30
      "visibility": "find"
    },
    {
      "id": "afternoon_batch",
      "label": { "child": "Muffins in the fresh afternoon batch", "compact": "Afternoon batch", "lowercase": "afternoon batch" },
      "unit": "muffins",
      "value": 24,
      "visibility": "given"
    },
    {
      "id": "closing_total",                          // STEP 2 goal (derived, revealed after)
      "label": { "child": "Muffins on the shelf at closing", "compact": "Closing muffins", "lowercase": "closing muffins" },
      "unit": "muffins",
      "value": null,
      "derived": {
        "formulaId": "part_a_plus_part_b_equals_whole",
        "operands": { "partA": "morning_leftover", "partB": "afternoon_batch" }  // depends on a derived operand — resolves fine
      },
      "expectedValueForFixture": 44,                  // 20 + 24
      "visibility": "revealed_after_step"
    }
  ],

  "steps": [
    {
      "id": "find_morning_leftover",
      "order": 1,
      "prompt": "How many muffins were left after the morning rush?",       // NOT merged — no numbers
      "reasoningPrompt": "Muffins were sold, so did the shelf count go up or down?",
      "relationshipTemplateId": "start_change_end_decrease",                // roles: start, change, end
      "roleToQuantityId": {
        "start": "morning_start",
        "change": "morning_sold",
        "end": "morning_leftover"
      },
      "goalQuantityId": "morning_leftover",
      "preferredEquationFormId": "start_minus_change_equals_end",           // operands: morning_start, morning_sold
      "acceptedEquationFormIds": ["start_minus_change_equals_end"],
      "expectedDirection": "decrease",                                      // = form's directionProduced
      "operatorOptions": ["+", "-", "×", "÷"],
      "backwardCheck": {
        "prompt": "Can you show that the muffins left fit the story?",
        "acceptedEquationFormIds": ["end_plus_change_equals_start"]         // inverse: end + change = start (roles all mapped)
      }
    },
    {
      "id": "find_closing_total",
      "order": 2,
      "prompt": "How many muffins were on the shelf by closing?",
      "reasoningPrompt": "The leftover muffins and the fresh batch are on the shelf together — combine them.",
      "relationshipTemplateId": "part_part_whole",                         // roles: partA, partB, whole
      "roleToQuantityId": {
        "partA": "morning_leftover",
        "partB": "afternoon_batch",
        "whole": "closing_total"
      },
      "goalQuantityId": "closing_total",
      "preferredEquationFormId": "part_a_plus_part_b_equals_whole",         // operands: morning_leftover, afternoon_batch
      "acceptedEquationFormIds": ["part_a_plus_part_b_equals_whole"],
      "expectedDirection": "combine",
      "operatorOptions": ["+", "-", "×", "÷"],
      "backwardCheck": {
        "prompt": "Can you take the batch back out and land on the muffins left?",
        "acceptedEquationFormIds": ["whole_minus_part_b_equals_part_a"]     // whole − partB = partA
      }
    }
  ],

  // ARRAY — one entry per (step × operator). Exactly one "actual" per step.
  "operatorExperiments": [
    // Step 1
    { "stepId": "find_morning_leftover", "operator": "-", "narrativeFit": "actual",
      "alternateWorldTemplate": "This matches the story: {value:morning_sold} muffins left the shelf, so we subtract." },
    { "stepId": "find_morning_leftover", "operator": "+", "narrativeFit": "different_story",
      "alternateWorldTemplate": "Adding would fit a world where {value:morning_sold} more muffins arrived instead of selling." },
    { "stepId": "find_morning_leftover", "operator": "×", "narrativeFit": "different_question" },
    { "stepId": "find_morning_leftover", "operator": "÷", "narrativeFit": "different_question" },
    // Step 2
    { "stepId": "find_closing_total", "operator": "+", "narrativeFit": "actual",
      "alternateWorldTemplate": "This matches the story: the leftover muffins and the fresh batch combine." },
    { "stepId": "find_closing_total", "operator": "-", "narrativeFit": "different_story",
      "shortReaction": "That would empty the shelf, not fill it." },
    { "stepId": "find_closing_total", "operator": "×", "narrativeFit": "different_question" },
    { "stepId": "find_closing_total", "operator": "÷", "narrativeFit": "different_question" }
  ],

  "recap": {
    "headline": "Why the shelf ended with {value:closing_total} muffins",   // field-merged
    "causalChain": [
      "The morning rush sold {value:morning_sold} muffins.",
      "That left {value:morning_leftover} on the shelf.",
      "A fresh batch of {value:afternoon_batch} joined them for {value:closing_total} by closing."
    ],
    "calcFromStepId": "find_morning_leftover",
    "totalVisualStepId": "find_closing_total",
    "dataQuestion": {
      "prompt": "In the part-whole bar, what does the shorter {label:afternoon_batch.compact} part stand for?",
      "correctQuantityId": "afternoon_batch",
      "distractorQuantityIds": ["closing_total", "morning_sold"],
      "correctFeedback": "Right — that part is the fresh batch of {value:afternoon_batch} muffins.",
      "incorrectFeedback": "That part is the fresh batch — {value:afternoon_batch} muffins added in the afternoon."
    }
  }
}
```

Why this passes: unique ids; `morning_leftover` and `closing_total` are `value:null` + derived with matching `expectedValueForFixture`; each step covers all template roles and all referenced-form roles; both preferred forms combine two `muffins` operands (unit-compatible); all 4 operators per step have experiments with exactly one `"actual"`; both backward checks reuse mapped roles and are non-empty; recap ids all exist; every modeled number in merged prose is a token.

---

## 9. Steps to add a new problem

1. **Create the file** under `/Users/franciscoarechiga/dev/StoryMath/storymath-change-engine-starter/data/problems/`, e.g. `corner-bakery-muffin-count.json`. The filename is independent of the pack `id`.
2. **Model it on a fixture** by family — subtraction+part-whole → `nasa-perseverance-wheel-slip.json`; addition (`start_change_end_increase`) → `minnesota-birding.json`; decrease → `puppy-rescue-biscuits.json`; multiplication → `animation-lab-eyebrows.json`.
3. **Loading** — packs enter the app only through `loadProblem` / `loadProblemSpec`, which call `instantiateProblem(spec)`; components read the resulting `InstantiatedProblem`, never your raw JSON.
4. **Smoke-test** — run `validateProblem` on the spec (or load it in-app): `isProblemValid` must return true (zero errors). Fix any `Instantiation failed: …` message, then confirm the derived values match your `expectedValueForFixture`s and the story/recap prose renders numbers (not literal `{tokens}`). Also eyeball the two runtime-only traps validation misses: a real `recap.totalVisualStepId` and a non-empty `backwardCheck.acceptedEquationFormIds`.

---

## 10. Common pitfalls

1. **`operatorExperiments` is an ARRAY**, keyed by `(stepId, operator)` — not a map. One entry per offered operator; exactly one `"actual"` per step.
2. **Use real Unicode `×` (U+00D7) and `÷` (U+00F7)** — ASCII `x`/`*`/`/` will not match.
3. **Derived quantities take `derived`** (with `value: null` by convention — the value is ignored for them); a **non-derived** quantity with `value: null` throws.
4. **`derived.operands` lists only the formula's left/right roles** — never the result role (it auto-binds to the quantity itself).
5. **`roleToQuantityId` must cover the union of the template's roles AND every referenced form's roles** (preferred, accepted, backward), not just the template roles.
6. **`preferredEquationFormId` chooses the two operands** for both the equation and every operator experiment — pick it so the experimented values are the ones you intend.
7. **Unit compatibility is exact string equality** (case-insensitive, trimmed) on the preferred form's two operands. For multiply/divide you may need to give operands the same unit word even when their real dimensions differ (as `animation-lab-eyebrows.json` does).
8. **Only §5's fields are field-merged.** A `{value:…}` in a step prompt, `reasoningPrompt`, `backwardCheck.prompt`, `causalEvent`, or any label renders as literal text — and those fields aren't linted, so a stray literal silently drifts.
9. **`expectedValueForFixture` is a hard assertion, not a fallback** — wrong operands/formula make instantiation throw. It never grades.
10. **`semanticRole` is unvalidated but not inert** — the domain engine (grading/derivation) ignores it, yet the EquationBuilder UI reads it (`accentFor`) to color the operand tile (`bigger`/`smaller`/`difference`/`whole`; else default). The real *wiring* is still `roleToQuantityId` + `derived.operands`.
11. **`backwardCheck.acceptedEquationFormIds` must be non-empty** and **`recap.totalVisualStepId` must be a real step** — both slip past validation but crash at render.
12. **Don't trust `data/problem-schema.json`** — it is stale (see §11).

---

## 11. `data/problem-schema.json` is stale — do NOT author against it

Concrete divergences vs the current TypeScript:

- Requires a top-level **`visualizations`** array that does not exist; **omits** the required `dimension`, `storyChrome`, and `recap`.
- Types **`operatorExperiments` as an object/map** with fields like `hypotheticalTargetQuantityId`, `directionProduced`, `headline`, `explanation`, `worldIfTrue`, `operandQuantityIds` — reality is an **array** of `{stepId, operator, narrativeFit, visualModel?, shortReaction?, alternateWorldTemplate?, groupNoun?}`.
- **`narrativeFit`** enum says `counterfactual`; correct is `"actual" | "different_story" | "different_question"`.
- **`factualStatus`** enum `verified|fictionalized|inspired_by` and required; correct is `"fictionalized" | "inspired_by_real_world" | "realistic"` and **optional**.
- **`story`** requires `brief`/`causalChain`; reality is `briefTemplate` (+ optional `causalEvent`, `closingNoteTemplate`), and `causalChain` lives under `recap`.
- **`label`** requires `semanticChips` (nonexistent); the real optional third field is `lowercase`. `semanticRole` is optional (schema marks it required).
- **`quantity.value`** typed required `number`; reality is `number | null`, and `derived` / `expectedValueForFixture` / `allowLiteralNumbers` are missing from the schema.
- **`backwardCheck`** requires a `required` boolean; no such field exists.
- **`expectedDirection`** enum omits `same`/`unknown`, which the TS `DirectionKind` includes.

Author against the TypeScript interfaces and a working fixture, and validate with `validateProblem`.