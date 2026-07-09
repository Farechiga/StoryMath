/**
 * A mini celebration shown the moment the child recruits their fifth teammate
 * (the team is complete and the ProjectSpace unlocks). It prompts them to go
 * build their sticker book. Pure CSS confetti — no library.
 */

import { useStudio } from "./StudioContext";
import { STICKER_GOAL } from "./types";

const CONFETTI_COLORS = ["#6886EC", "#53A0B0", "#e0895f", "#6d5ce6", "#2e9e7a"];
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 5.5 + 2) % 100,
  delay: (i % 9) * 0.16,
  duration: 1.8 + (i % 5) * 0.28,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
}));

export function UnlockCelebration() {
  const { justUnlocked, dismissUnlock, openStudio } = useStudio();
  if (!justUnlocked) return null;

  return (
    <div className="reward-overlay" role="dialog" aria-modal="true" aria-label="Team complete">
      <div className="reward-card celebrate-card">
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="confetti__bit"
              style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
            />
          ))}
        </div>
        <div className="celebrate-body">
          <div className="celebrate-emoji" aria-hidden="true">🎉</div>
          <h2 className="reward-card__title">Your project team is ready!</h2>
          <p className="reward-card__sub">
            You recruited {STICKER_GOAL} teammates. Now build your ProjectSpace — pick a room, place your team, and save your sticker book.
          </p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                openStudio();
                dismissUnlock();
              }}
            >
              Make your sticker book
            </button>
            <button type="button" className="btn btn--ghost" onClick={dismissUnlock}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
