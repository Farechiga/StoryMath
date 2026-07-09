/**
 * Domain types. The authored schema + registry live in src/model; the engine
 * re-exports the instantiated shapes under familiar names and adds the
 * evaluation result types the UI consumes.
 */

export type {
  Operator,
  DirectionKind,
  VisualModelType,
  FormulaId,
  RelationshipTemplateId,
  EquationForm,
  RelationshipTemplate,
} from "../model/relationshipRegistry";

export type {
  ProblemSpec,
  InstantiatedProblem,
  Quantity,
  QuantitySpec,
  StepSpec,
  OperatorExperimentSpec,
  DimensionSpec,
  StoryChromeSpec,
  RecapSpec,
  DataQuestionSpec,
} from "../model/problemSpec";

import type { DirectionKind, Operator } from "../model/relationshipRegistry";
import type { InstantiatedProblem, StepSpec } from "../model/problemSpec";

/** Familiar aliases for the instantiated shapes. */
export type ProblemInstance = InstantiatedProblem;
export type ProblemStep = StepSpec;
export type Direction = DirectionKind;

/** What the child predicts before committing to an operation. */
export type PredictedDirection = "increase" | "decrease" | "same" | "not_sure";

// ---------------------------------------------------------------------------
// Engine evaluation result types
// ---------------------------------------------------------------------------

export interface StudentEquation {
  leftQuantityId: string;
  operator: Operator;
  rightQuantityId: string;
  resultQuantityId: string;
  typedAnswer?: number;
}

export interface EquationEvaluation {
  semanticMatch: boolean;
  matchedEquationFormId?: string;
  numericModelResult: number | null;
  operatorFitsStory: boolean;
  answerCorrect: boolean | null;
  storyEffect: DirectionKind;
  feedbackMode: "actual" | "different_story" | "different_question";
}

export interface OperatorExperimentResult {
  operator: Operator;
  computed: number;
  operandValues: [number, number];
  operandQuantityIds: [string, string];
  narrativeFit: "actual" | "different_story" | "different_question";
  directionProduced: DirectionKind;
  /** Resolved alternate-world / why-it-matches sentence (field-merged). */
  worldSentence: string;
  /** Optional authored short reaction; the panel falls back to a generic one. */
  shortReaction?: string;
  visualModel: import("../model/relationshipRegistry").VisualModelType;
  groupNoun?: string;
  fitsStory: boolean;
}

export interface BackwardCheckFrame {
  equationFormId: string;
  prompt: string;
  leftQuantityId: string;
  operator: Operator;
  rightQuantityId: string;
  resultQuantityId: string;
  semanticReading: string;
  expectedResult: number;
}
