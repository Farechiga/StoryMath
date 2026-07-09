import type {
  Operator,
  OperatorExperimentResult,
  ProblemInstance,
} from "../domain/types";

/**
 * Explicit UI state machine for StoryMath (docs/05 §4).
 *
 * Phases are ordered; the app reveals stage panels progressively so the child
 * can see her whole reasoning journey on one stable page. Ephemeral per-step
 * working memory is reset when advancing to the next step.
 */
export type GamePhase =
  | "brief"
  | "relationship_building"
  | "operator_experiment"
  | "arithmetic_entry"
  | "step_confirmed"
  | "backward_check"
  | "causal_recap"
  | "complete";

export const PHASE_ORDER: GamePhase[] = [
  "brief",
  "relationship_building",
  "operator_experiment",
  "arithmetic_entry",
  "step_confirmed",
  "backward_check",
  "causal_recap",
  "complete",
];

export type OperandSlot = "left" | "right";

export interface CompletedStepRecord {
  stepId: string;
  matchedEquationFormId?: string;
  operator: Operator;
  answer: number;
  semanticCorrect: boolean;
  numericalCorrect: boolean;
}

export interface GameState {
  problemId: string;
  stepCount: number;
  currentStepIndex: number;
  phase: GamePhase;

  // --- ephemeral, reset per step ---
  placed: { left?: string; right?: string };
  selectedOperator?: Operator;
  lastExperiment?: OperatorExperimentResult;
  attemptedOperators: Operator[];
  answerDraft: string;
  answerFeedback?: "check_arithmetic";
  backwardChoiceIndex: number;
  backwardDraft: string;
  backwardFeedback?: "retry";

  // --- durable history ---
  completedSteps: Record<string, CompletedStepRecord>;
  backwardChecks: Record<string, boolean>;
  recapAnswerCorrect?: boolean;
}

const emptyEphemeral = {
  placed: {},
  selectedOperator: undefined,
  lastExperiment: undefined,
  attemptedOperators: [] as Operator[],
  answerDraft: "",
  answerFeedback: undefined,
  backwardChoiceIndex: 0,
  backwardDraft: "",
  backwardFeedback: undefined,
} satisfies Partial<GameState>;

export function initGame(problem: ProblemInstance): GameState {
  return {
    problemId: problem.id,
    stepCount: problem.steps.length,
    currentStepIndex: 0,
    phase: "brief",
    completedSteps: {},
    backwardChecks: {},
    ...emptyEphemeral,
  };
}

export type GameAction =
  | { type: "BEGIN" }
  | { type: "PLACE_QUANTITY"; slot: OperandSlot; quantityId: string }
  | { type: "CLEAR_SLOT"; slot: OperandSlot }
  | { type: "SELECT_OPERATOR"; operator: Operator; result: OperatorExperimentResult }
  | { type: "TRY_ANOTHER_OPERATOR" }
  | { type: "ACCEPT_OPERATOR" }
  | { type: "SET_ANSWER"; value: string }
  | { type: "SUBMIT_ANSWER"; stepId: string; correct: boolean; matchedEquationFormId?: string; answer: number; semanticCorrect: boolean }
  | { type: "GO_BACKWARD_CHECK" }
  | { type: "SELECT_BACKWARD_CHOICE"; index: number }
  | { type: "SET_BACKWARD_ANSWER"; value: string }
  | { type: "SUBMIT_BACKWARD_CHECK"; correct: boolean; stepId: string }
  | { type: "CONTINUE_FROM_BACKWARD" }
  | { type: "ADVANCE_STEP" }
  | { type: "ANSWER_RECAP"; correct: boolean }
  | { type: "FINISH" }
  | { type: "RESET"; problem: ProblemInstance };

/**
 * Leave a confirmed step: go to the recap after the last step, otherwise advance
 * to the next step with fresh working memory. Shared by the optional backward
 * check ("Continue") and the direct "move on" path (backward check is optional).
 */
function advanceFromStep(state: GameState): GameState {
  const isLastStep = state.currentStepIndex >= state.stepCount - 1;
  if (isLastStep) {
    return { ...state, phase: "causal_recap" };
  }
  return {
    ...state,
    currentStepIndex: state.currentStepIndex + 1,
    phase: "relationship_building",
    ...emptyEphemeral,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BEGIN":
      return { ...state, phase: "relationship_building" };

    case "PLACE_QUANTITY": {
      // A quantity can only occupy one operand slot at a time.
      const placed = { ...state.placed };
      if (placed.left === action.quantityId) placed.left = undefined;
      if (placed.right === action.quantityId) placed.right = undefined;
      placed[action.slot] = action.quantityId;
      return { ...state, placed };
    }

    case "CLEAR_SLOT": {
      const placed = { ...state.placed };
      placed[action.slot] = undefined;
      return { ...state, placed };
    }

    case "SELECT_OPERATOR": {
      const attempted = state.attemptedOperators.includes(action.operator)
        ? state.attemptedOperators
        : [...state.attemptedOperators, action.operator];
      return {
        ...state,
        selectedOperator: action.operator,
        lastExperiment: action.result,
        attemptedOperators: attempted,
        phase: "operator_experiment",
      };
    }

    case "TRY_ANOTHER_OPERATOR":
      return {
        ...state,
        selectedOperator: undefined,
        lastExperiment: undefined,
        phase: "relationship_building",
      };

    case "ACCEPT_OPERATOR":
      return { ...state, phase: "arithmetic_entry", answerFeedback: undefined };

    case "SET_ANSWER":
      return { ...state, answerDraft: action.value, answerFeedback: undefined };

    case "SUBMIT_ANSWER": {
      if (!action.correct) {
        return { ...state, answerFeedback: "check_arithmetic" };
      }
      const stepId = action.stepId;
      const operator = state.selectedOperator!;
      return {
        ...state,
        phase: "step_confirmed",
        answerFeedback: undefined,
        completedSteps: {
          ...state.completedSteps,
          [stepId]: {
            stepId,
            ...(action.matchedEquationFormId
              ? { matchedEquationFormId: action.matchedEquationFormId }
              : {}),
            operator,
            answer: action.answer,
            semanticCorrect: action.semanticCorrect,
            numericalCorrect: true,
          },
        },
      };
    }

    case "GO_BACKWARD_CHECK":
      return { ...state, phase: "backward_check" };

    case "SELECT_BACKWARD_CHOICE":
      return {
        ...state,
        backwardChoiceIndex: action.index,
        backwardDraft: "",
        backwardFeedback: undefined,
      };

    case "SET_BACKWARD_ANSWER":
      return {
        ...state,
        backwardDraft: action.value,
        backwardFeedback: undefined,
      };

    case "SUBMIT_BACKWARD_CHECK": {
      if (!action.correct) {
        return { ...state, backwardFeedback: "retry" };
      }
      // Mark it reconciled but stay put so we can confirm before advancing.
      return {
        ...state,
        backwardFeedback: undefined,
        backwardChecks: { ...state.backwardChecks, [action.stepId]: true },
      };
    }

    // Optional backward check confirmed → advance.
    case "CONTINUE_FROM_BACKWARD":
      return advanceFromStep(state);

    // "Move on" straight from a confirmed step, skipping the backward check.
    case "ADVANCE_STEP":
      return advanceFromStep(state);

    case "ANSWER_RECAP":
      return { ...state, recapAnswerCorrect: action.correct };

    case "FINISH":
      return { ...state, phase: "complete" };

    case "RESET":
      return initGame(action.problem);

    default:
      return state;
  }
}

/** Index of a phase in canonical order (for progress rendering). */
export function phaseIndex(phase: GamePhase): number {
  return PHASE_ORDER.indexOf(phase);
}
