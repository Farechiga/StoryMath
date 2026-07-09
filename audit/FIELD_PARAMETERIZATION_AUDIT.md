# StoryMath — Field-by-Field Parameterization Audit

_Generated from a source-level audit of the running app (every page inspected against the actual component code + problem JSON). One row per visible field._

## Objective

Now that the one canonical word problem is ironed out end-to-end, this document lists **every field on every page**: (a) what is written/shown, (b) the element type, (c) whether it is **parameterized**, **templated (generated)**, or **hardcoded**. The target state: once the concrete story context + values are supplied, *nearly everything* is expressed as clean formulaic relationships, so **the numbers can change and the entire scenario can be swapped** with no wording or modeled relationship breaking.

### Source classification

| Badge | Meaning | Swap behavior |
|---|---|---|
| 🟢 **param** | Value/text comes straight from the problem JSON | Swapping the JSON changes it |
| 🔵 **template** | A component computes it generically from data (formula / field-merge / role-keyed) | Adapts to any story, no code edit |
| ⚪ **hardcoded** | A static string/literal baked into a component | Needs a code edit to change |

### Swap-safety

`✅` survives a scenario/number swap · `⚠️ risky` works now but embeds an assumption (a unit, a day, a domain noun, a sign, a cap) · `❌ breaks` would read wrong or desync on swap and must be parameterized.

## Headline numbers

- **205 fields** audited across 13 pages + the data layer.
- Source mix: **🟢 88 parameterized · 🔵 78 templated · ⚪ 39 hardcoded**.
- Swap-safety: **✅ 165 safe · ⚠️ 28 risky · ❌ 12 would break** → **40 fields need attention** before the app is truly scenario-swappable.

> **Verdict:** the *interaction and modeled relationships* are already generic — operators, bar models, backward checks, and the equation engine all read from roles + values, not story ids. The gap to "swap the scenario, change the numbers, nothing breaks" is concentrated in **five themes** below. None require re-architecting; they are content-field extractions plus two real swap-bugs.

## What still needs parameterizing — the 5 themes

### ① Derived values are stored as literals (highest priority — silent desync)

`tuesday_distance = 256` and `two_day_total = 640` are hand-entered in the JSON, not computed. The engine **grades the child against these stored literals** (`evaluateEquation` compares the typed answer to `goal.value`). So if an author changes `monday_distance` (384) or `tuesday_difference` (128), the derived `256`/`640` silently go stale — the story, the bars, and the *correct answer* all disagree, with no error.

**Fix:** give derived quantities a formula (`derivedFrom: "monday_distance - tuesday_difference"`) and compute them at load in `loadProblem`/`instantiateProblem`; keep `validateProblem` asserting `computed === stored`. This is the single change that makes *numbers* swappable.

### ② Operator-experiment prose bakes the arithmetic and units (all 8 packs)

Every `operatorExperiments.*.explanation` hardcodes its own equation string (e.g. `"384 + 128 = 512"`, `"384 × 128 = 49,152"`) — duplicating the number the engine already computes from `operandValues`, and even duplicating the comma **format** (`49,152` vs engine `49152`). `worldIfTrue` bakes numbers, the unit `meter`, and domain nouns. A number/unit swap desyncs the prose from the engine.

**Fix:** the panel already renders the equation line from `operandValues` + a shared formatter, so the authored `explanation`/`headline` are effectively **dead fields** that only invite drift — drop them, or template them. For `worldIfTrue` (still shown), field-merge the operands/unit/group-noun from data instead of literal numbers.

### ③ Story text repeats values that live in the quantities

`story.brief` writes `384`, `128`, and `meters` into prose that is decoupled from `quantities[].value`. Same pattern in the recap total-bar caption. Changing a value leaves the narrative contradicting the model.

**Fix:** author the brief/captions as small field-merge templates (`"…drove {monday_distance} {unit} on Monday…"`) resolved against the quantities, or add a validation lint that flags value literals in prose.

### ④ Domain vocabulary is hardcoded in generic chrome

Several strings assume a *space-mission/distance* theme and would misread for a bakery / savings / weather swap: the brief eyebrow **"Imaginary Mission Brief"**, **"Start the investigation"**, **"Finish the mission"**, the ×-model key **"(one drive)"** and its aria noun **"drive"**, the reaction **"That's a huge jump!"**, and the direction labels **"Farther" / "Shorter"** in `labels.ts` (which then propagate into the prediction echo and the prediction-outcome sentence).

**Fix:** (a) parameterize a small set of theme nouns from `metadata.theme` / new `story.*Label` fields (eyebrow, start CTA, finish CTA, group noun); (b) make the direction labels **dimension-aware** — derive increase/decrease words from the goal quantity (or a `directionLabels` map), or fall back to neutral **More / Less / The same**. This one change fixes ~6 propagated fields at once.

### ⑤ The causal recap is wired to *this* relationship family

The recap's derived calc node hardcodes the `−` operator and the `bigger/difference` roles; the data-literacy question's correct answer + distractors are hardwired to `difference` vs `whole/bigger`; and the feedback sentences assume two-bar comparison geometry ("the gap between the two bars"). A part-whole or start-change-end scenario would show a wrong sign, a wrong answer key, or a nonsensical explanation.

**Fix:** move the recap question, options (with a `correctRole`), and feedback frames into JSON (`story.recap*` already exists for the heading/question — extend it), and derive the calc node from the actual completed step rather than fixed roles.

### ⚠️ Two real swap-bugs to fix regardless (surface on step 2 / any subtraction backward check)

- **BackwardBar subtraction branch** (`BackwardBar.tsx`): the teal segment is `resultValue` but the caption is always `leftCaption` (the whole), so step 2's check renders a number/label contradiction; and the aria reads *"256 with 384 meters taken away"* (the real reduced amount is the whole = 640). Base the caption/aria on the segment's own quantity.
- **`PLACE_NAMES` capped at 5** (`StackedArithmetic.tsx`): 6-digit+ answers degrade the place aria to "place 5". Generate place names arithmetically.

## Full field inventory

### Header — masthead

_5 fields — 🟢 0 · 🔵 1 · ⚪ 4  ·  ✅ 5 / ⚠️ 0 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Brand logo mark** | (inline SVG: rising curve resolving into a delta glyph; aria-label "StoryMath") | logo / SVG icon-marker | ⚪ hardcoded | ✅ | `src/components/BrandMark.tsx:2-36 (rendered at src/App.tsx:277)` — *ok* |
| **Product brand title** | StoryMath | brand label | ⚪ hardcoded | ✅ | `src/App.tsx:278` — *ok* |
| **Progress region aria-label** | Progress | aria-label (a11y chrome) | ⚪ hardcoded | ✅ | `src/App.tsx:280` — *ok* |
| **Progress step fraction** | 1/2 | progress value | 🔵 template | ✅ | `src/App.tsx:281 (computed from state.currentStepIndex / state.stepCount, which derive from problem.steps.length)` — *ok* |
| **Progress caption text** | model the problem | chrome label | ⚪ hardcoded | ✅ | `src/App.tsx:281` — *ok* |

### Stage 0 — Mission Brief

_4 fields — 🟢 1 · 🔵 0 · ⚪ 3  ·  ✅ 2 / ⚠️ 2 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Eyebrow section number** | 00 | eyebrow number | ⚪ hardcoded | ✅ | `src/App.tsx:304` — *ok* |
| **Eyebrow label text** | Imaginary Mission Brief | eyebrow text | ⚪ hardcoded | ⚠️ risky | `src/App.tsx:304`<br/>"Mission" is a NASA/space-domain word that reads wrong for a non-mission scenario (bakery, savings, weather). The "Imaginary" fictionalization marker is generic, but the noun is not. Parameterize the eyebrow, e.g. a story.briefEyebrow field, or derive "Imaginary {metadata.theme} Brief" from JSON metadata.theme so a swap updates it. |
| **Story brief paragraph** | NASA’s Mars rover Perseverance was mapping pale layers of rock near an ancient Martian river delta. It drove 384 meters on Monday. Overnight, one wheel slipped into soft sand, so on Tuesday it drove 128 fewer meters while engineers chose a safer path. | body sentence (story prose) | 🟢 param | ✅ | `src/App.tsx:306 → JSON story.brief (data/problems/nasa-perseverance-wheel-slip.json:17)` — *ok* |
| **Primary start button** | Start the investigation | button label | ⚪ hardcoded | ⚠️ risky | `src/App.tsx:309-311`<br/>"investigation" is a science/mystery domain word that can read wrong for other scenarios (e.g. a cookie-sharing or shopping story). Either parameterize (story.startLabel) or use a neutral CTA like "Start" / "Begin". |

### Stage 1 — Direction prediction

_12 fields — 🟢 3 · 🔵 7 · ⚪ 2  ·  ✅ 9 / ⚠️ 3 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Step heading prefix + separator** | Step {…}: | heading chrome label | ⚪ hardcoded | ✅ | `src/App.tsx:132-133` — *ok* |
| **Step order number** | 1 | step number value | 🟢 param | ✅ | `src/App.tsx:133 → JSON steps[0].order (…json:95)` — *ok* |
| **Step prompt** | How far did Perseverance travel on Tuesday? | heading (question) | 🟢 param | ✅ | `src/App.tsx:133 → JSON steps[0].prompt (…json:114)` — *ok* |
| **Reasoning prompt heading** | After the wheel slipped, how did Tuesday’s distance change? | prompt heading | 🟢 param | ✅ | `src/App.tsx:330 → JSON steps[0].reasoningPrompt (…json:115), falls back to steps[].prompt` — *ok* |
| **Prediction choice option A** | ↑ Farther | choice button (glyph + label) | 🔵 template | ⚠️ risky | `src/components/labels.ts:26 (option set chosen by directionOptionsFor(step.expectedDirection); rendered src/App.tsx:332-343)`<br/>"Farther" is a distance-domain word baked into labels.ts; it reads wrong for a temperature/money/count story (should be "Warmer", "More", etc.). The glyph ↑ is fine. Parameterize the increase/decrease labels per the goal quantity's dimension (e.g. from quantity.unit or a story-provided directionLabels map), or make them dimension-neutral ("More"/"Less"/"Same"). |
| **Prediction choice option B** | ↓ Shorter | choice button (glyph + label) | 🔵 template | ⚠️ risky | `src/components/labels.ts:27 (rendered src/App.tsx:332-343)`<br/>Same issue as "Farther": "Shorter" is a distance-specific word hardcoded in labels.ts (comparisonFamily) and would read wrong on a non-distance swap. Fix by parameterizing direction labels per quantity dimension or using neutral "Less". |
| **Prediction choice option C** | = The same | choice button (glyph + label) | 🔵 template | ✅ | `src/components/labels.ts:28 (rendered src/App.tsx:332-343)` — *ok* |
| **Prediction choice option A (combine family)** | ⊕ Combine them | choice button (glyph + label) | 🔵 template | ✅ | `src/components/labels.ts:21 (rendered on step 2's direction-prediction pass, src/App.tsx:332-343)` — *ok* |
| **Prediction choice option B (combine family)** | ⇄ Compare them | choice button (glyph + label) | 🔵 template | ✅ | `src/components/labels.ts:22 (rendered on step 2, src/App.tsx:332-343)` — *ok* |
| **Prediction choice option C (combine family)** | × Repeat them | choice button (glyph + label) | 🔵 template | ✅ | `src/components/labels.ts:23 (rendered on step 2, src/App.tsx:332-343)` — *ok* |
| **Prediction echo prefix** | Your prediction: | status sentence chrome | ⚪ hardcoded | ✅ | `src/App.tsx:354-355` — *ok* |
| **Prediction echo value (child's choice)** | shorter | status value (merged label, lowercased) | 🔵 template | ⚠️ risky | `src/App.tsx:355 (chosen.label.toLowerCase(); label from src/components/labels.ts)`<br/>The merge mechanism is generic, but the value inherits the distance-word label from labels.ts ("shorter"/"farther"), so it reads wrong on a non-distance swap. Fixed by parameterizing the direction labels (see options 14/15). |

### Stage 2–3 — Equation builder

_14 fields — 🟢 6 · 🔵 4 · ⚪ 4  ·  ✅ 14 / ⚠️ 0 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Eqline group aria-label** | The relationship you are testing | aria-label | ⚪ hardcoded | ✅ | `EquationBuilder.tsx:52`<br/>Generic accessibility chrome; survives any scenario/number swap. No change. |
| **Left tile name** | Monday distance | tile label | 🟢 param | ✅ | `quantities[0].label.compact (rendered EquationBuilder.tsx:22)` — *ok* |
| **Left tile value + unit** | 384 meters | value | 🟢 param | ✅ | `quantities[0].value + quantities[0].unit (EquationBuilder.tsx:24-25)` — *ok* |
| **Operator slot (placeholder / chosen glyph)** | ▁ (empty) → e.g. − | marker | 🔵 template | ✅ | `EquationBuilder.tsx:54-56`<br/>Chosen glyph is parameterized from step.operatorOptions; the ▁ underscore placeholder is a generic empty-slot marker. No change. |
| **Right tile name** | Tuesday was shorter by | tile label | 🟢 param | ✅ | `quantities[1].label.compact (EquationBuilder.tsx:22)` — *ok* |
| **Right tile value + unit** | 128 meters | value | 🟢 param | ✅ | `quantities[1].value + unit (EquationBuilder.tsx:24-25)` — *ok* |
| **Equals sign** | = | math chrome | ⚪ hardcoded | ✅ | `EquationBuilder.tsx:58`<br/>Universal arithmetic symbol; aria-hidden. No change. |
| **Target tile name** | Tuesday distance | tile label | 🟢 param | ✅ | `quantities[2].label.compact (EquationBuilder.tsx:22)` — *ok* |
| **Target tile value (unknown) + unit** | ? meters | unknown placeholder | 🔵 template | ✅ | `EquationBuilder.tsx:24 (unknown prop) + line 26 unit`<br/>'?' is the template's generic unknown marker; unit is parameterized. No change. |
| **Operator-picker group aria-label** | Choose an operation to try | aria-label | ⚪ hardcoded | ✅ | `EquationBuilder.tsx:62`<br/>Story-agnostic math chrome. No change. |
| **Operator button labels** | +  −  ×  ÷ | button | 🟢 param | ✅ | `step.operatorOptions (rendered EquationBuilder.tsx:81)` — *ok* |
| **Operator button aria-label** | Try + (Try −, Try ×, Try ÷) | aria-label | 🔵 template | ✅ | `EquationBuilder.tsx:78`<br/>Template 'Try ${op}' merges the parameterized operator glyph; generic. No change. |
| **Tried-operator marker** | (no text — dimmed op-btn--tried visual state) | icon/marker | 🔵 template | ✅ | `EquationBuilder.tsx:67 (class from triedOperators)`<br/>Pure interaction-state styling driven by data; no wording. No change. |
| **Empty-state hint line** | Choose an operation to see what it does. | hint | ⚪ hardcoded | ✅ | `EquationBuilder.tsx:87`<br/>Generic instruction using the math-neutral word 'operation'; survives any story. No change. |

### Stage 4 — Operator experiment

_23 fields — 🟢 5 · 🔵 14 · ⚪ 4  ·  ✅ 18 / ⚠️ 5 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Calc equation line** | 384 + 128 = 512 meters   (fitting op hides result: 384 − 128 = ?) | generated equation | 🔵 template | ✅ | `OperatorExperimentPanel.tsx:85-89`<br/>Assembled generically from operandValues, operator, computed, and parameterized unit; fitsStory hides the answer. Fully swap-safe. |
| **Reaction — increase/decrease** | That’s bigger.  /  That’s smaller. | reaction | 🔵 template | ✅ | `OperatorExperimentPanel.tsx:17-23,54 (keyed on directionProduced)`<br/>String selected by the JSON-provided directionProduced; magnitude words are story-agnostic. No change. |
| **Reaction — scale (×)** | That’s a huge jump! | reaction | 🔵 template | ⚠️ risky | `OperatorExperimentPanel.tsx:21 (REACTION.scale)`<br/>'huge jump' assumes a large multiplier; a ×1.5 or ×2 scenario would overstate. Make it neutral/magnitude-aware (e.g. 'That’s much bigger.') or add a per-experiment short-reaction field in operatorExperiments to override it. |
| **Reaction — split (÷)** | That’s split into parts. | reaction | 🔵 template | ✅ | `OperatorExperimentPanel.tsx:22 (REACTION.split)`<br/>Generic description of division for any scenario. No change. |
| **Reaction — combine** | That’s the two-day total. | reaction | 🔵 template | ⚠️ risky | `OperatorExperimentPanel.tsx:51-54 (That’s the ${attemptedLabel.toLowerCase()}.)`<br/>Forced .toLowerCase() on the target label breaks proper nouns — a label like 'Saturday total' or 'Denver haul' would render 'saturday'/'denver'. Use the authored label case as-is, or add a curated lowercase short-name field (e.g. label.derivedName) on the quantity. |
| **World-if-true sentence** | A farther Tuesday could fit a different mission: perhaps Perseverance found smoother ground or had more available battery power. But this story says the wheel slipped and Tuesday was shorter. | body sentence | 🟢 param | ✅ | `operatorExperiments[key].worldIfTrue (rendered OperatorExperimentPanel.tsx:93)` — *ok* |
| **Primary action (fitting op)** | This fits — let’s solve it | button | ⚪ hardcoded | ✅ | `OperatorExperimentPanel.tsx:99`<br/>Generic affirming CTA independent of story/numbers. No change. |
| **Secondary action (fitting op)** | Try a different operation | button | ⚪ hardcoded | ✅ | `OperatorExperimentPanel.tsx:102`<br/>Generic navigation label. No change. |
| **Primary action (non-fitting op)** | Try another operation | button | ⚪ hardcoded | ✅ | `OperatorExperimentPanel.tsx:107`<br/>Generic navigation label. No change. |
| **Groups model aria-label** | 128 blocks, each one 384 meters drive, totalling 49152 meters. | aria-label | 🔵 template | ⚠️ risky | `RepeatedGroupsModel.tsx:28`<br/>Embeds the domain word 'drive' (and interpolates RAW numbers, so it says 49152 while the visible total shows 49,152). Parameterize the group noun (e.g. a groupNoun field on the problem/experiment or the group quantity's label) and wrap the numbers in formatNumber for consistency. |
| **Group key swatch** | (colored unit square — no text) | icon/marker | ⚪ hardcoded | ✅ | `RepeatedGroupsModel.tsx:31`<br/>Generic legend swatch for the block unit. No change. |
| **Group key text** | = 384 meters (one drive) | caption | 🔵 template | ⚠️ risky | `RepeatedGroupsModel.tsx:32-34`<br/>Value and unit are parameterized but '(one drive)' is a hardcoded domain word that reads wrong for non-driving scenarios. Replace with a per-problem group noun (e.g. `(one ${groupNoun})`) sourced from JSON. |
| **Block grid** | (up to 300 colored square blocks; here 128) | svg/marker grid | 🔵 template | ✅ | `RepeatedGroupsModel.tsx:8,37-40 (MAX_BLOCKS=300)`<br/>Count is data-driven and overflow degrades gracefully via '+N more'. Low-risk, but MAX_BLOCKS=300 is an arbitrary literal — consider deriving the cap from layout/viewport rather than a magic number. |
| **Grid overflow marker** | +48,852 more (only when groupCount > 300) | caption | 🔵 template | ✅ | `RepeatedGroupsModel.tsx:41`<br/>Generic overflow template on the parameterized remainder. No change. |
| **Groups total line** | 128 blocks = 49,152 meters | caption | 🔵 template | ✅ | `RepeatedGroupsModel.tsx:44-46`<br/>'blocks' is generic model vocabulary; count, total, and unit are parameterized/derived. No change. |
| **Screen-reader bar summary** | Monday distance is 384 meters; Tuesday distance would be 512 meters. | visually-hidden text | 🔵 template | ✅ | `PreviewBars.tsx:30-33`<br/>Field-merge template over parameterized labels/values/unit; generic. No change. |
| **Reference bar name** | Monday distance | label | 🟢 param | ✅ | `PreviewBars.tsx:36 (referenceLabel)` — *ok* |
| **Reference bar fill** | (bar, width = refPct%, color var(--q-bigger)) | svg bar | 🔵 template | ⚠️ risky | `PreviewBars.tsx:37-39`<br/>Width is data-driven, but the fill color is hardcoded var(--q-bigger), which visually asserts the reference is the 'bigger' quantity. If a swapped scenario's reference isn't the bigger role this mislabels it. Color by the reference quantity's semanticRole via a role→color map (mirror EquationBuilder's ROLE_ACCENT) instead of the fixed --q-bigger. |
| **Reference bar number** | 384 | value | 🟢 param | ✅ | `PreviewBars.tsx:40 (referenceValue)` — *ok* |
| **Attempted bar name** | Tuesday distance | label | 🟢 param | ✅ | `PreviewBars.tsx:43 (attemptedLabel)` — *ok* |
| **Attempted bar fill** | (bar, width = attPct%, color var(--q-smaller) if decreased else var(--q-whole)) | svg bar | 🔵 template | ✅ | `PreviewBars.tsx:45-48`<br/>Color is chosen generically from whether the value decreased vs. the reference; no story assumption. No change. |
| **Removed-amount gap** | −128 (dark dotted gap, only when attemptedValue < referenceValue) | svg caption/marker | 🔵 template | ✅ | `PreviewBars.tsx:49-56`<br/>Signed difference computed generically (gap = reference − attempted). No change. |
| **Attempted bar number** | 512 | value | 🟢 param | ✅ | `PreviewBars.tsx:58 (attemptedValue / result.computed)` — *ok* |

### Stage 5 — Solve (column arithmetic)

_16 fields — 🟢 4 · 🔵 9 · ⚪ 3  ·  ✅ 12 / ⚠️ 4 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Step question heading** | Step 1: How far did Perseverance travel on Tuesday? | heading | 🟢 param | ✅ | `src/App.tsx:131-133 (prompt = data/problems/...json steps[0].prompt); order = steps[0].order` — *ok* |
| **Column-arithmetic grid accessible name (role=group aria-label)** | 384 - 128 | svg-aria/aria-label | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:90 (${left} ${operator} ${right})` — *ok* |
| **Regroup/carry row gutter label** | regroup | label | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:92` — *ok* |
| **Regroup input fields (one per place column) + accessible name** | (empty inputs) aria: "Regroup, hundreds place" / "...tens place" / "...ones place" | input | 🔵 template | ⚠️ risky | `src/components/StackedArithmetic.tsx:93-103, placeName() 22-25, PLACE_NAMES 13`<br/>PLACE_NAMES is capped at 5 names (ones…ten-thousands); a scenario swapped to 6+ digit numbers falls back to the aria text "place 5". Generate place names arithmetically or extend PLACE_NAMES so larger-number stories read correctly. |
| **Top operand digits (minuend)** | 3  8  4 | number | 🟢 param | ✅ | `src/components/StackedArithmetic.tsx:108-122 (left = monday_distance.value); JSON quantities[0].value=384` — *ok* |
| **Borrow boxes (left of each top digit, subtraction only) + accessible name** | (empty inputs) aria: "Borrow into hundreds place" / "...tens place" / "...ones place" | input | 🔵 template | ⚠️ risky | `src/components/StackedArithmetic.tsx:66,110-119`<br/>Correctly gated to subtraction (showBorrow), but the aria place names share the PLACE_NAMES 5-place cap (see entry 4). Fix place-name generation for large-number swaps. |
| **Strikethrough on a top digit once its regroup box is filled** | (visual — struck-through digit, no text) | marker | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:120 (colsum__digit--struck when subtraction && regroup[i])` — *ok* |
| **Operator glyph gutter (between operands)** | - | label | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:125 (operator from accepted state.selectedOperator; Operator type types.ts:11)`<br/>Minor: renders the ASCII hyphen "-" (JSON operatorOptions use "-"), whereas the bar model uses the true minus "−" (U+2212). Optionally normalize the minus glyph for visual consistency; not a swap breaker. |
| **Bottom operand digits (subtrahend)** | 1  2  8 | number | 🟢 param | ✅ | `src/components/StackedArithmetic.tsx:126-128 (right = tuesday_difference.value); JSON quantities[1].value=128` — *ok* |
| **Horizontal rule between operands and answer** | (visual — rule line, no text) | divider | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:131` — *ok* |
| **Answer input fields (one per place) + accessible name** | (empty inputs) aria: "Answer for Distance Perseverance traveled on Tuesday, hundreds place" (…tens/ones) | input | 🔵 template | ⚠️ risky | `src/components/StackedArithmetic.tsx:135-145 (ariaLabel from ArithmeticAnswer App.tsx:448 = goal.label.child); placeName PLACE_NAMES 13`<br/>The "Answer for {goal.label.child}" half is parameterized and safe; the "{place} place" half uses the 5-entry PLACE_NAMES cap and degrades to "place 5" for 6+ digit numbers. Generate place names dynamically / extend PLACE_NAMES. |
| **Unit label beside submit** | meters | label | 🟢 param | ✅ | `src/components/StackedArithmetic.tsx:149 (unit = goal.unit); JSON quantities[2].unit="meters"` — *ok* |
| **Submit button** | Enter answer | button | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:150-152 (submitLabel literal passed at App.tsx:450)` — *ok* |
| **Wrong-answer feedback lead-in ("slip" hint, shown only on check_arithmetic)** | Close — re-check 384 - 128. | hint | 🔵 template | ✅ | `src/App.tsx:453-458 (ArithmeticAnswer); "Close — re-check" is literal, equation from operand values` — *ok* |
| **Magnitude hint (tail of the slip hint)** | The result should be smaller than 384 but greater than 0. | hint | 🔵 template | ✅ | `src/App.tsx:468-481 magnitudeHint(); subtraction branch line 471` — *ok* |
| **Prediction echo (persists into arithmetic entry)** | Your prediction: shorter. | body | 🔵 template | ⚠️ risky | `src/App.tsx:349-357 (PredictionEcho); label from directionOptionsFor labels.ts:26-28`<br/>The magnitude word "shorter" comes from the hardcoded comparisonFamily labels ("Farther"/"Shorter") in src/components/labels.ts:26-28 — distance/driving vocabulary. For a non-distance scenario (money, weight, count) it reads wrong. Parameterize direction labels per story or use neutral "More/Less/Same". (This element is shared with the relationship-building pages.) |

### Stage 6 — Step confirmed

_18 fields — 🟢 6 · 🔵 10 · ⚪ 2  ·  ✅ 14 / ⚠️ 4 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Step-confirmed panel heading** | The math and the story agree | heading | ⚪ hardcoded | ✅ | `src/App.tsx:194` — *ok* |
| **Prediction outcome note** | You predicted shorter — and it was.  (mismatch branch: "You predicted shorter, but it turned out farther. Revising after seeing the numbers is good thinking.") | body | 🔵 template | ⚠️ risky | `src/App.tsx:392-414 (PredictionOutcome); labels from directionOptionsFor labels.ts:26-28`<br/>Same root cause as entry 16: the magnitude words "shorter"/"farther" are the hardcoded distance-specific comparisonFamily labels (labels.ts:26-28) and misread on a non-distance swap; neutralize/parameterize them. Secondary: the mismatch branch's trailing "Revising after seeing the numbers is good thinking." (App.tsx:406-410) is exactly the AI-style narration CLAUDE.md's copy rules say to delete. |
| **Model card reading (goal quantity name)** | Distance Perseverance traveled on Tuesday | label | 🟢 param | ✅ | `src/App.tsx:501 (goal.label.child); JSON quantities[2].label.child` — *ok* |
| **Model card equation** | 384 - 128 = 256 meters | number | 🔵 template | ✅ | `src/App.tsx:502-505 (values via formatNumber, answer bold = child's record.answer, unit = goal.unit)` — *ok* |
| **Comparison bar model accessible name (SVG aria-label)** | Comparison bar model. Monday distance: 384 meters. Tuesday distance: 256 meters. Tuesday was shorter by: 128 meters. | svg-aria | 🔵 template | ✅ | `src/components/BarModel.tsx:129` — *ok* |
| **Prediction outcome — matched branch** | You predicted <strong>shorter</strong> — and it was. | outcome sentence (template + merged label) | 🔵 template | ⚠️ risky | `src/App.tsx:402-404`<br/>Sentence frame ("You predicted … — and it was.") is generic and swap-safe, but the inserted label inherits the distance-word problem from labels.ts. Fix by parameterizing direction labels (see options 14/15). |
| **Bigger bar row label (Monday)** | Monday distance | svg-caption | 🟢 param | ✅ | `src/components/BarModel.tsx:69-77 via BarFigure datum (q.label.compact); JSON quantities[0].label.compact` — *ok* |
| **Prediction outcome — mismatch branch** | You predicted <strong>farther</strong>, but it turned out <strong>shorter</strong>. Revising after seeing the numbers is good thinking. | outcome sentence (template + merged labels) | 🔵 template | ⚠️ risky | `src/App.tsx:406-410`<br/>Two problems: (1) the merged labels inherit the distance-word issue from labels.ts (fix per options 14/15); (2) "Revising after seeing the numbers is good thinking." is exactly the kind of generic motivational narration the CLAUDE.md copy rule forbids ("No AI-style narration … 'Experimenting is good thinking'") — recommend removing that closing sentence. |
| **Bigger bar rectangle (role-colored)** | (visual — filled bar, width scaled to 384, fill var(--q-bigger)) | svg-bar | 🔵 template | ✅ | `src/components/BarModel.tsx:78-85,131-139; ROLE_FILL 19-24` — *ok* |
| **Bigger bar value + unit** | 384 meters | svg-value | 🟢 param | ✅ | `src/components/BarModel.tsx:86-100 (formatNumber(value) + unit tspan); JSON quantities[0]` — *ok* |
| **Smaller bar row label (Tuesday)** | Tuesday distance | svg-caption | 🟢 param | ✅ | `src/components/BarModel.tsx:142-151 (label prop = smaller.label); JSON quantities[2].label.compact` — *ok* |
| **Smaller bar rectangle (role-colored)** | (visual — filled bar, width scaled to 256, fill var(--q-smaller)) | svg-bar | 🔵 template | ✅ | `src/components/BarModel.tsx:142-151; ROLE_FILL 19-24` — *ok* |
| **Smaller bar value + unit (drawn past the gap)** | 256 meters | svg-value | 🟢 param | ✅ | `src/components/BarModel.tsx:152-164 (drawn right of the gap so it's never occluded); JSON quantities[2]` — *ok* |
| **Subtracted-amount gap (dotted rect completing smaller up to bigger)** | (visual — dashed maroon rect, fill var(--q-minus-tint), stroke var(--q-minus)) | svg-bar | 🔵 template | ✅ | `src/components/BarModel.tsx:168-180` — *ok* |
| **Gap value label (the difference)** | −128 | svg-value | 🔵 template | ⚠️ risky | `src/components/BarModel.tsx:181-190 (−${formatNumber(difference.value)})`<br/>The value is data-driven but the leading minus "−" is a hardcoded literal that frames the gap as an amount removed. Correct for this subtractive comparison, but a "how much more" comparison would want a "+"/neutral framing. Drive the sign from the relationship/equation direction rather than baking "−", or rely on the data-driven caption below it. |
| **Gap caption (difference quantity label)** | Tuesday was shorter by | svg-caption | 🟢 param | ✅ | `src/components/BarModel.tsx:193-200 (difference.label = JSON quantities[1].label.compact)` — *ok* |
| **"Check your work" button** | Check your work | button | ⚪ hardcoded | ✅ | `src/App.tsx:199-201` — *ok* |
| **Established-context label (only when confirming a later step, above the carried model card)** | Step 1, solved | label | 🔵 template | ✅ | `src/App.tsx:521-523 (EstablishedContext; step.order from JSON, "Step"/"solved" literals)` — *ok* |

### Global chrome (buttons, notes)

_5 fields — 🟢 1 · 🔵 1 · ⚪ 3  ·  ✅ 4 / ⚠️ 0 / ❌ 1_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Masthead brand mark** | (visual — BrandMark SVG logo) | icon | ⚪ hardcoded | ✅ | `src/App.tsx:277 (BrandMark component)` — *ok* |
| **Masthead brand title** | StoryMath | label | ⚪ hardcoded | ✅ | `src/App.tsx:278` — *ok* |
| **Masthead progress indicator** | 1/2 model the problem | label | 🔵 template | ✅ | `src/App.tsx:280-282 (count from state; "model the problem" literal)` — *ok* |
| **Mission-brief eyebrow (muted on these pages)** | 00  Imaginary Mission Brief | eyebrow | ⚪ hardcoded | ❌ breaks | `src/App.tsx:303-305`<br/>"Imaginary" assumes factualStatus=fictionalized and "Mission Brief" assumes a NASA/mission theme; both misread for a non-fiction or non-mission swap (e.g., a grocery story). Derive the eyebrow from problem metadata — e.g. a fictionalization prefix keyed on metadata.factualStatus plus a story.eyebrow/theme label — instead of the literal string. (Primarily a page-0 element; persists muted here.) |
| **Mission-brief story prose (muted on these pages)** | NASA’s Mars rover Perseverance was mapping pale layers of rock near an ancient Martian river delta. It drove 384 meters on Monday. Overnight, one wheel slipped into soft sand, so on Tuesday it drove 128 fewer meters while engineers chose a safer path. | body | 🟢 param | ✅ | `src/App.tsx:306 (problem.story.brief); JSON story.brief` — *ok* |

### Established (prior solved step)

_5 fields — 🟢 2 · 🔵 2 · ⚪ 1  ·  ✅ 5 / ⚠️ 0 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **established step-number label** | Step 1, | label | 🔵 template | ✅ | `src/App.tsx:521-522` — *ok* |
| **"solved" status tag** | solved | label | ⚪ hardcoded | ✅ | `src/App.tsx:522 (span.established__solved)` — *ok* |
| **model-card reading (goal label)** | Distance Perseverance traveled on Tuesday | reading/heading | 🟢 param | ✅ | `src/App.tsx:501 (goal.label.child) ← JSON quantities[].label.child` — *ok* |
| **model-card equation line** | 384 - 128 = 256 meters | equation | 🔵 template | ✅ | `src/App.tsx:502-505 (findExperiment operand values + record.operator + record.answer + goal.unit)` — *ok* |
| **model-card unit** | meters | unit | 🟢 param | ✅ | `src/App.tsx:504 (goal.unit) ← JSON quantities[].unit` — *ok* |

### Stage 8 — Check your work

_28 fields — 🟢 4 · 🔵 16 · ⚪ 8  ·  ✅ 26 / ⚠️ 1 / ❌ 1_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **collaborative heading (backwardExplanation field-merge)** | Let's add back 128 meters to our answer for Tuesday distance, to see if it equals Monday distance. | heading | 🔵 template | ✅ | `src/components/BackwardCheckBuilder.tsx:40 + 106-120` — *ok* |
| **choice group aria-label** | Choose a check to prove | aria-label | ⚪ hardcoded | ✅ | `src/components/BackwardCheckBuilder.tsx:43` — *ok* |
| **backward-check choice buttons (only when >1 accepted inverse form; e.g. step 2)** | Two-day total - Monday distance = Tuesday distance | button | 🔵 template | ✅ | `src/components/BackwardCheckBuilder.tsx:44-60 (label.compact + f.operator)` — *ok* |
| **backward bar — answer(teal) segment value** | 256 | svg number | 🔵 template | ✅ | `src/components/BackwardBar.tsx:58-60 (formatNumber(teal))` — *ok* |
| **backward bar — answer(teal) segment caption** | Tuesday distance | svg caption | 🟢 param | ❌ breaks | `src/components/BackwardBar.tsx:61-63 (leftCaption=left.label.compact) + branch logic 39-40`<br/>BUG on swap: caption is ALWAYS leftCaption, but for subtraction backward checks (this problem's step 2) the teal segment shows resultValue (256=Tuesday) while leftCaption is the whole ("Two-day total") — a number/label contradiction. Add a resultCaption prop (target.label.compact) and render caption as isAdd ? leftCaption : resultCaption. |
| **backward bar — other segment value (signed)** | +128 | svg number | 🔵 template | ✅ | `src/components/BackwardBar.tsx:78-87 (sign from operator + formatNumber(other))` — *ok* |
| **backward bar — other segment caption** | Tuesday was shorter by | svg caption | 🟢 param | ✅ | `src/components/BackwardBar.tsx:88-90 (rightCaption=right.label.compact)` — *ok* |
| **backward bar — answer(teal) rect** | teal filled bar segment (width = teal/max · W) | svg bar-segment | 🔵 template | ✅ | `src/components/BackwardBar.tsx:57 (fill var(--q-smaller))` — *ok* |
| **backward bar — added-back / taken-away rect** | periwinkle segment (add) or maroon dashed gap (subtract) | svg bar-segment/marker | 🔵 template | ✅ | `src/components/BackwardBar.tsx:66-77 (isAdd → var(--q-bigger) rect; else var(--q-minus) dashed)` — *ok* |
| **backward bar — SVG aria-label** | 256 plus 128 meters, to be added. | svg-aria | 🔵 template | ⚠️ risky | `src/components/BackwardBar.tsx:50-54`<br/>Add branch is fine; subtract branch composes "{teal} with {other} {unit} taken away." using teal=resultValue as the minuend → for step 2 it reads "256 with 384 meters taken away." (nonsensical; the real reduced amount is the whole=640). Base subtract aria on leftValue, e.g. "{leftValue} with {other} {unit} taken away, leaving {resultValue}." |
| **column arithmetic — "regroup" gutter label** | regroup | gutter-label | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:92` — *ok* |
| **column arithmetic — regroup/carry input row + aria** | empty inputs; aria "Regroup, hundreds place" (place names ones…ten-thousands) | input | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:93-103, placeName 22-25 (PLACE_NAMES 13)` — *ok* |
| **column arithmetic — top operand digits** | 2 5 6 | digits | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:108-122 (digitsOf(left.value)) ← left = frame.leftQuantityId value` — *ok* |
| **column arithmetic — operator gutter symbol** | + | symbol | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:125 (operator = frame.operator)` — *ok* |
| **column arithmetic — bottom operand digits** | 1 2 8 | digits | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:126-128 (digitsOf(right.value))` — *ok* |
| **column arithmetic — borrow boxes (subtraction backward checks only, e.g. step 2)** | per-digit borrow inputs; aria "Borrow into hundreds place" | input | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:110-119 (showBorrow = operator === "-")` — *ok* |
| **column arithmetic — rule line** | horizontal rule under operands | divider | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:131 (span.colsum__rule)` — *ok* |
| **column arithmetic — answer input row + aria** | empty answer inputs; aria "Result: Distance Perseverance traveled on Monday, hundreds place" | input | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:135-145 + ariaLabel from BackwardCheckBuilder.tsx:82 (target.label.child)` — *ok* |
| **column arithmetic — grid aria-label** | 256 + 128 | svg-aria | 🔵 template | ✅ | `src/components/StackedArithmetic.tsx:90` — *ok* |
| **column arithmetic — unit tag** | meters | unit | 🟢 param | ✅ | `src/components/StackedArithmetic.tsx:149 (unit = target.unit) ← JSON` — *ok* |
| **column arithmetic — submit button** | Check it | button | ⚪ hardcoded | ✅ | `src/components/StackedArithmetic.tsx:150-152, submitLabel from BackwardCheckBuilder.tsx:84` — *ok* |
| **retry / not-reconciled note** | Not reconciled yet. Work out 256 + 128 and try again — it should land on Monday distance. | body-sentence | 🔵 template | ✅ | `src/components/BackwardCheckBuilder.tsx:88-96 (static scaffold + assembled equation + target.label.compact)` — *ok* |
| **confirmation heading** | Your work checks out | heading | ⚪ hardcoded | ✅ | `src/App.tsx:374` — *ok* |
| **confirmation equation** | 256 + 128 = 384 | equation | 🔵 template | ✅ | `src/App.tsx:376-379 (left.value / frame.operator / right.value / frame.expectedResult)` — *ok* |
| **"that matches" connector** | — that matches | body-sentence | ⚪ hardcoded | ✅ | `src/App.tsx:380` — *ok* |
| **matched quantity label** | Monday distance | label | 🟢 param | ✅ | `src/App.tsx:380 (result.label.compact) ← JSON quantities[].label.compact` — *ok* |
| **closing affirmation sentence** | . The story and the math agree. | body-sentence | ⚪ hardcoded | ✅ | `src/App.tsx:380-381` — *ok* |
| **continue button** | Continue | button | ⚪ hardcoded | ✅ | `src/App.tsx:384` — *ok* |

### Stage 9 — Causal recap

_24 fields — 🟢 14 · 🔵 8 · ⚪ 2  ·  ✅ 18 / ⚠️ 4 / ❌ 2_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Recap headline (h2)** | Why Tuesday was shorter | heading | 🟢 param | ✅ | `src/App.tsx:555 (problem.story.recapHeadline); JSON story.recapHeadline` — *ok* |
| **Causal chain node 1** | Wheel slipped into soft sand | chain node | 🟢 param | ✅ | `src/App.tsx:557-559 (story.causalChain[0]); JSON story.causalChain` — *ok* |
| **Causal chain node 2** | Less useful driving time | chain node | 🟢 param | ✅ | `src/App.tsx:557-559 (story.causalChain[1]); JSON story.causalChain` — *ok* |
| **Causal chain node 3** | Tuesday traveled fewer meters than Monday | chain node | 🟢 param | ✅ | `src/App.tsx:557-559 (story.causalChain[2]); JSON story.causalChain` — *ok* |
| **Chain arrow connectors** | (CSS arrow connector rendered after every node, ×3) | arrow marker | 🔵 template | ✅ | `src/App.tsx:560 (<div className="recap-arrow"/>, guarded by i < causalChain.length)`<br/>Generic connector, count derived from causalChain length. Minor: the guard i < causalChain.length is always true, so an arrow also renders after the LAST chain node to bridge into the calc node (intended). Survives swap; no change required. |
| **Derived calc node** | 384 − 128 = 256 | derived calc | 🔵 template | ❌ breaks | `src/App.tsx:563-567 (${bigger.value} − ${difference.value} = ${bigger.value - difference.value})`<br/>Numbers are parameterized, but the operator '−' and the roles (bigger, difference) are hardcoded in JSX. It only reads correctly for an additive_comparison DECREASE story. A combine/increase or start_change_end scenario would show a wrong sign, and a story lacking 'bigger'/'difference' roles (e.g. part_part_whole-only, or start/change/end) renders an EMPTY node (the `? : ""` branch). Fix: derive the operator + operands from the step's relationshipTemplate/preferredEquationForm (e.g. read lhs = [role, op, role]) instead of literal '−' and fixed roles. |
| **Total bar figure caption** | Both days, combined into the two-day total. | figure caption | ⚪ hardcoded | ❌ breaks | `src/App.tsx:570 (caption="Both days, combined into the two-day total.")`<br/>Baked-in domain wording: 'Both days' and 'two-day total' assume a two-day distance scenario. A bakery/team/two-container swap reads wrong. Fix: add a JSON field (e.g. story.totalBarCaption) or derive from the whole quantity's label.child ("Distance ... over both days"). |
| **Total bar — part A label** | Monday distance | bar label | 🟢 param | ✅ | `src/components/BarModel.tsx:231-239 via BarFigure.tsx:40-47; JSON monday_distance.label.compact` — *ok* |
| **Total bar — part A value + unit** | 384 meters | bar value | 🟢 param | ✅ | `src/components/BarModel.tsx:86-99 (BarRow value/unit); JSON monday_distance.value=384, unit=meters` — *ok* |
| **Total bar — part B label** | Tuesday distance | bar label | 🟢 param | ✅ | `src/components/BarModel.tsx:240-248; JSON tuesday_distance.label.compact` — *ok* |
| **Total bar — part B value + unit** | 256 meters | bar value | 🟢 param | ✅ | `src/components/BarModel.tsx:86-99; JSON tuesday_distance.value=256, unit=meters` — *ok* |
| **Total bar — whole label** | Two-day total | bar label | 🟢 param | ✅ | `src/components/BarModel.tsx:251-259; JSON two_day_total.label.compact` — *ok* |
| **Total bar — whole value + unit** | 640 meters | bar value | 🟢 param | ✅ | `src/components/BarModel.tsx:269-281; JSON two_day_total.value=640, unit=meters` — *ok* |
| **Total bar — segment fills** | (part A colored 'bigger' hue, part B colored 'smaller' hue; whole bar segmented A+B) | bar segment | 🔵 template | ✅ | `src/components/BarModel.tsx:19-32 ROLE_FILL, 236-267 (parts[0]→bigger fill, parts[1]→smaller fill)`<br/>Generic role-keyed colors. Minor: colors are assigned by array position (parts[0]=bigger hue, parts[1]=smaller hue), not the parts' actual roles, but for any 2-part whole this reads fine. No change required. |
| **Total bar — SVG aria-label** | Part-part-whole bar model. Monday distance: 384 meters. Tuesday distance: 256 meters. Combined Two-day total: 640 meters. | aria-label | 🔵 template | ✅ | `src/components/BarModel.tsx:229`<br/>Generic template merging quantity labels/values; 'Part-part-whole bar model.'/'Combined' are model-type words, not story words. Survives swap. |
| **Divider rule** | (thin horizontal divider) | divider | 🔵 template | ✅ | `src/App.tsx:572 (<hr className="divider"/>)` — *ok* |
| **Data-literacy question (h3)** | What does the gap between the Monday and Tuesday bars mean? | question heading | 🟢 param | ✅ | `src/App.tsx:574-576 (story.recapQuestion); JSON story.recapQuestion` — *ok* |
| **Answer option 1 (correct)** | How much shorter Tuesday was than Monday | option button | 🟢 param | ✅ | `src/App.tsx:577-589 (o.q.label.child for difference); JSON tuesday_difference.label.child`<br/>Text is parameterized and swaps cleanly. See entry 21 for the (generated) which-option-is-correct logic. |
| **Answer option 2 (distractor)** | Distance Perseverance traveled over both days | option button | 🟢 param | ✅ | `src/App.tsx:577-589 (o.q.label.child for whole); JSON two_day_total.label.child` — *ok* |
| **Answer option 3 (distractor)** | Distance Perseverance traveled on Monday | option button | 🟢 param | ✅ | `src/App.tsx:577-589 (o.q.label.child for bigger); JSON monday_distance.label.child` — *ok* |
| **Option set & correctness logic** | (difference = correct; whole & bigger = distractors; fixed order, unshuffled) | answer-key logic | 🔵 template | ⚠️ risky | `src/App.tsx:547-551 (options array with correct flags)`<br/>Correctness is hardwired to the 'difference' role and distractors to 'whole'/'bigger'. If a swapped story's recapQuestion isn't 'what does the gap mean' (→difference), or the story lacks those exact roles, the key is wrong or options vanish (the .filter drops missing roles, e.g. a part_part_whole-only story has no 'bigger'/'difference'). Also options are never shuffled (correct is always first), telegraphing the answer. Fix: drive option membership + correct flag from a JSON field (e.g. story.recapAnswerRole + distractorRoles) and shuffle. |
| **Feedback — correct** | Exactly — the gap is “How much shorter Tuesday was than Monday.” The bars make the difference visible. | feedback text | 🔵 template | ⚠️ risky | `src/App.tsx:593-594 (merges difference.label.child into a fixed frame)`<br/>The label is merged in, but the frame 'the gap is …' / 'The bars make the difference visible.' bakes in a comparison-bar (two-bar gap) reading. Reads wrong for a part-whole or start-change-end recap. Fix: move the framing to JSON (e.g. story.recapFeedback.correct) or key it on the relationship family instead of assuming a gap/difference. |
| **Feedback — incorrect / nudge** | Close — the gap between the two bars is “How much shorter Tuesday was than Monday,” not a total. It’s the extra length one bar has over the other. | feedback text | 🔵 template | ⚠️ risky | `src/App.tsx:595 (merges difference.label.child into a fixed frame)`<br/>Embeds three assumptions: 'the gap between the two bars' (exactly two comparison bars), 'not a total' (assumes the distractor chosen is the whole/total), and 'the extra length one bar has over the other' (comparison-bar geometry). Any of these can misfire on a non-comparison swap. Fix: parameterize via a JSON recapFeedback.incorrect field or template off the chosen wrong role rather than assuming it was the total. |
| **Finish button** | Finish the mission | button label | ⚪ hardcoded | ⚠️ risky | `src/App.tsx:597-599`<br/>'mission' assumes a mission/space theme; reads oddly for a bakery/store/sports swap. Fix: use a neutral 'Finish' or parameterize a theme noun (e.g. metadata.finishLabel / theme-derived word). |

### Complete — finish banner

_4 fields — 🟢 1 · 🔵 1 · ⚪ 2  ·  ✅ 4 / ⚠️ 0 / ❌ 0_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **Brand mark** | (StoryMath brand mark SVG icon) | icon/logo | 🔵 template | ✅ | `src/App.tsx:244 (<BrandMark className="brand__mark"/>)` — *ok* |
| **Finish headline (h2)** | You built a model, tested it, and checked it. | heading | ⚪ hardcoded | ✅ | `src/App.tsx:245`<br/>Generic description of the app's pedagogy (build/test/check), contains no story facts, so it survives any scenario swap. Optional: could parameterize, but not required. |
| **Closing note prose** | The wheel slipped, so Tuesday had to be shorter — you took away the amount it was shorter, then combined both days, and proved each result backward. | body sentence | 🟢 param | ✅ | `src/App.tsx:246-249 (story.closingNote); JSON story.closingNote` — *ok* |
| **Play again button** | Play it again | button label | ⚪ hardcoded | ✅ | `src/App.tsx:251-253` — *ok* |

### Data layer (JSON + engine)

_47 fields — 🟢 41 · 🔵 5 · ⚪ 1  ·  ✅ 34 / ⚠️ 5 / ❌ 8_

| Field | What's shown | Type | Source | Swap | Location · how to parameterize |
|---|---|---|---|:--:|---|
| **metadata.title** | Imaginary mission: Perseverance’s sandy Tuesday | metadata-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:4` — *ok* |
| **metadata.theme** | Mars rover mission | metadata-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:5` — *ok* |
| **metadata.gradeBand** | 2–3 | metadata-value | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:6` — *ok* |
| **metadata.factualStatus** | fictionalized | metadata-value | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:7` — *ok* |
| **metadata.tags** | ["NASA-inspired","comparison","part-part-whole","two-step","bar-model"] | metadata-value | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:8-14` — *ok* |
| **story.brief** | NASA’s Mars rover Perseverance was mapping pale layers of rock near an ancient Martian river delta. It drove 384 meters on Monday. Overnight, one wheel slipped into soft sand, so on Tuesday it drove 128 fewer meters while engineers chose a safer path. | story-text | 🟢 param | ⚠️ risky | `data/problems/nasa-perseverance-wheel-slip.json:17`<br/>The literals 384 and 128 and the unit 'meters' are hardcoded in prose, decoupled from quantities[].value. Changing monday_distance/tuesday_difference leaves the brief stale/contradictory. Use a field-merge template that inserts values+unit by quantity id (e.g. `{monday_distance.value} {monday_distance.unit}`) so the brief stays in sync on a number change. |
| **story.causalEvent** | One wheel slipped into soft sand. | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:18` — *ok* |
| **story.causalChain** | ["Wheel slipped into soft sand","Less useful driving time","Tuesday traveled fewer meters than Monday"] | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:19-23` — *ok* |
| **story.curiosityNote** | This is a fictionalized math mission inspired by Mars rover exploration; it is not a real NASA daily drive log. | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:24` — *ok* |
| **story.factualFlag** | Inspired by Mars rover exploration — not a real mission log | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:25` — *ok* |
| **story.recapHeadline** | Why Tuesday was shorter | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:26` — *ok* |
| **story.recapQuestion** | What does the gap between the Monday and Tuesday bars mean? | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:27` — *ok* |
| **story.closingNote** | The wheel slipped, so Tuesday had to be shorter — you took away the amount it was shorter, then combined both days, and proved each result backward. | story-text | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:28` — *ok* |
| **quantities[monday_distance].value** | 384 | quantity-value | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:43` — *ok* |
| **quantities[monday_distance].label** | child: "Distance Perseverance traveled on Monday"; compact: "Monday distance"; semanticChips: ["distance traveled","on Monday"] | quantity-label | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:34-42` — *ok* |
| **quantities[tuesday_difference].value** | 128 | quantity-value | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:58` — *ok* |
| **quantities[tuesday_difference].label** | child: "How much shorter Tuesday was than Monday"; compact: "Tuesday was shorter by"; semanticChips: ["amount shorter","Tuesday than Monday"] | quantity-label | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:49-56` — *ok* |
| **quantities[tuesday_distance].value** | 256 | quantity-value | 🟢 param | ⚠️ risky | `data/problems/nasa-perseverance-wheel-slip.json:73`<br/>DERIVED value stored as a literal (256 = 384 − 128, role smaller, visibility 'find'). The engine never computes it — evaluateEquation.ts:97-101 compares the child's typedAnswer to this stored goal.value. Changing 384 or 128 leaves 256 stale and the step becomes unwinnable. Compute derived quantities in loadProblem from a formula spec (e.g. derivedFrom: {form:'bigger_minus_difference_equals_smaller'}) OR add a config-validation invariant asserting stored value === engine-computed result. |
| **quantities[tuesday_distance].label** | child: "Distance Perseverance traveled on Tuesday"; compact: "Tuesday distance"; semanticChips: ["distance traveled","on Tuesday"] | quantity-label | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:64-71` — *ok* |
| **quantities[two_day_total].value** | 640 | quantity-value | 🟢 param | ⚠️ risky | `data/problems/nasa-perseverance-wheel-slip.json:88`<br/>DERIVED value stored as a literal (640 = 384 + 256 = monday + tuesday, role whole, visibility 'revealed_after_step'). Chained off another derived value (256), so a single input change desyncs both. Same fix as entry 18: compute from formula in loadProblem or validate stored==computed. backwardCheck.ts:83-88 (backwardCheckReconciles) already assumes stored===expectedResult, so a stale literal silently breaks the backward check. |
| **quantities[two_day_total].label** | child: "Distance Perseverance traveled over both days"; compact: "Two-day total"; semanticChips: ["distance traveled","over both days"] | quantity-label | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:79-86` — *ok* |
| **quantities[*].unit** | meters (on all four quantities) | unit | 🟢 param | ⚠️ risky | `data/problems/nasa-perseverance-wheel-slip.json:42,57,72,87`<br/>The unit is cleanly parameterized on each quantity, BUT the literal word 'meter(s)' is ALSO hardcoded inside experiment prose ('128-meter sections', 'Monday’s 384 meters', explanation '= 512') — see entries 34/36. On a scenario swap to a non-distance domain (apples, dollars), quantity.unit updates but the baked prose does not. Reference quantity.unit in any templated sentence and strip literal units from authored explanation/worldIfTrue text. |
| **quantities[*].semanticRole + visibility** | semanticRole: bigger/difference/smaller/whole; visibility: given/given/find/revealed_after_step | role-spec | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:33,44,47,59,63,74,78,89` — *ok* |
| **steps[find_tuesday_distance].prompt** | How far did Perseverance travel on Tuesday? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:114` — *ok* |
| **steps[find_tuesday_distance].reasoningPrompt** | After the wheel slipped, how did Tuesday’s distance change? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:115` — *ok* |
| **steps[find_tuesday_distance].backwardCheck.prompt** | Can you prove that Tuesday’s distance fits the story? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:118` — *ok* |
| **steps[find_tuesday_distance] equation spec** | relationshipTemplateId: additive_comparison; acceptedEquationFormIds: [bigger_minus_difference_equals_smaller]; expectedDirection: decrease; backwardCheck.acceptedEquationFormIds: [smaller_plus_difference_equals_bigger]; operatorOptions: [+,-,×,÷] | step-spec | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:97-122` — *ok* |
| **steps[find_two_day_total].prompt** | How far did Perseverance travel over both days? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:145` — *ok* |
| **steps[find_two_day_total].reasoningPrompt** | Monday and Tuesday are two separate distances — how do they relate to the two-day trip? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:146` — *ok* |
| **steps[find_two_day_total].backwardCheck.prompt** | Can you use the total to check one of the daily distances? | step-prompt | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:149` — *ok* |
| **steps[find_two_day_total] equation spec** | relationshipTemplateId: part_part_whole; acceptedEquationFormIds: [part_a_plus_part_b_equals_whole]; expectedDirection: combine; backwardCheck.acceptedEquationFormIds: [whole_minus_part_a_equals_part_b, whole_minus_part_b_equals_part_a] | step-spec | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:127-154` — *ok* |
| **operatorExperiments.step1_add (headline/explanation/worldIfTrue)** | headline: "Addition creates a farther Tuesday"; explanation: "384 + 128 = 512. That makes Tuesday farther than Monday."; worldIfTrue: "A farther Tuesday could fit a different mission: perhaps Perseverance found smoother ground or had more available battery power. But this story says the wheel slipped and Tuesday was shorter." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:158-171`<br/>explanation hardcodes the arithmetic '384 + 128 = 512', duplicating runOperatorExperiment's engine result (operatorExperiment.ts:57 computes computed=512 from operandValues). A number swap desyncs the two silently. Render the equation line from the OperatorExperimentResult template `${operandValues[0]} ${operator} ${operandValues[1]} = ${computed}` and keep only the narrative clause ('That makes Tuesday farther…') in JSON. headline/worldIfTrue are OK on scenario swap (rewritten) but still embed 'Tuesday'. |
| **operatorExperiments.step1_subtract (actual)** | headline: "Subtraction creates a shorter Tuesday"; explanation: "384 − 128 = 256. That makes Tuesday shorter than Monday."; worldIfTrue: "This matches the story: the wheel slipping into sand meant Perseverance could travel less distance on Tuesday." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:172-185`<br/>This is the narrativeFit:'actual' pack that drives operatorFitsStory (evaluateEquation.ts:95) — correct role, but explanation baked-arithmetic '384 − 128 = 256' duplicates engine computed and duplicates derived quantity 256. Template the equation line from operandValues+computed as in entry 32. |
| **operatorExperiments.step1_multiply** | headline: "Multiplication creates a repeated-group question"; explanation: "384 × 128 = 49,152. That is far larger than one Tuesday drive."; worldIfTrue: "This equation would fit a different story: if Perseverance drove Monday’s 384 meters on 128 different days, how far would it travel altogether?" | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:186-199`<br/>Two defects: (1) explanation '49,152' is a comma-formatted literal while engine computed is 49152 — even the FORMAT can diverge from what a component renders; (2) worldIfTrue bakes '384 meters', '128 different days'. Generate the equation line from operandValues+computed with a shared number formatter, and template the operands/unit in worldIfTrue by quantity id. |
| **operatorExperiments.step1_divide** | headline: "Division asks a sections question"; explanation: "384 ÷ 128 = 3. This tells how many 128-meter sections fit into Monday’s 384 meters."; worldIfTrue: "Division could answer a different question: “How many 128-meter sections fit into Monday’s drive?” It does not tell Tuesday’s travel distance." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:200-213`<br/>explanation and worldIfTrue bake '384', '128', and the unit '128-meter'. Number swap desyncs from engine computed (3) and unit swap breaks '128-meter sections'. Template operands+unit by quantity id and render the equation from operandValues+computed. |
| **operatorExperiments.step2_add (actual)** | headline: "Addition combines both days"; explanation: "384 + 256 = 640. This combines Monday’s and Tuesday’s distance."; worldIfTrue: "This matches the question because the two-day total includes both separate daily distances." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:214-227`<br/>narrativeFit:'actual' for step 2. explanation '384 + 256 = 640' bakes both a given (384) AND two derived values (256, 640) — triply fragile: it must be edited whenever monday_distance OR the derived tuesday_distance/two_day_total change. Generate the equation line from operandValues+computed; keep only 'This combines Monday’s and Tuesday’s distance.' |
| **operatorExperiments.step2_subtract** | headline: "Subtraction finds the gap, not the total"; explanation: "384 − 256 = 128. This finds how much farther Monday was than Tuesday."; worldIfTrue: "That is a useful comparison question, but the mission asks for the distance over both days together." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:228-241`<br/>explanation bakes '384 − 256 = 128' (given minus derived = the other given). Number swap desyncs. Template the equation line from operandValues+computed. |
| **operatorExperiments.step2_multiply** | headline: "Multiplication creates an enormous repeated-group result"; explanation: "384 × 256 = 98,304. This is not a two-day total."; worldIfTrue: "Multiplication would fit a repeated-groups situation, not two different daily distances being added together." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:242-255`<br/>explanation bakes comma-formatted '98,304' (engine computed 98304). worldIfTrue is scenario-generic. Generate the equation line from operandValues+computed with a shared formatter. |
| **operatorExperiments.step2_divide** | headline: "Division compares how many times one amount fits in another"; explanation: "384 ÷ 256 = 1.5. This compares the two daily distances."; worldIfTrue: "That is not a total. The question asks us to combine Monday and Tuesday." | experiment-text | 🟢 param | ❌ breaks | `data/problems/nasa-perseverance-wheel-slip.json:256-269`<br/>explanation bakes '384 ÷ 256 = 1.5' (a non-integer, so also a rounding/format concern vs engine computed). worldIfTrue names 'Monday and Tuesday'. Generate the equation line from operandValues+computed. |
| **visualizations[step1_comparison]** | { id: step1_comparison, type: comparison_bar, quantityIds: [monday_distance, tuesday_distance, tuesday_difference] } | viz-spec | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:272-280` — *ok* |
| **visualizations[step2_total]** | { id: step2_total, type: part_whole_bar, quantityIds: [monday_distance, tuesday_distance, two_day_total] } | viz-spec | 🟢 param | ✅ | `data/problems/nasa-perseverance-wheel-slip.json:281-289` — *ok* |
| **numericModelResult (engine)** | calculate(equation.operator, left, right) | computed-value | 🔵 template | ✅ | `src/domain/evaluateEquation.ts:88-90` — *ok* |
| **operatorExperiment.computed (engine)** | const computed = calculate(operator, left, right); operandValues: [left, right] | computed-value | 🔵 template | ✅ | `src/domain/operatorExperiment.ts:47-63` — *ok* |
| **backwardCheck.expectedResult (engine)** | calculate(operator, values[leftQuantityId], values[rightQuantityId]) over inverse form ids | computed-value | 🔵 template | ✅ | `src/domain/backwardCheck.ts:32-55` — *ok* |
| **answerCorrect vs goal.value (engine)** | numbersEqual(equation.typedAnswer, goal.value) | engine-logic | 🔵 template | ⚠️ risky | `src/domain/evaluateEquation.ts:97-101`<br/>Logic is generic, BUT it grades the child against the STORED goal.value, which for the two answer quantities is a hand-entered derived literal (256, 640 — entries 18, 20). If those literals drift from 384/128, a child who does the correct arithmetic is marked wrong while numericModelResult still computes the right number. Fix by deriving goal.value from the formula (entry 18/20) or validating stored==computed at load. |
| **bindRolesToQuantities (engine)** | Pass 1 exact semanticRole match; Pass 2 positional fallback in declaration order | engine-logic | 🔵 template | ✅ | `src/domain/loadProblem.ts:72-110` — *ok* |
| **engine fallback constants** | COMMUTATIVE = new Set(["+","×"]); feedbackMode = experiment?.narrativeFit ?? "different_question"; operatorFitsStory = experiment?.narrativeFit === "actual" | engine-logic | ⚪ hardcoded | ✅ | `src/domain/evaluateEquation.ts:17,92-95` — *ok* |

---

## Swap-readiness checklist

To swap **numbers** only (same scenario): fix **Theme ①** (compute derived values) — then 384/128 can change freely and everything downstream (bars, answers, backward checks, recap calc) follows.

To swap the **whole scenario** (new story, new units, new relationship family): fix **① + ② + ③ + ④ + ⑤** and the two swap-bugs. After that, a new problem is *pure JSON*: story fields, quantity labels/units/formulas, an operator-experiment pack, and the recap block — no component edits.

_Everything already marked 🔵 template or 🟢 param needs no work; the interaction shell, equation engine, operator experiments, bar models, and backward-check construction are already story-agnostic._
