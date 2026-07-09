# Implementation Notes — StoryMath Change Engine (Vertical Slice)

This is the first playable slice of the Change Engine, built around the canonical
problem `data/problems/nasa-perseverance-wheel-slip.json`. It proves the core loop:

> story → predict → build a model → test an operator → reconcile with the story →
> solve → check backward → read the bar model.

All content lives in JSON; the UI carries **no** story-specific conditionals.

---

## How to run

```bash
cd storymath-change-engine-starter
npm install
npm run dev        # start Vite dev server (prints a localhost URL)
```

Other scripts:

```bash
npm run build      # type-check (tsc -b) + production build to dist/
npm run typecheck  # types only
npm test           # run the full Vitest suite (domain + state + UI)
```

Requires Node 18+ (developed on Node 22). No accounts, database, network, or AI
calls — it runs fully local.

---

## Files created

**Tooling / scaffold**
- `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `.gitignore`

**Domain engine** (framework-independent, no React) — `src/domain/`
- `types.ts` — all domain + catalog + evaluation types
- `calculate.ts` — the four operators, number formatting, unit compatibility
- `relationships.ts` — loads the shared relationship catalog, form lookups
- `loadProblem.ts` — loads the JSON instance; **`bindRolesToQuantities`** maps
  abstract roles (`bigger`, `partA`, `whole`, …) to concrete quantity ids generically
- `operatorExperiment.ts` — selects the authored operator pack by `(stepId, operator)`
- `evaluateEquation.ts` — separates *semantic match* from *operator-fits-story* from
  *arithmetic correctness*
- `backwardCheck.ts` — builds interactive inverse-check frames from the catalog
- `validateProblem.ts` — structural + pedagogical validation (docs/02 §9)
- `index.ts` — public barrel

**UI state machine** — `src/state/gameMachine.ts`
- Explicit `GamePhase` union + reducer; ephemeral per-step memory reset on advance

**Components** — `src/components/`
- `PearlBackground.tsx`, `BrandMark.tsx`, `Panel.tsx`
- `QuantityCard.tsx`, `EquationBuilder.tsx`, `OperatorPicker` (inside EquationBuilder)
- `OperatorExperimentPanel.tsx`, `PreviewBars.tsx`
- `BarModel.tsx` (comparison + part-whole, inline SVG), `BarFigure.tsx`
- `BackwardCheckBuilder.tsx`, `labels.ts` (presentation-only vocabulary)

**App + styles**
- `src/App.tsx` — orchestrates every stage through the state machine
- `src/main.tsx`
- `src/styles/tokens.css`, `global.css` (incl. the pearlescent background), `components.css`

**Tests** — `tests/`
- `domain/calculate.test.ts`, `operatorExperiment.test.ts`, `evaluateEquation.test.ts`,
  `backwardCheck.test.ts`, `validateProblem.test.ts`
- `state/gameMachine.test.ts`
- `ui/app.test.tsx` — drives the whole NASA problem through the real UI

---

## What is complete

Both required steps of the reference problem play end to end (Milestones 1 **and** 2):

- ✅ Mission brief, marked **fictionalized / inspired**, not a factual mission log
- ✅ Direction prediction (Farther / Shorter / The same / I’m not sure), as a nudge — never a grade
- ✅ Semantic quantity cards (child label + unit + semantic chips), canonical id as source of truth
- ✅ One guided equation frame at a time: `[quantity] [operator] [quantity] = [quantity]`
- ✅ Click/tap card placement (no drag dependency); keyboard-operable buttons
- ✅ Child chooses `+ − × ÷`; the operator is never auto-filled
- ✅ Immediate numerical result + bar preview for every attempted operator
- ✅ Content-defined counterfactual / “different question” worlds for non-matching operators —
  the word “wrong” never appears in the child UI
- ✅ Correct subtraction route → typed answer (256), model separated from arithmetic
- ✅ Comparison bar model and part-part-whole (total) bar model, inline SVG, shared scale
- ✅ Interactive backward checks: `256 + 128 = 384` (step 1) and `640 − 256/384` (step 2)
- ✅ Second step (part-part-whole total) with its own experiment + backward check
- ✅ Causal recap + one light data-literacy (bar-reading) question
- ✅ Generic domain module; **no `problem.id ===` branching in any component**
- ✅ Unit tests for arithmetic, experiment selection, equation evaluation, backward-check
  construction, validation, state transitions, and a full UI playthrough (42 tests)
- ✅ JSON schema-shaped validation (`validateProblem`) available and tested

**Design.** A calm, sophisticated tech/math aesthetic on a dynamic pearlescent
chromatic-white field (drifting `#F7FAFD / #FBFBFE / #F8FDFC`-range auroras), frosted-glass
panels, tabular monospace numerals for equations/values, generous white space, and a
restrained categorical palette for the bars (indigo / teal / amber / violet). The
background animation respects `prefers-reduced-motion`.

---

## What remains (toward later milestones)

- **Drag-and-drop** placement as a second input path (click/tap works today).
- **Free operand ordering with nudges.** Today a tapped card is routed to its correct
  semantic slot, so arrangement is always canonical; a future pass can let a child place a
  card in either slot and gently nudge on a reversed non-commutative arrangement. The
  engine already distinguishes this (`evaluateEquation.semanticMatch`).
- **Optional helper tools:** scratchpad, place-value blocks, read-aloud (Stage 5 extras).
- **Detective Note** (unscored free-text reasoning) capture.
- **Parameter generation:** deterministic instance generator from numeric constraints
  (docs/02 §4) — the static instance works first, as instructed.
- **More story worlds** (Milestone 4) to prove content-only scaling.
- **JSON-Schema enforcement** wired to `data/problem-schema.json` at load time (a
  hand-written structural/pedagogical validator exists in `validateProblem.ts`).

---

## Design decisions that may want owner input

1. **Per-step backward check placement.** The check runs immediately after each step is
   solved (matching the per-step `backwardCheck` in the JSON and the kickoff loop), rather
   than deferring step 1’s check until after step 2 as docs/03 Stage 8 sketches. This keeps
   each step’s reasoning self-contained. Easy to reorder if you prefer the deferred flow.
2. **Guided slot routing.** For a first slice we route a tapped card to its semantic slot so
   the built equation is always canonical (keeps the counterfactual numbers matching the
   authored text). If you want placement itself to be a graded decision, we can switch to
   free placement + nudges (the engine already supports it).
3. **Step-2 direction prediction options.** Comparison steps offer Farther/Shorter/Same;
   combine steps offer Combine/Compare/Share. These option sets are derived from the step’s
   `expectedDirection` (generic), not authored per story — confirm the wording works for you.
4. **Data-literacy recap question** is constructed generically from the quantities’ roles
   (difference vs whole vs bigger) rather than authored in JSON. If you’d like authored
   distractors per story, add them to the schema.
5. **No routing/build tooling beyond Vite.** Single-page, no router; sufficient for the slice.
