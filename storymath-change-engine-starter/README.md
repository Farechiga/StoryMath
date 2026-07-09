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
