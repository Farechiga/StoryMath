/**
 * The studio: your recruited team, and (once STICKER_GOAL is reached) the
 * ProjectSpace builder — pick a room, place/resize/remove your team, and save the
 * project (to the in-app gallery and/or a downloaded PNG file).
 */

import { useState } from "react";
import { useStudio } from "./StudioContext";
import { ROOMS, ROOM_BY_ID, TEAM_BY_ID } from "./assets";
import { SceneCanvas } from "./SceneCanvas";
import { downloadDataUrl, exportScenePng } from "./sceneExport";
import type { Placement, SavedProject } from "./types";
import { BrandMark } from "../components/BrandMark";

let placementSeq = 0;

export function StudioView() {
  const {
    earned,
    goal,
    unlocked,
    draftRoomId,
    draftPlacements,
    setDraftRoom,
    setDraftPlacements,
    saveProject,
    savedProjects,
    deleteProject,
    openMenu,
  } = useStudio();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);

  const team = earned.map((id) => TEAM_BY_ID.get(id)).filter(Boolean);
  const room = draftRoomId ? ROOM_BY_ID.get(draftRoomId) : undefined;

  const addTeammate = (stickerId: string) => {
    placementSeq += 1;
    const key = `k${Date.now().toString(36)}-${placementSeq}`;
    const jitter = () => Math.round((Math.random() * 16 - 8) * 10) / 10;
    setDraftPlacements([...draftPlacements, { key, stickerId, xPct: 50 + jitter(), yPct: 44 + jitter(), widthPct: 16 }]);
    setSelectedKey(key);
  };

  const save = () => {
    const project = saveProject(name || `Project ${savedProjects.length + 1}`);
    if (project) {
      // Saving graduates the team (context resets earned + draft), so the builder
      // closes and this note explains the fresh-team state.
      setName("");
      setSelectedKey(null);
      setSavedName(project.name);
    }
  };

  const download = async () => {
    if (!room) return;
    const url = await exportScenePng(room.url, draftPlacements);
    downloadDataUrl(url, `${(name || "project").replace(/\s+/g, "-").toLowerCase()}.png`);
  };

  return (
    <main className="app-shell studio">
      <header className="masthead">
        <button type="button" className="brand brand--link" onClick={openMenu}>
          <BrandMark className="brand__mark" />
          <span className="brand__title">StoryMath</span>
        </button>
        <div className="masthead__progress" aria-label="Team progress">
          <b>{earned.length}</b>
          {unlocked ? " teammates" : `/${goal} to unlock`}
        </div>
      </header>

      <h1 className="stage-title" style={{ marginBottom: "var(--sp-2)" }}>Your project team</h1>

      {savedName && earned.length === 0 && (
        <div className="note note--good" role="status">
          <strong>“{savedName}”</strong> saved to your gallery below. Your team graduated — recruit a
          new team of {goal} to build another sticker book.
        </div>
      )}

      {team.length === 0 ? (
        <p className="prose">Solve a word problem to recruit your first teammate.</p>
      ) : (
        <div className="team-roster">
          {team.map((s) => (
            <figure key={s!.id} className="team-chip">
              <img src={s!.url} alt={s!.name} draggable={false} />
              <figcaption>{s!.name}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {!unlocked && (
        <div className="studio-lock">
          <p className="prose">
            Recruit <b>{Math.max(0, goal - earned.length)}</b> more teammate
            {goal - earned.length === 1 ? "" : "s"} to unlock your ProjectSpace.
          </p>
          <div className="lock-meter" aria-hidden="true">
            {Array.from({ length: goal }, (_, i) => (
              <span key={i} className={`lock-pip${i < earned.length ? " lock-pip--on" : ""}`} />
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={openMenu}>
              Go to the problems
            </button>
          </div>
        </div>
      )}

      {unlocked && (
        <section className="builder">
          <hr className="divider" />
          <h2 className="stage-title" style={{ fontSize: "1.2rem" }}>Choose a ProjectSpace</h2>
          <div className="room-picker">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`room-tile${draftRoomId === r.id ? " room-tile--active" : ""}`}
                style={{ backgroundImage: `url(${r.url})` }}
                onClick={() => setDraftRoom(r.id)}
                aria-label={r.name}
              >
                <span className="room-tile__name">{r.name}</span>
              </button>
            ))}
          </div>

          {room && (
            <div className="builder__scene">
              <p className="builder__hint">Tap a teammate to add them, then drag to place and use the corner to resize.</p>
              <SceneCanvas
                roomUrl={room.url}
                placements={draftPlacements}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onChange={setDraftPlacements}
              />

              <div className="tray" role="list" aria-label="Your team">
                {team.map((s) => (
                  <button key={s!.id} type="button" className="tray__item" role="listitem" onClick={() => addTeammate(s!.id)}>
                    <img src={s!.url} alt={s!.name} draggable={false} />
                  </button>
                ))}
              </div>

              <div className="builder__save">
                <input
                  className="text-input"
                  placeholder={`Project ${savedProjects.length + 1}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Project name"
                />
                <button type="button" className="btn btn--primary" onClick={save} disabled={draftPlacements.length === 0}>
                  Save sticker book
                </button>
                <button type="button" className="btn btn--ghost" onClick={download} disabled={draftPlacements.length === 0}>
                  Download PNG
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => { setDraftPlacements([]); setSelectedKey(null); }} disabled={draftPlacements.length === 0}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {savedProjects.length > 0 && (
        <section className="saved">
          <hr className="divider" />
          <h2 className="stage-title" style={{ fontSize: "1.2rem" }}>Saved projects</h2>
          <div className="saved-grid">
            {savedProjects.map((p) => (
              <SavedProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function SceneThumb({ roomId, placements }: { roomId: string; placements: Placement[] }) {
  const room = ROOM_BY_ID.get(roomId);
  if (!room) return null;
  return (
    <div className="scene-thumb" style={{ backgroundImage: `url(${room.url})` }}>
      {placements.map((p) => {
        const a = TEAM_BY_ID.get(p.stickerId);
        return a ? (
          <img key={p.key} src={a.url} alt="" draggable={false} style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, width: `${p.widthPct}%` }} />
        ) : null;
      })}
    </div>
  );
}

function SavedProjectCard({ project, onDelete }: { project: SavedProject; onDelete: () => void }) {
  const download = async () => {
    const room = ROOM_BY_ID.get(project.roomId);
    if (!room) return;
    const url = await exportScenePng(room.url, project.placements);
    downloadDataUrl(url, `${project.name.replace(/\s+/g, "-").toLowerCase()}.png`);
  };
  return (
    <figure className="saved-card">
      <SceneThumb roomId={project.roomId} placements={project.placements} />
      <figcaption className="saved-card__meta">
        <span className="saved-card__name">{project.name}</span>
        <span className="saved-card__team">{project.team.length} teammates</span>
        <span className="saved-card__actions">
          <button type="button" className="linkish" onClick={download}>Download</button>
          <button type="button" className="linkish linkish--danger" onClick={onDelete}>Delete</button>
        </span>
      </figcaption>
    </figure>
  );
}
