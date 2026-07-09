/**
 * The home menu: pick any of the word problems to model. Solved problems are
 * marked; the header carries the "Your stickers" entry point and team progress.
 */

import { useState } from "react";
import { useStudio } from "./StudioContext";
import { StickersButton } from "./StickersButton";
import { PROBLEMS } from "./problemCatalog";
import { BrandMark } from "../components/BrandMark";
import { CubeOrnament } from "../ornament/CubeOrnament";

export function MenuView() {
  const { solvedProblemIds, playProblem, earned, goal, unlocked } = useStudio();

  // A fresh cube arrangement every time the home page mounts — never hard-coded
  // to one configuration. Held in state so it stays put across re-renders within
  // a single visit, then re-seeds when you leave and come back.
  const [ornamentSeed] = useState(() => `menu-${Math.floor(Math.random() * 1e9)}`);

  // Unsolved problems rise to the top; solved ones settle to the bottom. Array
  // sort is stable, so the catalog order is preserved within each group.
  const orderedProblems = [...PROBLEMS].sort(
    (a, b) => Number(solvedProblemIds.includes(a.id)) - Number(solvedProblemIds.includes(b.id)),
  );

  return (
    <main className="app-shell menu">
      {/* Quiet cube atmosphere in the right column, sitting under the stickers
          pill — same scale as the problem pages (region="right"). The problem
          list is narrower and stacks above it, so the rows overlap the cluster
          as the viewport tightens. */}
      <CubeOrnament seed={ornamentSeed} region="right" />

      <header className="masthead">
        <div className="brand">
          <BrandMark className="brand__mark" />
          <span className="brand__title">StoryMath</span>
        </div>
        <StickersButton />
      </header>

      <h1 className="stage-title">Pick a problem to model</h1>
      <p className="prose menu__progress">
        Solved <b>{solvedProblemIds.length}</b> of {PROBLEMS.length}.{" "}
        {unlocked
          ? "Your ProjectSpace is unlocked — open Your stickers to build it."
          : `Recruit ${Math.max(0, goal - earned.length)} more teammate${goal - earned.length === 1 ? "" : "s"} to unlock your ProjectSpace.`}
      </p>

      <ul className="problem-list">
        {orderedProblems.map((p) => {
          const solved = solvedProblemIds.includes(p.id);
          return (
            <li key={p.id}>
              <button type="button" className="problem-card" onClick={() => playProblem(p.id)}>
                <span className="problem-card__main">
                  <span className="problem-card__title">{p.title}</span>
                  <span className="problem-card__theme">{p.theme}</span>
                </span>
                <span className={`problem-card__status${solved ? " problem-card__status--solved" : ""}`}>
                  {solved ? "Solved ✓" : `Grades ${p.gradeBand}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
