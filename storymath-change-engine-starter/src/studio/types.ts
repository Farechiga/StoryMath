/**
 * Studio types — the reward + project-space (sticker collage) feature.
 *
 * Solving a word problem lets the child recruit one "project team member"
 * sticker. At STICKER_GOAL recruits the ProjectSpace builder unlocks, where the
 * child picks a room background and freely places/resizes/removes their team,
 * then saves the project. Placement coordinates follow the reference game:
 * percentages of the canvas, anchored at the sticker's centre (so a saved
 * project renders identically at any canvas size).
 */

/** Recruits needed before the ProjectSpace builder unlocks. */
export const STICKER_GOAL = 5;

/** One placed sticker instance on the scene canvas. */
export interface Placement {
  /** Unique instance id (the same teammate can appear more than once). */
  key: string;
  /** Team sticker id (filename stem). */
  stickerId: string;
  /** Centre X as a percentage of canvas width. */
  xPct: number;
  /** Centre Y as a percentage of canvas height. */
  yPct: number;
  /** Width as a percentage of canvas width; height is auto (keeps aspect). */
  widthPct: number;
}

/** A saved project: the room, the placed team, and the roster at save time. */
export interface SavedProject {
  id: string;
  name: string;
  roomId: string;
  placements: Placement[];
  /** Recruited team sticker ids captured when the project was saved. */
  team: string[];
  /** ISO timestamp. */
  savedAt: string;
}

/** Everything persisted to localStorage. */
export interface StudioState {
  /** Recruited team sticker ids, in recruit order. */
  earned: string[];
  /** Problem ids that have already granted a recruit (award once each). */
  solvedProblemIds: string[];
  /** Saved projects, newest first. */
  savedProjects: SavedProject[];
  /** In-progress scene so the child can leave and return. */
  draftRoomId: string | null;
  draftPlacements: Placement[];
}
