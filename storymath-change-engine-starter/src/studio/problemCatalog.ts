/**
 * The catalog of playable word problems for multi-problem navigation. Every pack
 * under data/problems is imported here; the menu lists them and the router loads
 * one by id (instantiated through the same engine every screen uses).
 */

import { instantiateProblem } from "../model/instantiateProblem";
import type { ProblemSpec } from "../model/problemSpec";
import type { ProblemInstance } from "../domain/types";

import marsDustStorm from "../../data/problems/mars-rover-versatility-dust-storm.json";
import monarchs from "../../data/problems/monarch-prairie-citizen-science.json";
import tidePool from "../../data/problems/tide-pool-rising-water.json";
import sourdough from "../../data/problems/sourdough-armadillo-rolls.json";
import christmasCarol from "../../data/problems/christmas-carol-seat-crisis.json";
import nasa from "../../data/problems/nasa-perseverance-wheel-slip.json";
import owl from "../../data/problems/minnesota-owl-snow-tracks.json";
import littleWomen from "../../data/problems/little-women-storm-reading.json";
import aikido from "../../data/problems/aikido-sliding-mat-rolls.json";
import lunar from "../../data/problems/lunar-cookie-constellation.json";
import birding from "../../data/problems/minnesota-birding.json";
import animation from "../../data/problems/animation-lab-eyebrows.json";
import puppyBiscuits from "../../data/problems/puppy-rescue-biscuits.json";

const IMPORTED_SPECS: ProblemSpec[] = [
  // The five new add/subtract stories surface first on the menu.
  marsDustStorm, monarchs, tidePool, sourdough, christmasCarol,
  nasa, owl, littleWomen, aikido, lunar, birding, animation, puppyBiscuits,
].map((s) => s as unknown as ProblemSpec);

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
