/**
 * localStorage persistence for the studio, mirroring the reference game: a single
 * JSON blob, rewritten on every change, merged over a fresh empty state on load
 * so adding fields never breaks an older save. An in-memory fallback keeps things
 * working when localStorage throws (private mode / disabled storage).
 */

import type { StudioState } from "./types";

// Bumping this version resets all saved state (solved problems, recruited team,
// saved projects) to a clean slate for every player.
const KEY = "storymath_studio_v2";

let memoryFallback: StudioState | null = null;

const STICKER_ID_RENAMES = new Map([
  ["Astrid", "Hannah"],
  ["Isak", "Isaac"],
  ["Sam", "Soo-jin"],
  ["Theresa", "Bridget"],
]);

function currentStickerId(stickerId: string): string {
  return STICKER_ID_RENAMES.get(stickerId) ?? stickerId;
}

function migrateSavedState(state: StudioState): StudioState {
  return {
    ...state,
    earned: state.earned.map(currentStickerId),
    savedProjects: state.savedProjects.map((project) => ({
      ...project,
      team: project.team.map(currentStickerId),
      placements: project.placements.map((placement) => ({
        ...placement,
        stickerId: currentStickerId(placement.stickerId),
      })),
    })),
    draftPlacements: state.draftPlacements.map((placement) => ({
      ...placement,
      stickerId: currentStickerId(placement.stickerId),
    })),
  };
}

export function emptyStudioState(): StudioState {
  return {
    earned: [],
    solvedProblemIds: [],
    savedProjects: [],
    draftRoomId: null,
    draftPlacements: [],
  };
}

export function loadStudioState(): StudioState {
  if (memoryFallback) return memoryFallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStudioState();
    // Merge over empty so new fields default sanely on old saves.
    return migrateSavedState({ ...emptyStudioState(), ...(JSON.parse(raw) as Partial<StudioState>) });
  } catch {
    return emptyStudioState();
  }
}

export function saveStudioState(state: StudioState): void {
  memoryFallback = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // keep the in-memory copy; nothing else to do
  }
}

export const STUDIO_STORAGE_KEY = KEY;

/** Test seam: clear the in-memory fallback so load reads storage fresh. */
export function resetStudioMemory(): void {
  memoryFallback = null;
}
