/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { validateProblem } from "../../src/domain";
import type { ProblemSpec } from "../../src/domain";
import nasa from "../../data/problems/nasa-perseverance-wheel-slip.json";
import birding from "../../data/problems/minnesota-birding.json";
import puppy from "../../data/problems/puppy-rescue-biscuits.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";

const PACKS: Array<[string, ProblemSpec]> = [
  ["nasa", nasa as unknown as ProblemSpec],
  ["birding", birding as unknown as ProblemSpec],
  ["puppy", puppy as unknown as ProblemSpec],
  ["animation", animation as unknown as ProblemSpec],
];

// "384 + 128 = 512" style frozen arithmetic that duplicates the engine.
const FROZEN_ARITHMETIC = /\d[\d,]*\s*[+\-×÷]\s*\d[\d,]*\s*=\s*\d/;

describe("data governance — authored problem packs", () => {
  it.each(PACKS)("%s: no frozen arithmetic in operator-experiment text", (_name, spec) => {
    for (const exp of spec.operatorExperiments) {
      for (const text of [exp.alternateWorldTemplate, exp.shortReaction]) {
        if (text) expect(text, text).not.toMatch(FROZEN_ARITHMETIC);
      }
    }
  });

  it.each(PACKS)("%s: validates with no errors and no stale-literal warnings", (_name, spec) => {
    const issues = validateProblem(spec);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues.filter((i) => i.message.includes("bare modeled literal"))).toEqual([]);
  });
});

// The banned strings must not live in component source — chrome comes from the
// story pack, and filler narration is forbidden entirely.
const BANNED = [
  "Imaginary",
  "Mission Brief",
  "Start the investigation",
  "Finish the mission",
  "Change Engine",
  "good thinking",
  "you can always revise",
  "let’s build",
  "let's build",
  "runs far past this scale",
  "A different question",
  "repeated-group question",
];

// Raw source of App + every component, via Vite (no Node fs needed).
const RAW = {
  ...import.meta.glob("../../src/App.tsx", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../../src/components/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

const componentSources: Array<[string, string]> = Object.entries(RAW);

describe("source governance — no chrome literals or filler in components", () => {
  it.each(componentSources)("%s is clean", (_file, source) => {
    for (const banned of BANNED) {
      expect(source.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
