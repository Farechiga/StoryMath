import { describe, it, expect } from "vitest";
import {
  gameReducer,
  initGame,
  type GameState,
} from "../../src/state/gameMachine";
import {
  loadProblem,
  runOperatorExperiment,
  getStep,
} from "../../src/domain";

const problem = loadProblem();
const step1 = getStep(problem, "find_tuesday_distance");
const step2 = getStep(problem, "find_two_day_total");

function reduce(state: GameState, ...actions: Parameters<typeof gameReducer>[1][]): GameState {
  return actions.reduce((s, a) => gameReducer(s, a), state);
}

describe("game machine — NASA reference flow", () => {
  it("moves brief → building (no prediction stage)", () => {
    let s = initGame(problem);
    expect(s.phase).toBe("brief");
    s = reduce(s, { type: "BEGIN" });
    expect(s.phase).toBe("relationship_building");
  });

  it("a card only occupies one slot at a time", () => {
    let s = initGame(problem);
    s = reduce(
      s,
      { type: "PLACE_QUANTITY", slot: "left", quantityId: "monday_distance" },
      { type: "PLACE_QUANTITY", slot: "right", quantityId: "monday_distance" },
    );
    expect(s.placed.left).toBeUndefined();
    expect(s.placed.right).toBe("monday_distance");
  });

  it("an attempted counterfactual never confirms the step, and can be revised", () => {
    let s = initGame(problem);
    s = reduce(s, { type: "BEGIN" });
    s = reduce(
      s,
      { type: "PLACE_QUANTITY", slot: "left", quantityId: "monday_distance" },
      { type: "PLACE_QUANTITY", slot: "right", quantityId: "tuesday_difference" },
    );

    // Try addition first (counterfactual).
    const addResult = runOperatorExperiment(problem, step1, "+");
    s = gameReducer(s, { type: "SELECT_OPERATOR", operator: "+", result: addResult });
    expect(s.phase).toBe("operator_experiment");
    expect(s.completedSteps[step1.id]).toBeUndefined();

    // Revise to subtraction.
    s = gameReducer(s, { type: "TRY_ANOTHER_OPERATOR" });
    expect(s.phase).toBe("relationship_building");
    expect(s.attemptedOperators).toContain("+");

    const subResult = runOperatorExperiment(problem, step1, "-");
    s = gameReducer(s, { type: "SELECT_OPERATOR", operator: "-", result: subResult });
    s = gameReducer(s, { type: "ACCEPT_OPERATOR" });
    expect(s.phase).toBe("arithmetic_entry");
  });

  it("a wrong number does not confirm the step; the right number does", () => {
    let s = withOperatorAccepted();
    s = gameReducer(s, {
      type: "SUBMIT_ANSWER",
      stepId: step1.id,
      correct: false,
      answer: 999,
      semanticCorrect: true,
    });
    expect(s.phase).toBe("arithmetic_entry");
    expect(s.answerFeedback).toBe("check_arithmetic");

    s = gameReducer(s, {
      type: "SUBMIT_ANSWER",
      stepId: step1.id,
      correct: true,
      answer: 256,
      semanticCorrect: true,
      matchedEquationFormId: "bigger_minus_difference_equals_smaller",
    });
    expect(s.phase).toBe("step_confirmed");
    expect(s.completedSteps[step1.id]?.answer).toBe(256);
  });

  it("backward check advances to the next step, clearing ephemeral state", () => {
    let s = withStepOneConfirmed();
    s = gameReducer(s, { type: "GO_BACKWARD_CHECK" });
    s = gameReducer(s, { type: "SUBMIT_BACKWARD_CHECK", correct: false, stepId: step1.id });
    expect(s.backwardFeedback).toBe("retry");
    expect(s.backwardChecks[step1.id]).toBeUndefined();

    s = gameReducer(s, { type: "SUBMIT_BACKWARD_CHECK", correct: true, stepId: step1.id });
    expect(s.backwardChecks[step1.id]).toBe(true);
    // Reconciled but not yet advanced — confirmation comes first.
    expect(s.phase).toBe("backward_check");

    s = gameReducer(s, { type: "CONTINUE_FROM_BACKWARD" });
    expect(s.currentStepIndex).toBe(1);
    expect(s.phase).toBe("relationship_building");
    expect(s.selectedOperator).toBeUndefined();
    expect(s.placed).toEqual({});
  });

  it("ADVANCE_STEP moves on from a confirmed step, skipping the optional backward check", () => {
    let s = withStepOneConfirmed();
    expect(s.phase).toBe("step_confirmed");

    s = gameReducer(s, { type: "ADVANCE_STEP" });
    expect(s.currentStepIndex).toBe(1);
    expect(s.phase).toBe("relationship_building");
    // Advanced without ever running the backward check, and ephemeral state reset.
    expect(s.backwardChecks[step1.id]).toBeUndefined();
    expect(s.selectedOperator).toBeUndefined();
    expect(s.placed).toEqual({});
  });

  it("ADVANCE_STEP from the final confirmed step goes to the causal recap", () => {
    let s = withStepOneConfirmed();
    s = gameReducer(s, { type: "ADVANCE_STEP" }); // straight to step 2
    const addResult = runOperatorExperiment(problem, step2, "+");
    s = reduce(
      s,
      { type: "SELECT_OPERATOR", operator: "+", result: addResult },
      { type: "ACCEPT_OPERATOR" },
      { type: "SUBMIT_ANSWER", stepId: step2.id, correct: true, answer: 640, semanticCorrect: true },
    );
    expect(s.phase).toBe("step_confirmed");

    s = gameReducer(s, { type: "ADVANCE_STEP" });
    expect(s.phase).toBe("causal_recap");
  });

  it("the final backward check goes to the causal recap, then completes", () => {
    let s = withStepOneConfirmed();
    s = reduce(
      s,
      { type: "GO_BACKWARD_CHECK" },
      { type: "SUBMIT_BACKWARD_CHECK", correct: true, stepId: step1.id },
      { type: "CONTINUE_FROM_BACKWARD" },
    );
    // Step 2
    s = reduce(
      s,
      { type: "PLACE_QUANTITY", slot: "left", quantityId: "monday_distance" },
      { type: "PLACE_QUANTITY", slot: "right", quantityId: "tuesday_distance" },
    );
    const addResult = runOperatorExperiment(problem, step2, "+");
    s = reduce(
      s,
      { type: "SELECT_OPERATOR", operator: "+", result: addResult },
      { type: "ACCEPT_OPERATOR" },
      { type: "SUBMIT_ANSWER", stepId: step2.id, correct: true, answer: 640, semanticCorrect: true },
      { type: "GO_BACKWARD_CHECK" },
      { type: "SUBMIT_BACKWARD_CHECK", correct: true, stepId: step2.id },
      { type: "CONTINUE_FROM_BACKWARD" },
    );
    expect(s.phase).toBe("causal_recap");
    s = reduce(s, { type: "ANSWER_RECAP", correct: true }, { type: "FINISH" });
    expect(s.phase).toBe("complete");
  });
});

// --- fixtures ---------------------------------------------------------------

function withOperatorAccepted(): GameState {
  let s = initGame(problem);
  s = reduce(
    s,
    { type: "BEGIN" },
    { type: "PLACE_QUANTITY", slot: "left", quantityId: "monday_distance" },
    { type: "PLACE_QUANTITY", slot: "right", quantityId: "tuesday_difference" },
  );
  const subResult = runOperatorExperiment(problem, step1, "-");
  s = reduce(
    s,
    { type: "SELECT_OPERATOR", operator: "-", result: subResult },
    { type: "ACCEPT_OPERATOR" },
  );
  return s;
}

function withStepOneConfirmed(): GameState {
  return gameReducer(withOperatorAccepted(), {
    type: "SUBMIT_ANSWER",
    stepId: step1.id,
    correct: true,
    answer: 256,
    semanticCorrect: true,
    matchedEquationFormId: "bigger_minus_difference_equals_smaller",
  });
}
