import type { ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import saveProblemHandler from "../../api/save-problem";
import libraryProblem from "../../data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json";
import type { ProblemSpec } from "../../src/model/problemSpec";

type ResponseDouble = ServerResponse & {
  bodyText?: string;
};

function responseDouble(): ResponseDouble {
  return {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(function end(this: ResponseDouble, payload?: unknown) {
      this.bodyText = String(payload ?? "");
    }),
  } as unknown as ResponseDouble;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Vercel authoring save API", () => {
  it("validates the authoring secret and commits problem JSON through GitHub", async () => {
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    vi.stubEnv("STORYMATH_GITHUB_TOKEN", "github_pat_test");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commit: { sha: "abcdef1234567890", html_url: "https://github.com/Farechiga/StoryMath/commit/abcdef1" },
            content: { path: "storymath-change-engine-starter/data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await saveProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          spec: libraryProblem as ProblemSpec,
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    expect(payload.ok).toBe(true);
    expect(payload.path).toBe("storymath-change-engine-starter/data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json");
    expect(payload.commitSha).toBe("abcdef1234567890");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toBe(
      "https://api.github.com/repos/Farechiga/StoryMath/contents/storymath-change-engine-starter/data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json",
    );
    const putRequest = JSON.parse(String(fetchMock.mock.calls[1]![1]!.body));
    expect(putRequest.branch).toBe("main");
    expect(putRequest.message).toContain("Save StoryMath problem:");
    expect(putRequest.content).toBe(Buffer.from(`${JSON.stringify(libraryProblem, null, 2)}\n`, "utf8").toString("base64"));
  });

  it("adds publishedAt when a new problem has no explicit ordering metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T02:08:37.000Z"));
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    vi.stubEnv("STORYMATH_GITHUB_TOKEN", "github_pat_test");

    const unorderedProblem = JSON.parse(JSON.stringify(libraryProblem)) as ProblemSpec;
    delete unorderedProblem.metadata.catalogOrder;
    delete unorderedProblem.metadata.publishedAt;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commit: { sha: "abcdef1234567890", html_url: "https://github.com/Farechiga/StoryMath/commit/abcdef1" },
            content: { path: "storymath-change-engine-starter/data/problems/tilly_and_oscar_s_library_of_congress_search-v1.json" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await saveProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          spec: unorderedProblem,
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const putRequest = JSON.parse(String(fetchMock.mock.calls[1]![1]!.body));
    const saved = JSON.parse(Buffer.from(String(putRequest.content), "base64").toString("utf8")) as ProblemSpec;
    expect(saved.metadata.publishedAt).toBe("2026-10-10T02:08:37.000Z");
  });

  it("rejects requests with the wrong authoring secret before calling GitHub", async () => {
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    vi.stubEnv("STORYMATH_GITHUB_TOKEN", "github_pat_test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await saveProblemHandler(
      {
        method: "POST",
        body: {
          secret: "wrong",
          spec: libraryProblem as ProblemSpec,
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.bodyText ?? "{}").error).toMatch(/secret/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
