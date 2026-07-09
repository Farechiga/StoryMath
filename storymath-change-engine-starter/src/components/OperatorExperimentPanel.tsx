import { formatNumber } from "../domain";
import type { DirectionKind, OperatorExperimentResult } from "../domain";
import { PreviewBars } from "./PreviewBars";
import { RepeatedGroupsModel } from "./RepeatedGroupsModel";

type Tone = "fit" | "alt" | "question";

const TONE: Record<string, Tone> = {
  actual: "fit",
  different_story: "alt",
  different_question: "question",
};

// Generic magnitude reactions keyed on the direction the operation produces.
// A story pack may override any of these via the experiment's shortReaction.
const REACTION: Partial<Record<DirectionKind, string>> = {
  increase: "That’s bigger.",
  decrease: "That’s smaller.",
  scale: "That’s a huge jump!",
  split: "That’s split into parts.",
};

/**
 * Consequence of an attempted operation: the computed equation (answer hidden
 * when it fits, so the child solves it below), a short reaction, the correct
 * visual model for that operation, and one field-merged alternate-world sentence.
 */
export function OperatorExperimentPanel({
  result,
  referenceLabel,
  referenceValue,
  attemptedLabel,
  attemptedLabelLower,
  unit,
  onAccept,
  onTryAnother,
}: {
  result: OperatorExperimentResult;
  referenceLabel: string;
  referenceValue: number;
  attemptedLabel: string;
  attemptedLabelLower: string;
  unit: string;
  onAccept: () => void;
  onTryAnother: () => void;
}) {
  const tone = TONE[result.narrativeFit] ?? "question";
  const [leftVal, rightVal] = result.operandValues;

  const reactionText =
    result.shortReaction ??
    (result.directionProduced === "combine"
      ? `That’s ${attemptedLabelLower}.`
      : REACTION[result.directionProduced] ?? "");

  // The multiplication grid shows the STRUCTURE (repeated groups) for every
  // operator — including the fitting one — but hides the product there so the
  // child still computes it below. The additive preview bars would reveal the
  // answer, so those stay hidden for the fitting operator.
  let viz: React.ReactNode = null;
  if (result.visualModel === "repeated_groups_grid") {
    viz = (
      <RepeatedGroupsModel
        groupSize={leftVal}
        groupCount={rightVal}
        total={result.computed}
        unit={unit}
        groupNoun={result.groupNoun ?? "group"}
        hideTotal={result.fitsStory}
      />
    );
  } else if (
    !result.fitsStory &&
    (result.visualModel === "comparison_gap_bar" || result.visualModel === "part_whole_bar")
  ) {
    viz = (
      <PreviewBars
        referenceLabel={referenceLabel}
        referenceValue={referenceValue}
        attemptedLabel={attemptedLabel}
        attemptedValue={result.computed}
        unit={unit}
      />
    );
  }
  // Other models (e.g. equal_shares_tray) are a later pass; show no bar.

  return (
    <div className={`verdict verdict--${tone}`}>
      <p className="verdict__calc">
        {formatNumber(leftVal)} {result.operator} {formatNumber(rightVal)} ={" "}
        {result.fitsStory ? "?" : `${formatNumber(result.computed)} ${unit}`}
        <span className="verdict__reaction">{reactionText}</span>
      </p>

      {viz}

      {result.worldSentence && <p className="verdict__world">{result.worldSentence}</p>}

      <div className="btn-row">
        {result.fitsStory ? (
          <>
            <button type="button" className="btn btn--primary" onClick={onAccept}>
              This fits — let’s solve it
            </button>
            <button type="button" className="btn btn--ghost" onClick={onTryAnother}>
              Try a different operation
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onTryAnother}>
            Try another operation
          </button>
        )}
      </div>
    </div>
  );
}
