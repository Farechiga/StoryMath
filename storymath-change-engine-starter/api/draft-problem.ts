import type { IncomingMessage, ServerResponse } from "node:http";
import type { OperatorExperimentSpec, ProblemSpec, StepSpec } from "../src/model/problemSpec";
import type { FormulaId } from "../src/model/relationshipRegistry";

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

type DraftIssue = {
  severity: "error" | "warning";
  message: string;
};

const DEFAULT_MODEL = "gpt-5-mini";
const MAX_RAW_PROBLEM_CHARS = 8_000;
const DEFAULT_ALLOWED_ORIGINS = ["https://farechiga.github.io", "https://story-math.vercel.app"];

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
const EXPECTED_VALUE_EPSILON = 1e-9;
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

const TEMPLATE_REPAIRS: Record<
  string,
  {
    roles: string[];
    preferred: string;
    accepted: string[];
    backward: string[];
    actualOperator: string;
    direction: string;
    visualModel: string;
  }
> = {
  additive_comparison_decrease: {
    roles: ["bigger", "difference", "smaller"],
    preferred: "bigger_minus_difference_equals_smaller",
    accepted: ["bigger_minus_difference_equals_smaller", "bigger_minus_smaller_equals_difference"],
    backward: ["smaller_plus_difference_equals_bigger", "bigger_minus_smaller_equals_difference"],
    actualOperator: "-",
    direction: "decrease",
    visualModel: "comparison_gap_bar",
  },
  additive_comparison_increase: {
    roles: ["smaller", "difference", "bigger"],
    preferred: "smaller_plus_difference_equals_bigger",
    accepted: ["smaller_plus_difference_equals_bigger"],
    backward: ["bigger_minus_difference_equals_smaller"],
    actualOperator: "+",
    direction: "increase",
    visualModel: "comparison_gap_bar",
  },
  part_part_whole: {
    roles: ["partA", "partB", "whole"],
    preferred: "part_a_plus_part_b_equals_whole",
    accepted: ["part_a_plus_part_b_equals_whole"],
    backward: ["whole_minus_part_a_equals_part_b", "whole_minus_part_b_equals_part_a"],
    actualOperator: "+",
    direction: "combine",
    visualModel: "part_whole_bar",
  },
  start_change_end_increase: {
    roles: ["start", "change", "end"],
    preferred: "start_plus_change_equals_end",
    accepted: ["start_plus_change_equals_end"],
    backward: ["end_minus_start_equals_change"],
    actualOperator: "+",
    direction: "increase",
    visualModel: "before_change_after_bridge",
  },
  start_change_end_decrease: {
    roles: ["start", "change", "end"],
    preferred: "start_minus_change_equals_end",
    accepted: ["start_minus_change_equals_end"],
    backward: ["end_plus_change_equals_start"],
    actualOperator: "-",
    direction: "decrease",
    visualModel: "before_change_after_bridge",
  },
  multiplication_equal_groups: {
    roles: ["groups", "itemsPerGroup", "total"],
    preferred: "groups_times_items_equals_total",
    accepted: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
    backward: ["total_divided_by_groups_equals_items", "total_divided_by_items_equals_groups"],
    actualOperator: "×",
    direction: "scale",
    visualModel: "repeated_groups_grid",
  },
  division_equal_sharing: {
    roles: ["total", "groups", "itemsPerGroup"],
    preferred: "total_divided_by_groups_equals_items",
    accepted: ["total_divided_by_groups_equals_items"],
    backward: ["groups_times_items_equals_total"],
    actualOperator: "÷",
    direction: "split",
    visualModel: "equal_shares_tray",
  },
};

const FORMULA_ROLE_REPAIRS: Record<string, string[]> = {
  bigger_minus_difference_equals_smaller: ["bigger", "difference", "smaller"],
  smaller_plus_difference_equals_bigger: ["smaller", "difference", "bigger"],
  bigger_minus_smaller_equals_difference: ["bigger", "smaller", "difference"],
  part_a_plus_part_b_equals_whole: ["partA", "partB", "whole"],
  whole_minus_part_a_equals_part_b: ["whole", "partA", "partB"],
  whole_minus_part_b_equals_part_a: ["whole", "partB", "partA"],
  start_plus_change_equals_end: ["start", "change", "end"],
  start_minus_change_equals_end: ["start", "change", "end"],
  end_minus_start_equals_change: ["end", "start", "change"],
  end_plus_change_equals_start: ["end", "change", "start"],
  groups_times_items_equals_total: ["groups", "itemsPerGroup", "total"],
  items_times_groups_equals_total: ["itemsPerGroup", "groups", "total"],
  total_divided_by_groups_equals_items: ["total", "groups", "itemsPerGroup"],
  total_divided_by_items_equals_groups: ["total", "itemsPerGroup", "groups"],
};

const FORMULA_REPAIR_IDS = Object.keys(FORMULA_ROLE_REPAIRS) as FormulaId[];
const ADDITIVE_COMPARISON_FORMULA_IDS = new Set<FormulaId>([
  "bigger_minus_difference_equals_smaller",
  "smaller_plus_difference_equals_bigger",
  "bigger_minus_smaller_equals_difference",
]);

const FORMULA_ID_ALIASES: Record<string, FormulaId> = {
  end_divided_by_groups_equals_items: "total_divided_by_groups_equals_items",
  end_divided_by_groups_equals_items_per_group: "total_divided_by_groups_equals_items",
  total_divided_by_group_equals_items: "total_divided_by_groups_equals_items",
  total_divided_by_groups_equals_items_per_group: "total_divided_by_groups_equals_items",
  total_divided_by_items_per_group_equals_groups: "total_divided_by_items_equals_groups",
  total_divided_by_item_equals_groups: "total_divided_by_items_equals_groups",
  groups_times_items_per_group_equals_total: "groups_times_items_equals_total",
  items_per_group_times_groups_equals_total: "items_times_groups_equals_total",
};

const ROLE_DERIVATIONS: Record<
  string,
  Partial<Record<string, { formulaId: FormulaId; operands: string[] }>>
> = {
  additive_comparison_decrease: {
    bigger: { formulaId: "smaller_plus_difference_equals_bigger", operands: ["smaller", "difference"] },
    difference: { formulaId: "bigger_minus_smaller_equals_difference", operands: ["bigger", "smaller"] },
    smaller: { formulaId: "bigger_minus_difference_equals_smaller", operands: ["bigger", "difference"] },
  },
  additive_comparison_increase: {
    bigger: { formulaId: "smaller_plus_difference_equals_bigger", operands: ["smaller", "difference"] },
    difference: { formulaId: "bigger_minus_smaller_equals_difference", operands: ["bigger", "smaller"] },
    smaller: { formulaId: "bigger_minus_difference_equals_smaller", operands: ["bigger", "difference"] },
  },
};

const FORMULA_TEMPLATE_REPAIRS: Partial<Record<FormulaId, string>> = {
  bigger_minus_difference_equals_smaller: "additive_comparison_decrease",
  bigger_minus_smaller_equals_difference: "additive_comparison_decrease",
  smaller_plus_difference_equals_bigger: "additive_comparison_increase",
  part_a_plus_part_b_equals_whole: "part_part_whole",
  whole_minus_part_a_equals_part_b: "part_part_whole",
  whole_minus_part_b_equals_part_a: "part_part_whole",
  start_plus_change_equals_end: "start_change_end_increase",
  end_minus_start_equals_change: "start_change_end_increase",
  start_minus_change_equals_end: "start_change_end_decrease",
  end_plus_change_equals_start: "start_change_end_decrease",
  groups_times_items_equals_total: "multiplication_equal_groups",
  items_times_groups_equals_total: "multiplication_equal_groups",
  total_divided_by_groups_equals_items: "division_equal_sharing",
  total_divided_by_items_equals_groups: "division_equal_sharing",
};

const SYSTEM_PROMPT = `
You draft StoryMath problem packs from raw word problems.

Return exactly one JSON object shaped as a StoryMath ProblemSpec. Do not include markdown.

Core rules:
- Preserve the story's meaning. Do not invent a different premise, title, characters, or object nouns.
- Replace every modeled number in child-facing prose with field-merge tokens: {quantity:id} when the noun should render, {value:id} for money/scalar values inside phrases like £{value:price_per_bookmark}.
- Do not repeat a noun after a quantity token. Good: "{quantity:boxes} of classics" or "{quantity:books_per_box} in each box". Bad: "{quantity:boxes} boxes" because {quantity:boxes} already renders "8 boxes".
- Prefer precise, story-specific quantity ids: price_per_bookmark, books_per_box, cart_capacity, total_books, not price_per_item unless the story gives no noun.
- Always infer a specific metadata.title from the story unless the raw input starts with a deliberate title. Never leave "New StoryMath problem" as the final title.
- metadata.theme should read like a menu subtitle or driving question, not a single generic setting word. Good: "Will the carts be enough?" Bad: "library".
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

function configuredOrigins(): string[] {
  const raw = process.env.STORYMATH_ALLOWED_ORIGINS;
  const configured = raw
    ? raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured])];
}

function requestOrigin(req: IncomingMessage): string | undefined {
  const origin = req.headers?.origin;
  if (Array.isArray(origin)) return origin[0];
  return origin;
}

function applyAuthoringCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = requestOrigin(req);
  if (!origin) return true;

  const origins = configuredOrigins();
  const allowed = origins.includes("*") || origins.includes(origin);
  if (!allowed) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
  return true;
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

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? `${trimmed[0]!.toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function isGenericTitle(value: string | undefined): boolean {
  return !value || /^new storymath problem$/i.test(value.trim()) || /^generated storymath problem$/i.test(value.trim());
}

function isGenericTheme(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return ["classroom story", "library", "books", "story", "generated two-step model"].includes(normalized) || normalized.split(/\s+/).length <= 1;
}

function lastQuestion(rawProblem: string): string {
  const match = rawProblem.match(/[^.?!]*\?/g);
  return match && match.length > 0 ? match[match.length - 1]!.trim().replace(/\s+/g, " ") : "";
}

function inferTitleFromRaw(rawProblem: string, fallbackTitle: string): string {
  if (!isGenericTitle(fallbackTitle)) return fallbackTitle;
  const story = rawProblem.trim();
  const properPair = story.match(/\b([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/);
  const names = properPair ? `${properPair[1]} and ${properPair[2]}` : story.match(/\b([A-Z][a-z]+)\b/)?.[1];

  if (/\bUnderlibrary\b/i.test(story) && /\bcarts?\b/i.test(story)) return "Underlibrary book-cart move";
  if (/\bLibrary of Congress\b/i.test(story)) return "Library of Congress book search";
  if (/\bQuip\b/i.test(story) && /\bVenice\b/i.test(story)) return "The Quip stops in Venice";
  if (/\btheatre\b/i.test(story) && /\bbookmarks?\b/i.test(story)) return `${names ? `${names}'s` : "The"} theatre bookmark plan`;
  if (/\bcarts?\b/i.test(story) && /\bbooks?\b/i.test(story)) return `${names ? `${names}'s ` : ""}book-cart move`;
  if (/\bshelves?\b/i.test(story) && /\bbooks?\b/i.test(story)) return `${names ? `${names}'s ` : ""}book search`;

  const openingWords = story
    .replace(/[^a-zA-Z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 5)
    .join(" ");
  return sentenceCase(openingWords || "StoryMath problem");
}

function inferThemeFromRaw(rawProblem: string): string {
  const question = lastQuestion(rawProblem);
  if (/will\s+\d+\s+carts?\s+be\s+enough/i.test(question)) return "Will the carts be enough?";
  if (/will\b.*\benough/i.test(question)) return sentenceCase(question.replace(/\b\d+\s+/g, "").replace(/\s+/g, " "));
  if (/how many.*left/i.test(question)) return "How many are left?";
  if (/how many.*each friend/i.test(question)) return "How many books does each friend search?";
  if (question) return sentenceCase(question.replace(/\b\d+\s+/g, "").replace(/\s+/g, " "));
  return "What does the model show?";
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

function normalizedLookupKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalRoleKey(role: string): string {
  const normalized = normalizedLookupKey(role);
  const aliases: Record<string, string> = {
    larger: "bigger",
    greater: "bigger",
    more: "bigger",
    smalleramount: "smaller",
    lesser: "smaller",
    less: "smaller",
    gap: "difference",
    diff: "difference",
    differenceamount: "difference",
    firstpart: "partA",
    parta: "partA",
    part1: "partA",
    secondpart: "partB",
    partb: "partB",
    part2: "partB",
    wholeamount: "whole",
    totalamount: "total",
    totalbooks: "total",
    totalitems: "total",
    amounttotal: "total",
    initial: "start",
    before: "start",
    original: "start",
    starting: "start",
    removed: "change",
    sold: "change",
    traded: "change",
    used: "change",
    needed: "change",
    required: "change",
    need: "change",
    requires: "change",
    changeamount: "change",
    neededamount: "change",
    requiredamount: "change",
    remaining: "end",
    left: "end",
    final: "end",
    after: "end",
    group: "groups",
    groups: "groups",
    numberofgroups: "groups",
    numbergroups: "groups",
    branch: "groups",
    branches: "groups",
    numberofbranches: "groups",
    branchcount: "groups",
    boxes: "groups",
    carts: "groups",
    shelves: "groups",
    months: "groups",
    cars: "groups",
    item: "itemsPerGroup",
    items: "itemsPerGroup",
    each: "itemsPerGroup",
    eachgroup: "itemsPerGroup",
    pergroup: "itemsPerGroup",
    itemspergroup: "itemsPerGroup",
    itempergroup: "itemsPerGroup",
    itemsineachgroup: "itemsPerGroup",
    booksperbox: "itemsPerGroup",
    bookspercart: "itemsPerGroup",
    bookspercar: "itemsPerGroup",
    bookspersection: "itemsPerGroup",
    booksoneachshelf: "itemsPerGroup",
    booksoneach: "itemsPerGroup",
    cartcapacity: "itemsPerGroup",
    capacitypercart: "itemsPerGroup",
    amountpergroup: "itemsPerGroup",
    spacing: "itemsPerGroup",
    branchspacing: "itemsPerGroup",
    distancebetweenbranches: "itemsPerGroup",
    distanceperbranch: "itemsPerGroup",
    height: "itemsPerGroup",
    branchheight: "itemsPerGroup",
    heightperbranch: "itemsPerGroup",
    feetperbranch: "itemsPerGroup",
    feetforeachbranch: "itemsPerGroup",
    eachbranchheight: "itemsPerGroup",
  };
  return aliases[normalized] ?? role;
}

function inferOperandForRole(spec: ProblemSpec, role: string, usedIds: Set<string>): string | undefined {
  if (role === "bigger") {
    return firstQuantityMatching(
      spec,
      [/\bbigger\b/, /\blarger\b/, /\bgreater\b/, /\bmore\b/, /\btotal\b/, /\bheight\b/, /\bcapacity\b/, /\brevenue\b/, /\bavailable\b/, /\bpack\b/],
      usedIds,
    );
  }
  if (role === "smaller") {
    return firstQuantityMatching(
      spec,
      [/\bsmaller\b/, /\blesser\b/, /\bless\b/, /\bcost\b/, /\bneeded\b/, /\bneed\b/, /\bpackage\b/, /\bused\b/, /\brequired\b/, /\brequir/],
      usedIds,
    );
  }
  if (role === "difference") {
    return firstQuantityMatching(
      spec,
      [/\bdifference\b/, /\bgap\b/, /\bleft\b/, /\bremaining\b/, /\bextra\b/, /\bsuffic/, /\bshortage\b/, /\bchange\b/],
      usedIds,
    );
  }
  if (role === "itemsPerGroup") {
    return firstQuantityMatching(
      spec,
      [/\bper\b/, /\beach\b/, /\bcapacity\b/, /\bheight\b/, /\bfeet\b/, /\bspacing\b/, /\bdistance\b/, /per_/, /_each/, /books_per/, /items_per/],
      usedIds,
    );
  }
  if (role === "groups") {
    return firstQuantityMatching(spec, [/\bbox/, /\bcart/, /\bshelf/, /\bmonth/, /\bcar\b/, /\bgroup/, /\bfriend/, /\bbranch/], usedIds);
  }
  if (role === "total" || role === "whole") {
    return firstQuantityMatching(spec, [/\btotal\b/, /\bheight\b/, /\bwhole\b/, /\baltogether\b/], usedIds);
  }
  if (role === "start") {
    return firstQuantityMatching(spec, [/\bbefore\b/, /\bstart/, /\binitial/, /\btotal/], usedIds);
  }
  if (role === "change") {
    return firstQuantityMatching(spec, [/\bsold\b/, /\btraded\b/, /\bremoved\b/, /\bused\b/, /\bneed/, /\brequir/, /\bchange\b/], usedIds);
  }
  return undefined;
}

function quantityNumericValue(spec: ProblemSpec, id: string): number | undefined {
  const quantity = spec.quantities.find((item) => item.id === id);
  if (!quantity) return undefined;
  if (quantity.derived && typeof quantity.expectedValueForFixture === "number") return quantity.expectedValueForFixture;
  if (typeof quantity.value === "number") return quantity.value;
  if (typeof quantity.expectedValueForFixture === "number") return quantity.expectedValueForFixture;
  return undefined;
}

function applyFormula(formulaId: string, left: number, right: number): number | undefined {
  if (
    formulaId === "bigger_minus_difference_equals_smaller" ||
    formulaId === "bigger_minus_smaller_equals_difference" ||
    formulaId === "whole_minus_part_a_equals_part_b" ||
    formulaId === "whole_minus_part_b_equals_part_a" ||
    formulaId === "start_minus_change_equals_end" ||
    formulaId === "end_minus_start_equals_change"
  ) {
    return left - right;
  }
  if (
    formulaId === "smaller_plus_difference_equals_bigger" ||
    formulaId === "part_a_plus_part_b_equals_whole" ||
    formulaId === "start_plus_change_equals_end" ||
    formulaId === "end_plus_change_equals_start"
  ) {
    return left + right;
  }
  if (formulaId === "groups_times_items_equals_total" || formulaId === "items_times_groups_equals_total") {
    return left * right;
  }
  if (formulaId === "total_divided_by_groups_equals_items" || formulaId === "total_divided_by_items_equals_groups") {
    return right === 0 ? undefined : left / right;
  }
  return undefined;
}

function roleMatchScore(spec: ProblemSpec, id: string, role: string): number {
  const text = quantityText(spec, id);
  if (role === "groups") {
    return [/\bbranch/, /\bcount\b/, /\bnumber\b/, /\bgroup/, /\bbox/, /\bcart/, /\bshelf/, /\bmonth/, /\bfriend/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  if (role === "itemsPerGroup") {
    return [/\bper\b/, /\beach\b/, /\bspacing\b/, /\bdistance\b/, /\bheight\b/, /\bfeet\b/, /\bcapacity\b/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  if (role === "total" || role === "whole") {
    return [/\btotal\b/, /\bheight\b/, /\bwhole\b/, /\baltogether\b/].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
  }
  return 0;
}

function resultRoleMatchScore(spec: ProblemSpec, quantity: ProblemSpec["quantities"][number], role: string): number {
  const text = quantityText(spec, quantity.id);
  if (role === "itemsPerGroup") {
    return [/\bper\b/, /\beach\b/, /\bspacing\b/, /\bdistance\b/, /\bbetween\b/, /per_/, /_each/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  if (role === "groups") {
    return [/\bcount\b/, /\bnumber\b/, /\bgroup/, /\bbox/, /\bcart/, /\bshelf/, /\bmonth/, /\bbranch/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  if (role === "total" || role === "whole" || role === "end" || role === "bigger") {
    return [/\btotal\b/, /\bheight\b/, /\bwhole\b/, /\baltogether\b/, /\bapproximate\b/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  if (role === "change" || role === "difference") {
    return [/\bchange\b/, /\bdifference\b/, /\bgap\b/, /\bmore\b/, /\bless\b/, /\bneed/, /\brequir/].reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0,
    );
  }
  return 0;
}

function semanticFormulaForDerivedResult(spec: ProblemSpec, quantity: ProblemSpec["quantities"][number], roles: string[]): FormulaId | undefined {
  const formulaId = quantity.derived?.formulaId;
  if (!formulaId || !ADDITIVE_COMPARISON_FORMULA_IDS.has(formulaId as FormulaId)) return undefined;
  if (roles[2] === "itemsPerGroup") return undefined;
  if (resultRoleMatchScore(spec, quantity, "itemsPerGroup") < 2) return undefined;

  const unavailableIds = new Set([quantity.id]);
  const totalGuess = inferOperandForRole(spec, "total", unavailableIds);
  if (totalGuess) unavailableIds.add(totalGuess);
  const groupsGuess = inferOperandForRole(spec, "groups", unavailableIds);
  if (!totalGuess || !groupsGuess) return undefined;
  return "total_divided_by_groups_equals_items";
}

function repairExpectedDerivedOperands(spec: ProblemSpec, quantity: ProblemSpec["quantities"][number], operands: Record<string, string>, roles: string[]): DraftIssue[] {
  if (typeof quantity.expectedValueForFixture !== "number" || roles.length < 3) return [];

  const leftRole = roles[0]!;
  const rightRole = roles[1]!;
  const currentLeftId = operands[leftRole];
  const currentRightId = operands[rightRole];
  const currentLeft = currentLeftId ? quantityNumericValue(spec, currentLeftId) : undefined;
  const currentRight = currentRightId ? quantityNumericValue(spec, currentRightId) : undefined;
  const currentValue =
    currentLeft !== undefined && currentRight !== undefined
      ? applyFormula(quantity.derived!.formulaId, currentLeft, currentRight)
      : undefined;
  if (currentValue !== undefined && Math.abs(currentValue - quantity.expectedValueForFixture) < EXPECTED_VALUE_EPSILON) {
    return [];
  }

  let best:
    | {
        formulaId: FormulaId;
        leftRole: string;
        rightRole: string;
        leftId: string;
        rightId: string;
        score: number;
      }
    | undefined;
  const formulaIds = [
    quantity.derived!.formulaId as FormulaId,
    ...FORMULA_REPAIR_IDS.filter((formulaId) => formulaId !== quantity.derived!.formulaId),
  ].filter((formulaId, index, all) => all.indexOf(formulaId) === index);

  for (const formulaId of formulaIds) {
    const candidateRoles = FORMULA_ROLE_REPAIRS[formulaId] ?? [];
    if (candidateRoles.length < 3) continue;
    const candidateLeftRole = candidateRoles[0]!;
    const candidateRightRole = candidateRoles[1]!;
    const candidateResultRole = candidateRoles[2]!;
    for (const left of spec.quantities) {
      if (left.id === quantity.id) continue;
      const leftValue = quantityNumericValue(spec, left.id);
      if (leftValue === undefined) continue;
      for (const right of spec.quantities) {
        if (right.id === quantity.id || right.id === left.id) continue;
        const rightValue = quantityNumericValue(spec, right.id);
        if (rightValue === undefined) continue;
        const result = applyFormula(formulaId, leftValue, rightValue);
        if (result === undefined || Math.abs(result - quantity.expectedValueForFixture) >= EXPECTED_VALUE_EPSILON) continue;
        const score =
          roleMatchScore(spec, left.id, candidateLeftRole) +
          roleMatchScore(spec, right.id, candidateRightRole) +
          resultRoleMatchScore(spec, quantity, candidateResultRole) +
          (quantity.derived!.formulaId === formulaId ? 2 : 0) +
          (operands[candidateLeftRole] === left.id ? 1 : 0) +
          (operands[candidateRightRole] === right.id ? 1 : 0);
        if (!best || score > best.score) {
          best = {
            formulaId,
            leftRole: candidateLeftRole,
            rightRole: candidateRightRole,
            leftId: left.id,
            rightId: right.id,
            score,
          };
        }
      }
    }
  }

  if (!best) return [];
  const changedFormula = best.formulaId !== quantity.derived!.formulaId;
  quantity.derived!.formulaId = best.formulaId;
  for (const role of Object.keys(operands)) {
    if (role !== best.leftRole && role !== best.rightRole) delete operands[role];
  }
  operands[best.leftRole] = best.leftId;
  operands[best.rightRole] = best.rightId;
  return [
    {
      severity: "warning",
      message: `Repaired derived quantity ${quantity.id}: chose ${changedFormula ? "formula and operands" : "operands"} that match expectedValueForFixture.`,
    },
  ];
}

function canonicalOperator(operator: string): string {
  const normalized = operator.trim().toLowerCase();
  if (normalized === "*" || normalized === "x" || normalized === "×") return "×";
  if (normalized === "/" || normalized === "÷") return "÷";
  if (normalized === "plus") return "+";
  if (normalized === "minus") return "-";
  return operator;
}

function canonicalRelationshipTemplateId(step: StepSpec): string | undefined {
  if (step.relationshipTemplateId in TEMPLATE_REPAIRS) return step.relationshipTemplateId;
  const normalized = normalizedLookupKey(step.relationshipTemplateId);
  const aliases: Record<string, string> = {
    additivecomparisondecrease: "additive_comparison_decrease",
    additivecomparisonincrease: "additive_comparison_increase",
    comparisondecrease: "additive_comparison_decrease",
    comparisonincrease: "additive_comparison_increase",
    partpartwhole: "part_part_whole",
    partwhole: "part_part_whole",
    startchangeendincrease: "start_change_end_increase",
    startchangeenddecrease: "start_change_end_decrease",
    multiplication: "multiplication_equal_groups",
    multiply: "multiplication_equal_groups",
    equalgroups: "multiplication_equal_groups",
    multiplicationequalgroup: "multiplication_equal_groups",
    multiplicationequalgroups: "multiplication_equal_groups",
    division: "division_equal_sharing",
    divide: "division_equal_sharing",
    equalsharing: "division_equal_sharing",
    divisionequalsharing: "division_equal_sharing",
    divisionequalshares: "division_equal_sharing",
  };
  const alias = aliases[normalized];
  if (alias) return alias;

  const formIds = [
    step.preferredEquationFormId,
    ...(Array.isArray(step.acceptedEquationFormIds) ? step.acceptedEquationFormIds : []),
    ...(Array.isArray(step.backwardCheck?.acceptedEquationFormIds) ? step.backwardCheck.acceptedEquationFormIds : []),
  ];
  return formIds.map((formId) => FORMULA_TEMPLATE_REPAIRS[formId]).find((templateId): templateId is string => Boolean(templateId));
}

function canonicalFormulaId(formulaId: string): FormulaId | undefined {
  if (FORMULA_IDS.includes(formulaId)) return formulaId as FormulaId;
  return FORMULA_ID_ALIASES[formulaId] ?? FORMULA_ID_ALIASES[normalizedLookupKey(formulaId)];
}

function quantityExists(spec: ProblemSpec, id: string | undefined): id is string {
  return typeof id === "string" && spec.quantities.some((quantity) => quantity.id === id);
}

function quantityText(spec: ProblemSpec, id: string): string {
  const quantity = spec.quantities.find((item) => item.id === id);
  return [
    quantity?.id,
    quantity?.label?.child,
    quantity?.label?.compact,
    quantity?.label?.lowercase,
    quantity?.unit,
    quantity?.unitSingular,
    quantity?.unitPlural,
    quantity?.semanticRole,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function firstQuantityMatching(spec: ProblemSpec, patterns: RegExp[], usedIds: Set<string>): string | undefined {
  return spec.quantities.find((quantity) => {
    if (usedIds.has(quantity.id)) return false;
    const text = quantityText(spec, quantity.id);
    return patterns.some((pattern) => pattern.test(text));
  })?.id;
}

function repairGoalQuantityDerivation(
  spec: ProblemSpec,
  step: StepSpec,
  roleMap: Record<string, string>,
): DraftIssue[] {
  const quantity = spec.quantities.find((item) => item.id === step.goalQuantityId);
  if (!quantity || quantity.derived || typeof quantity.value === "number") return [];

  const goalRole = Object.entries(roleMap).find(([, quantityId]) => quantityId === step.goalQuantityId)?.[0];
  if (!goalRole) return [];

  const derivation = ROLE_DERIVATIONS[step.relationshipTemplateId]?.[goalRole];
  if (!derivation) return [];

  if (!derivation.operands.every((role) => quantityExists(spec, roleMap[role]))) return [];

  quantity.derived = {
    formulaId: derivation.formulaId,
    operands: Object.fromEntries(derivation.operands.map((role) => [role, roleMap[role]!])),
  };
  quantity.value = null;
  return [
    {
      severity: "warning",
      message: `Repaired quantity ${quantity.id}: derived it from step ${step.id}.`,
    },
  ];
}

function fillMissingStepRoles(spec: ProblemSpec, step: StepSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const repair = TEMPLATE_REPAIRS[step.relationshipTemplateId];
  if (!repair) return issues;

  const roleMap = { ...step.roleToQuantityId };
  for (const [role, quantityId] of Object.entries(step.roleToQuantityId)) {
    const canonical = canonicalRoleKey(role);
    if (canonical !== role && !roleMap[canonical]) {
      roleMap[canonical] = quantityId;
      issues.push({
        severity: "warning",
        message: `Repaired step ${step.id}: mapped role "${role}" to "${canonical}".`,
      });
    }
  }

  for (const role of repair.roles) {
    if (quantityExists(spec, roleMap[role]) || !quantityExists(spec, step.goalQuantityId)) continue;
    const derivation = ROLE_DERIVATIONS[step.relationshipTemplateId]?.[role];
    if (!derivation?.operands.every((operandRole) => quantityExists(spec, roleMap[operandRole]))) continue;
    roleMap[role] = step.goalQuantityId;
    issues.push({ severity: "warning", message: `Repaired step ${step.id}: used the goal quantity as ${role}.` });
    break;
  }

  const usedIds = new Set(Object.values(roleMap).filter((id) => quantityExists(spec, id)));
  if (repair.roles.includes("total") && !quantityExists(spec, roleMap.total) && quantityExists(spec, step.goalQuantityId)) {
    roleMap.total = step.goalQuantityId;
    usedIds.add(step.goalQuantityId);
    issues.push({ severity: "warning", message: `Repaired step ${step.id}: used the goal quantity as total.` });
  }
  if (repair.roles.includes("end") && !quantityExists(spec, roleMap.end) && quantityExists(spec, step.goalQuantityId)) {
    roleMap.end = step.goalQuantityId;
    usedIds.add(step.goalQuantityId);
    issues.push({ severity: "warning", message: `Repaired step ${step.id}: used the goal quantity as end.` });
  }
  if (repair.roles.includes("whole") && !quantityExists(spec, roleMap.whole) && quantityExists(spec, step.goalQuantityId)) {
    roleMap.whole = step.goalQuantityId;
    usedIds.add(step.goalQuantityId);
    issues.push({ severity: "warning", message: `Repaired step ${step.id}: used the goal quantity as whole.` });
  }

  if (repair.roles.includes("itemsPerGroup") && !quantityExists(spec, roleMap.itemsPerGroup)) {
    const guess = firstQuantityMatching(
      spec,
      [/\bper\b/, /\beach\b/, /\bcapacity\b/, /\bheight\b/, /\bfeet\b/, /per_/, /_each/, /books_per/, /items_per/],
      usedIds,
    );
    if (guess) {
      roleMap.itemsPerGroup = guess;
      usedIds.add(guess);
      issues.push({ severity: "warning", message: `Repaired step ${step.id}: inferred itemsPerGroup from ${guess}.` });
    }
  }

  if (repair.roles.includes("groups") && !quantityExists(spec, roleMap.groups)) {
    const guess = firstQuantityMatching(
      spec,
      [/\bbox/, /\bcart/, /\bshelf/, /\bmonth/, /\bcar\b/, /\bgroup/, /\bfriend/, /\bbranch/],
      usedIds,
    );
    if (guess) {
      roleMap.groups = guess;
      usedIds.add(guess);
      issues.push({ severity: "warning", message: `Repaired step ${step.id}: inferred groups from ${guess}.` });
    }
  }

  if (repair.roles.includes("start") && !quantityExists(spec, roleMap.start)) {
    const guess = firstQuantityMatching(spec, [/\bbefore\b/, /\bstart/, /\binitial/, /\btotal/], usedIds);
    if (guess) {
      roleMap.start = guess;
      usedIds.add(guess);
      issues.push({ severity: "warning", message: `Repaired step ${step.id}: inferred start from ${guess}.` });
    }
  }

  if (repair.roles.includes("change") && !quantityExists(spec, roleMap.change)) {
    const guess = firstQuantityMatching(
      spec,
      [/\bsold\b/, /\btraded\b/, /\bremoved\b/, /\bused\b/, /\bneed/, /\brequir/, /\bchange\b/],
      usedIds,
    );
    if (guess) {
      roleMap.change = guess;
      usedIds.add(guess);
      issues.push({ severity: "warning", message: `Repaired step ${step.id}: inferred change from ${guess}.` });
    }
  }

  step.roleToQuantityId = roleMap;
  issues.push(...repairGoalQuantityDerivation(spec, step, roleMap));
  return issues;
}

function repairDerivedOperands(spec: ProblemSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const quantity of spec.quantities) {
    if (!quantity.derived) continue;
    const canonicalDerivedFormula = canonicalFormulaId(quantity.derived.formulaId);
    if (canonicalDerivedFormula && canonicalDerivedFormula !== quantity.derived.formulaId) {
      issues.push({
        severity: "warning",
        message: `Repaired derived quantity ${quantity.id}: mapped formulaId "${quantity.derived.formulaId}" to "${canonicalDerivedFormula}".`,
      });
      quantity.derived.formulaId = canonicalDerivedFormula;
    }
    let roles = FORMULA_ROLE_REPAIRS[quantity.derived.formulaId] ?? [];
    const operands = { ...quantity.derived.operands };
    for (const [role, quantityId] of Object.entries(quantity.derived.operands)) {
      const canonical = canonicalRoleKey(role);
      if (canonical !== role && !operands[canonical]) {
        operands[canonical] = quantityId;
        issues.push({
          severity: "warning",
          message: `Repaired derived quantity ${quantity.id}: mapped operand "${role}" to "${canonical}".`,
        });
      }
    }
    const semanticFormula = semanticFormulaForDerivedResult(spec, quantity, roles);
    if (semanticFormula && semanticFormula !== quantity.derived.formulaId) {
      issues.push({
        severity: "warning",
        message: `Repaired derived quantity ${quantity.id}: mapped comparison formula "${quantity.derived.formulaId}" to "${semanticFormula}" from its per-item label.`,
      });
      quantity.derived.formulaId = semanticFormula;
      roles = FORMULA_ROLE_REPAIRS[quantity.derived.formulaId] ?? [];
    }
    const resultRole = roles[2];
    if (resultRole) delete operands[resultRole];
    const usedIds = new Set(
      roles
        .filter((role) => role !== resultRole)
        .map((role) => operands[role])
        .filter((id) => quantityExists(spec, id)),
    );
    for (const role of roles) {
      if (role === resultRole || quantityExists(spec, operands[role])) continue;
      const guess = inferOperandForRole(spec, role, usedIds);
      if (!guess) continue;
      operands[role] = guess;
      usedIds.add(guess);
      issues.push({
        severity: "warning",
        message: `Repaired derived quantity ${quantity.id}: inferred operand "${role}" from ${guess}.`,
      });
    }
    issues.push(...repairExpectedDerivedOperands(spec, quantity, operands, roles));
    quantity.derived.operands = operands;
  }
  return issues;
}

function repairStepTemplateIds(spec: ProblemSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const step of spec.steps) {
    const preferred = canonicalFormulaId(step.preferredEquationFormId);
    if (preferred && preferred !== step.preferredEquationFormId) {
      issues.push({
        severity: "warning",
        message: `Repaired step ${step.id}: mapped preferred formula "${step.preferredEquationFormId}" to "${preferred}".`,
      });
      step.preferredEquationFormId = preferred as StepSpec["preferredEquationFormId"];
    }
    step.acceptedEquationFormIds = step.acceptedEquationFormIds.map((formulaId) => canonicalFormulaId(formulaId) ?? formulaId) as StepSpec["acceptedEquationFormIds"];
    step.backwardCheck.acceptedEquationFormIds = step.backwardCheck.acceptedEquationFormIds.map(
      (formulaId) => canonicalFormulaId(formulaId) ?? formulaId,
    ) as StepSpec["backwardCheck"]["acceptedEquationFormIds"];

    const canonical = canonicalRelationshipTemplateId(step);
    if (canonical && canonical !== step.relationshipTemplateId) {
      issues.push({
        severity: "warning",
        message: `Repaired step ${step.id}: mapped relationship template "${step.relationshipTemplateId}" to "${canonical}".`,
      });
      step.relationshipTemplateId = canonical as StepSpec["relationshipTemplateId"];
    }
  }
  return issues;
}

function defaultExperiment(step: StepSpec, operator: string, actualOperator: string, visualModel: string): OperatorExperimentSpec {
  const actual = operator === actualOperator;
  const reaction =
    operator === "×"
      ? "Multiplication fits equal groups."
      : operator === "÷"
        ? "Division fits equal sharing or checking a grouped total."
        : operator === "+"
          ? "Addition fits a joining story."
          : "Subtraction fits a removal or difference story.";
  return {
    stepId: step.id,
    operator: operator as OperatorExperimentSpec["operator"],
    narrativeFit: actual ? "actual" : operator === "-" ? "different_story" : "different_question",
    ...(operator === "×" || operator === "÷" || actual ? { visualModel: visualModel as OperatorExperimentSpec["visualModel"] } : {}),
    alternateWorldTemplate: actual ? `This operation matches this step: ${step.prompt}` : reaction,
  };
}

function repairOperatorExperiments(spec: ProblemSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const stepIds = new Set(spec.steps.map((step) => step.id));
  const sourceExperiments = Array.isArray(spec.operatorExperiments) ? spec.operatorExperiments : [];
  if (!Array.isArray(spec.operatorExperiments)) {
    issues.push({ severity: "warning", message: "Repaired operator experiments: initialized missing experiment list." });
  }
  const cleaned = sourceExperiments
    .filter((experiment) => stepIds.has(experiment.stepId))
    .map((experiment) => ({
      ...experiment,
      operator: canonicalOperator(experiment.operator) as OperatorExperimentSpec["operator"],
    }))
    .filter((experiment) => OPERATORS.includes(experiment.operator));

  const repaired: OperatorExperimentSpec[] = [];
  for (const step of spec.steps) {
    const repair = TEMPLATE_REPAIRS[step.relationshipTemplateId];
    if (!repair) continue;
    step.operatorOptions = ["+", "-", "×", "÷"];
    for (const operator of OPERATORS) {
      const existing = cleaned.find((experiment) => experiment.stepId === step.id && experiment.operator === operator);
      const next = existing ?? defaultExperiment(step, operator, repair.actualOperator, repair.visualModel);
      next.narrativeFit = operator === repair.actualOperator ? "actual" : next.narrativeFit === "actual" ? "different_question" : next.narrativeFit;
      if (operator === repair.actualOperator && !next.visualModel) {
        next.visualModel = repair.visualModel as OperatorExperimentSpec["visualModel"];
      }
      repaired.push(next);
      if (!existing) {
        issues.push({ severity: "warning", message: `Repaired step ${step.id}: added missing ${operator} operator experiment.` });
      }
    }
  }
  spec.operatorExperiments = repaired;
  return issues;
}

function repairStepForms(spec: ProblemSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const step of spec.steps) {
    const repair = TEMPLATE_REPAIRS[step.relationshipTemplateId];
    if (!repair) continue;
    step.preferredEquationFormId = repair.preferred as StepSpec["preferredEquationFormId"];
    step.acceptedEquationFormIds = repair.accepted as StepSpec["acceptedEquationFormIds"];
    step.backwardCheck.acceptedEquationFormIds = repair.backward as StepSpec["backwardCheck"]["acceptedEquationFormIds"];
    step.expectedDirection = repair.direction as StepSpec["expectedDirection"];
    issues.push(...fillMissingStepRoles(spec, step));
  }
  return issues;
}

function repairStoryFrame(spec: ProblemSpec, rawProblem: string, fallbackTitle: string): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (isGenericTitle(spec.metadata.title)) {
    spec.metadata.title = inferTitleFromRaw(rawProblem, fallbackTitle);
    spec.id = `${spec.metadata.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "storymath_problem"}-v1`;
    issues.push({ severity: "warning", message: `Repaired story frame: inferred title "${spec.metadata.title}".` });
  }
  if (isGenericTheme(spec.metadata.theme)) {
    spec.metadata.theme = inferThemeFromRaw(rawProblem);
    issues.push({ severity: "warning", message: `Repaired story frame: inferred theme "${spec.metadata.theme}".` });
  }
  return issues;
}

function uniqueWords(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.length - a.length);
}

function removeRepeatedNounAfterQuantityToken(text: string, spec: ProblemSpec): string {
  let next = text;
  for (const quantity of spec.quantities) {
    const nouns = uniqueWords([quantity.unitPlural, quantity.unitSingular, quantity.unit]);
    for (const noun of nouns) {
      const pattern = new RegExp(`(\\{quantity:${quantity.id}\\})\\s+${escapeRegExp(noun)}\\b`, "gi");
      next = next.replace(pattern, "$1");
    }
  }
  return next;
}

function repairRepeatedQuantityNouns(spec: ProblemSpec): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const repairText = (value: string): string => removeRepeatedNounAfterQuantityToken(value, spec);
  const update = (label: string, setValue: (value: string) => void, current: string) => {
    const repaired = repairText(current);
    if (repaired !== current) {
      setValue(repaired);
      issues.push({ severity: "warning", message: `Repaired repeated noun after quantity token in ${label}.` });
    }
  };

  update("story.briefTemplate", (value) => { spec.story.briefTemplate = value; }, spec.story.briefTemplate);
  if (spec.story.closingNoteTemplate) {
    update("story.closingNoteTemplate", (value) => { spec.story.closingNoteTemplate = value; }, spec.story.closingNoteTemplate);
  }

  for (const step of spec.steps) {
    update(`step ${step.id} prompt`, (value) => { step.prompt = value; }, step.prompt);
    update(`step ${step.id} reasoningPrompt`, (value) => { step.reasoningPrompt = value; }, step.reasoningPrompt);
    update(`step ${step.id} backwardCheck.prompt`, (value) => { step.backwardCheck.prompt = value; }, step.backwardCheck.prompt);
  }

  spec.operatorExperiments = Array.isArray(spec.operatorExperiments) ? spec.operatorExperiments : [];

  for (const experiment of spec.operatorExperiments) {
    if (experiment.alternateWorldTemplate) {
      update(
        `operator experiment ${experiment.stepId} ${experiment.operator}`,
        (value) => { experiment.alternateWorldTemplate = value; },
        experiment.alternateWorldTemplate,
      );
    }
  }

  update("recap.headline", (value) => { spec.recap.headline = value; }, spec.recap.headline);
  spec.recap.causalChain = spec.recap.causalChain.map((item, index) => {
    const repaired = repairText(item);
    if (repaired !== item) {
      issues.push({ severity: "warning", message: `Repaired repeated noun after quantity token in recap.causalChain[${index}].` });
    }
    return repaired;
  });
  update("recap.dataQuestion.prompt", (value) => { spec.recap.dataQuestion.prompt = value; }, spec.recap.dataQuestion.prompt);
  update("recap.dataQuestion.correctFeedback", (value) => { spec.recap.dataQuestion.correctFeedback = value; }, spec.recap.dataQuestion.correctFeedback);
  update("recap.dataQuestion.incorrectFeedback", (value) => { spec.recap.dataQuestion.incorrectFeedback = value; }, spec.recap.dataQuestion.incorrectFeedback);
  if (spec.recap.decisionQuestion) {
    update("recap.decisionQuestion.prompt", (value) => { spec.recap.decisionQuestion!.prompt = value; }, spec.recap.decisionQuestion.prompt);
    update("recap.decisionQuestion.correctFeedback", (value) => { spec.recap.decisionQuestion!.correctFeedback = value; }, spec.recap.decisionQuestion.correctFeedback);
    update("recap.decisionQuestion.incorrectFeedback", (value) => { spec.recap.decisionQuestion!.incorrectFeedback = value; }, spec.recap.decisionQuestion.incorrectFeedback);
  }

  return issues;
}

function normalizeProblemSpec(spec: ProblemSpec, rawProblem: string, fallbackTitle: string): { spec: ProblemSpec; issues: DraftIssue[] } {
  const issues: DraftIssue[] = [];
  issues.push(...repairStoryFrame(spec, rawProblem, fallbackTitle));
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
  issues.push(...repairDerivedOperands(spec));
  issues.push(...repairStepTemplateIds(spec));
  issues.push(...repairStepForms(spec));
  issues.push(...repairOperatorExperiments(spec));
  issues.push(...repairRepeatedQuantityNouns(spec));
  return { spec, issues };
}

function draftShapeErrors(spec: ProblemSpec): DraftIssue[] {
  const errors: DraftIssue[] = [];
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
    reasoning: {
      effort: "minimal",
    },
    max_output_tokens: 5000,
  };
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  const corsAllowed = applyAuthoringCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = corsAllowed ? 204 : 403;
    res.end();
    return;
  }

  if (!corsAllowed) {
    sendJson(res, 403, { ok: false, error: "This origin is not allowed to use the StoryMath authoring API." });
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
    if (body.secret?.trim() !== expectedSecret) {
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
    const { spec, issues: repairIssues } = normalizeProblemSpec(parseSpecFromResponseText(responseText), rawProblem, fallbackTitle);
    const issues = draftShapeErrors(spec);
    if (issues.length > 0) {
      sendJson(res, 422, {
        ok: false,
        error: "OpenAI returned an incomplete problem draft.",
        issues: [...repairIssues, ...issues],
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      source: "openai",
      model,
      spec,
      issues: repairIssues,
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Could not draft problem.",
    });
  }
}
