/**
 * Shown right after a word problem is solved: the child recruits one project team
 * member. Candidates (everyone not yet on the team) are SHUFFLED fresh each time
 * the modal opens — so she isn't scrolling past the same faces in the same order —
 * and shown one-at-a-time, large, with left/right arrows to browse. Choosing is
 * the only exit (there is always someone left to recruit).
 */

import { useEffect, useMemo, useState } from "react";
import { useStudio } from "./StudioContext";
import { TEAM_STICKERS, type TeamSticker } from "./assets";
import { STICKER_GOAL } from "./types";

function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function StickerRewardModal() {
  const { pendingAward } = useStudio();
  if (!pendingAward) return null;
  // Remount per award: reshuffles the order and resets the carousel to the start.
  return <RewardChooser key={pendingAward} />;
}

function RewardChooser() {
  const { earned, chooseSticker } = useStudio();

  // Shuffle once at mount (a fresh order for this award).
  const options = useMemo<TeamSticker[]>(
    () => shuffle(TEAM_STICKERS.filter((s) => !earned.includes(s.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [i, setI] = useState(0);
  const count = options.length;
  const prev = () => setI((x) => (x - 1 + count) % count);
  const next = () => setI((x) => (x + 1) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (count === 0) return null;
  const current = options[i]!;
  const prevItem = options[(i - 1 + count) % count]!;
  const nextItem = options[(i + 1) % count]!;
  const remainingToUnlock = Math.max(0, STICKER_GOAL - (earned.length + 1));

  return (
    <div className="reward-overlay" role="dialog" aria-modal="true" aria-label="Recruit a teammate">
      <div className="reward-card">
        <span className="eyebrow">Problem solved</span>
        <h2 className="reward-card__title">Recruit a project teammate</h2>
        <p className="reward-card__sub">
          {remainingToUnlock > 0
            ? `Browse and pick someone. ${remainingToUnlock} more unlocks your ProjectSpace.`
            : "Browse and pick someone — this recruit unlocks your ProjectSpace!"}
        </p>

        <div className="recruit-carousel">
          <button type="button" className="recruit-arrow" aria-label="Previous teammate" onClick={prev}>
            ‹
          </button>
          <div className="recruit-track">
            {count > 1 && (
              <img
                className="recruit-peek recruit-peek--prev"
                src={prevItem.url}
                alt=""
                aria-hidden="true"
                draggable={false}
                onClick={prev}
              />
            )}
            <img className="recruit-hero" key={current.id} src={current.url} alt={current.name} draggable={false} />
            {count > 1 && (
              <img
                className="recruit-peek recruit-peek--next"
                src={nextItem.url}
                alt=""
                aria-hidden="true"
                draggable={false}
                onClick={next}
              />
            )}
          </div>
          <button type="button" className="recruit-arrow" aria-label="Next teammate" onClick={next}>
            ›
          </button>
        </div>

        <p className="recruit-name">{current.name}</p>
        <p className="recruit-count">{i + 1} of {count}</p>

        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn--primary" onClick={() => chooseSticker(current.id)}>
            Add {current.name} to the team
          </button>
        </div>
      </div>
    </div>
  );
}
