import type { ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import draftProblemHandler from "../../api/draft-problem";
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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Vercel OpenAI draft API", () => {
  it("validates the authoring secret and requests structured StoryMath JSON from OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    vi.stubEnv("STORYMATH_DRAFTER_MODEL", "gpt-test-drafter");

    const modelSpec = {
      ...(libraryProblem as ProblemSpec),
      metadata: {
        ...(libraryProblem as ProblemSpec).metadata,
        curiosityNote: null,
      },
      story: {
        ...(libraryProblem as ProblemSpec).story,
        closingNoteTemplate: null,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(modelSpec) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "secret phrase",
          fallbackTitle: "Underlibrary carts",
          rawProblem:
            "Tilly and Oskar received 8 boxes of classics. Each box has 30 books. The carts can hold 50 books each. Will 5 carts be enough?",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.bodyText ?? "{}");
    expect(payload.ok).toBe(true);
    expect(payload.source).toBe("openai");
    expect(payload.model).toBe("gpt-test-drafter");
    expect(payload.spec.id).toBe((libraryProblem as ProblemSpec).id);
    expect(payload.spec.metadata.curiosityNote).toBeUndefined();
    expect(payload.spec.story.closingNoteTemplate).toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.openai.com/v1/responses");
    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(request.method).toBe("POST");
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer sk-storymath-test");
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe("gpt-test-drafter");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.name).toBe("storymath_problem_spec");
    expect(body.input[1].content).toContain("Will 5 carts be enough?");
  });

  it("rejects requests with the wrong authoring secret before calling OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-storymath-test");
    vi.stubEnv("STORYMATH_SAVE_SECRET", "secret phrase");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = responseDouble();
    await draftProblemHandler(
      {
        method: "POST",
        body: {
          secret: "wrong",
          rawProblem: "A test problem",
        },
      } as never,
      res,
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.bodyText ?? "{}").error).toMatch(/secret/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
