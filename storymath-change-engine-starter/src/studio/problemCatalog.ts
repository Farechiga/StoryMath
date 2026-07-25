/**
 * The catalog of playable word problems for multi-problem navigation. Every JSON
 * pack under data/problems is included by Vite at build time; the menu lists
 * them and the router loads one by id.
 */

import { instantiateProblem } from "../model/instantiateProblem";
import type { ProblemSpec } from "../model/problemSpec";
import type { ProblemInstance } from "../domain/types";

const PROBLEM_MODULES = import.meta.glob("../../data/problems/*.json", {
  eager: true,
  import: "default",
});

const IMPORTED_SPECS: ProblemSpec[] = Object.entries(PROBLEM_MODULES)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, spec]) => spec as ProblemSpec);

function catalogRank(spec: ProblemSpec, fallbackOrder: number): number {
  if (typeof spec.metadata.catalogOrder === "number") return spec.metadata.catalogOrder;
  if (spec.metadata.publishedAt) {
    const time = Date.parse(spec.metadata.publishedAt);
    if (Number.isFinite(time)) return time;
  }
  return fallbackOrder;
}

export function orderProblemSpecs(specs: ProblemSpec[]): ProblemSpec[] {
  return specs
    .map((spec, index) => ({ spec, rank: catalogRank(spec, specs.length - index), index }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map(({ spec }) => spec);
}

const SPECS = orderProblemSpecs(IMPORTED_SPECS);

export const AUTHORING_PROBLEM_SPECS: readonly ProblemSpec[] = SPECS;

export interface ProblemSummary {
  id: string;
  title: string;
  theme: string;
  gradeBand: string;
  catalogOrder?: number;
  publishedAt?: string;
}

export const PROBLEMS: ProblemSummary[] = SPECS.map((s) => ({
  id: s.id,
  title: s.metadata.title,
  theme: s.metadata.theme,
  gradeBand: s.metadata.gradeBand,
  ...(s.metadata.catalogOrder !== undefined ? { catalogOrder: s.metadata.catalogOrder } : {}),
  ...(s.metadata.publishedAt ? { publishedAt: s.metadata.publishedAt } : {}),
}));

const SPEC_BY_ID = new Map(SPECS.map((s) => [s.id, s]));

export const FIRST_PROBLEM_ID = PROBLEMS[0]!.id;

export function loadProblemById(id: string): ProblemInstance {
  const spec = SPEC_BY_ID.get(id);
  if (!spec) throw new Error(`Unknown problem id: ${id}`);
  return instantiateProblem(spec);
}

/** Next problem id after `id` (wraps), for a "play another" flow. */
export function nextProblemId(id: string): string {
  const i = PROBLEMS.findIndex((p) => p.id === id);
  return PROBLEMS[(i + 1) % PROBLEMS.length]!.id;
}
