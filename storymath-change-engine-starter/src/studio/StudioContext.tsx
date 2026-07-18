/**
 * The one context for the reward + project-space feature: persisted studio state
 * (recruits, solved problems, saved projects, the in-progress scene) plus the
 * app's view navigation and the pending sticker reward. Persisted slices go
 * through a reducer that mirrors to localStorage; navigation and the pending
 * award are ephemeral.
 *
 * A full no-op default lets <App/> render without a provider (unit tests), so the
 * masthead sticker button and the completion hook are inert there.
 */

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { TEAM_STICKERS } from "./assets";
import { loadStudioState, saveStudioState } from "./storage";
import { STICKER_GOAL, type Placement, type SavedProject, type StudioState } from "./types";

export type StudioView = "menu" | "play" | "studio" | "authoring";

type Action =
  | { type: "MARK_SOLVED"; problemId: string }
  | { type: "EARN"; stickerId: string }
  | { type: "SAVE_PROJECT"; project: SavedProject }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "SET_DRAFT"; roomId?: string | null; placements?: Placement[] }
  | { type: "RESET_TEAM" };

export function studioReducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "MARK_SOLVED":
      return state.solvedProblemIds.includes(action.problemId)
        ? state
        : { ...state, solvedProblemIds: [...state.solvedProblemIds, action.problemId] };
    case "EARN":
      return state.earned.includes(action.stickerId)
        ? state
        : { ...state, earned: [...state.earned, action.stickerId] };
    case "SAVE_PROJECT":
      return { ...state, savedProjects: [action.project, ...state.savedProjects] };
    case "DELETE_PROJECT":
      return { ...state, savedProjects: state.savedProjects.filter((p) => p.id !== action.id) };
    case "SET_DRAFT":
      return {
        ...state,
        ...(action.roomId !== undefined ? { draftRoomId: action.roomId } : {}),
        ...(action.placements !== undefined ? { draftPlacements: action.placements } : {}),
      };
    case "RESET_TEAM":
      // A saved team "graduates": clear the roster and the scene so the child
      // forms a brand-new team. Saved projects keep their own snapshots.
      return { ...state, earned: [], draftRoomId: null, draftPlacements: [] };
    default:
      return state;
  }
}

export interface StudioContextValue {
  // persisted
  earned: string[];
  solvedProblemIds: string[];
  savedProjects: SavedProject[];
  draftRoomId: string | null;
  draftPlacements: Placement[];
  // derived
  unlocked: boolean;
  goal: number;
  // reward
  pendingAward: string | null;
  markSolved: (problemId: string) => void;
  chooseSticker: (stickerId: string) => void;
  dismissAward: () => void;
  // celebration when the team is first completed (reaches the goal)
  justUnlocked: boolean;
  dismissUnlock: () => void;
  // scene draft
  setDraftRoom: (roomId: string) => void;
  setDraftPlacements: (placements: Placement[]) => void;
  saveProject: (name: string) => SavedProject | null;
  deleteProject: (id: string) => void;
  // navigation
  view: StudioView;
  selectedProblemId: string | null;
  openMenu: () => void;
  openStudio: () => void;
  openAuthoring: () => void;
  playProblem: (id: string) => void;
}

const noop = () => {};

const DEFAULT: StudioContextValue = {
  earned: [],
  solvedProblemIds: [],
  savedProjects: [],
  draftRoomId: null,
  draftPlacements: [],
  unlocked: false,
  goal: STICKER_GOAL,
  pendingAward: null,
  markSolved: noop,
  chooseSticker: noop,
  dismissAward: noop,
  justUnlocked: false,
  dismissUnlock: noop,
  setDraftRoom: noop,
  setDraftPlacements: noop,
  saveProject: () => null,
  deleteProject: noop,
  view: "play",
  selectedProblemId: null,
  openMenu: noop,
  openStudio: noop,
  openAuthoring: noop,
  playProblem: noop,
};

const StudioContext = createContext<StudioContextValue>(DEFAULT);

export function useStudio(): StudioContextValue {
  return useContext(StudioContext);
}

export function StudioProvider({ children, initialView = "menu" }: { children: ReactNode; initialView?: StudioView }) {
  const [persist, dispatch] = useReducer(studioReducer, undefined, loadStudioState);
  const [view, setView] = useState<StudioView>(initialView);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [pendingAward, setPendingAward] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    saveStudioState(persist);
  }, [persist]);

  const value = useMemo<StudioContextValue>(() => {
    const anyUnowned = TEAM_STICKERS.some((s) => !persist.earned.includes(s.id));
    return {
      earned: persist.earned,
      solvedProblemIds: persist.solvedProblemIds,
      savedProjects: persist.savedProjects,
      draftRoomId: persist.draftRoomId,
      draftPlacements: persist.draftPlacements,
      unlocked: persist.earned.length >= STICKER_GOAL,
      goal: STICKER_GOAL,
      pendingAward,
      markSolved: (problemId) => {
        // Permanent solved-mark for the menu (idempotent).
        if (!persist.solvedProblemIds.includes(problemId)) dispatch({ type: "MARK_SOLVED", problemId });
        // Recruit while the team has an open seat. A full team of STICKER_GOAL
        // must make a sticker book (which graduates it) before recruiting more —
        // so each completion can build toward a new team.
        const teamFull = persist.earned.length >= STICKER_GOAL;
        if (!teamFull && anyUnowned) setPendingAward(problemId);
      },
      chooseSticker: (stickerId) => {
        const isNew = !persist.earned.includes(stickerId);
        // Fire the celebration only on the recruit that first reaches the goal.
        if (isNew && persist.earned.length + 1 === STICKER_GOAL) setJustUnlocked(true);
        dispatch({ type: "EARN", stickerId });
        setPendingAward(null);
      },
      dismissAward: () => setPendingAward(null),
      justUnlocked,
      dismissUnlock: () => setJustUnlocked(false),
      setDraftRoom: (roomId) => dispatch({ type: "SET_DRAFT", roomId }),
      setDraftPlacements: (placements) => dispatch({ type: "SET_DRAFT", placements }),
      saveProject: (name) => {
        if (!persist.draftRoomId) return null;
        const project: SavedProject = {
          id: `p${Date.now()}`,
          name: name.trim() || "Untitled project",
          roomId: persist.draftRoomId,
          placements: persist.draftPlacements.slice(),
          team: persist.earned.slice(),
          savedAt: new Date().toISOString(),
        };
        dispatch({ type: "SAVE_PROJECT", project });
        dispatch({ type: "RESET_TEAM" }); // the team graduates → form a new one
        return project;
      },
      deleteProject: (id) => dispatch({ type: "DELETE_PROJECT", id }),
      view,
      selectedProblemId,
      openMenu: () => setView("menu"),
      openStudio: () => setView("studio"),
      openAuthoring: () => setView("authoring"),
      playProblem: (id) => {
        setSelectedProblemId(id);
        setView("play");
      },
    };
  }, [persist, view, selectedProblemId, pendingAward, justUnlocked]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
