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
