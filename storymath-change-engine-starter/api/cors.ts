import type { IncomingMessage, ServerResponse } from "node:http";

const DEFAULT_ALLOWED_ORIGINS = ["https://farechiga.github.io"];
const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type";
const MAX_AGE_SECONDS = "86400";

function configuredOrigins(): string[] {
  const raw = process.env.STORYMATH_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requestOrigin(req: IncomingMessage): string | undefined {
  const origin = req.headers?.origin;
  if (Array.isArray(origin)) return origin[0];
  return origin;
}

export function applyAuthoringCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = requestOrigin(req);
  if (!origin) return true;

  const origins = configuredOrigins();
  const allowed = origins.includes("*") || origins.includes(origin);
  if (!allowed) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Max-Age", MAX_AGE_SECONDS);
  res.setHeader("Vary", "Origin");
  return true;
}
