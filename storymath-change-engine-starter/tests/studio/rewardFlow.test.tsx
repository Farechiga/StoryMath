// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { StudioProvider, useStudio, type StudioContextValue } from "../../src/studio/StudioContext";
import { TEAM_STICKERS } from "../../src/studio/assets";
import { resetStudioMemory } from "../../src/studio/storage";
import { STICKER_GOAL } from "../../src/studio/types";

let api!: StudioContextValue;
function Probe() {
  api = useStudio();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  resetStudioMemory();
});
afterEach(cleanup);

/** Recruit the next un-owned teammate (whatever the shuffle would offer). */
function recruitOne() {
  act(() => api.markSolved("p"));
  const pick = TEAM_STICKERS.find((s) => !api.earned.includes(s.id))!.id;
  act(() => api.chooseSticker(pick));
}

describe("reward loop", () => {
  it("recruits per completion up to a full team, then a full team offers no recruit", () => {
    render(
      <StudioProvider>
        <Probe />
      </StudioProvider>,
    );
    expect(api.unlocked).toBe(false);

    for (let n = 0; n < STICKER_GOAL; n++) {
      act(() => api.markSolved(`p${n}`));
      expect(api.pendingAward).not.toBeNull(); // a seat is open → a recruit is offered
      const pick = TEAM_STICKERS.find((s) => !api.earned.includes(s.id))!.id;
      act(() => api.chooseSticker(pick));
    }
    expect(api.earned).toHaveLength(STICKER_GOAL);
    expect(api.unlocked).toBe(true);

    // Reaching the goal fires the celebration once.
    expect(api.justUnlocked).toBe(true);
    act(() => api.dismissUnlock());

    // A FULL team offers no more recruits — you must make a sticker book first.
    act(() => api.markSolved("later"));
    expect(api.pendingAward).toBeNull();
    expect(api.earned).toHaveLength(STICKER_GOAL);
  });

  it("saving a sticker book graduates the team, so you form a new one", () => {
    render(
      <StudioProvider>
        <Probe />
      </StudioProvider>,
    );
    for (let n = 0; n < STICKER_GOAL; n++) recruitOne();
    expect(api.unlocked).toBe(true);

    act(() => api.setDraftRoom("room-x"));
    let saved: ReturnType<typeof api.saveProject> = null;
    act(() => {
      saved = api.saveProject("Book One");
    });

    // The saved book snapshots the team of five…
    expect(api.savedProjects).toHaveLength(1);
    expect(saved!.team).toHaveLength(STICKER_GOAL);
    // …and the active team graduates: empty roster, cleared scene, re-locked.
    expect(api.earned).toEqual([]);
    expect(api.draftRoomId).toBeNull();
    expect(api.draftPlacements).toEqual([]);
    expect(api.unlocked).toBe(false);

    // Recruiting works again for the new team.
    act(() => api.markSolved("p-again"));
    expect(api.pendingAward).not.toBeNull();
  });

  it("persists the team and the draft room across a remount", () => {
    const { unmount } = render(
      <StudioProvider>
        <Probe />
      </StudioProvider>,
    );
    act(() => api.markSolved("p1"));
    act(() => api.chooseSticker(TEAM_STICKERS[0]!.id));
    act(() => api.setDraftRoom("room-x"));
    unmount();

    resetStudioMemory(); // simulate a fresh load from storage
    render(
      <StudioProvider>
        <Probe />
      </StudioProvider>,
    );
    expect(api.earned).toEqual([TEAM_STICKERS[0]!.id]);
    expect(api.draftRoomId).toBe("room-x");
  });
});
