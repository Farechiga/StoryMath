import { useEffect, useMemo, useReducer } from "react";
import {
  applyOperator,
  evaluateEquation,
  findExperiment,
  formatNumber,
  getEquationForm,
  getQuantity,
  getStep,
  loadProblem,
  quantitiesById,
  runOperatorExperiment,
  stepOperandIds,
  buildBackwardChecks,
  isBackwardCheckCorrect,
} from "./domain";
import type {
  BackwardCheckFrame,
  Operator,
  ProblemInstance,
  ProblemStep,
} from "./domain";
import { gameReducer, initGame } from "./state/gameMachine";
import { PearlBackground } from "./components/PearlBackground";
import { CubeOrnament } from "./ornament/CubeOrnament";
import { variantForTheme } from "./ornament/variants";
import { useStudio } from "./studio/StudioContext";
import { StickersButton } from "./studio/StickersButton";
import { BrandMark } from "./components/BrandMark";
import { EquationBuilder } from "./components/EquationBuilder";
import { OperatorExperimentPanel } from "./components/OperatorExperimentPanel";
import { BackwardCheckBuilder } from "./components/BackwardCheckBuilder";
import { BarFigure } from "./components/BarFigure";
import { StackedArithmetic } from "./components/StackedArithmetic";

/** Phases where the child is actively working the current step. */
const WORKING_PHASES = new Set([
  "relationship_building",
  "operator_experiment",
  "arithmetic_entry",
]);

export default function App({ problem: injected }: { problem?: ProblemInstance } = {}) {
  const problem = useMemo(() => injected ?? loadProblem(), [injected]);
  const [state, dispatch] = useReducer(gameReducer, problem, initGame);

  const byId = useMemo(() => quantitiesById(problem), [problem]);
  const step = problem.steps[state.currentStepIndex]!;
  const goal = getQuantity(problem, step.goalQuantityId);

  // The two operands are the preferred form's operands, resolved via the step's
  // explicit role → quantity mapping (no positional heuristic).
  const [leftId, rightId] = stepOperandIds(step);
  const leftQuantity = getQuantity(problem, leftId);
  const rightQuantity = getQuantity(problem, rightId);

  const phase = state.phase;

  // The ornament's mood follows the story's theme; its seed follows the screen.
  const ornamentVariant = useMemo(
    () => variantForTheme([problem.metadata.theme, ...(problem.metadata.tags ?? [])].join(" ")),
    [problem],
  );

  // Solving a problem (reaching completion) grants one team recruit — once per
  // problem. Inert when there's no StudioProvider (unit tests render App alone).
  const studio = useStudio();
  useEffect(() => {
    if (phase === "complete") studio.markSolved(problem.id);
    // markSolved is idempotent; re-running on studio identity change is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, problem.id]);

  // -- handlers ------------------------------------------------------------
  const handleSelectOperator = (op: Operator) => {
    // Resilient: an operator option with no authored experiment is ignored
    // rather than crashing the picker (validateProblem also flags this).
    if (!findExperiment(problem, step.id, op)) return;
    const result = runOperatorExperiment(problem, step, op);
    dispatch({ type: "SELECT_OPERATOR", operator: op, result });
  };

  const handleSubmitAnswer = () => {
    if (!state.selectedOperator) return;
    const answer = Number(state.answerDraft);
    const evaluation = evaluateEquation(problem, step, {
      leftQuantityId: leftId,
      operator: state.selectedOperator,
      rightQuantityId: rightId,
      resultQuantityId: step.goalQuantityId,
      typedAnswer: answer,
    });
    dispatch({
      type: "SUBMIT_ANSWER",
      stepId: step.id,
      correct: evaluation.answerCorrect === true,
      answer,
      semanticCorrect: evaluation.semanticMatch,
      ...(evaluation.matchedEquationFormId
        ? { matchedEquationFormId: evaluation.matchedEquationFormId }
        : {}),
    });
  };

  const backwardFrames = useMemo(
    () => buildBackwardChecks(problem, step),
    [problem, step],
  );

  const handleSubmitBackward = () => {
    const frame = backwardFrames[state.backwardChoiceIndex] ?? backwardFrames[0]!;
    const correct = isBackwardCheckCorrect(frame, Number(state.backwardDraft));
    dispatch({ type: "SUBMIT_BACKWARD_CHECK", correct, stepId: step.id });
  };

  return (
    <>
      <PearlBackground />
      <CubeOrnament seed={`${problem.id}::${phase}`} variant={ornamentVariant} region="right" />
      <main className="app-shell">
        <Masthead
          stepIndex={state.currentStepIndex}
          stepCount={state.stepCount}
          progressVerb={problem.storyChrome.stepProgressVerb ?? "model the problem"}
        />

        <MissionBrief problem={problem} firstStep={problem.steps[0]!} phase={phase} onBegin={() => dispatch({ type: "BEGIN" })} />

        {/* Context: results established in earlier steps stay visible. */}
        {problem.steps
          .filter((s, i) => i < state.currentStepIndex && state.completedSteps[s.id])
          .map((s) => (
            <EstablishedContext key={s.id} problem={problem} step={s} record={state.completedSteps[s.id]!} />
          ))}

        {/* The current step's question sits below any earlier solved step. */}
        {WORKING_PHASES.has(phase) && (
          <h2 className="stage-title step-question">
            Step {step.order}: {step.prompt}
          </h2>
        )}

        {/* --- Build + operator experiment --- */}
        {(phase === "relationship_building" ||
          phase === "operator_experiment" ||
          phase === "arithmetic_entry") && (
          <section className="panel">
            <EquationBuilder
              leftQuantity={leftQuantity}
              rightQuantity={rightQuantity}
              targetQuantity={goal}
              {...(state.selectedOperator ? { selectedOperator: state.selectedOperator } : {})}
              operatorOptions={step.operatorOptions}
              triedOperators={state.attemptedOperators}
              locked={phase === "arithmetic_entry"}
              onSelectOperator={handleSelectOperator}
            />

            {phase === "operator_experiment" && state.lastExperiment && (
              <OperatorExperimentPanel
                result={state.lastExperiment}
                referenceLabel={getQuantity(problem, state.lastExperiment.operandQuantityIds[0]).label.compact}
                referenceValue={state.lastExperiment.operandValues[0]}
                attemptedLabel={goal.label.compact}
                attemptedLabelLower={goal.label.lowercase ?? `the ${goal.label.compact.toLowerCase()}`}
                unit={goal.unit}
                onAccept={() => dispatch({ type: "ACCEPT_OPERATOR" })}
                onTryAnother={() => dispatch({ type: "TRY_ANOTHER_OPERATOR" })}
              />
            )}

            {phase === "arithmetic_entry" && (
              <ArithmeticAnswer
                step={step}
                problem={problem}
                operator={state.selectedOperator!}
                draft={state.answerDraft}
                feedback={state.answerFeedback}
                onChange={(value) => dispatch({ type: "SET_ANSWER", value })}
                onSubmit={handleSubmitAnswer}
              />
            )}
          </section>
        )}

        {/* --- Stage 6: Step confirmed --- */}
        {phase === "step_confirmed" && (
          <section className="panel">
            <h2 className="stage-title">The math and the story agree</h2>
            <ModelCardView problem={problem} step={step} record={state.completedSteps[step.id]!} />
            <BarFigure problem={problem} step={step} />
            {/* Backward check is optional: move on, or verify first. */}
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "ADVANCE_STEP" })}>
                {state.currentStepIndex >= state.stepCount - 1 ? "See the recap" : "Next step"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: "GO_BACKWARD_CHECK" })}>
                Check your work
              </button>
            </div>
          </section>
        )}

        {/* --- Stage 8: Check your work --- */}
        {phase === "backward_check" && (
          <section className="panel">
            {state.backwardChecks[step.id] ? (
              <BackwardConfirmed
                problem={problem}
                frame={backwardFrames[state.backwardChoiceIndex] ?? backwardFrames[0]!}
                onContinue={() => dispatch({ type: "CONTINUE_FROM_BACKWARD" })}
              />
            ) : (
              <BackwardCheckBuilder
                frames={backwardFrames}
                selectedIndex={state.backwardChoiceIndex}
                draft={state.backwardDraft}
                {...(state.backwardFeedback ? { feedback: state.backwardFeedback } : {})}
                quantitiesById={byId}
                onSelectChoice={(index) => dispatch({ type: "SELECT_BACKWARD_CHOICE", index })}
                onSetAnswer={(value) => dispatch({ type: "SET_BACKWARD_ANSWER", value })}
                onSubmit={handleSubmitBackward}
              />
            )}
          </section>
        )}

        {/* --- Stage 9: Causal recap --- */}
        {phase === "causal_recap" && (
          <CausalRecap
            problem={problem}
            state={state}
            onAnswerRecap={(correct) => dispatch({ type: "ANSWER_RECAP", correct })}
            onFinish={() => dispatch({ type: "FINISH" })}
          />
        )}

        {/* --- Complete --- */}
        {phase === "complete" && (
          <section className="panel">
            <div className="finish-banner">
              <BrandMark className="brand__mark" />
              <h2 className="stage-title">
                {problem.storyChrome.completionTitle ?? "You built a model, tested it, and checked it."}
              </h2>
              <p className="prose">
                {problem.story.closingNote ??
                  "You built the model, tested operators, kept the one that fit the story, solved it, and proved each result backward."}
              </p>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn--primary" onClick={() => studio.openMenu()}>
                  Back to the problems
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ===========================================================================
// Local presentational pieces
// ===========================================================================

function Masthead({
  stepIndex,
  stepCount,
  progressVerb,
}: {
  stepIndex: number;
  stepCount: number;
  progressVerb: string;
}) {
  const { openMenu } = useStudio();
  return (
    <header className="masthead">
      <button type="button" className="brand brand--link" onClick={openMenu} aria-label="Back to the problem menu">
        <BrandMark className="brand__mark" />
        <span className="brand__title">StoryMath</span>
      </button>
      <div className="masthead__right">
        <span className="masthead__progress" aria-label="Progress">
          <b>{Math.min(stepIndex + 1, stepCount)}/{stepCount}</b> {progressVerb}
        </span>
        <StickersButton />
      </div>
    </header>
  );
}

function MissionBrief({
  problem,
  firstStep,
  phase,
  onBegin,
}: {
  problem: ProblemInstance;
  firstStep: ProblemStep;
  phase: string;
  onBegin: () => void;
}) {
  const isStart = phase === "brief";

  // All flavor (eyebrow, title, CTA) comes from the story pack, not literals.
  // The opening shows the story once, then the first step's single question.
  return (
    <section className={`brief${isStart ? "" : " brief--muted"}`}>
      <span className="eyebrow">{problem.storyChrome.openingEyebrow}</span>
      <h1 className="brief__title">{problem.metadata.title}</h1>
      <p className="brief__story">{problem.story.brief}</p>
      {isStart && (
        <>
          <p className="brief__question">{firstStep.prompt}</p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={onBegin}>
              {problem.storyChrome.startCta}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function BackwardConfirmed({
  problem,
  frame,
  onContinue,
}: {
  problem: ProblemInstance;
  frame: BackwardCheckFrame;
  onContinue: () => void;
}) {
  const left = getQuantity(problem, frame.leftQuantityId);
  const right = getQuantity(problem, frame.rightQuantityId);
  const result = getQuantity(problem, frame.resultQuantityId);
  return (
    <>
      <h2 className="stage-title">Your work checks out</h2>
      <div className="note note--good" role="status" style={{ marginTop: 0 }}>
        <strong>
          {formatNumber(left.value)} {frame.operator} {formatNumber(right.value)} ={" "}
          {formatNumber(frame.expectedResult)}
        </strong>{" "}
        — that matches {result.label.compact}. The story and the math agree.
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  );
}

function ArithmeticAnswer({
  step,
  problem,
  operator,
  draft,
  feedback,
  onChange,
  onSubmit,
}: {
  step: ProblemStep;
  problem: ProblemInstance;
  operator: Operator;
  draft: string;
  feedback?: "check_arithmetic";
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [lId, rId] = stepOperandIds(step);
  const left = getQuantity(problem, lId);
  const right = getQuantity(problem, rId);
  const goal = getQuantity(problem, step.goalQuantityId);

  return (
    <div style={{ marginTop: "var(--sp-6)" }}>
      <StackedArithmetic
        key={`${step.id}-${operator}`}
        left={left.value}
        right={right.value}
        operator={operator}
        unit={goal.unit}
        draft={draft}
        ariaLabel={`Answer for ${goal.label.child}`}
        submitLabel="Enter answer"
        onChange={onChange}
        onSubmit={onSubmit}
      />
      {feedback === "check_arithmetic" && (
        <div className="note note--nudge" role="status">
          Close — re-check{" "}
          <strong>{formatNumber(left.value)} {operator} {formatNumber(right.value)}</strong>.{" "}
          {magnitudeHint(operator, left.value, right.value)}
        </div>
      )}
    </div>
  );
}

/**
 * A truthful magnitude hint derived from the operator — never a hard-coded
 * "smaller than left" (which is false for addition/multiplication).
 */
function magnitudeHint(operator: Operator, left: number, right: number): string {
  switch (operator) {
    case "-":
      return `The result should be smaller than ${formatNumber(left)} but greater than 0.`;
    case "+":
      return `The result should be larger than both ${formatNumber(left)} and ${formatNumber(right)}.`;
    case "×":
      return `The result should be much larger than ${formatNumber(left)}.`;
    case "÷":
      return `The result should be smaller than ${formatNumber(left)}.`;
    default:
      return `Work it out step by step.`;
  }
}


function ModelCardView({
  problem,
  step,
  record,
}: {
  problem: ProblemInstance;
  step: ProblemStep;
  record: { operator: Operator; answer: number; matchedEquationFormId?: string };
}) {
  const [lId, rId] = stepOperandIds(step);
  const left = getQuantity(problem, lId);
  const right = getQuantity(problem, rId);
  const goal = getQuantity(problem, step.goalQuantityId);

  return (
    <div className="modelcard">
      <div className="modelcard__reading">{goal.label.child}</div>
      <div className="modelcard__eq">
        {formatNumber(left.value)} {record.operator} {formatNumber(right.value)} ={" "}
        <b className="modelcard__answer">{formatNumber(record.answer)}</b> {goal.unit}
      </div>
    </div>
  );
}

function EstablishedContext({
  problem,
  step,
  record,
}: {
  problem: ProblemInstance;
  step: ProblemStep;
  record: { operator: Operator; answer: number; matchedEquationFormId?: string };
}) {
  return (
    <section className="panel panel--muted established">
      <p className="established__label">
        Step {step.order}, <span className="established__solved">solved</span>
      </p>
      <ModelCardView problem={problem} step={step} record={record} />
    </section>
  );
}

function CausalRecap({
  problem,
  state,
  onAnswerRecap,
  onFinish,
}: {
  problem: ProblemInstance;
  state: ReturnType<typeof initGame>;
  onAnswerRecap: (correct: boolean) => void;
  onFinish: () => void;
}) {
  const recap = problem.recap;
  const dq = recap.dataQuestion;
  const answered = state.recapAnswerCorrect !== undefined;

  // Calc node derived from the referenced step's preferred equation.
  const calcStep = getStep(problem, recap.calcFromStepId);
  const [clId, crId] = stepOperandIds(calcStep);
  const calcOp = getEquationForm(calcStep.preferredEquationFormId).operator;
  const clV = getQuantity(problem, clId).value;
  const crV = getQuantity(problem, crId).value;
  const calcLine = `${formatNumber(clV)} ${calcOp} ${formatNumber(crV)} = ${formatNumber(applyOperator(clV, calcOp, crV))}`;

  const totalStep = recap.totalVisualStepId ? getStep(problem, recap.totalVisualStepId) : undefined;

  // Options come straight from the data question, shuffled once.
  const options = useMemo(() => {
    const arr = [dq.correctQuantityId, ...dq.distractorQuantityIds].map((id) => ({
      q: getQuantity(problem, id),
      correct: id === dq.correctQuantityId,
    }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }, [problem, dq]);

  return (
    <section className="panel">
      <h2 className="stage-title">{recap.headline}</h2>
      <div className="recap-chain">
        {recap.causalChain.map((node) => (
          <div key={node}>
            <div className="recap-node">{node}</div>
            <div className="recap-arrow" />
          </div>
        ))}
        <div className="recap-node recap-node--calc">{calcLine}</div>
      </div>

      {totalStep && <BarFigure problem={problem} step={totalStep} />}

      <hr className="divider" />

      <h3 className="stage-title" style={{ fontSize: "1.1rem" }}>{dq.prompt}</h3>
      <div className="choice-grid">
        {options.map((o) => (
          <button
            key={o.q.id}
            type="button"
            className="choice"
            disabled={answered}
            onClick={() => onAnswerRecap(o.correct)}
          >
            {o.q.label.child}
          </button>
        ))}
      </div>

      {answered && (
        <div className={`note ${state.recapAnswerCorrect ? "note--good" : "note--nudge"}`} role="status">
          {state.recapAnswerCorrect ? dq.correctFeedback : dq.incorrectFeedback}
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={onFinish}>
              {problem.storyChrome.finishCta}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
