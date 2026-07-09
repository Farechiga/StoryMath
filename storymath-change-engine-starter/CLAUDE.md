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

## Child-facing UI and copy rules

The child UI must stay radically minimal (Tufte: never add a box or line that isn't
necessary). Treat these as hard constraints for every story, not one-off cleanups:

- **Surface follows action.** The page is the canvas. Do **not** wrap static reading
  content (story, headings, status text) in cards, boxes, or pills. Only interactive
  objects — quantity tiles, drop slots, operator buttons, primary actions, typed inputs —
  may carry a boundary or background. Reach for typography, whitespace, alignment, and thin
  dividers before any border/box.
- **Say each thing once.** Show the story once, the task once, the relationship once. Never
  repeat a fact across title + story + badge + card label + feedback.
- **No AI-style narration.** Delete generic motivational/explanatory prose that announces
  what the interaction already shows (e.g. "Let's build it and see", "You can always
  revise", "Experimenting is good thinking", "runs far past this scale"). Do not show
  category labels like "A Different Question". If a phrase can be removed without impairing
  the child's next action, remove it.
- **One question per page.** Never make the child hold two unknowns at once. Do not mention
  a later step's unknown until the current step is complete.
- **Concrete over abstract labels.** Default equation slots to the quantity's own name
  ("Monday distance / 384 m"), not "BIGGER AMOUNT". Role labels may appear only as small,
  optional hints.
- **Every child-facing sentence comes from a curated story field or a small, intentional
  preview template** — never concatenated from metadata just because it exists.
- **Fictionalization** is marked in the problem title ("Imaginary mission: …"); do not add a
  separate disclaimer pill to the child flow. Keep `factualStatus` / `curiosityNote` as
  author metadata only.
- **Visualization: choose the right model, never a misleading scale.** Additive comparisons
  use aligned linear bars; multiplication uses a repeated-groups model; division uses an
  equal-sharing/equal-groups model. Never normalize two very different values into similar
  bars, and never silently truncate or annotate a broken scale with prose.
- Preserve calm typography, whitespace, native HTML/CSS/inline SVG (no chart libs), mobile
  responsiveness, keyboard accessibility, and tap-to-place as a first-class interaction.
