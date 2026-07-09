/**
 * Rasterize a project scene to a PNG file — the "save the project space to a
 * file" path. Same-origin bundled assets never taint the canvas, so toDataURL
 * works. The export canvas uses the same 4:3 frame as the on-screen scene and
 * draws the background "cover", so the file matches what the child arranged.
 */

import { TEAM_BY_ID } from "./assets";
import type { Placement } from "./types";

const EXPORT_W = 1280;
const EXPORT_H = 960; // 4:3, matches the on-screen canvas aspect

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number): void {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

export async function exportScenePng(roomUrl: string, placements: Placement[]): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W;
  canvas.height = EXPORT_H;
  const ctx = canvas.getContext("2d")!;

  const bg = await loadImage(roomUrl);
  drawCover(ctx, bg, EXPORT_W, EXPORT_H);

  for (const p of placements) {
    const asset = TEAM_BY_ID.get(p.stickerId);
    if (!asset) continue;
    const img = await loadImage(asset.url);
    const w = (p.widthPct / 100) * EXPORT_W;
    const h = w * (img.naturalHeight / img.naturalWidth);
    const x = (p.xPct / 100) * EXPORT_W - w / 2;
    const y = (p.yPct / 100) * EXPORT_H - h / 2;
    ctx.drawImage(img, x, y, w, h);
  }
  return canvas.toDataURL("image/png");
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
