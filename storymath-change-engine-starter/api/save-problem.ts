import type { IncomingMessage, ServerResponse } from "node:http";
import { validateProblem } from "../src/domain/validateProblem";
import type { ProblemSpec } from "../src/model/problemSpec";

type RequestWithBody = IncomingMessage & {
  body?: unknown;
};

type SaveRequestBody = {
  secret?: string;
  spec?: ProblemSpec;
};

type GitHubContentPayload = {
  sha?: string;
  message?: string;
  errors?: Array<{ message?: string }>;
  commit?: {
    sha?: string;
    html_url?: string;
  };
  content?: {
    path?: string;
  };
};

const DEFAULT_OWNER = "Farechiga";
const DEFAULT_REPO = "StoryMath";
const DEFAULT_BRANCH = "main";
const DEFAULT_PROBLEM_PATH_PREFIX = "storymath-change-engine-starter/data/problems";

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

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

async function parsedBody(req: RequestWithBody): Promise<SaveRequestBody> {
  if (typeof req.body === "object" && req.body !== null) return req.body as SaveRequestBody;
  if (typeof req.body === "string") return JSON.parse(req.body) as SaveRequestBody;
  return JSON.parse(await readRequestBody(req)) as SaveRequestBody;
}

function safeProblemId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9_-]*$/.test(id);
}

function githubJsonHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function githubErrorMessage(payload: GitHubContentPayload, fallback: string): string {
  const detail = payload.errors?.map((error) => error.message).filter(Boolean).join(" ");
  return [payload.message, detail].filter(Boolean).join(" ") || fallback;
}

function githubContentsUrl(owner: string, repo: string, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST to save a problem draft." });
    return;
  }

  try {
    const expectedSecret = process.env.STORYMATH_SAVE_SECRET?.trim();
    const githubToken = process.env.STORYMATH_GITHUB_TOKEN?.trim();
    if (!expectedSecret) {
      sendJson(res, 500, { ok: false, error: "Vercel is missing STORYMATH_SAVE_SECRET." });
      return;
    }
    if (!githubToken) {
      sendJson(res, 500, { ok: false, error: "Vercel is missing STORYMATH_GITHUB_TOKEN." });
      return;
    }

    const body = await parsedBody(req);
    if (body.secret !== expectedSecret) {
      sendJson(res, 401, { ok: false, error: "Authoring save secret did not match." });
      return;
    }
    const spec = body.spec;
    if (!spec || typeof spec !== "object") {
      sendJson(res, 400, { ok: false, error: "Request body must include a problem spec." });
      return;
    }
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

    const owner = process.env.STORYMATH_GITHUB_OWNER?.trim() || DEFAULT_OWNER;
    const repo = process.env.STORYMATH_GITHUB_REPO?.trim() || DEFAULT_REPO;
    const branch = process.env.STORYMATH_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH;
    const pathPrefix = process.env.STORYMATH_PROBLEM_PATH_PREFIX?.trim() || DEFAULT_PROBLEM_PATH_PREFIX;
    const githubPath = `${pathPrefix}/${spec.id}.json`;
    const url = githubContentsUrl(owner, repo, githubPath);
    const headers = githubJsonHeaders(githubToken);

    const existingResponse = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
    let existingSha: string | undefined;
    if (existingResponse.status !== 404) {
      const existingPayload = (await existingResponse.json().catch(() => ({}))) as GitHubContentPayload;
      if (!existingResponse.ok) {
        throw new Error(githubErrorMessage(existingPayload, "Could not check the existing GitHub file."));
      }
      existingSha = existingPayload.sha;
    }

    const serialized = `${JSON.stringify(spec, null, 2)}\n`;
    const saveResponse = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Save StoryMath problem: ${spec.metadata.title}`,
        content: Buffer.from(serialized, "utf8").toString("base64"),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });
    const savePayload = (await saveResponse.json().catch(() => ({}))) as GitHubContentPayload;
    if (!saveResponse.ok) {
      throw new Error(githubErrorMessage(savePayload, "Could not commit the problem JSON to GitHub."));
    }

    sendJson(res, 200, {
      ok: true,
      id: spec.id,
      path: githubPath,
      commitSha: savePayload.commit?.sha,
      commitUrl: savePayload.commit?.html_url,
      issues,
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save problem draft.",
    });
  }
}
