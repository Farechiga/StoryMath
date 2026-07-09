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
