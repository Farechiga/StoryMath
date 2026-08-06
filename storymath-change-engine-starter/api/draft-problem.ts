import type { IncomingMessage, ServerResponse } from "node:http";
import type { ProblemSpec } from "../src/model/problemSpec";

type RequestWithBody = IncomingMessage & {
  body?: unknown;
};

type DraftRequestBody = {
  secret?: string;
  rawProblem?: string;
  fallbackTitle?: string;
};

type DraftResponsePayload = {
  output_text?: string;
  error?: {
    message?: string;
  };
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type DraftShapeError = {
  severity: "error";
  message: string;
};

const DEFAULT_MODEL = "gpt-5";
const MAX_RAW_PROBLEM_CHARS = 8_000;

const RELATIONSHIP_TEMPLATE_IDS = [
  "additive_comparison_decrease",
  "additive_comparison_increase",
  "part_part_whole",
  "start_change_end_increase",
  "start_change_end_decrease",
  "multiplication_equal_groups",
  "division_equal_sharing",
];

const FORMULA_IDS = [
  "bigger_minus_difference_equals_smaller",
  "smaller_plus_difference_equals_bigger",
  "bigger_minus_smaller_equals_difference",
  "part_a_plus_part_b_equals_whole",
  "whole_minus_part_a_equals_part_b",
  "whole_minus_part_b_equals_part_a",
  "start_plus_change_equals_end",
  "start_minus_change_equals_end",
  "end_minus_start_equals_change",
  "end_plus_change_equals_start",
  "groups_times_items_equals_total",
  "items_times_groups_equals_total",
  "total_divided_by_groups_equals_items",
  "total_divided_by_items_equals_groups",
];

const OPERATORS = ["+", "-", "×", "÷"];
const DIRECTIONS = ["increase", "decrease", "same", "combine", "scale", "split", "unknown"];
const VISUAL_MODEL_TYPES = [
  "comparison_gap_bar",
  "part_whole_bar",
  "before_change_after_bridge",
  "number_line_jump",
  "repeated_groups_grid",
  "equal_shares_tray",
  "array_grid",
  "ratio_strip",
  "causal_chain_formula",
  "data_table",
  "dot_plot",
  "pictograph",
  "line_over_time",
  "subtraction_span",
];

const SYSTEM_PROMPT = `
You draft StoryMath problem packs from raw word problems.

Return exactly one JSON object shaped as a StoryMath ProblemSpec. Do not include markdown.

Core rules:
- Preserve the story's meaning. Do not invent a different premise, title, characters, or object nouns.
- Replace every modeled number in child-facing prose with field-merge tokens: {quantity:id} when the noun should render, {value:id} for money/scalar values inside phrases like £{value:price_per_bookmark}.
- Prefer precise, story-specific quantity ids: price_per_bookmark, books_per_box, cart_capacity, total_books, not price_per_item unless the story gives no noun.
- Use "approximately" in the wording when the source says about/approximately; avoid "about" in generated prompts.
- Use one step per arithmetic operation. For yes/no capacity or affordability stories, compute the compared quantities first, then put the comparison in recap.decisionQuestion.
- For capacity/enough stories like boxes of books and carts, use two multiplication steps: boxes × books per box = total books; carts × books per cart = cart capacity; then answer yes/no by comparing capacity to total.
- For sales affordability stories, use months × items per month = total items; total items × price per item = revenue; then answer yes/no by comparing revenue to cost.
- For shelves/books searched by friends, use shelves × books per shelf = total books; total books ÷ friends = books per friend.
- For grouped books then sold/traded/removed stories, use groups × books per group = total before; total before − removed books = books left.
- Each step must map all roles required by its relationshipTemplateId, use compatible formula ids, have operatorOptions ["+","-","×","÷"], and exactly one operatorExperiment with narrativeFit "actual".
- Derived quantities should include expectedValueForFixture when values can be computed from the story.
- Keep gradeBand "3-4" unless the prompt explicitly indicates another band.
`.trim();

const PROBLEM_SPEC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "metadata",
    "dimension",
    "storyChrome",
    "story",
    "quantities",
    "steps",
    "operatorExperiments",
    "recap",
  ],
  properties: {
    id: { type: "string" },
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["title", "theme", "gradeBand", "factualStatus", "tags", "curiosityNote", "catalogOrder", "publishedAt"],
      properties: {
        title: { type: "string" },
        theme: { type: "string" },
        gradeBand: { type: "string" },
        factualStatus: { enum: ["fictionalized", "inspired_by_real_world", "realistic", null] },
        tags: { type: "array", items: { type: "string" } },
        curiosityNote: { type: ["string", "null"] },
        catalogOrder: { type: ["number", "null"] },
        publishedAt: { type: ["string", "null"] },
      },
    },
    dimension: {
      type: "object",
      additionalProperties: false,
      required: [
        "kind",
        "increaseLabel",
        "decreaseLabel",
        "sameLabel",
        "increaseLabelLower",
        "decreaseLabelLower",
        "sameLabelLower",
        "increaseSentence",
        "decreaseSentence",
      ],
      properties: {
        kind: { type: "string" },
        increaseLabel: { type: "string" },
        decreaseLabel: { type: "string" },
        sameLabel: { type: "string" },
        increaseLabelLower: { type: ["string", "null"] },
        decreaseLabelLower: { type: ["string", "null"] },
        sameLabelLower: { type: ["string", "null"] },
        increaseSentence: { type: ["string", "null"] },
        decreaseSentence: { type: ["string", "null"] },
      },
    },
    storyChrome: {
      type: "object",
      additionalProperties: false,
      required: [
        "openingEyebrow",
        "startCta",
        "finishCta",
        "completionTitle",
        "stepProgressVerb",
        "groupNoun",
        "learnerRole",
      ],
      properties: {
        openingEyebrow: { type: "string" },
        startCta: { type: "string" },
        finishCta: { type: "string" },
        completionTitle: { type: ["string", "null"] },
        stepProgressVerb: { type: ["string", "null"] },
        groupNoun: { type: ["string", "null"] },
        learnerRole: { type: ["string", "null"] },
      },
    },
    story: {
      type: "object",
      additionalProperties: false,
      required: ["briefTemplate", "causalEvent", "closingNoteTemplate"],
      properties: {
        briefTemplate: { type: "string" },
        causalEvent: { type: ["string", "null"] },
        closingNoteTemplate: { type: ["string", "null"] },
      },
    },
    quantities: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "label",
          "unit",
          "unitSingular",
          "unitPlural",
          "value",
          "expectedValueForFixture",
          "derived",
          "semanticRole",
          "visibility",
          "allowLiteralNumbers",
          "visualization",
        ],
        properties: {
          id: { type: "string" },
          label: {
            type: "object",
            additionalProperties: false,
            required: ["child", "compact", "lowercase"],
            properties: {
              child: { type: "string" },
              compact: { type: "string" },
              lowercase: { type: ["string", "null"] },
            },
          },
          unit: { type: "string" },
          unitSingular: { type: ["string", "null"] },
          unitPlural: { type: ["string", "null"] },
          value: { type: ["number", "null"] },
          expectedValueForFixture: { type: ["number", "null"] },
          derived: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["formulaId", "operands"],
                properties: {
                  formulaId: { enum: FORMULA_IDS },
                  operands: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
              },
            ],
          },
          semanticRole: { type: ["string", "null"] },
          visibility: { enum: ["given", "find", "revealed_after_step"] },
          allowLiteralNumbers: { type: ["boolean", "null"] },
          visualization: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["colorToken", "storyLabel"],
                properties: {
                  colorToken: { type: ["string", "null"] },
                  storyLabel: { type: ["string", "null"] },
                },
              },
            ],
          },
        },
      },
    },
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "order",
          "prompt",
          "reasoningPrompt",
          "relationshipTemplateId",
          "roleToQuantityId",
          "goalQuantityId",
          "acceptedEquationFormIds",
          "preferredEquationFormId",
          "expectedDirection",
          "operatorOptions",
          "backwardCheck",
          "visualization",
        ],
        properties: {
          id: { type: "string" },
          order: { type: "number" },
          prompt: { type: "string" },
          reasoningPrompt: { type: "string" },
          relationshipTemplateId: { enum: RELATIONSHIP_TEMPLATE_IDS },
          roleToQuantityId: {
            type: "object",
            additionalProperties: { type: "string" },
          },
          goalQuantityId: { type: "string" },
          acceptedEquationFormIds: { type: "array", minItems: 1, items: { enum: FORMULA_IDS } },
          preferredEquationFormId: { enum: FORMULA_IDS },
          expectedDirection: { enum: DIRECTIONS },
          operatorOptions: { type: "array", items: { enum: OPERATORS } },
          backwardCheck: {
            type: "object",
            additionalProperties: false,
            required: ["prompt", "acceptedEquationFormIds"],
            properties: {
              prompt: { type: "string" },
              acceptedEquationFormIds: { type: "array", minItems: 1, items: { enum: FORMULA_IDS } },
            },
          },
          visualization: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["relationshipType", "visualModel", "referenceWholeRole", "removedRole", "remainderRole"],
                properties: {
                  relationshipType: { type: ["string", "null"] },
                  visualModel: { enum: [...VISUAL_MODEL_TYPES, null] },
                  referenceWholeRole: { type: ["string", "null"] },
                  removedRole: { type: ["string", "null"] },
                  remainderRole: { type: ["string", "null"] },
                },
              },
            ],
          },
        },
      },
    },
    operatorExperiments: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "stepId",
          "operator",
          "narrativeFit",
          "visualModel",
          "shortReaction",
          "alternateWorldTemplate",
          "groupNoun",
        ],
        properties: {
          stepId: { type: "string" },
          operator: { enum: OPERATORS },
          narrativeFit: { enum: ["actual", "different_story", "different_question"] },
          visualModel: { enum: [...VISUAL_MODEL_TYPES, null] },
          shortReaction: { type: ["string", "null"] },
          alternateWorldTemplate: { type: ["string", "null"] },
          groupNoun: { type: ["string", "null"] },
        },
      },
    },
    recap: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "causalChain", "calcFromStepId", "totalVisualStepId", "dataQuestion", "decisionQuestion"],
      properties: {
        headline: { type: "string" },
        causalChain: { type: "array", minItems: 1, items: { type: "string" } },
        calcFromStepId: { type: "string" },
        totalVisualStepId: { type: ["string", "null"] },
        dataQuestion: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "correctQuantityId", "distractorQuantityIds", "correctFeedback", "incorrectFeedback"],
          properties: {
            prompt: { type: "string" },
            correctQuantityId: { type: "string" },
            distractorQuantityIds: { type: "array", items: { type: "string" } },
            correctFeedback: { type: "string" },
            incorrectFeedback: { type: "string" },
          },
        },
        decisionQuestion: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              required: ["prompt", "correctAnswer", "correctFeedback", "incorrectFeedback"],
              properties: {
                prompt: { type: "string" },
                correctAnswer: { enum: ["yes", "no"] },
                correctFeedback: { type: "string" },
                incorrectFeedback: { type: "string" },
              },
            },
          ],
        },
      },
    },
  },
};

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readRequestBody(req: IncomingMessage, limitBytes = 100_000): Promise<string> {
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

async function parsedBody(req: RequestWithBody): Promise<DraftRequestBody> {
  if (typeof req.body === "object" && req.body !== null) return req.body as DraftRequestBody;
  if (typeof req.body === "string") return JSON.parse(req.body) as DraftRequestBody;
  return JSON.parse(await readRequestBody(req)) as DraftRequestBody;
}

function safeProblemId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9][a-z0-9_-]*$/.test(id);
}

function compactTitle(rawProblem: string, fallbackTitle: string | undefined): string {
  const firstLine = rawProblem
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine && !/[?.!]$/.test(firstLine) ? firstLine : fallbackTitle?.trim() || "New StoryMath problem";
}

function extractResponseText(payload: DraftResponsePayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const pieces =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string" && text.trim().length > 0) ?? [];

  if (pieces.length > 0) return pieces.join("\n");
  throw new Error(payload.error?.message || "OpenAI did not return draft JSON.");
}

function parseSpecFromResponseText(text: string): ProblemSpec {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(withoutFence) as ProblemSpec;
}

function deleteIfNull(object: object, key: string) {
  const values = object as Record<string, unknown>;
  if (values[key] === null) delete values[key];
}

function normalizeProblemSpec(spec: ProblemSpec): ProblemSpec {
  deleteIfNull(spec.metadata, "factualStatus");
  deleteIfNull(spec.metadata, "curiosityNote");
  deleteIfNull(spec.metadata, "catalogOrder");
  deleteIfNull(spec.metadata, "publishedAt");
  deleteIfNull(spec.dimension, "increaseLabelLower");
  deleteIfNull(spec.dimension, "decreaseLabelLower");
  deleteIfNull(spec.dimension, "sameLabelLower");
  deleteIfNull(spec.dimension, "increaseSentence");
  deleteIfNull(spec.dimension, "decreaseSentence");
  deleteIfNull(spec.storyChrome, "completionTitle");
  deleteIfNull(spec.storyChrome, "stepProgressVerb");
  deleteIfNull(spec.storyChrome, "groupNoun");
  deleteIfNull(spec.storyChrome, "learnerRole");
  deleteIfNull(spec.story, "causalEvent");
  deleteIfNull(spec.story, "closingNoteTemplate");

  for (const quantity of spec.quantities) {
    deleteIfNull(quantity.label, "lowercase");
    deleteIfNull(quantity, "unitSingular");
    deleteIfNull(quantity, "unitPlural");
    deleteIfNull(quantity, "expectedValueForFixture");
    deleteIfNull(quantity, "derived");
    deleteIfNull(quantity, "semanticRole");
    deleteIfNull(quantity, "allowLiteralNumbers");
    deleteIfNull(quantity, "visualization");
    if (quantity.visualization) {
      deleteIfNull(quantity.visualization, "colorToken");
      deleteIfNull(quantity.visualization, "storyLabel");
    }
  }

  for (const step of spec.steps) {
    deleteIfNull(step, "visualization");
    if (step.visualization) {
      deleteIfNull(step.visualization, "relationshipType");
      deleteIfNull(step.visualization, "visualModel");
      deleteIfNull(step.visualization, "referenceWholeRole");
      deleteIfNull(step.visualization, "removedRole");
      deleteIfNull(step.visualization, "remainderRole");
    }
  }

  for (const experiment of spec.operatorExperiments) {
    deleteIfNull(experiment, "visualModel");
    deleteIfNull(experiment, "shortReaction");
    deleteIfNull(experiment, "alternateWorldTemplate");
    deleteIfNull(experiment, "groupNoun");
  }

  deleteIfNull(spec.recap, "totalVisualStepId");
  deleteIfNull(spec.recap, "decisionQuestion");
  return spec;
}

function draftShapeErrors(spec: ProblemSpec): DraftShapeError[] {
  const errors: DraftShapeError[] = [];
  if (!safeProblemId(spec.id)) {
    errors.push({ severity: "error", message: "Problem id must use only lowercase letters, numbers, underscores, and hyphens." });
  }
  if (!spec.metadata || typeof spec.metadata.title !== "string" || spec.metadata.title.trim().length === 0) {
    errors.push({ severity: "error", message: "Problem metadata must include a title." });
  }
  if (!spec.story || typeof spec.story.briefTemplate !== "string" || spec.story.briefTemplate.trim().length === 0) {
    errors.push({ severity: "error", message: "Problem story must include a briefTemplate." });
  }
  if (!Array.isArray(spec.quantities) || spec.quantities.length === 0) {
    errors.push({ severity: "error", message: "Problem must include quantities." });
  }
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
    errors.push({ severity: "error", message: "Problem must include steps." });
  }
  if (!Array.isArray(spec.operatorExperiments) || spec.operatorExperiments.length < (spec.steps?.length ?? 0)) {
    errors.push({ severity: "error", message: "Problem must include operator experiments for its steps." });
  }
  if (!spec.recap || typeof spec.recap.calcFromStepId !== "string") {
    errors.push({ severity: "error", message: "Problem recap must include calcFromStepId." });
  }
  return errors;
}

function openAiHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function openAiErrorMessage(payload: DraftResponsePayload, fallback: string): string {
  return payload.error?.message || fallback;
}

function draftRequestPayload(rawProblem: string, fallbackTitle: string, model: string) {
  return {
    model,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          `Fallback title: ${fallbackTitle}`,
          "",
          "Raw problem:",
          rawProblem,
        ].join("\n"),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "storymath_problem_spec",
        strict: false,
        schema: PROBLEM_SPEC_SCHEMA,
      },
    },
    max_output_tokens: 7000,
  };
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST to draft a problem." });
    return;
  }

  try {
    const apiKey = (process.env.OPENAI_API_KEY ?? process.env.ApiDraftProblem)?.trim();
    const expectedSecret = (process.env.STORYMATH_DRAFT_SECRET ?? process.env.STORYMATH_SAVE_SECRET)?.trim();
    if (!apiKey) {
      sendJson(res, 500, { ok: false, error: "Vercel is missing OPENAI_API_KEY." });
      return;
    }
    if (!expectedSecret) {
      sendJson(res, 500, { ok: false, error: "Vercel is missing STORYMATH_DRAFT_SECRET or STORYMATH_SAVE_SECRET." });
      return;
    }

    const body = await parsedBody(req);
    if (body.secret !== expectedSecret) {
      sendJson(res, 401, { ok: false, error: "Authoring draft secret did not match." });
      return;
    }

    const rawProblem = body.rawProblem?.trim() ?? "";
    if (!rawProblem) {
      sendJson(res, 400, { ok: false, error: "Paste a raw problem before drafting." });
      return;
    }
    if (rawProblem.length > MAX_RAW_PROBLEM_CHARS) {
      sendJson(res, 413, { ok: false, error: "Raw problem is too long for the drafter." });
      return;
    }

    const fallbackTitle = compactTitle(rawProblem, body.fallbackTitle);
    const model = process.env.STORYMATH_DRAFTER_MODEL?.trim() || DEFAULT_MODEL;
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: openAiHeaders(apiKey),
      body: JSON.stringify(draftRequestPayload(rawProblem, fallbackTitle, model)),
    });
    const openAiPayload = (await openAiResponse.json().catch(() => ({}))) as DraftResponsePayload;
    if (!openAiResponse.ok) {
      throw new Error(openAiErrorMessage(openAiPayload, "OpenAI could not draft the problem."));
    }

    const responseText = extractResponseText(openAiPayload);
    const spec = normalizeProblemSpec(parseSpecFromResponseText(responseText));
    const issues = draftShapeErrors(spec);
    if (issues.length > 0) {
      sendJson(res, 422, {
        ok: false,
        error: "OpenAI returned an incomplete problem draft.",
        issues,
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      source: "openai",
      model,
      spec,
      issues: [],
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Could not draft problem.",
    });
  }
}
