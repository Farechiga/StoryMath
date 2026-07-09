# StoryMath

A model-building math game for causal, multi-step word problems. StoryMath is not a
worksheet with themes: the child reads a causal story, predicts whether a quantity
grows or shrinks, builds the relationship from named quantity cards, **chooses the
operator**, sees what that operator does numerically and visually, decides whether the
new world matches the story, then solves and verifies with a backward (inverse) check.

Solving problems recruits a **project team** of stickers; a full team of five unlocks a
**ProjectSpace** builder where the child places their team in a room and saves a sticker
book.

## Run it

The app is a Vite + React + TypeScript project in
[`storymath-change-engine-starter/`](storymath-change-engine-starter/):

```bash
cd storymath-change-engine-starter
npm install
npm run dev        # http://localhost:5173
npm test           # vitest (unit + component)
npm run build      # typecheck + production build
```

Dev routes: `/` is the game; `/#ornament` opens the cube-ornament gallery.

## Repository layout

```
.
├── storymath-change-engine-starter/   # the app
│   ├── src/                           # engine (domain/, model/), UI components,
│   │   │                              #   ornament system, reward/sticker studio
│   │   └── assets/                    # bundled sticker + room art
│   ├── data/problems/                 # story-pack JSON (one file per word problem)
│   └── tests/                         # vitest suites (model, domain, ui, studio, ornament)
└── StoryMathLogo.png                  # brand mark
```

## How a problem pack works

Every word problem is a JSON `ProblemSpec` under `data/problems/`. The engine computes
all derived values by formula and field-merges story prose from tokens (`{quantity:id}`,
`{value:id}`, `{label:id}`), so a pack can change numbers or swap its entire scenario
with **zero component edits**. `src/model/relationshipRegistry.ts` is the source of truth
for relationship families and equation forms, and the existing files under `data/problems/`
are worked examples to copy.

## Tech

React 18, TypeScript (strict), Vite 5, Vitest. All visuals are native inline SVG or
CSS — no chart library.
