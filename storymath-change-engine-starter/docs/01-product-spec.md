# Product Specification
## StoryMath Change Engine — MVP

## 1. Product statement

**StoryMath Change Engine is a model-building game in which a child uses mathematics to describe what happened in a vivid world.**

The first version teaches multi-step addition/subtraction word problems. The child does not simply identify an answer. She:

- names the quantities;
- identifies a relationship;
- predicts direction of change;
- chooses an operation;
- observes the numerical consequence;
- compares that consequence with the story;
- revises when needed;
- checks backward.

The experience is built on a simple causal chain:

```text
World → Event → Change → Relationship → Equation → Check
```

The child-facing question is not merely, “Which operation?”

It is:

> **What happened in this world, and what did that make the number do?**

## 2. Pedagogical thesis

### 2.1 The mathematical object is a relationship

The app should teach that addition and subtraction are different views of the same additive relationship.

For a comparison:

```text
Smaller + Difference = Bigger
Bigger − Difference = Smaller
Bigger − Smaller = Difference
```

For part-part-whole:

```text
Part A + Part B = Whole
Whole − Part A = Part B
Whole − Part B = Part A
```

For a change over time:

```text
Start + Change = End
End − Change = Start
End − Start = Change
```

The words can change. The relationship stays coherent.

### 2.2 A keyword is not a model

The app must never encode “fewer means subtract” as its instructional rule.

Example:

> Ben has 88 fewer marbles than Alice. How many marbles does Alice have?

The word *fewer* appears, yet the correct operation may be addition if the child knows Ben’s amount and seeks Alice’s larger amount.

The workflow should ask:

```text
Who has more?
What amount are we trying to find?
What difference connects the two amounts?
What equation gives that missing amount?
```

### 2.3 An attempted operation is a hypothesis

When a child chooses `+`, `−`, `×`, or `÷`, the app should calculate what that choice implies.

The response pattern:

```text
You tried: Monday distance + distance difference
384 + 128 = 512

That makes Tuesday farther than Monday.

A story in which that fits:
Perseverance found a smoother route or had more battery available.

Our story says the wheel slipped in sand and Tuesday was shorter.
Which operation makes the story smaller instead?
```

No red X. No loss of points. No shame.

### 2.4 The backward check is a reconciliation, not an afterthought

Every completed step has an inverse or complementary check.

For:

```text
384 − 128 = 256
```

the app asks the child to reconstruct:

```text
256 + 128 = 384
```

Then it names the relationship:

> Tuesday’s distance plus the amount it was shorter equals Monday’s distance.

This makes the fact family visible.

## 3. MVP learning objectives

By the end of a small set of problems, the child should increasingly be able to:

1. Distinguish **what is known** from **what is being found**.
2. Name quantities with units and context.
3. Tell whether an answer should be larger, smaller, or a total.
4. Choose and articulate an operation.
5. Notice when an operation produces a result that contradicts the story.
6. Use a bar model to see comparison, difference, and total.
7. Use a backward/inverse equation to verify a result.
8. Understand that alternate equations may describe alternate worlds or alternate questions.

## 4. Initial content scope

### Included in MVP

- Multi-step problems with exactly two required arithmetic steps.
- Additive relationships:
  - comparison;
  - part-part-whole;
  - start/change/end.
- Whole-number values.
- One consistent unit per problem step.
- Operator experimentation with all four symbols available, while only addition/subtraction is formally taught in this first unit.
- Simple bar charts/bar models.
- Typed answer field plus click/tap/drag construction.
- Story “why” that is causally relevant.

### Deferred but architected for

- Multiplication/division learning packs.
- Equal groups, arrays, scaling, sharing, and measurement division.
- Fractions/decimals.
- More than two steps.
- Student-generated stories.
- Voice narration and speech-to-text.
- Longitudinal learner model.
- Content authoring UI.
- Adaptive practice plans.

## 5. Core loop

```text
1. Mission Brief
2. Predict the direction of change
3. Name the target quantity
4. Build one relationship from quantity cards
5. Choose an operator
6. Observe the numerical and visual result
7. Reconcile result against the story
8. Solve the step
9. Repeat for the next step
10. Check backward
11. Read the graph / causal recap
```

The important pacing rule:

> **One relationship at a time.**

The child should never face a full multi-step algebraic chain at the beginning.

## 6. Product principles

### Principle A — Vivid specificity

Every problem includes:

- character;
- place;
- goal;
- conflict, opportunity, or event;
- numerical consequence.

Generic:

> A rover traveled 384 meters Monday.

Rich:

> Perseverance was mapping pale layers of rock near an ancient Martian river delta. On Monday it drove 384 meters. Overnight, one wheel slipped into soft sand, so on Tuesday it drove 128 fewer meters while engineers chose a safer path.

The numbers belong to an event.

### Principle B — The “why” must matter

The cause is not decorative flavor. It predicts the direction of numerical change.

```text
Wheel slips → less usable driving time → less distance
Extra helper → more hands working → more tasks completed
Donation → fewer supplies left → smaller inventory
```

### Principle C — Counterfactuals are productive

Wrong operator preview:

```text
Actual story: wheel slips → distance decreases.
Try +: distance increases.
Alternate story: smoother route / extra power → distance increases.
Conclusion: addition describes a possible different world, not this world.
```

### Principle D — Strong scaffold, real agency

The child chooses:

- direction;
- target quantity;
- relationship cards;
- operator;
- numerical answer;
- backward-check arrangement.

The app provides:

- predefined semantic quantity cards;
- one equation frame at a time;
- clear numerical calculations;
- graph feedback;
- optional hint/narration;
- no requirement for open-ended writing to progress.

### Principle E — Rich language without comprehension overload

Stories should be two to four concise sentences. Every detail must do at least one of the following:

- establish a character/place;
- explain a causal change;
- create a memorable visual;
- supply a required quantity;
- reward curiosity with a small true or explicitly fictionalized fact.

Do not use decorative prose that hides the mathematical relationships.

## 7. Fact-family catalog

### 7.1 Additive comparison

```text
Smaller + Difference = Bigger
Bigger − Difference = Smaller
Bigger − Smaller = Difference
```

Story language examples:

```text
Tuesday traveled 128 fewer meters than Monday.
The owl spotted 18 more mice than the fox.
Alice read 42 fewer pages than Jo.
```

### 7.2 Part-part-whole

```text
Part A + Part B = Whole
Whole − Part A = Part B
Whole − Part B = Part A
```

Story language examples:

```text
Monday’s distance plus Tuesday’s distance equals the two-day total.
Red maple leaves plus yellow maple leaves equal all collected leaves.
Puppies in kennel A plus puppies in kennel B equal all puppies at the shelter.
```

### 7.3 Start-change-end

```text
Start + Change = End
End − Change = Start
End − Start = Change
```

Story language examples:

```text
The shelter started with 48 food bowls and donated 17.
A book began with 327 pages; 184 pages have been read.
An ice skater practiced 126 minutes, then added 24 more minutes.
```

### 7.4 Future multiplicative families

These are documented now because the counterfactual preview can expose their intuition early.

```text
Equal groups:
groups × in each group = total

Sharing / partition:
total ÷ groups = in each group

Measurement division:
total ÷ size of each group = number of groups

Scaling / rate:
one unit amount × number of units = total
```

The multiplication/division unit should distinguish *repeated groups*, *equal sharing*, and *how many groups fit*, rather than treating `×` and `÷` as generic “big” or “small” buttons.

## 8. Definition of success for MVP

A successful child session looks like this:

```text
Child predicts Tuesday should be smaller.
Child initially tries +.
App shows 512 meters and a longer bar.
Child says/chooses that this does not match “wheel slipped.”
Child changes to −.
Child solves 384 − 128 = 256.
Child then adds 384 + 256 = 640.
Child checks 256 + 128 = 384.
Child reads the final bar model and can say why Tuesday was shorter.
```

The child should leave not thinking:

> “I got subtraction right.”

But rather:

> “The wheel problem made Tuesday shorter, so I had to take away the amount it was shorter.”
