/// <reference types="vitest/config" />
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { validateProblem } from "./src/domain/validateProblem";
import type { ProblemSpec } from "./src/model/problemSpec";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const problemsDir = path.resolve(configDir, "data/problems");
const authoringSaveRoute = "/__storymath_authoring/problems";
const productionBasePath = process.env.STORYMATH_BASE_PATH ?? (process.env.VERCEL ? "/" : "/StoryMath/");

function readRequestBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > limitBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function safeProblemId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9_-]*$/.test(id);
}

function storyMathAuthoringSavePlugin(): Plugin {
  return {
    name: "storymath-authoring-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(authoringSaveRoute, async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "Use POST to save a problem draft." });
          return;
        }

        try {
          const spec = JSON.parse(await readRequestBody(req)) as ProblemSpec;
          if (!safeProblemId(spec.id)) {
            sendJson(res, 400, {
              ok: false,
              error: "Problem id must use only lowercase letters, numbers, underscores, and hyphens.",
            });
            return;
          }

          const issues = validateProblem(spec);
          const errors = issues.filter((issue) => issue.severity === "error");
          if (errors.length > 0) {
            sendJson(res, 422, { ok: false, error: "Problem validation failed.", issues });
            return;
          }

          const fileName = `${spec.id}.json`;
          const filePath = path.join(problemsDir, fileName);
          if (path.dirname(filePath) !== problemsDir) {
            sendJson(res, 400, { ok: false, error: "Resolved problem path is outside data/problems." });
            return;
          }

          const serialized = `${JSON.stringify(spec, null, 2)}\n`;
          await fs.mkdir(problemsDir, { recursive: true });
          await fs.writeFile(filePath, serialized, "utf8");

          const relativePath = `data/problems/${fileName}`;
          setTimeout(() => server.ws.send({ type: "full-reload" }), 250);
          sendJson(res, 200, {
            ok: true,
            id: spec.id,
            path: relativePath,
            sha256: createHash("sha256").update(serialized).digest("hex"),
            issues,
          });
        } catch (error) {
          sendJson(res, 400, {
            ok: false,
            error: error instanceof Error ? error.message : "Could not save problem draft.",
          });
        }
      });
    },
  };
}

// Domain data lives at the repo root under data/. The engine imports the
// canonical problem JSON directly so there is a single source of truth.
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project at farechiga.github.io/StoryMath/, so the
  // production build is based under /StoryMath/; local dev stays at /.
  base: command === "build" ? productionBasePath : "/",
  plugins: [react(), storyMathAuthoringSavePlugin()],
  server: {
    fs: {
      // Allow importing the JSON problem library that sits beside src/.
      allow: [".."],
    },
  },
  test: {
    // Default to Node; UI tests opt into jsdom via a file-level directive.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: false,
  },
}));
