// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { studioReducer } from "../../src/studio/StudioContext";
import {
  emptyStudioState,
  loadStudioState,
  resetStudioMemory,
  saveStudioState,
  STUDIO_STORAGE_KEY,
} from "../../src/studio/storage";
import type { SavedProject, StudioState } from "../../src/studio/types";

const base = (): StudioState => emptyStudioState();

describe("studioReducer", () => {
  it("EARN appends a recruit and never duplicates", () => {
    let s = studioReducer(base(), { type: "EARN", stickerId: "Astrid" });
    expect(s.earned).toEqual(["Astrid"]);
    s = studioReducer(s, { type: "EARN", stickerId: "Astrid" });
    expect(s.earned).toEqual(["Astrid"]);
  });

  it("MARK_SOLVED records a problem exactly once", () => {
    let s = studioReducer(base(), { type: "MARK_SOLVED", problemId: "p1" });
    s = studioReducer(s, { type: "MARK_SOLVED", problemId: "p1" });
    expect(s.solvedProblemIds).toEqual(["p1"]);
  });

  it("SAVE_PROJECT prepends (newest first) and DELETE_PROJECT removes by id", () => {
    const proj: SavedProject = { id: "a", name: "A", roomId: "r", placements: [], team: [], savedAt: "t" };
    let s = studioReducer(base(), { type: "SAVE_PROJECT", project: proj });
    s = studioReducer(s, { type: "SAVE_PROJECT", project: { ...proj, id: "b" } });
    expect(s.savedProjects.map((p) => p.id)).toEqual(["b", "a"]);
    s = studioReducer(s, { type: "DELETE_PROJECT", id: "a" });
    expect(s.savedProjects.map((p) => p.id)).toEqual(["b"]);
  });

  it("SET_DRAFT merges room and placements independently", () => {
    let s = studioReducer(base(), { type: "SET_DRAFT", roomId: "room1" });
    expect(s.draftRoomId).toBe("room1");
    s = studioReducer(s, { type: "SET_DRAFT", placements: [{ key: "k", stickerId: "x", xPct: 50, yPct: 50, widthPct: 16 }] });
    expect(s.draftRoomId).toBe("room1"); // untouched
    expect(s.draftPlacements).toHaveLength(1);
  });
});

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStudioMemory();
  });

  it("round-trips state through localStorage", () => {
    saveStudioState({ ...emptyStudioState(), earned: ["Bea", "Sam"] });
    resetStudioMemory();
    expect(loadStudioState().earned).toEqual(["Bea", "Sam"]);
  });

  it("merges an old save that is missing fields over the empty shape", () => {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ earned: ["Vera"] }));
    resetStudioMemory();
    const loaded = loadStudioState();
    expect(loaded.earned).toEqual(["Vera"]);
    expect(loaded.savedProjects).toEqual([]);
    expect(loaded.draftPlacements).toEqual([]);
  });

  it("falls back to an empty state on corrupt JSON", () => {
    localStorage.setItem(STUDIO_STORAGE_KEY, "{not json");
    resetStudioMemory();
    expect(loadStudioState()).toEqual(emptyStudioState());
  });
});
