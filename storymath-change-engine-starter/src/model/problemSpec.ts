// src/model/problemSpec.ts
//
// The authored problem schema. A story pack is pure data conforming to this;
// no component knows about a specific story. `instantiateProblem` turns a
// ProblemSpec into an InstantiatedProblem with computed values + resolved text.

import type {
  DirectionKind,
  FormulaId,
  Operator,
  QuantityId,
  RelationshipTemplateId,
  VisualModelType,
} from "./relationshipRegistry";

export interface DimensionSpec {
  kind: string;
  increaseLabel: string;
  decreaseLabel: string;
  sameLabel: string;
  /** Explicit lowercase variants for merge sentences (never toLowerCase authored labels). */
  increaseLabelLower?: string;
  decreaseLabelLower?: string;
  sameLabelLower?: string;
  increaseSentence?: string;
  decreaseSentence?: string;
}

export interface StoryChromeSpec {
  /** Opening kicker that gives the world its "field notebook" feel. */
  openingEyebrow: string;
  startCta: string;
  finishCta: string;
  /** Optional headline shown on the completion screen. */
  completionTitle?: string;
  stepProgressVerb?: string;
  groupNoun?: string;
  learnerRole?: string;
}

export interface QuantityLabelSpec {
  child: string;
  compact: string;
  lowercase?: string;
}

export interface DerivedQuantitySpec {
  formulaId: FormulaId;
  operands: Record<string, QuantityId>;
}

export interface QuantitySpec {
  id: QuantityId;
  label: QuantityLabelSpec;
  /**
   * The arithmetic dimension used for unit-compatibility (e.g. "calls",
   * "sounds"). Kept generic so operands that combine into a supertype still add.
   */
  unit: string;
  /**
   * Story-specific display noun for field-merged prose. When present,
   * `{quantity:id}` renders "78 chickadee calls" instead of the generic
   * "78 calls". `unitSingular` is used when the value is exactly 1.
   */
  unitSingular?: string;
  unitPlural?: string;
  value: number | null;
  expectedValueForFixture?: number;
  derived?: DerivedQuantitySpec;
  semanticRole?: string;
  visibility: "given" | "find" | "revealed_after_step";
  /** Optional escape hatch for prose literals (see validation). */
  allowLiteralNumbers?: boolean;
}

export interface BackwardCheckSpec {
  prompt: string;
  acceptedEquationFormIds: FormulaId[];
}

export interface StepSpec {
  id: string;
  order: number;
  prompt: string;
  reasoningPrompt: string;
  relationshipTemplateId: RelationshipTemplateId;
  roleToQuantityId: Record<string, QuantityId>;
  goalQuantityId: QuantityId;
  acceptedEquationFormIds: FormulaId[];
  preferredEquationFormId: FormulaId;
  expectedDirection: DirectionKind;
  operatorOptions: Operator[];
  backwardCheck: BackwardCheckSpec;
}

export interface OperatorExperimentSpec {
  stepId: string;
  operator: Operator;
  narrativeFit: "actual" | "different_story" | "different_question";
  visualModel?: VisualModelType;
  shortReaction?: string;
  alternateWorldTemplate?: string;
  groupNoun?: string;
}

export interface DataQuestionSpec {
  prompt: string;
  correctQuantityId: QuantityId;
  distractorQuantityIds: QuantityId[];
  correctFeedback: string;
  incorrectFeedback: string;
}

export interface RecapSpec {
  headline: string;
  causalChain: string[];
  calcFromStepId: string;
  totalVisualStepId?: string;
  dataQuestion: DataQuestionSpec;
}

export interface ProblemMetadataSpec {
  title: string;
  theme: string;
  gradeBand: string;
  factualStatus?: "fictionalized" | "inspired_by_real_world" | "realistic";
  tags: string[];
  curiosityNote?: string;
}

export interface ProblemSpec {
  id: string;
  metadata: ProblemMetadataSpec;
  dimension: DimensionSpec;
  storyChrome: StoryChromeSpec;
  story: {
    briefTemplate: string;
    causalEvent?: string;
    closingNoteTemplate?: string;
  };
  quantities: QuantitySpec[];
  steps: StepSpec[];
  operatorExperiments: OperatorExperimentSpec[];
  recap: RecapSpec;
}

// ---------------------------------------------------------------------------
// Instantiated (post-computation) shapes that components consume
// ---------------------------------------------------------------------------

export interface Quantity {
  id: QuantityId;
  label: QuantityLabelSpec;
  unit: string;
  unitSingular?: string;
  unitPlural?: string;
  value: number;
  semanticRole?: string;
  visibility: "given" | "find" | "revealed_after_step";
}

export interface InstantiatedProblem {
  id: string;
  metadata: ProblemMetadataSpec;
  dimension: DimensionSpec;
  storyChrome: StoryChromeSpec;
  story: {
    brief: string;
    causalEvent?: string;
    closingNote?: string;
  };
  quantities: Quantity[];
  steps: StepSpec[];
  operatorExperiments: OperatorExperimentSpec[];
  recap: RecapSpec;
  /** id -> computed value, for arithmetic. */
  quantityValues: Record<QuantityId, number>;
}
