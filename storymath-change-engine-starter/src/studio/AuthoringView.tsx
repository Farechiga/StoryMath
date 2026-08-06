import { useMemo, useState } from "react";
import { BrandMark } from "../components/BrandMark";
import type { OperatorExperimentSpec, ProblemSpec } from "../model/problemSpec";
import { validateProblem } from "../domain/validateProblem";
import { useStudio } from "./StudioContext";
import { AUTHORING_PROBLEM_SPECS } from "./problemCatalog";

const PASSCODE = "0511";
const AUTHORING_DRAFT_KEY = "storymath_authoring_draft_v1";
const GITHUB_OWNER = "Farechiga";
const GITHUB_REPO = "StoryMath";
const GITHUB_BRANCH = "main";
const GITHUB_PROBLEM_PATH_PREFIX = "storymath-change-engine-starter/data/problems";

const RELATIONSHIPS = [
  {
    id: "additive_comparison_decrease",
    title: "Compare, find gap",
    operation: "-",
    roles: "bigger, difference, smaller",
    formula: "bigger - smaller = difference",
    visual: "Comparison gap bar",
  },
  {
    id: "additive_comparison_increase",
    title: "Compare, build bigger",
    operation: "+",
    roles: "smaller, difference, bigger",
    formula: "smaller + difference = bigger",
    visual: "Comparison gap bar",
  },
  {
    id: "start_change_end_decrease",
    title: "Start, remove, end",
    operation: "-",
    roles: "start, change, end",
    formula: "start - change = end",
    visual: "Full starting span over remaining + removed parts",
  },
  {
    id: "start_change_end_increase",
    title: "Start, add, end",
    operation: "+",
    roles: "start, change, end",
    formula: "start + change = end",
    visual: "Before/change/after bridge",
  },
  {
    id: "part_part_whole",
    title: "Parts make a whole",
    operation: "+",
    roles: "partA, partB, whole",
    formula: "partA + partB = whole",
    visual: "Part-whole bar",
  },
  {
    id: "multiplication_equal_groups",
    title: "Equal groups",
    operation: "×",
    roles: "groups, itemsPerGroup, total",
    formula: "groups × items = total",
    visual: "Repeated-groups grid",
  },
  {
    id: "division_equal_sharing",
    title: "Equal sharing",
    operation: "÷",
    roles: "total, groups, itemsPerGroup",
    formula: "total ÷ groups = items per group",
    visual: "Equal-shares tray",
  },
] as const;

type RelationshipId = typeof RELATIONSHIPS[number]["id"];
type QuantityDraft = {
  id: string;
  child: string;
  compact: string;
  lowercase: string;
  unit: string;
  unitSingular: string;
  unitPlural: string;
};
type StepDraft = {
  id: string;
  prompt: string;
  reasoningPrompt: string;
  backwardPrompt: string;
};
type RecapDraft = {
  headline: string;
  causalChain: string;
  dataQuestionPrompt: string;
  correctFeedback: string;
  incorrectFeedback: string;
  decisionQuestionPrompt: string;
  decisionCorrectAnswer: "yes" | "no";
  decisionCorrectFeedback: string;
  decisionIncorrectFeedback: string;
};
type RepoSavePayload = {
  ok?: boolean;
  path?: string;
  error?: string;
  issues?: Array<{ severity?: string; message?: string }>;
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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cloneSpec(spec: ProblemSpec): ProblemSpec {
  return JSON.parse(JSON.stringify(spec)) as ProblemSpec;
}

function base64EncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function githubJsonHeaders(token: string): HeadersInit {
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

function githubContentsUrl(problemId: string): string {
  const path = `${GITHUB_PROBLEM_PATH_PREFIX}/${problemId}.json`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;
}

async function saveProblemSpecThroughGitHub(spec: ProblemSpec, serialized: string, token: string): Promise<GitHubContentPayload> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Paste a GitHub token with Contents read/write access before saving from the live site.");
  }

  const issues = validateProblem(spec);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`Problem validation failed. ${errors.map((issue) => issue.message).join(" ")}`);
  }

  const url = githubContentsUrl(spec.id);
  const headers = githubJsonHeaders(trimmedToken);
  const existingResponse = await fetch(`${url}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  let existingSha: string | undefined;
  if (existingResponse.status !== 404) {
    const existingPayload = (await existingResponse.json().catch(() => ({}))) as GitHubContentPayload;
    if (!existingResponse.ok) {
      throw new Error(githubErrorMessage(existingPayload, "Could not check the existing GitHub file."));
    }
    existingSha = existingPayload.sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Save StoryMath problem: ${spec.metadata.title}`,
      content: base64EncodeUtf8(`${serialized}\n`),
      branch: GITHUB_BRANCH,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as GitHubContentPayload;
  if (!response.ok) {
    throw new Error(githubErrorMessage(payload, "Could not commit the problem JSON to GitHub."));
  }
  return payload;
}

function relationshipFor(id: string) {
  return RELATIONSHIPS.find((item) => item.id === id) ?? RELATIONSHIPS[0];
}

function quantityDraftsFor(spec: ProblemSpec): QuantityDraft[] {
  return spec.quantities.map((quantity) => ({
    id: quantity.id,
    child: quantity.label.child,
    compact: quantity.label.compact,
    lowercase: quantity.label.lowercase ?? quantity.label.compact.toLowerCase(),
    unit: quantity.unit,
    unitSingular: quantity.unitSingular ?? quantity.unit,
    unitPlural: quantity.unitPlural ?? quantity.unit,
  }));
}

function stepDraftsFor(spec: ProblemSpec): StepDraft[] {
  return spec.steps.map((step) => ({
    id: step.id,
    prompt: step.prompt,
    reasoningPrompt: step.reasoningPrompt,
    backwardPrompt: step.backwardCheck.prompt,
  }));
}

function recapDraftFor(spec: ProblemSpec): RecapDraft {
  return {
    headline: spec.recap.headline,
    causalChain: spec.recap.causalChain.join("\n"),
    dataQuestionPrompt: spec.recap.dataQuestion.prompt,
    correctFeedback: spec.recap.dataQuestion.correctFeedback,
    incorrectFeedback: spec.recap.dataQuestion.incorrectFeedback,
    decisionQuestionPrompt: spec.recap.decisionQuestion?.prompt ?? "",
    decisionCorrectAnswer: spec.recap.decisionQuestion?.correctAnswer ?? "yes",
    decisionCorrectFeedback: spec.recap.decisionQuestion?.correctFeedback ?? "",
    decisionIncorrectFeedback: spec.recap.decisionQuestion?.incorrectFeedback ?? "",
  };
}

function singularize(noun: string): string {
  const trimmed = noun.trim();
  if (trimmed.endsWith("ies")) return `${trimmed.slice(0, -3)}y`;
  if (trimmed.endsWith("s") && !trimmed.endsWith("ss")) return trimmed.slice(0, -1);
  return trimmed;
}

function titleCaseFirst(value: string): string {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function replaceFirst(text: string, literal: string, replacement: string): string {
  return text.replace(literal, replacement);
}

function extractAfterTitle(raw: string): { title: string; story: string } {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2 && !/[?.!]$/.test(lines[0]!)) {
    return { title: lines[0]!, story: lines.slice(1).join(" ") };
  }
  return { title: "", story: raw.trim().replace(/\s+/g, " ") };
}

function buildEqualGroupsThenSubtractGuess(rawInput: string, fallbackTitle: string): ProblemSpec | null {
  const { title: titleFromText, story } = extractAfterTitle(rawInput);
  const storyTitle = titleFromText || fallbackTitle || "Generated StoryMath problem";
  const id = `${slugify(storyTitle) || "generated_storymath_problem"}-v1`;
  const eachMatch = story.match(/(\d+)\s+([a-z][a-z -]*?)\s+for each\s+([a-z][a-z -]*)/i);
  const topMatch = story.match(/top\s+(\d+)\s+([a-z][a-z -]*?)(?=\s+to\b|\s+that\b|[.?!,]|$)/i);
  if (!eachMatch || !topMatch) return null;

  const itemsPerGroupValue = Number(eachMatch[1]);
  const itemPlural = eachMatch[2]!.trim();
  const groupSingular = singularize(eachMatch[3]!.trim().replace(/\bthat\b.*$/i, ""));
  const groupPattern = new RegExp(`(?:for|designs for|making designs for)\\s+(\\d+)\\s+([a-z][a-z -]*?)(?=[.,]|\\s+She\\b|\\s+he\\b|\\s+they\\b|$)`, "i");
  const groupMatch = story.match(groupPattern);
  const groupValue = Number(groupMatch?.[1] ?? 0);
  if (!Number.isFinite(groupValue) || groupValue <= 0) return null;

  const selectedValue = Number(topMatch[1]);
  const selectedPlural = topMatch[2]!.trim();
  const normalizedItemPlural = selectedPlural.includes(itemPlural) ? selectedPlural : itemPlural;
  const itemSingular = singularize(normalizedItemPlural);
  const groupPlural = groupSingular.endsWith("s") ? groupSingular : `${groupSingular}s`;
  const totalValue = groupValue * itemsPerGroupValue;
  const eliminatedValue = totalValue - selectedValue;
  const firstName = story.match(/^([A-Z][a-z]+)/)?.[1] ?? "the student";
  const theme = storyTitle.includes("Fashion") ? "Fashion show design fundraiser" : "Generated two-step model";

  let tokenized = story;
  if (groupMatch) tokenized = replaceFirst(tokenized, `${groupValue} ${groupMatch[2]!.trim()}`, "{quantity:models_to_design_for}");
  tokenized = replaceFirst(tokenized, eachMatch[0], eachMatch[0].replace(`${itemsPerGroupValue} ${itemPlural}`, "{quantity:sketches_per_model}"));
  tokenized = replaceFirst(tokenized, topMatch[0], topMatch[0].replace(`${selectedValue} ${selectedPlural}`, "{quantity:top_sketches}"));

  return {
    id,
    metadata: {
      title: storyTitle,
      theme,
      gradeBand: "3-4",
      factualStatus: "realistic",
      tags: ["multiplication", "subtraction", "equal groups", "two-step"],
      catalogOrder: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
    },
    dimension: {
      kind: "count",
      increaseLabel: "More",
      decreaseLabel: "Fewer",
      sameLabel: "The same",
      increaseLabelLower: "more",
      decreaseLabelLower: "fewer",
      sameLabelLower: "the same",
    },
    storyChrome: {
      openingEyebrow: "Design studio tally",
      startCta: "Open the design board",
      finishCta: "Close the design board",
      completionTitle: "Design tally complete",
      stepProgressVerb: "model the design sketches",
      groupNoun: groupSingular,
      learnerRole: "design planner",
    },
    story: {
      briefTemplate: tokenized,
      causalEvent: `Each ${groupSingular} needed the same number of ${normalizedItemPlural}.`,
      closingNoteTemplate: `${firstName} had to eliminate {quantity:eliminated_sketches}.`,
    },
    quantities: [
      {
        id: "models_to_design_for",
        label: {
          child: `${titleCaseFirst(groupPlural)} Seraphina designed for`,
          compact: `${titleCaseFirst(groupPlural)}`,
          lowercase: `${groupPlural} Seraphina designed for`,
        },
        unit: groupPlural,
        unitSingular: groupSingular,
        unitPlural: groupPlural,
        value: groupValue,
        visibility: "given",
      },
      {
        id: "sketches_per_model",
        label: {
          child: `${titleCaseFirst(normalizedItemPlural)} for each ${groupSingular}`,
          compact: `${titleCaseFirst(normalizedItemPlural)} each`,
          lowercase: `${normalizedItemPlural} for each ${groupSingular}`,
        },
        unit: normalizedItemPlural,
        unitSingular: itemSingular,
        unitPlural: normalizedItemPlural,
        value: itemsPerGroupValue,
        visibility: "given",
      },
      {
        id: "total_sketches",
        label: {
          child: `Total ${normalizedItemPlural}`,
          compact: `Total ${normalizedItemPlural}`,
          lowercase: `the total ${normalizedItemPlural}`,
        },
        unit: normalizedItemPlural,
        unitSingular: itemSingular,
        unitPlural: normalizedItemPlural,
        value: null,
        visibility: "find",
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            groups: "models_to_design_for",
            itemsPerGroup: "sketches_per_model",
          },
        },
        expectedValueForFixture: totalValue,
      },
      {
        id: "top_sketches",
        label: {
          child: `Top ${normalizedItemPlural}`,
          compact: `Top ${normalizedItemPlural}`,
          lowercase: `the top ${normalizedItemPlural}`,
        },
        unit: normalizedItemPlural,
        unitSingular: itemSingular,
        unitPlural: normalizedItemPlural,
        value: selectedValue,
        visibility: "given",
      },
      {
        id: "eliminated_sketches",
        label: {
          child: `Eliminated ${normalizedItemPlural}`,
          compact: `Eliminated ${normalizedItemPlural}`,
          lowercase: `the eliminated ${normalizedItemPlural}`,
        },
        unit: normalizedItemPlural,
        unitSingular: itemSingular,
        unitPlural: normalizedItemPlural,
        value: null,
        visibility: "revealed_after_step",
        derived: {
          formulaId: "start_minus_change_equals_end",
          operands: {
            start: "total_sketches",
            change: "top_sketches",
          },
        },
        expectedValueForFixture: eliminatedValue,
      },
    ],
    steps: [
      {
        id: "find_total_sketches",
        order: 1,
        prompt: `How many ${normalizedItemPlural} did ${firstName} make in all?`,
        reasoningPrompt: `Each ${groupSingular} gets the same number of ${normalizedItemPlural}. What operation models equal groups?`,
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          groups: "models_to_design_for",
          itemsPerGroup: "sketches_per_model",
          total: "total_sketches",
        },
        goalQuantityId: "total_sketches",
        acceptedEquationFormIds: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Now let's divide the total ${normalizedItemPlural} by the number of ${groupPlural}. Do we get the sketches for each ${groupSingular}?`,
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
      {
        id: "find_eliminated_sketches",
        order: 2,
        prompt: `How many ${normalizedItemPlural} did ${firstName} have to eliminate?`,
        reasoningPrompt: `The top ${selectedValue} ${normalizedItemPlural} are kept. What operation finds the sketches left out?`,
        relationshipTemplateId: "start_change_end_decrease",
        roleToQuantityId: {
          start: "total_sketches",
          change: "top_sketches",
          end: "eliminated_sketches",
        },
        goalQuantityId: "eliminated_sketches",
        acceptedEquationFormIds: ["start_minus_change_equals_end"],
        preferredEquationFormId: "start_minus_change_equals_end",
        expectedDirection: "decrease",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Add the top ${normalizedItemPlural} back to the eliminated ${normalizedItemPlural}. Do you return to the total?`,
          acceptedEquationFormIds: ["end_plus_change_equals_start"],
        },
      },
    ],
    operatorExperiments: [
      {
        stepId: "find_total_sketches",
        operator: "+",
        narrativeFit: "different_question",
        alternateWorldTemplate: `Adding would count ${groupPlural} and ${normalizedItemPlural} as separate things, not equal groups.`,
      },
      {
        stepId: "find_total_sketches",
        operator: "-",
        narrativeFit: "different_story",
        alternateWorldTemplate: `Subtracting would fit a story where some ${normalizedItemPlural} were removed before counting the total.`,
      },
      {
        stepId: "find_total_sketches",
        operator: "×",
        narrativeFit: "actual",
        visualModel: "repeated_groups_grid",
        alternateWorldTemplate: `This matches the story: each ${groupSingular} gets the same number of ${normalizedItemPlural}.`,
      },
      {
        stepId: "find_total_sketches",
        operator: "÷",
        narrativeFit: "different_question",
        visualModel: "equal_shares_tray",
        alternateWorldTemplate: `Dividing would fit a different question about sharing ${normalizedItemPlural} equally.`,
      },
      {
        stepId: "find_eliminated_sketches",
        operator: "+",
        narrativeFit: "different_story",
        alternateWorldTemplate: `Adding would fit a story where the top ${normalizedItemPlural} were added onto the total.`,
      },
      {
        stepId: "find_eliminated_sketches",
        operator: "-",
        narrativeFit: "actual",
        alternateWorldTemplate: `This matches the story: subtracting the top ${normalizedItemPlural} from all the ${normalizedItemPlural} finds what was eliminated.`,
      },
      {
        stepId: "find_eliminated_sketches",
        operator: "×",
        narrativeFit: "different_question",
        visualModel: "repeated_groups_grid",
        alternateWorldTemplate: `Multiplying would fit a different question about equal groups of ${normalizedItemPlural}.`,
      },
      {
        stepId: "find_eliminated_sketches",
        operator: "÷",
        narrativeFit: "different_question",
        visualModel: "equal_shares_tray",
        alternateWorldTemplate: `Dividing would fit a different question about sharing the ${normalizedItemPlural}.`,
      },
    ],
    recap: {
      headline: `Why ${firstName} eliminated {quantity:eliminated_sketches}`,
      causalChain: [
        `{quantity:models_to_design_for} each needed {quantity:sketches_per_model}.`,
        `That made {quantity:total_sketches}.`,
        `${firstName} kept {quantity:top_sketches}, leaving {quantity:eliminated_sketches} to eliminate.`,
      ],
      calcFromStepId: "find_total_sketches",
      totalVisualStepId: "find_eliminated_sketches",
      dataQuestion: {
        prompt: `What does {quantity:eliminated_sketches} represent in the design model?`,
        correctQuantityId: "eliminated_sketches",
        distractorQuantityIds: ["models_to_design_for", "total_sketches", "top_sketches"],
        correctFeedback: `Right. {quantity:eliminated_sketches} is the number of sketches not chosen for outfits.`,
        incorrectFeedback: `That amount is the sketches left after the top choices: {quantity:eliminated_sketches}.`,
      },
    },
  };
}

function replaceNumberInMatch(text: string, matchText: string, value: number, token: string): string {
  return replaceFirst(text, matchText, matchText.replace(new RegExp(`\\b${value}\\b`), token));
}

function replaceMoneyInMatch(text: string, matchText: string, value: number, token: string): string {
  const moneyPattern = new RegExp(`£?\\s*${value}(?:\\s+pounds?)?`, "i");
  return replaceFirst(text, matchText, matchText.replace(moneyPattern, `£${token}`));
}

function inferSoldItemPlural(story: string, firstName: string): string {
  const knownItem = story.match(/\b(bookmarks|stickers|cards|prints|posters|tickets)\b/i)?.[1];
  if (knownItem) return knownItem.toLowerCase();

  const afterName = story.match(new RegExp(`^${firstName}\\s+([a-z][a-z-]*s)\\b`, "i"))?.[1];
  if (afterName) return afterName.toLowerCase();

  const madeItem = story.match(/\b(?:make|making|made|sell|selling)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z-]*s)\b/i)?.[1];
  return madeItem?.toLowerCase() ?? "items";
}

function inferFundraiserOwner(story: string): string {
  const opportunityMatch = story.match(/^[A-Z][a-z]+\s+(?:gave|offered)\s+([A-Z][a-z]+)\b/);
  if (opportunityMatch) return opportunityMatch[1]!;

  return story.match(/^([A-Z][a-z]+)/)?.[1] ?? "the seller";
}

function possessiveName(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function inferSearchers(story: string): { count: number; label: string } {
  const pairMatch = story.match(/^([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/);
  if (pairMatch) {
    return { count: 2, label: `${pairMatch[1]} and ${pairMatch[2]}` };
  }

  const friendCountMatch = story.match(/\b(\d+)\s+friends?\b/i);
  if (friendCountMatch) {
    const count = Number(friendCountMatch[1]);
    if (Number.isFinite(count) && count > 0) return { count, label: `${count} friends` };
  }

  return { count: 2, label: "the friends" };
}

function equalGroupsExperiments(args: {
  stepId: string;
  groupPlural: string;
  itemPlural: string;
  actualSentence: string;
}): OperatorExperimentSpec[] {
  const { stepId, groupPlural, itemPlural, actualSentence } = args;
  return [
    {
      stepId,
      operator: "+",
      narrativeFit: "different_question",
      alternateWorldTemplate: `Adding would count ${groupPlural} and ${itemPlural} side by side, not every equal group.`,
    },
    {
      stepId,
      operator: "-",
      narrativeFit: "different_story",
      alternateWorldTemplate: `Subtracting would fit a story where some ${itemPlural} were removed.`,
    },
    {
      stepId,
      operator: "×",
      narrativeFit: "actual",
      visualModel: "repeated_groups_grid",
      alternateWorldTemplate: actualSentence,
    },
    {
      stepId,
      operator: "÷",
      narrativeFit: "different_question",
      visualModel: "equal_shares_tray",
      alternateWorldTemplate: `Dividing would fit a different question about sharing ${itemPlural} equally.`,
    },
  ];
}

function equalSharingExperiments(args: {
  stepId: string;
  totalPlural: string;
  groupPlural: string;
  itemsPerGroupPlural: string;
  actualSentence: string;
}): OperatorExperimentSpec[] {
  const { stepId, totalPlural, groupPlural, itemsPerGroupPlural, actualSentence } = args;
  return [
    {
      stepId,
      operator: "+",
      narrativeFit: "different_question",
      alternateWorldTemplate: `Adding would count ${totalPlural} and ${groupPlural} side by side, not share the search.`,
    },
    {
      stepId,
      operator: "-",
      narrativeFit: "different_story",
      alternateWorldTemplate: `Subtracting would fit a story where some ${totalPlural} were removed from the search.`,
    },
    {
      stepId,
      operator: "×",
      narrativeFit: "different_question",
      visualModel: "repeated_groups_grid",
      alternateWorldTemplate: `Multiplying would fit a different question about equal groups of ${itemsPerGroupPlural}.`,
    },
    {
      stepId,
      operator: "÷",
      narrativeFit: "actual",
      visualModel: "equal_shares_tray",
      alternateWorldTemplate: actualSentence,
    },
  ];
}

function buildMonthlySalesAffordabilityGuess(rawInput: string, fallbackTitle: string): ProblemSpec | null {
  const { title: titleFromText, story } = extractAfterTitle(rawInput);
  if (!/\bmonths?\b/i.test(story)) return null;

  const perMonthMatch = story.match(/\blimited run of\s+(\d+)(?:\s+([a-z][a-z -]*?))?\s+each\b/i);
  const priceMatch =
    story.match(/\bsell(?:\s+(?:them|each|the\s+[a-z][a-z -]*))?\s+for\s+£?\s*(\d+)(?:\s+pounds?)?\s+each\b/i) ??
    story.match(/\bsell\s+each\s+for\s+£?\s*(\d+)(?:\s+pounds?)?\b/i);
  const packageMatch =
    story.match(/\b(?:buying|buy|purchase|purchasing)\s+(?:a|an|the)?\s*£?\s*(\d+)(?:\s+pounds?)?\s+([a-z][a-z -]*?(?:package|subscription|tickets?))(?:[.?!]|$)/i) ??
    story.match(/£\s*(\d+)(?:\s+pounds?)?\s+([a-z][a-z -]*?(?:package|subscription|tickets?))(?:[.?!]|$)/i);
  if (!perMonthMatch || !priceMatch || !packageMatch) return null;

  const monthsValue = 12;
  const perMonthValue = Number(perMonthMatch[1]);
  const priceValue = Number(priceMatch[1]);
  const packageCostValue = Number(packageMatch[1]);
  if (![perMonthValue, priceValue, packageCostValue].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  const firstName = inferFundraiserOwner(story);
  const itemPlural = inferSoldItemPlural(story, firstName);
  const itemSingular = singularize(itemPlural);
  const itemStem = slugify(itemSingular) || "item";
  const itemPluralStem = slugify(itemPlural) || `${itemStem}s`;
  const itemsPerMonthId = `${itemPluralStem}_per_month`;
  const totalItemsId = `total_${itemPluralStem}`;
  const pricePerItemId = `price_per_${itemStem}`;
  const saleMoneyId = `${itemStem}_revenue`;
  const packageNoun = packageMatch[2]!.trim();
  const packageLabel = titleCaseFirst(packageNoun);
  const totalItemsValue = monthsValue * perMonthValue;
  const revenueValue = totalItemsValue * priceValue;
  const enough = revenueValue >= packageCostValue;
  const generatedTitle = `${possessiveName(firstName)} ${packageNoun.includes("theatre") ? "theatre " : ""}${itemSingular} fundraiser`;
  const storyTitle =
    titleFromText ||
    (!fallbackTitle || fallbackTitle === "New StoryMath problem" ? titleCaseFirst(generatedTitle) : fallbackTitle);
  const id = `${slugify(storyTitle) || "monthly_sales_affordability"}-v1`;

  let tokenized = story;
  tokenized = replaceNumberInMatch(tokenized, perMonthMatch[0], perMonthValue, `{value:${itemsPerMonthId}}`);
  tokenized = replaceMoneyInMatch(tokenized, priceMatch[0], priceValue, `{value:${pricePerItemId}}`);
  tokenized = replaceMoneyInMatch(tokenized, packageMatch[0], packageCostValue, "{value:package_cost}");
  tokenized = tokenized.replace(
    /\bIf they all sell,?\s+how much will\s+(?:she|he|they|[A-Z][a-z]+)\s+have left after buying\s+(?:a|an|the)?\s*£\{value:package_cost\}\s+[a-z][a-z -]*?\?/i,
    `If they all sell, will ${firstName} have enough to buy the £{value:package_cost} ${packageNoun}?`,
  );

  return {
    id,
    metadata: {
      title: storyTitle,
      theme: "Will the fundraiser be enough?",
      gradeBand: "3-4",
      factualStatus: "realistic",
      tags: ["multiplication", "equal groups", "money", "yes-no", "two-step"],
      catalogOrder: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
    },
    dimension: {
      kind: "money",
      increaseLabel: "More",
      decreaseLabel: "Less",
      sameLabel: "The same",
      increaseLabelLower: "more",
      decreaseLabelLower: "less",
      sameLabelLower: "the same",
    },
    storyChrome: {
      openingEyebrow: "Fundraiser plan",
      startCta: "Open the fundraiser plan",
      finishCta: "Close the fundraiser plan",
      completionTitle: "Fundraiser decision made",
      stepProgressVerb: `model the ${itemPlural}`,
      groupNoun: itemSingular,
      learnerRole: "fundraiser planner",
    },
    story: {
      briefTemplate: tokenized,
      causalEvent: `Each month has the same limited run, and each ${itemSingular} sells for the same amount.`,
      closingNoteTemplate: enough
        ? `${firstName} would have enough for the ${packageNoun}.`
        : `${firstName} would not have enough for the ${packageNoun}.`,
    },
    quantities: [
      {
        id: "calendar_months",
        label: {
          child: "Months in a year",
          compact: "Months",
          lowercase: "the months in a year",
        },
        unit: "months",
        unitSingular: "month",
        unitPlural: "months",
        value: monthsValue,
        visibility: "given",
      },
      {
        id: itemsPerMonthId,
        label: {
          child: `${titleCaseFirst(itemPlural)} made each month`,
          compact: `${titleCaseFirst(itemPlural)} each month`,
          lowercase: `${itemPlural} made each month`,
        },
        unit: itemPlural,
        unitSingular: itemSingular,
        unitPlural: itemPlural,
        value: perMonthValue,
        visibility: "given",
      },
      {
        id: totalItemsId,
        label: {
          child: `Total ${itemPlural} made`,
          compact: `Total ${itemPlural}`,
          lowercase: `the total ${itemPlural}`,
        },
        unit: itemPlural,
        unitSingular: itemSingular,
        unitPlural: itemPlural,
        value: null,
        visibility: "find",
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            groups: "calendar_months",
            itemsPerGroup: itemsPerMonthId,
          },
        },
        expectedValueForFixture: totalItemsValue,
      },
      {
        id: pricePerItemId,
        label: {
          child: `Price per ${itemSingular}`,
          compact: `Price per ${itemSingular}`,
          lowercase: `the price per ${itemSingular}`,
        },
        unit: "pounds",
        unitSingular: "pound",
        unitPlural: "pounds",
        value: priceValue,
        visibility: "given",
      },
      {
        id: saleMoneyId,
        label: {
          child: `Money from selling all ${itemPlural}`,
          compact: `${titleCaseFirst(itemSingular)} revenue`,
          lowercase: `the money from selling all ${itemPlural}`,
        },
        unit: "pounds",
        unitSingular: "pound",
        unitPlural: "pounds",
        value: null,
        visibility: "find",
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            groups: totalItemsId,
            itemsPerGroup: pricePerItemId,
          },
        },
        expectedValueForFixture: revenueValue,
      },
      {
        id: "package_cost",
        label: {
          child: `${packageLabel} cost`,
          compact: `${packageLabel} cost`,
          lowercase: `the ${packageNoun} cost`,
        },
        unit: "pounds",
        unitSingular: "pound",
        unitPlural: "pounds",
        value: packageCostValue,
        visibility: "given",
      },
    ],
    steps: [
      {
        id: `find_${totalItemsId}`,
        order: 1,
        prompt: `How many ${itemPlural} could ${firstName} make across the whole year?`,
        reasoningPrompt: `There are 12 months in a year, and each month has the same limited run. What operation models equal groups?`,
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          groups: "calendar_months",
          itemsPerGroup: itemsPerMonthId,
          total: totalItemsId,
        },
        goalQuantityId: totalItemsId,
        acceptedEquationFormIds: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Now let's divide the total ${itemPlural} by the number of months. Do we get the limited run for each month?`,
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
      {
        id: `find_${saleMoneyId}`,
        order: 2,
        prompt: `If all the ${itemPlural} sell, how much money will ${firstName} collect?`,
        reasoningPrompt: `Each ${itemSingular} sells for the same number of pounds. What operation finds the total money?`,
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          groups: totalItemsId,
          itemsPerGroup: pricePerItemId,
          total: saleMoneyId,
        },
        goalQuantityId: saleMoneyId,
        acceptedEquationFormIds: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Now let's divide the sale money by the total ${itemPlural}. Do we get the price for each ${itemSingular}?`,
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
    ],
    operatorExperiments: [
      ...equalGroupsExperiments({
        stepId: `find_${totalItemsId}`,
        groupPlural: "months",
        itemPlural,
        actualSentence: `This matches the story: every month has {quantity:${itemsPerMonthId}}.`,
      }),
      ...equalGroupsExperiments({
        stepId: `find_${saleMoneyId}`,
        groupPlural: itemPlural,
        itemPlural: "pounds",
        actualSentence: `This matches the story: every ${itemSingular} sells for £{value:${pricePerItemId}}.`,
      }),
    ],
    recap: {
      headline: `Will ${possessiveName(firstName)} fundraiser be enough?`,
      causalChain: [
        `{quantity:calendar_months} with {quantity:${itemsPerMonthId}} each made {quantity:${totalItemsId}}.`,
        `{quantity:${totalItemsId}} sold for £{value:${pricePerItemId}} each made £{value:${saleMoneyId}}.`,
        `The ${packageNoun} costs £{value:package_cost}.`,
      ],
      calcFromStepId: `find_${saleMoneyId}`,
      dataQuestion: {
        prompt: `What does £{value:${saleMoneyId}} represent in the fundraiser model?`,
        correctQuantityId: saleMoneyId,
        distractorQuantityIds: [totalItemsId, pricePerItemId, "package_cost"],
        correctFeedback: `Right. £{value:${saleMoneyId}} is the money from selling all the ${itemPlural}.`,
        incorrectFeedback: `That amount is the sale money: £{value:${saleMoneyId}}.`,
      },
      decisionQuestion: {
        prompt: `Will ${firstName} have enough to buy the £{value:package_cost} ${packageNoun}?`,
        correctAnswer: enough ? "yes" : "no",
        correctFeedback: enough
          ? `Yes. Selling all the ${itemPlural} makes £{value:${saleMoneyId}}, which is enough for the £{value:package_cost} ${packageNoun}.`
          : `Right. Selling all the ${itemPlural} makes £{value:${saleMoneyId}}, which is not enough for the £{value:package_cost} ${packageNoun}.`,
        incorrectFeedback: enough
          ? `Check the comparison: £{value:${saleMoneyId}} is more than £{value:package_cost}, so the answer is yes.`
          : `Check the comparison: £{value:${saleMoneyId}} is less than £{value:package_cost}, so the answer is no.`,
      },
    },
  };
}

function buildShelfBookSharingGuess(rawInput: string, fallbackTitle: string): ProblemSpec | null {
  const { title: titleFromText, story } = extractAfterTitle(rawInput);
  if (!/\bshelves\b/i.test(story) || !/\bbooks\b/i.test(story) || !/\beach friend\b/i.test(story)) {
    return null;
  }

  const shelfMatch = story.match(/\bThere are\s+(\d+)\s+(shelves)\b/i);
  const booksPerShelfMatch = story.match(/\beach\s+with\s+(?:about|approximately|around)?\s*(\d+)\s+(books)\b/i);
  if (!shelfMatch || !booksPerShelfMatch) return null;

  const shelfValue = Number(shelfMatch[1]);
  const booksPerShelfValue = Number(booksPerShelfMatch[1]);
  if (![shelfValue, booksPerShelfValue].every((value) => Number.isFinite(value) && value > 0)) return null;

  const searchers = inferSearchers(story);
  const totalBooksValue = shelfValue * booksPerShelfValue;
  const booksPerFriendValue = totalBooksValue / searchers.count;
  const storyTitle =
    titleFromText ||
    (!fallbackTitle || fallbackTitle === "New StoryMath problem"
      ? `${searchers.label === "the friends" ? "The friends" : searchers.label}'s Library of Congress search`
      : fallbackTitle);
  const id = `${slugify(storyTitle) || "library_book_search"}-v1`;

  let tokenized = story;
  tokenized = replaceFirst(tokenized, `${shelfValue} ${shelfMatch[2]!.toLowerCase()}`, "{quantity:library_shelves}");
  tokenized = replaceFirst(
    tokenized,
    `${booksPerShelfValue} ${booksPerShelfMatch[2]!.toLowerCase()}`,
    "{quantity:books_per_shelf}",
  );
  tokenized = tokenized.replace(/\b(?:about|around)\s+(?=\{quantity:books_per_shelf\})/i, "approximately ");

  return {
    id,
    metadata: {
      title: storyTitle,
      theme: "Library clue search",
      gradeBand: "3-4",
      factualStatus: "realistic",
      tags: ["multiplication", "division", "equal groups", "equal sharing", "two-step", "approximation"],
      catalogOrder: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
    },
    dimension: {
      kind: "count",
      increaseLabel: "More",
      decreaseLabel: "Fewer",
      sameLabel: "The same",
      increaseLabelLower: "more",
      decreaseLabelLower: "fewer",
      sameLabelLower: "the same",
    },
    storyChrome: {
      openingEyebrow: "Library search note",
      startCta: "Open the search plan",
      finishCta: "Close the search plan",
      completionTitle: "Search plan complete",
      stepProgressVerb: "model the book search",
      groupNoun: "book",
      learnerRole: "clue finder",
    },
    story: {
      briefTemplate: tokenized,
      causalEvent: "Each shelf has approximately the same number of books, and the friends can split the search.",
      closingNoteTemplate: `Each friend would need to search approximately {quantity:books_per_friend}.`,
    },
    quantities: [
      {
        id: "library_shelves",
        label: {
          child: "Shelves on the bookcase",
          compact: "Shelves",
          lowercase: "the shelves on the bookcase",
        },
        unit: "shelves",
        unitSingular: "shelf",
        unitPlural: "shelves",
        value: shelfValue,
        visibility: "given",
      },
      {
        id: "books_per_shelf",
        label: {
          child: "Approximate number of books on each shelf",
          compact: "Books each shelf",
          lowercase: "the approximate number of books on each shelf",
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: booksPerShelfValue,
        visibility: "given",
      },
      {
        id: "total_books",
        label: {
          child: "Approximate total books on the bookcase",
          compact: "Total books",
          lowercase: "the approximate total books on the bookcase",
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: null,
        visibility: "find",
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            groups: "library_shelves",
            itemsPerGroup: "books_per_shelf",
          },
        },
        expectedValueForFixture: totalBooksValue,
      },
      {
        id: "searching_friends",
        label: {
          child: "Friends searching",
          compact: "Friends",
          lowercase: "the friends searching",
        },
        unit: "friends",
        unitSingular: "friend",
        unitPlural: "friends",
        value: searchers.count,
        visibility: "given",
      },
      {
        id: "books_per_friend",
        label: {
          child: "Books each friend searches",
          compact: "Books per friend",
          lowercase: "the books each friend searches",
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: null,
        visibility: "revealed_after_step",
        derived: {
          formulaId: "total_divided_by_groups_equals_items",
          operands: {
            total: "total_books",
            groups: "searching_friends",
          },
        },
        expectedValueForFixture: booksPerFriendValue,
      },
    ],
    steps: [
      {
        id: "find_total_books",
        order: 1,
        prompt: "Approximately how many books might be on the bookcase?",
        reasoningPrompt: "Each shelf has approximately the same number of books. What operation models equal groups?",
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          groups: "library_shelves",
          itemsPerGroup: "books_per_shelf",
          total: "total_books",
        },
        goalQuantityId: "total_books",
        acceptedEquationFormIds: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt:
            "Now let's divide the approximate total books on the bookcase by the number of shelves. Do we get the approximate number of books on each shelf?",
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
      {
        id: "find_books_per_friend",
        order: 2,
        prompt: "If the clue is in the last book, approximately how many books does each friend need to search?",
        reasoningPrompt: "The friends can split the total search evenly. What operation finds each friend’s share?",
        relationshipTemplateId: "division_equal_sharing",
        roleToQuantityId: {
          total: "total_books",
          groups: "searching_friends",
          itemsPerGroup: "books_per_friend",
        },
        goalQuantityId: "books_per_friend",
        acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        preferredEquationFormId: "total_divided_by_groups_equals_items",
        expectedDirection: "split",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: "Multiply the books per friend by the friends searching. Do you return to the total books?",
          acceptedEquationFormIds: ["groups_times_items_equals_total"],
        },
      },
    ],
    operatorExperiments: [
      ...equalGroupsExperiments({
        stepId: "find_total_books",
        groupPlural: "shelves",
        itemPlural: "books",
        actualSentence: "This matches the story: every shelf has approximately {quantity:books_per_shelf}.",
      }),
      ...equalSharingExperiments({
        stepId: "find_books_per_friend",
        totalPlural: "books",
        groupPlural: "friends",
        itemsPerGroupPlural: "books per friend",
        actualSentence: "This matches the story: the total books are split between {quantity:searching_friends}.",
      }),
    ],
    recap: {
      headline: "How the friends split the book search",
      causalChain: [
        `{quantity:library_shelves} with approximately {quantity:books_per_shelf} each made approximately {quantity:total_books}.`,
        `{quantity:total_books} split between {quantity:searching_friends} gives approximately {quantity:books_per_friend}.`,
      ],
      calcFromStepId: "find_books_per_friend",
      dataQuestion: {
        prompt: "What does {quantity:books_per_friend} represent in the library search model?",
        correctQuantityId: "books_per_friend",
        distractorQuantityIds: ["library_shelves", "total_books", "searching_friends"],
        correctFeedback: "Right. {quantity:books_per_friend} is approximately how many books each friend searches.",
        incorrectFeedback: "That amount is each friend’s share of the search: {quantity:books_per_friend}.",
      },
    },
  };
}

function buildGroupedBooksThenTradeGuess(rawInput: string, fallbackTitle: string): ProblemSpec | null {
  const { title: titleFromText, story } = extractAfterTitle(rawInput);
  if (!/\bbooks\b/i.test(story) || !/\b(?:sold|traded|removed|donated|gave away)\b/i.test(story) || !/\bleft\b/i.test(story)) return null;

  const groupMatch = story.match(/\b(?:had|has)\s+(\d+)\s+([a-z][a-z -]*?cars)\b/i);
  const booksPerGroupMatch = story.match(
    /\beach\s+(?:section|car)\s+(?:has|had|holds|held|contains|contained)\s+(?:about|approximately|around)?\s*(\d+)\s+(books)\b/i,
  );
  const removedBooksMatch = story.match(
    /\b([A-Z][a-z]+)\s+(sold|traded|removed|donated|gave away)\s+(\d+)\s+(?:of\s+the\s+)?(books)\b/i,
  );
  if (!groupMatch || !booksPerGroupMatch || !removedBooksMatch) return null;

  const groupValue = Number(groupMatch[1]);
  const booksPerGroupValue = Number(booksPerGroupMatch[1]);
  const removedBooksValue = Number(removedBooksMatch[3]);
  if (![groupValue, booksPerGroupValue, removedBooksValue].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  const groupPlural = groupMatch[2]!.trim().toLowerCase();
  const groupSingular = singularize(groupPlural);
  const vehicleName = story.match(/^The\s+([A-Z][A-Za-z0-9'-]*)\b/)?.[1] ?? "the vehicle";
  const actor = removedBooksMatch[1] ?? "someone";
  const actionVerb = removedBooksMatch[2]!.toLowerCase();
  const actionQuantityId =
    actionVerb === "sold"
      ? "sold_books"
      : actionVerb === "traded"
        ? "traded_books"
        : actionVerb === "donated"
          ? "donated_books"
          : "removed_books";
  const actionCompact =
    actionVerb === "sold"
      ? "Sold books"
      : actionVerb === "traded"
        ? "Traded books"
        : actionVerb === "donated"
          ? "Donated books"
          : "Removed books";
  const actionNoun =
    actionVerb === "sold"
      ? "sale"
      : actionVerb === "traded"
        ? "trade"
        : actionVerb === "donated"
          ? "donation"
          : "removal";
  const actionReason = `${actor} ${actionVerb} some books. What operation shows what remained?`;
  const totalBooksValue = groupValue * booksPerGroupValue;
  const booksLeftValue = totalBooksValue - removedBooksValue;
  const storyTitle =
    titleFromText ||
    (!fallbackTitle || fallbackTitle === "New StoryMath problem"
      ? `${vehicleName} book ${actionNoun} in Venice`
      : fallbackTitle);
  const id = `${slugify(storyTitle) || "grouped_books_trade"}-v1`;

  let tokenized = story;
  tokenized = replaceFirst(tokenized, `${groupValue} ${groupPlural}`, "{quantity:train_cars}");
  tokenized = replaceFirst(tokenized, `${booksPerGroupValue} books`, "{quantity:books_per_section}");
  tokenized = replaceFirst(
    tokenized,
    removedBooksMatch[0],
    removedBooksMatch[0].replace(/\b\d+\s+(?:of\s+the\s+)?books\b/i, `{quantity:${actionQuantityId}}`),
  );
  tokenized = tokenized.replace(/\b(?:about|around)\s+(?=\{quantity:books_per_section\})/i, "approximately ");

  return {
    id,
    metadata: {
      title: storyTitle,
      theme: `Books left after a ${actionNoun}`,
      gradeBand: "3-4",
      factualStatus: "fictionalized",
      tags: ["multiplication", "subtraction", "equal groups", "two-step", "approximation"],
      catalogOrder: 0,
      publishedAt: new Date().toISOString().slice(0, 10),
    },
    dimension: {
      kind: "count",
      increaseLabel: "More",
      decreaseLabel: "Fewer",
      sameLabel: "The same",
      increaseLabelLower: "more",
      decreaseLabelLower: "fewer",
      sameLabelLower: "the same",
    },
    storyChrome: {
      openingEyebrow: "Book train manifest",
      startCta: "Open the manifest",
      finishCta: "Close the manifest",
      completionTitle: "Manifest updated",
      stepProgressVerb: "model the books",
      groupNoun: "book",
      learnerRole: "manifest keeper",
    },
    story: {
      briefTemplate: tokenized,
      causalEvent: `Each ${groupSingular} works like a book section with approximately the same number of books.`,
      closingNoteTemplate: `After Venice, approximately {quantity:books_left_after_venice} were left on ${vehicleName}.`,
    },
    quantities: [
      {
        id: "train_cars",
        label: {
          child: `${titleCaseFirst(groupPlural)} on ${vehicleName}`,
          compact: titleCaseFirst(groupPlural),
          lowercase: `the ${groupPlural} on ${vehicleName}`,
        },
        unit: groupPlural,
        unitSingular: groupSingular,
        unitPlural: groupPlural,
        value: groupValue,
        visibility: "given",
      },
      {
        id: "books_per_section",
        label: {
          child: "Approximate number of books in each section",
          compact: "Books each section",
          lowercase: "the approximate number of books in each section",
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: booksPerGroupValue,
        visibility: "given",
      },
      {
        id: "books_before_venice",
        label: {
          child: "Approximate total books before Venice",
          compact: "Total books before Venice",
          lowercase: "the approximate total books before Venice",
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: null,
        visibility: "find",
        derived: {
          formulaId: "groups_times_items_equals_total",
          operands: {
            groups: "train_cars",
            itemsPerGroup: "books_per_section",
          },
        },
        expectedValueForFixture: totalBooksValue,
      },
      {
        id: actionQuantityId,
        label: {
          child: `Books ${actor} ${actionVerb} in Venice`,
          compact: actionCompact,
          lowercase: `the books ${actor} ${actionVerb} in Venice`,
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: removedBooksValue,
        visibility: "given",
      },
      {
        id: "books_left_after_venice",
        label: {
          child: `Books left on ${vehicleName} after Venice`,
          compact: "Books left",
          lowercase: `the books left on ${vehicleName} after Venice`,
        },
        unit: "books",
        unitSingular: "book",
        unitPlural: "books",
        value: null,
        visibility: "revealed_after_step",
        derived: {
          formulaId: "start_minus_change_equals_end",
          operands: {
            start: "books_before_venice",
            change: actionQuantityId,
          },
        },
        expectedValueForFixture: booksLeftValue,
      },
    ],
    steps: [
      {
        id: "find_books_before_venice",
        order: 1,
        prompt: `Approximately how many books were on ${vehicleName} before Venice?`,
        reasoningPrompt: `Each ${groupSingular} has approximately the same number of books. What operation models equal groups?`,
        relationshipTemplateId: "multiplication_equal_groups",
        roleToQuantityId: {
          groups: "train_cars",
          itemsPerGroup: "books_per_section",
          total: "books_before_venice",
        },
        goalQuantityId: "books_before_venice",
        acceptedEquationFormIds: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        preferredEquationFormId: "groups_times_items_equals_total",
        expectedDirection: "scale",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Now let's divide the total books before Venice by the number of ${groupPlural}. Do we get the approximate number of books in each section?`,
          acceptedEquationFormIds: ["total_divided_by_groups_equals_items"],
        },
      },
      {
        id: "find_books_left_after_venice",
        order: 2,
        prompt: `Approximately how many books were left on ${vehicleName} after Venice?`,
        reasoningPrompt: actionReason,
        relationshipTemplateId: "start_change_end_decrease",
        roleToQuantityId: {
          start: "books_before_venice",
          change: actionQuantityId,
          end: "books_left_after_venice",
        },
        goalQuantityId: "books_left_after_venice",
        acceptedEquationFormIds: ["start_minus_change_equals_end"],
        preferredEquationFormId: "start_minus_change_equals_end",
        expectedDirection: "decrease",
        operatorOptions: ["+", "-", "×", "÷"],
        backwardCheck: {
          prompt: `Add the ${actionCompact.toLowerCase()} back to the books left. Do you return to the books before Venice?`,
          acceptedEquationFormIds: ["end_plus_change_equals_start"],
        },
      },
    ],
    operatorExperiments: [
      ...equalGroupsExperiments({
        stepId: "find_books_before_venice",
        groupPlural,
        itemPlural: "books",
        actualSentence: `This matches the story: each ${groupSingular} has {quantity:books_per_section}.`,
      }),
      {
        stepId: "find_books_left_after_venice",
        operator: "+",
        narrativeFit: "different_story",
        alternateWorldTemplate: `Adding would fit a story where ${actor} brought more books onto ${vehicleName}.`,
      },
      {
        stepId: "find_books_left_after_venice",
        operator: "-",
        narrativeFit: "actual",
        alternateWorldTemplate: `This matches the story: ${actor} ${actionVerb} books, leaving fewer books on ${vehicleName}.`,
      },
      {
        stepId: "find_books_left_after_venice",
        operator: "×",
        narrativeFit: "different_question",
        visualModel: "repeated_groups_grid",
        alternateWorldTemplate: "Multiplying would fit a different question about equal groups of books.",
      },
      {
        stepId: "find_books_left_after_venice",
        operator: "÷",
        narrativeFit: "different_question",
        visualModel: "equal_shares_tray",
        alternateWorldTemplate: "Dividing would fit a different question about sharing the books.",
      },
    ],
    recap: {
      headline: `How many books were left on ${vehicleName}`,
      causalChain: [
        `{quantity:train_cars} with approximately {quantity:books_per_section} each made approximately {quantity:books_before_venice}.`,
        `${actor} ${actionVerb} {quantity:${actionQuantityId}}, leaving approximately {quantity:books_left_after_venice}.`,
      ],
      calcFromStepId: "find_books_before_venice",
      totalVisualStepId: "find_books_left_after_venice",
      dataQuestion: {
        prompt: "What does {quantity:books_left_after_venice} represent in the book train model?",
        correctQuantityId: "books_left_after_venice",
        distractorQuantityIds: ["train_cars", "books_before_venice", actionQuantityId],
        correctFeedback: `Right. {quantity:books_left_after_venice} is approximately how many books were left on ${vehicleName} after Venice.`,
        incorrectFeedback: `That amount is the books left after the trade: {quantity:books_left_after_venice}.`,
      },
    },
  };
}

export function AuthoringView() {
  const { openMenu } = useStudio();
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [baseSpec, setBaseSpec] = useState<ProblemSpec | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [repoSaveBusy, setRepoSaveBusy] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [rawProblemInput, setRawProblemInput] = useState("");
  const [title, setTitle] = useState("New StoryMath problem");
  const [theme, setTheme] = useState("Classroom story");
  const [problemParagraph, setProblemParagraph] = useState(
    "Write the full word problem paragraph here. Use tokens like {quantity:items_given} for every modeled number.",
  );
  const [gradeBand, setGradeBand] = useState("3-4");
  const [storyNoun, setStoryNoun] = useState("items");
  const [singularNoun, setSingularNoun] = useState("item");
  const [genericUnit, setGenericUnit] = useState("items");
  const [relationshipIds, setRelationshipIds] = useState<RelationshipId[]>(["start_change_end_decrease"]);
  const [quantityDrafts, setQuantityDrafts] = useState<QuantityDraft[]>([]);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);
  const [recapDraft, setRecapDraft] = useState<RecapDraft>({
    headline: "Why the answer works",
    causalChain: "Use field-merge tokens here.",
    dataQuestionPrompt: "Ask what one modeled number represents.",
    correctFeedback: "Right.",
    incorrectFeedback: "Look back at the model.",
    decisionQuestionPrompt: "",
    decisionCorrectAnswer: "yes",
    decisionCorrectFeedback: "",
    decisionIncorrectFeedback: "",
  });
  const [selectedProblemId, setSelectedProblemId] = useState(AUTHORING_PROBLEM_SPECS[0]?.id ?? "");

  const primaryRelationship = relationshipFor(relationshipIds[0] ?? "start_change_end_decrease");
  const localRepoSaveAvailable = import.meta.env.DEV;
  const selectedProblem = AUTHORING_PROBLEM_SPECS.find((spec) => spec.id === selectedProblemId);
  const problemId = slugify(title) || "new_storymath_problem";
  const quantityStem = slugify(storyNoun) || "items";
  const today = new Date().toISOString().slice(0, 10);
  const applySpecToEditor = (spec: ProblemSpec, message: string) => {
    const firstQuantity = spec.quantities[0];

    setBaseSpec(cloneSpec(spec));
    setTitle(spec.metadata.title);
    setTheme(spec.metadata.theme);
    setGradeBand(spec.metadata.gradeBand);
    setProblemParagraph(spec.story.briefTemplate);
    setStoryNoun(firstQuantity?.unitPlural ?? firstQuantity?.unit ?? "items");
    setSingularNoun(firstQuantity?.unitSingular ?? "item");
    setGenericUnit(firstQuantity?.unit ?? "items");
    setQuantityDrafts(quantityDraftsFor(spec));
    setStepDrafts(stepDraftsFor(spec));
    setRecapDraft(recapDraftFor(spec));
    setRelationshipIds(
      spec.steps.map((step) => relationshipFor(step.relationshipTemplateId).id),
    );
    setSaveMessage(message);
  };
  const loadSelectedProblem = () => {
    if (!selectedProblem) return;
    applySpecToEditor(selectedProblem, "Loaded existing problem wording.");
  };
  const analyzeRawProblem = () => {
    const guess =
      buildEqualGroupsThenSubtractGuess(rawProblemInput || problemParagraph, title) ??
      buildMonthlySalesAffordabilityGuess(rawProblemInput || problemParagraph, title) ??
      buildShelfBookSharingGuess(rawProblemInput || problemParagraph, title) ??
      buildGroupedBooksThenTradeGuess(rawProblemInput || problemParagraph, title);
    if (!guess) {
      setSaveMessage(
        "Analyzer needs top/kept equal groups, monthly sales affordability, shelf/book sharing, or grouped-books-then-sale/trade story.",
      );
      return;
    }
    applySpecToEditor(guess, "Generated a two-step parameterized draft. Review the fields, then save or download.");
  };

  const editedSpec = useMemo(
    () => {
      if (baseSpec) {
        const spec = cloneSpec(baseSpec);
        spec.metadata.title = title;
        spec.metadata.theme = theme;
        spec.metadata.gradeBand = gradeBand;
        spec.story.briefTemplate =
          problemParagraph.trim() || "Write the story with quantity tokens.";
        spec.storyChrome.groupNoun = singularNoun;
        const quantityDraftById = new Map(quantityDrafts.map((draft) => [draft.id, draft]));
        spec.quantities = spec.quantities.map((quantity, index) => {
          const draft = quantityDraftById.get(quantity.id);
          const firstQuantityFallback =
            index === 0
              ? {
                  unit: genericUnit,
                  unitSingular: singularNoun,
                  unitPlural: storyNoun,
                }
              : {};
          if (!draft) return { ...quantity, ...firstQuantityFallback };
          return {
            ...quantity,
            label: {
              child: draft.child,
              compact: draft.compact,
              lowercase: draft.lowercase,
            },
            unit: draft.unit,
            unitSingular: draft.unitSingular,
            unitPlural: draft.unitPlural,
            ...firstQuantityFallback,
          };
        });
        const stepDraftById = new Map(stepDrafts.map((draft) => [draft.id, draft]));
        spec.steps = spec.steps.map((step, index) => ({
          ...step,
          ...(stepDraftById.get(step.id)
            ? {
                prompt: stepDraftById.get(step.id)!.prompt,
                reasoningPrompt: stepDraftById.get(step.id)!.reasoningPrompt,
                backwardCheck: {
                  ...step.backwardCheck,
                  prompt: stepDraftById.get(step.id)!.backwardPrompt,
                },
              }
            : {}),
          relationshipTemplateId: relationshipFor(relationshipIds[index] ?? step.relationshipTemplateId).id,
        }));
        spec.recap = {
          ...spec.recap,
          headline: recapDraft.headline,
          causalChain: recapDraft.causalChain
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          dataQuestion: {
            ...spec.recap.dataQuestion,
            prompt: recapDraft.dataQuestionPrompt,
            correctFeedback: recapDraft.correctFeedback,
            incorrectFeedback: recapDraft.incorrectFeedback,
          },
          ...(spec.recap.decisionQuestion
            ? {
                decisionQuestion: {
                  ...spec.recap.decisionQuestion,
                  prompt: recapDraft.decisionQuestionPrompt,
                  correctAnswer: recapDraft.decisionCorrectAnswer,
                  correctFeedback: recapDraft.decisionCorrectFeedback,
                  incorrectFeedback: recapDraft.decisionIncorrectFeedback,
                },
              }
            : {}),
        };
        return spec;
      }

      const relationship = primaryRelationship;
      return {
        id: `${problemId}-v1`,
        metadata: {
          title,
          theme,
          gradeBand,
          factualStatus: "realistic",
          tags: [relationship.operation, relationship.id],
          catalogOrder: 0,
          publishedAt: today,
        },
        dimension: {
          kind: "count",
          increaseLabel: "More",
          decreaseLabel: "Fewer",
          sameLabel: "The same",
          increaseLabelLower: "more",
          decreaseLabelLower: "fewer",
          sameLabelLower: "the same",
        },
        storyChrome: {
          openingEyebrow: "Author note",
          startCta: "Start the model",
          finishCta: "Close the model",
          stepProgressVerb: "model the story",
          groupNoun: singularNoun,
          learnerRole: "model builder",
        },
        story: {
          briefTemplate:
            problemParagraph.trim() || `Write the story with tokens like {quantity:${quantityStem}_given}.`,
        },
        quantities: [
          {
            id: `${quantityStem}_given`,
            label: {
              child: `Given ${storyNoun}`,
              compact: `Given ${storyNoun}`,
              lowercase: `the given ${storyNoun}`,
            },
            unit: genericUnit,
            unitSingular: singularNoun,
            unitPlural: storyNoun,
            value: 0,
            visibility: "given",
          },
        ],
        steps: [
          {
            id: `find_${quantityStem}`,
            order: 1,
            prompt: "Write one clear question for this step.",
            reasoningPrompt: "Ask what relationship the numbers have without giving away the answer.",
            relationshipTemplateId: relationship.id,
            roleToQuantityId: Object.fromEntries(relationship.roles.split(", ").map((role) => [role, "quantity_id_here"])),
            goalQuantityId: "goal_quantity_id_here",
            acceptedEquationFormIds: ["formula_id_here"],
            preferredEquationFormId: "formula_id_here",
            expectedDirection:
              relationship.operation === "×" ? "scale" : relationship.operation === "÷" ? "split" : relationship.operation === "+" ? "combine" : "decrease",
            operatorOptions: ["+", "-", "×", "÷"],
            backwardCheck: {
              prompt: "Write the inverse check.",
              acceptedEquationFormIds: ["inverse_formula_id_here"],
            },
          },
        ],
        operatorExperiments: ["+", "-", "×", "÷"].map((operator) => ({
          stepId: `find_${quantityStem}`,
          operator,
          narrativeFit: operator === relationship.operation ? "actual" : "different_question",
          alternateWorldTemplate: "Explain whether this operation matches the story.",
        })),
        recap: {
          headline: "Why the answer works",
          causalChain: ["Use field-merge tokens here."],
          calcFromStepId: `find_${quantityStem}`,
          dataQuestion: {
            prompt: "Ask what one modeled number represents.",
            correctQuantityId: `${quantityStem}_given`,
            distractorQuantityIds: [],
            correctFeedback: "Right.",
            incorrectFeedback: "Look back at the model.",
          },
        },
      } as unknown as ProblemSpec;
    },
    [baseSpec, genericUnit, gradeBand, primaryRelationship, problemId, problemParagraph, quantityDrafts, quantityStem, recapDraft, relationshipIds, singularNoun, stepDrafts, storyNoun, theme, title, today],
  );
  const editedJson = useMemo(() => JSON.stringify(editedSpec, null, 2), [editedSpec]);
  const downloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(`${editedJson}\n`)}`;
  const downloadName = `${baseSpec?.id ?? editedSpec.id}.json`;
  const saveDraft = () => {
    localStorage.setItem(AUTHORING_DRAFT_KEY, editedJson);
    setSaveMessage("Browser draft saved. Download JSON to update the repository.");
  };
  const saveProblemToRepo = async () => {
    setRepoSaveBusy(true);
    setSaveMessage(localRepoSaveAvailable ? "Saving problem JSON to the local repo…" : "Committing problem JSON to GitHub…");
    try {
      if (!localRepoSaveAvailable) {
        const payload = await saveProblemSpecThroughGitHub(editedSpec, editedJson, githubToken);
        const shortSha = payload.commit?.sha?.slice(0, 7);
        setSaveMessage(
          `Committed ${payload.content?.path ?? `${GITHUB_PROBLEM_PATH_PREFIX}/${editedSpec.id}.json`} to GitHub${shortSha ? ` (${shortSha})` : ""}. GitHub Pages will redeploy from main shortly.`,
        );
        return;
      }

      const response = await fetch("/__storymath_authoring/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: editedJson,
      });
      const payload = (await response.json().catch(() => ({}))) as RepoSavePayload;
      if (!response.ok || !payload.ok) {
        const issueText =
          payload.issues
            ?.map((issue) => issue.message)
            .filter(Boolean)
            .join(" ") ?? "";
        throw new Error([payload.error, issueText].filter(Boolean).join(" "));
      }
      const warningCount = payload.issues?.filter((issue) => issue.severity === "warning").length ?? 0;
      setSaveMessage(
        `Saved to ${payload.path ?? "data/problems"}.${warningCount > 0 ? ` ${warningCount} warning${warningCount === 1 ? "" : "s"} returned.` : ""} The dev server will reload so the menu can pick it up.`,
      );
    } catch (error) {
      setSaveMessage(
        localRepoSaveAvailable
          ? `Could not save to the local repo. Use Download JSON if needed. ${error instanceof Error ? error.message : ""}`
          : `Could not commit to GitHub from this page. Check the token permissions or use Download JSON. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      setRepoSaveBusy(false);
    }
  };
  const loadDraft = () => {
    const raw = localStorage.getItem(AUTHORING_DRAFT_KEY);
    if (!raw) {
      setSaveMessage("No saved draft found.");
      return;
    }
    try {
      applySpecToEditor(JSON.parse(raw) as ProblemSpec, "Loaded saved draft.");
    } catch {
      setSaveMessage("Saved draft could not be read.");
    }
  };
  const setStepRelationship = (index: number, id: RelationshipId) => {
    setRelationshipIds((current) => current.map((value, i) => (i === index ? id : value)));
  };
  const updateQuantityDraft = (id: string, field: keyof Omit<QuantityDraft, "id">, value: string) => {
    setQuantityDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };
  const updateStepDraft = (id: string, field: keyof Omit<StepDraft, "id">, value: string) => {
    setStepDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };

  const qaItems = [
    "Every modeled number in prose uses a field-merge token.",
    "Every story-specific noun has unitSingular and unitPlural.",
    "Every step has one goal quantity, preferred equation form, and backward check.",
    "Each offered operator has one operator experiment.",
    "Exactly one operator experiment per step is marked actual.",
    "Derived quantities include expectedValueForFixture.",
    "catalogOrder or publishedAt is set so newest packs can appear first.",
  ];

  if (!unlocked) {
    return (
      <main className="app-shell authoring">
        <header className="masthead">
          <button type="button" className="brand brand--link" onClick={openMenu} aria-label="Back to the problem menu">
            <BrandMark className="brand__mark" />
            <span className="brand__title">StoryMath</span>
          </button>
        </header>
        <section className="authoring-gate panel">
          <p className="eyebrow">Internal authoring</p>
          <h1 className="stage-title">Authoring tool</h1>
          <label className="authoring-field">
            <span>Passcode</span>
            <input
              className="text-input"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const ok = passcode === PASSCODE;
                  setUnlocked(ok);
                  setError(ok ? "" : "Passcode not recognized.");
                }
              }}
              type="password"
              inputMode="numeric"
              aria-label="Authoring passcode"
            />
          </label>
          {error && <p className="authoring-error">{error}</p>}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                const ok = passcode === PASSCODE;
                setUnlocked(ok);
                setError(ok ? "" : "Passcode not recognized.");
              }}
            >
              Unlock
            </button>
            <button type="button" className="btn btn--ghost" onClick={openMenu}>
              Back
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell authoring">
      <header className="masthead">
        <button type="button" className="brand brand--link" onClick={openMenu} aria-label="Back to the problem menu">
          <BrandMark className="brand__mark" />
          <span className="brand__title">StoryMath</span>
        </button>
      </header>

      <p className="eyebrow">Internal authoring</p>
      <h1 className="stage-title">Build a clean problem pack</h1>

      <section className="panel authoring-panel authoring-loader" aria-label="Analyze a hand-written problem">
        <h2 className="authoring-title">Start from a hand-written problem</h2>
        <label className="authoring-field">
          <span>Raw word problem</span>
          <span className="authoring-help">
            Paste the title and story here, then generate an editable parameterized draft.
          </span>
          <textarea
            className="text-input authoring-textarea"
            value={rawProblemInput}
            onChange={(event) => setRawProblemInput(event.target.value)}
            placeholder="Fashion Show Fundraiser Frenzy&#10;&#10;Seraphina was tasked with making designs for 11 models..."
          />
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={analyzeRawProblem}>
            Analyze and prefill draft
          </button>
        </div>
      </section>

      <section className="panel authoring-panel authoring-loader" aria-label="Load an existing problem">
        <h2 className="authoring-title">Load existing wording</h2>
        <label className="authoring-field">
          <span>Existing problem</span>
          <select
            className="text-input"
            value={selectedProblemId}
            onChange={(event) => setSelectedProblemId(event.target.value)}
          >
            {AUTHORING_PROBLEM_SPECS.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.metadata.title}
              </option>
            ))}
          </select>
        </label>
        {selectedProblem && (
          <p className="authoring-help">
            {selectedProblem.metadata.theme} · {selectedProblem.metadata.gradeBand}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={loadSelectedProblem}>
            Load wording
          </button>
          <button type="button" className="btn btn--ghost" onClick={loadDraft}>
            Load saved draft
          </button>
        </div>
        {saveMessage && <p className="authoring-save">{saveMessage}</p>}
      </section>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Story frame</h2>
          <label className="authoring-field">
            <span>Title</span>
            <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Story theme</span>
            <span className="authoring-help">
              Used as the menu subtitle and to choose the background ornament mood by keyword: space/rover, nature/forest, or design/studio.
            </span>
            <input className="text-input" value={theme} onChange={(event) => setTheme(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Word problem paragraph</span>
            <span className="authoring-help">
              This becomes story.briefTemplate. Replace every modeled number with a quantity token so the interfaces stay parameterized.
            </span>
            <textarea
              className="text-input authoring-textarea"
              value={problemParagraph}
              onChange={(event) => setProblemParagraph(event.target.value)}
            />
          </label>
          <label className="authoring-field">
            <span>Grade band</span>
            <input className="text-input" value={gradeBand} onChange={(event) => setGradeBand(event.target.value)} />
          </label>

          <h2 className="authoring-title">Naming</h2>
          <label className="authoring-field">
            <span>Story plural noun</span>
            <input className="text-input" value={storyNoun} onChange={(event) => setStoryNoun(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Story singular noun</span>
            <input className="text-input" value={singularNoun} onChange={(event) => setSingularNoun(event.target.value)} />
          </label>
          <label className="authoring-field">
            <span>Arithmetic unit</span>
            <input className="text-input" value={genericUnit} onChange={(event) => setGenericUnit(event.target.value)} />
          </label>
        </div>

        <div className="panel authoring-panel">
          <h2 className="authoring-title">Step sequence</h2>
          <div className="authoring-steps">
            {editedSpec.steps.map((step, index) => {
              const relationship = relationshipFor(relationshipIds[index] ?? step.relationshipTemplateId);
              const stepDraft = stepDrafts.find((draft) => draft.id === step.id);
              return (
                <section className="authoring-step" key={step.id}>
                  <h3 className="authoring-step__title">Step {index + 1}</h3>
                  {stepDraft ? (
                    <>
                      <label className="authoring-field">
                        <span>Question prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.prompt}
                          onChange={(event) => updateStepDraft(step.id, "prompt", event.target.value)}
                        />
                      </label>
                      <label className="authoring-field">
                        <span>Reasoning prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.reasoningPrompt}
                          onChange={(event) => updateStepDraft(step.id, "reasoningPrompt", event.target.value)}
                        />
                      </label>
                      <label className="authoring-field">
                        <span>Backward check prompt</span>
                        <textarea
                          className="text-input authoring-textarea"
                          value={stepDraft.backwardPrompt}
                          onChange={(event) => updateStepDraft(step.id, "backwardPrompt", event.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <p className="authoring-step__prompt">{step.prompt}</p>
                  )}
                  <label className="authoring-field">
                    <span>Relationship</span>
                    <select
                      className="text-input"
                      value={relationship.id}
                      onChange={(event) => setStepRelationship(index, event.target.value as RelationshipId)}
                    >
                      {RELATIONSHIPS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} ({item.operation})
                        </option>
                      ))}
                    </select>
                  </label>
                  <dl className="authoring-facts">
                    <div>
                      <dt>Roles</dt>
                      <dd>{relationship.roles}</dd>
                    </div>
                    <div>
                      <dt>Actual operation</dt>
                      <dd>{relationship.operation}</dd>
                    </div>
                  </dl>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Quantity wording</h2>
          {quantityDrafts.length === 0 ? (
            <p className="authoring-help">Load an existing problem to edit all quantity labels.</p>
          ) : (
            <div className="authoring-steps">
              {quantityDrafts.map((quantity) => (
                <section className="authoring-step" key={quantity.id}>
                  <h3 className="authoring-step__title">{quantity.id}</h3>
                  <label className="authoring-field">
                    <span>Answer choice label</span>
                    <input
                      className="text-input"
                      value={quantity.child}
                      onChange={(event) => updateQuantityDraft(quantity.id, "child", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Short label</span>
                    <input
                      className="text-input"
                      value={quantity.compact}
                      onChange={(event) => updateQuantityDraft(quantity.id, "compact", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Sentence label</span>
                    <input
                      className="text-input"
                      value={quantity.lowercase}
                      onChange={(event) => updateQuantityDraft(quantity.id, "lowercase", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Quantity arithmetic unit</span>
                    <input
                      className="text-input"
                      value={quantity.unit}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unit", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Singular display noun</span>
                    <input
                      className="text-input"
                      value={quantity.unitSingular}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unitSingular", event.target.value)}
                    />
                  </label>
                  <label className="authoring-field">
                    <span>Plural display noun</span>
                    <input
                      className="text-input"
                      value={quantity.unitPlural}
                      onChange={(event) => updateQuantityDraft(quantity.id, "unitPlural", event.target.value)}
                    />
                  </label>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="panel authoring-panel">
          <h2 className="authoring-title">Recap wording</h2>
          <label className="authoring-field">
            <span>Recap headline</span>
            <input
              className="text-input"
              value={recapDraft.headline}
              onChange={(event) => setRecapDraft((current) => ({ ...current, headline: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Causal chain</span>
            <span className="authoring-help">One recap bubble per line. Use tokens for quantities and labels.</span>
            <textarea
              className="text-input authoring-textarea"
              value={recapDraft.causalChain}
              onChange={(event) => setRecapDraft((current) => ({ ...current, causalChain: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Data question</span>
            <input
              className="text-input"
              value={recapDraft.dataQuestionPrompt}
              onChange={(event) => setRecapDraft((current) => ({ ...current, dataQuestionPrompt: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Correct feedback</span>
            <input
              className="text-input"
              value={recapDraft.correctFeedback}
              onChange={(event) => setRecapDraft((current) => ({ ...current, correctFeedback: event.target.value }))}
            />
          </label>
          <label className="authoring-field">
            <span>Try-again feedback</span>
            <input
              className="text-input"
              value={recapDraft.incorrectFeedback}
              onChange={(event) => setRecapDraft((current) => ({ ...current, incorrectFeedback: event.target.value }))}
            />
          </label>
          {baseSpec?.recap.decisionQuestion && (
            <>
              <h3 className="authoring-step__title">Yes/no decision</h3>
              <label className="authoring-field">
                <span>Decision question</span>
                <input
                  className="text-input"
                  value={recapDraft.decisionQuestionPrompt}
                  onChange={(event) => setRecapDraft((current) => ({ ...current, decisionQuestionPrompt: event.target.value }))}
                />
              </label>
              <label className="authoring-field">
                <span>Correct yes/no answer</span>
                <select
                  className="text-input"
                  value={recapDraft.decisionCorrectAnswer}
                  onChange={(event) =>
                    setRecapDraft((current) => ({
                      ...current,
                      decisionCorrectAnswer: event.target.value === "no" ? "no" : "yes",
                    }))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="authoring-field">
                <span>Decision correct feedback</span>
                <input
                  className="text-input"
                  value={recapDraft.decisionCorrectFeedback}
                  onChange={(event) => setRecapDraft((current) => ({ ...current, decisionCorrectFeedback: event.target.value }))}
                />
              </label>
              <label className="authoring-field">
                <span>Decision try-again feedback</span>
                <input
                  className="text-input"
                  value={recapDraft.decisionIncorrectFeedback}
                  onChange={(event) => setRecapDraft((current) => ({ ...current, decisionIncorrectFeedback: event.target.value }))}
                />
              </label>
            </>
          )}
        </div>
      </section>

      <section className="authoring-layout">
        <div className="panel authoring-panel">
          <h2 className="authoring-title">QA built into onboarding</h2>
          <ul className="authoring-checks">
            {qaItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="panel authoring-panel">
          <h2 className="authoring-title">Updated problem JSON</h2>
          <p className="authoring-help">
            {localRepoSaveAvailable
              ? "Browser drafts stay on this device. Save JSON to repo writes into data/problems on the local dev server."
              : "Browser drafts stay on this device. On the live site, Save JSON to repo commits through GitHub using a token you paste for this session."}
          </p>
          {!localRepoSaveAvailable && (
            <label className="authoring-field">
              <span>GitHub token for live repo save</span>
              <span className="authoring-help">
                Use a fine-grained token for {GITHUB_OWNER}/{GITHUB_REPO} with Contents read/write access. The token is kept in memory only and is not saved in the browser draft.
              </span>
              <input
                className="text-input"
                type="password"
                autoComplete="off"
                placeholder="github_pat_…"
                value={githubToken}
                onChange={(event) => setGithubToken(event.target.value)}
              />
            </label>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={saveDraft}>
              Save browser draft
            </button>
            <button type="button" className="btn btn--primary" onClick={saveProblemToRepo} disabled={repoSaveBusy}>
              {repoSaveBusy ? "Saving…" : "Save JSON to repo"}
            </button>
            <a className="btn btn--ghost" href={downloadHref} download={downloadName}>
              Download JSON for repo
            </a>
          </div>
          {saveMessage && <p className="authoring-save">{saveMessage}</p>}
          <pre className="authoring-json">{editedJson}</pre>
        </div>
      </section>
    </main>
  );
}
