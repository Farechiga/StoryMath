/**
 * Top-level view router for the whole experience: the menu (pick a problem), the
 * game (play a problem), and the studio (team + ProjectSpace builder). The sticker
 * reward modal overlays every view. The game keeps its own pearlescent background
 * + cube ornament; the other views get the pearl field from here.
 */

import { useEffect, useMemo, useState } from "react";
import App from "./App";
import { PearlBackground } from "./components/PearlBackground";
import { StudioProvider, useStudio } from "./studio/StudioContext";
import { AuthoringView } from "./studio/AuthoringView";
import { MenuView } from "./studio/MenuView";
import { StudioView } from "./studio/StudioView";
import { StickerRewardModal } from "./studio/StickerRewardModal";
import { UnlockCelebration } from "./studio/UnlockCelebration";
import { loadProblemById } from "./studio/problemCatalog";
import { TransformationSpaceDemo } from "./prototypes/TransformationSpaceDemo";

function RootView() {
  const { view, selectedProblemId } = useStudio();
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const problem = useMemo(
    () => (selectedProblemId ? loadProblemById(selectedProblemId) : null),
    [selectedProblemId],
  );

  if (hash === "#transformation-space") {
    return (
      <>
        <TransformationSpaceDemo />
        <StickerRewardModal />
      </>
    );
  }

  return (
    <>
      {view !== "play" && <PearlBackground />}
      {view === "menu" && <MenuView />}
      {view === "authoring" && <AuthoringView />}
      {view === "studio" && <StudioView />}
      {view === "play" && problem && <App key={problem.id} problem={problem} />}
      <StickerRewardModal />
      <UnlockCelebration />
    </>
  );
}

export function Root() {
  return (
    <StudioProvider initialView="menu">
      <RootView />
    </StudioProvider>
  );
}
