/**
 * Studio art, resolved at build time from src/assets via Vite's import.meta.glob
 * (URLs, hashed + emitted as separate files — only rendered images are fetched).
 * This replaces the reference game's generated index.json manifests.
 */

export interface TeamSticker {
  id: string;
  name: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  url: string;
}

function prettify(stem: string): string {
  return stem
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stem(path: string): string {
  return path.split("/").pop()!.replace(/\.[^.]+$/, "");
}

const teamModules = import.meta.glob("../assets/stickers/team/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Recruitable project team members, sorted by name. */
export const TEAM_STICKERS: TeamSticker[] = Object.entries(teamModules)
  .map(([path, url]) => ({ id: stem(path), name: prettify(stem(path)), url: url as string }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

export const TEAM_BY_ID = new Map(TEAM_STICKERS.map((s) => [s.id, s]));

const roomModules = import.meta.glob("../assets/projectrooms/*.{jpeg,jpg,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Selectable ProjectSpace backgrounds, sorted by name. */
export const ROOMS: Room[] = Object.entries(roomModules)
  .map(([path, url]) => ({ id: stem(path), name: prettify(stem(path)), url: url as string }))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

export const ROOM_BY_ID = new Map(ROOMS.map((r) => [r.id, r]));
