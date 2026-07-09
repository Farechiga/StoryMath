# Story Building and Content Authoring
## How to make a math problem feel like a world worth modeling

## 1. The five essential story elements

Every story should contain:

1. **Character** — who or what we care about.
2. **Place** — a specific setting that can be pictured.
3. **Goal** — what the character is trying to do.
4. **Conflict or opportunity** — what changes conditions.
5. **Consequence** — how the event changes a quantity.

The canonical pattern:

```text
Character + Place + Goal + Event + Quantity consequence
```

## 2. NASA rover reference example

### 2.1 World

```text
Character: Perseverance
Place: a fictionalized field log near an ancient Martian river delta
Goal: map pale layers of rock
```

### 2.2 Event

```text
Conflict: one wheel slips into soft sand
Causal effect: less useful driving time
Expected quantity effect: Tuesday distance decreases
```

### 2.3 Quantity relationships

```text
Monday distance = 384 meters
Tuesday was shorter by = 128 meters
Tuesday distance = 256 meters
Two-day total = 640 meters
```

### 2.4 Child-facing story

> **Perseverance’s Sandy Tuesday**  
> Perseverance was mapping pale layers of rock near an ancient Martian river delta. On Monday it drove **384 meters**. Overnight, one wheel slipped into soft sand, so on Tuesday it drove **128 fewer meters** while engineers chose a safer path.  
>
> How far did Perseverance travel on Tuesday? Then how far did it travel over both days?

### 2.5 Why it works

```text
Character: Perseverance
Place: ancient river delta on Mars
Goal: map unusual rocks
Conflict: wheel slips into soft sand
Consequence: Tuesday distance decreases
```

The conflict makes the word “fewer” meaningful. The number is no longer a detached instruction.

### 2.6 Important factual status rule

This should be labeled internally as:

```text
fictionalized / inspired_by
```

The real-world setting can inspire wonder, but the specific daily distances and wheel incident should not be presented as a factual mission log unless independently sourced and verified.

## 3. The “why” design rule

A good “why” has three properties:

```text
Plausible
Directionally meaningful
Brief
```

### Strong examples

```text
A wheel slipped in soft sand → less travel.
A storm knocked ripe apples down → more apples collected.
A puppy was adopted → fewer puppies remain at the shelter.
An extra animator joined the team → more frames can be checked.
A lost library book was found → more books are back on the shelf.
```

### Weak examples

```text
The owl was happy.
The rover saw something interesting.
The dog was fluffy.
The book was old.
```

Those may be charming, but they do not explain the numerical relationship.

## 4. Story writing formula

Use this fillable authoring form:

```text
TITLE:
WORLD / THEME:
FACTUAL STATUS: verified | fictionalized | inspired_by

CHARACTER:
PLACE:
GOAL:

ACTUAL EVENT:
WHY IT MATTERS:
EXPECTED DIRECTION: increase | decrease | combine | split | scale

GIVEN QUANTITY 1:
GIVEN QUANTITY 2:
FIND QUANTITY 1:
FIND QUANTITY 2:

RELATIONSHIP 1:
RELATIONSHIP 2:

ACTUAL OPERATOR FOR STEP 1:
ACTUAL OPERATOR FOR STEP 2:

COUNTERFACTUAL IF +:
COUNTERFACTUAL IF −:
COUNTERFACTUAL IF ×:
COUNTERFACTUAL IF ÷:

BACKWARD CHECK:
VISUALIZATION TYPE:
ONE-LINE “DID YOU KNOW?” OR FICTIONAL WORLD DETAIL:
```

## 5. Operator packs belong to the story

The content generator must tie different attempted operators to different worlds or different questions.

### NASA operator pack

| Attempt | Result | What that would mean |
|---|---:|---|
| `384 + 128` | `512` | Tuesday went farther. This could fit smoother ground or more available battery power. |
| `384 − 128` | `256` | Tuesday went shorter. This matches the wheel slipping into soft sand. |
| `384 × 128` | `49,152` | This would fit a repeated-group question, such as 128 identical 384-meter drives—not one Tuesday. |
| `384 ÷ 128` | `3` | This asks how many 128-meter sections fit into Monday’s distance—not Tuesday’s distance. |

This is not a choose-your-own-adventure quiz with three arbitrary explanations. The child’s chosen operation is the hypothesis. The content pack supplies the coherent consequence of that hypothesis.

## 6. Story detail checklist

Before approving a story, ask:

```text
Can a child picture the character?
Can she picture where it is happening?
Does the event explain why a number changes?
Does the event point toward bigger, smaller, total, equal groups, or sharing?
Are the units natural to this world?
Are the values believable enough for the imagined context?
Would the wrong-operator previews still produce a coherent alternate world or question?
Is the prose short enough that the math remains visible?
```

## 7. Domain-specific content patterns

### 7.1 Minnesota forests and wildlife

```text
Character: great gray owl, chickadee, red fox, monarch butterfly
Place: red pine forest, marsh edge, snow-covered field, prairie restoration
Goal: find food, count sightings, reach nest, tag birds
Event: windstorm, snowdrift, migration, restoration work, hidden vole
Natural quantities: sightings, feet flown, nests counted, seeds planted, miles tracked
```

Example:

> A great gray owl glided 142 feet before plunging into snow for a hidden vole. Later it flew 87 fewer feet because the wind became stronger. How far did it fly later? How far did it fly altogether?

### 7.2 Books and classic literature

```text
Character: Jo March, a reader, a librarian, a book club
Place: attic, library, train ride, porch during rain
Goal: finish a chapter, organize a shelf, prepare a reading list
Event: bookmark lost, extra reading time, a chapter was shared aloud, a book returned
Natural quantities: pages, chapters, bookmarks, books
```

Example:

> A young reader planned to finish a chapter of *Little Women* before lunch. She read 84 pages in the morning, then read 26 fewer pages during a noisy car ride. How many pages did she read in the car? How many pages did she read altogether?

### 7.3 Aikido, gymnastics, and skating

```text
Character: student athlete, coach, practice partner
Place: dojo mat, ice rink, gym floor
Goal: complete practice challenge
Event: a slippery patch, extra practice round, partner switch, long rest break
Natural quantities: rolls, inches, minutes, laps, turns
```

### 7.4 Pets and animal rescue

```text
Character: puppy, cat, shelter volunteer, family dog
Place: shelter, kitchen, park, vet clinic
Goal: feed, exercise, prepare adoption event
Event: adoption, spilled kibble, extra visitor, heat wave
Natural quantities: ounces of water, cups of food, puppies, minutes walked
```

### 7.5 Cooking

```text
Character: child baker, family cook, imaginary café
Place: kitchen, farmers market, picnic
Goal: bake, share, prepare recipe
Event: spilled flour, extra guests, doubled recipe, shared equally
Natural quantities: ounces, cups, cookies, servings
```

Cooking becomes especially useful once multiplication/division arrives.

### 7.6 Pixar, creative production, and GitHub

```text
Character: animator, design team, robot helper, code library
Place: animation studio, game jam, “Sticker Factory” repository
Goal: finish frames, sort stickers, publish a feature
Event: extra computer, missing file, helper bot, duplicate batch
Natural quantities: frames, sketches, files, stickers, pull requests
```

The story should remain child-friendly and specific without pretending to describe proprietary real workflow data.

## 8. Content anti-patterns

Avoid:

```text
Generic noun swaps:
“A rover has 12 apples.”
```

Avoid:

```text
Decorative but causally irrelevant detail:
“An adorable rover with sparkly wheels traveled 384 meters.”
```

Avoid:

```text
Contradictory story logic:
“A wheel broke, so the rover traveled 128 more meters.”
```

Avoid:

```text
Overloaded prose:
Six unrelated facts, three characters, two locations, and two unknowns in one early-grade problem.
```

Avoid:

```text
Pretending invented details are factual:
“NASA reported that Perseverance drove 384 meters after a wheel slip,”
unless this is sourced and actually true.
```

## 9. Authoring quality standard

A strong StoryMath problem should earn a “yes” to each statement:

```text
The story makes me curious before I calculate.
I can explain why the quantity should grow, shrink, combine, split, or scale.
The numbers have names and units.
The correct equation is a faithful model of the story.
A different operator creates a recognizable different world or different question.
The backward check returns me to the original relationship.
The graph tells the same story as the words and equation.
```
