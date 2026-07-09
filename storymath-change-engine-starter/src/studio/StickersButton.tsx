/**
 * The "Your stickers" masthead entry point — opens the studio and shows how many
 * teammates are recruited (and the goal until the ProjectSpace unlocks).
 */

import { useStudio } from "./StudioContext";

export function StickersButton() {
  const { earned, goal, unlocked, openStudio } = useStudio();
  return (
    <button type="button" className="stickers-btn" onClick={openStudio}>
      <span className="stickers-btn__icon" aria-hidden="true">★</span>
      <span className="stickers-btn__label">Your stickers</span>
      <span className="stickers-btn__count">{unlocked ? earned.length : `${earned.length}/${goal}`}</span>
    </button>
  );
}
