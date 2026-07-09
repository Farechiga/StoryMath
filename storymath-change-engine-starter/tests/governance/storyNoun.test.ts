/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { instantiateProblem } from "../../src/model/instantiateProblem";
import { displayNoun } from "../../src/model/fieldMerge";
import type { ProblemSpec } from "../../src/model/problemSpec";

/**
 * Story-noun governance: a field-merged quantity must keep the meaningful domain
 * noun from its story ("chickadee calls", "nuthatch taps"), never collapse into a
 * bland generic unit ("calls", "sounds"). Two checks run over every pack:
 *   1. id-specificity — a quantity whose id names a specific thing must render a
 *      display noun that contains it.
 *   2. no redundant echo — prose must not follow a {quantity:x} token with a
 *      literal copy of that quantity's own noun ("78 chickadee calls calls").
 */
const PACKS = import.meta.glob("../../data/problems/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ProblemSpec>;

const entries = Object.entries(PACKS).map(
  ([p, spec]) => [p.split("/").pop()!, spec] as const,
);

// If an id names a specific thing, its rendered noun must include that thing.
const NOUN_RULES: Array<{ idIncludes: string; must: string[] }> = [
  { idIncludes: "chickadee", must: ["chickadee"] },
  { idIncludes: "nuthatch", must: ["nuthatch"] },
  { idIncludes: "rocket_cookie", must: ["rocket"] },
  { idIncludes: "chocolate_biscuit", must: ["chocolate"] },
  { idIncludes: "bucket_stool", must: ["bucket"] },
  { idIncludes: "owl_wing", must: ["owl", "wing"] },
];

function proseFields(spec: ProblemSpec): string[] {
  const out = [spec.story.briefTemplate];
  if (spec.story.closingNoteTemplate) out.push(spec.story.closingNoteTemplate);
  out.push(
    spec.recap.headline,
    ...spec.recap.causalChain,
    spec.recap.dataQuestion.prompt,
    spec.recap.dataQuestion.correctFeedback,
    spec.recap.dataQuestion.incorrectFeedback,
  );
  for (const e of spec.operatorExperiments) if (e.alternateWorldTemplate) out.push(e.alternateWorldTemplate);
  return out;
}

describe.each(entries)("story-noun governance: %s", (_name, spec) => {
  const inst = instantiateProblem(spec);
  const dispById = new Map(inst.quantities.map((q) => [q.id, displayNoun(q)]));

  it("story-specific quantity ids render a specific noun, not a bland unit", () => {
    for (const q of inst.quantities) {
      for (const rule of NOUN_RULES) {
        if (!q.id.includes(rule.idIncludes)) continue;
        const noun = displayNoun(q).toLowerCase();
        expect(
          rule.must.some((m) => noun.includes(m)),
          `${q.id} renders "${displayNoun(q)}" but should contain one of: ${rule.must.join(", ")}`,
        ).toBe(true);
      }
    }
  });

  it("no {quantity} token is followed by a redundant copy of its own noun", () => {
    const re = /\{quantity:([a-zA-Z0-9_]+)\}\s+([a-z][a-zA-Z-]*)/g;
    for (const text of proseFields(spec)) {
      for (const m of text.matchAll(re)) {
        const disp = dispById.get(m[1]!);
        if (!disp) continue;
        const last = disp.split(" ").pop()!.toLowerCase();
        expect(
          m[2]!.toLowerCase(),
          `"...${m[0]}..." echoes the noun already in {quantity:${m[1]}} ("${disp}")`,
        ).not.toBe(last);
      }
    }
  });
});

describe("chickadee story renders story-specific nouns", () => {
  const birding = entries.find(([n]) => n === "minnesota-birding.json")![1];
  const inst = instantiateProblem(birding);

  it("brief keeps chickadee calls and nuthatch taps, not generic units", () => {
    expect(inst.story.brief).toContain("78 chickadee calls");
    expect(inst.story.brief).toMatch(/146 (more )?chickadee calls/);
    expect(inst.story.brief).toContain("93 nuthatch taps");
    expect(inst.story.brief).not.toMatch(/\b78 calls\b/);
    expect(inst.story.brief).not.toMatch(/\b93 sounds\b/);
  });

  it("step prompts keep the story-specific nouns", () => {
    expect(birding.steps[0]!.prompt).toMatch(/chickadee calls/i);
    expect(birding.steps[1]!.prompt).toMatch(/bird sounds/i);
  });
});
