# Problem-pack authoring checklist

Every new pack under `data/problems/` must satisfy these rules before it ships.
`validateProblem` and the governance suites (`tests/governance/`) enforce most of
them — run `npm test` and `npm run build` before considering a pack complete.

## Numbers and story nouns

1. **Every modeled number in child-facing prose comes from a field-merge token**
   (`{quantity:id}`, `{value:id}`), never a bare literal that can drift.
2. **Every field-merged quantity preserves the story-specific noun.** A quantity
   carries a generic `unit` (used only for arithmetic unit-compatibility) plus
   optional `unitSingular` / `unitPlural` display nouns. When the story noun is
   more specific than the unit, set the display nouns so the prose reads right:

   ```jsonc
   { "id": "morning_chickadee_calls", "unit": "calls",
     "unitSingular": "chickadee call", "unitPlural": "chickadee calls", "value": 78 }
   ```

   `{quantity:morning_chickadee_calls}` then renders **"78 chickadee calls"**, not
   "78 calls".
3. **Do not rely on the generic dimension unit when the story noun is more
   specific.** If the story says chickadee calls, nuthatch taps, rocket cookies,
   chocolate biscuits, bucket stools, or close-up photos, the rendered text must
   say that. A subtotal may be "chickadee calls" while the final total is "bird
   sounds" — these are different semantic quantities; do not force one generic
   unit onto all of them.
4. **Do not echo a quantity's noun as a literal right after its token.** Once
   `{quantity:x}` renders "… calls", writing `{quantity:x} calls` produces
   "… calls calls". Drop the trailing literal noun.
5. **Step prompts and reasoning prompts use the same story-specific nouns as the
   story**, and never give away the answer's direction ("How did the technique
   change the distance?" not "…so it was farther, shorter, or the same?").
6. **No em dashes in child-facing math text** — they read as a minus sign. Use
   commas or periods.

## Structure and flow

7. **Each step has exactly one** prompt, one reasoning prompt, one goal quantity,
   one preferred equation form, and one backward check. Actual solution steps use
   addition / subtraction only.
8. **Offer `["+", "-", "×", "÷"]`** so the counterfactual operator experiments can
   render, with **exactly one `actual`** experiment per step and one experiment
   per offered operator.
9. **There is no relationship-choice stage.** The flow is: brief → concrete step
   question → builder + operator experiment → solve → optional backward check →
   next step → recap. Never author vague relationship-category labels like
   "combine them", "compare them", or "repeat them".
10. **Derived quantities use a `derived` formula spec** plus
    `expectedValueForFixture`; values are computed, never hand-typed.

## Before you ship

11. `npm test` passes — including `tests/governance/storyNoun.test.ts` (story-noun
    preservation) and `tests/governance/copyGovernance.test.ts` (no chrome/filler).
12. `npm run build` typechecks and builds.
