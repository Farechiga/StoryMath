import { formatNumber } from "../domain";
import type { BackwardCheckFrame, Quantity } from "../domain";
import { StackedArithmetic } from "./StackedArithmetic";
import { BackwardBar } from "./BackwardBar";

/**
 * The backward check is a reconciliation, not an afterthought. The operands and
 * operator are fixed by an inverse equation form; the child reconstructs the
 * reconciling result. When the relationship supports more than one valid check,
 * the child may pick which one to prove.
 */
export function BackwardCheckBuilder({
  frames,
  selectedIndex,
  draft,
  feedback,
  quantitiesById,
  onSelectChoice,
  onSetAnswer,
  onSubmit,
}: {
  frames: BackwardCheckFrame[];
  selectedIndex: number;
  draft: string;
  feedback?: "retry";
  quantitiesById: Map<string, Quantity>;
  onSelectChoice: (index: number) => void;
  onSetAnswer: (value: string) => void;
  onSubmit: () => void;
}) {
  const frame = frames[selectedIndex] ?? frames[0]!;
  const left = quantitiesById.get(frame.leftQuantityId)!;
  const right = quantitiesById.get(frame.rightQuantityId)!;
  const target = quantitiesById.get(frame.resultQuantityId)!;

  const readLabel = (q: Quantity) => q.label.compact;

  return (
    <>
      <h2 className="stage-title">{backwardExplanation(frame, left, right, target)}</h2>

      {frames.length > 1 && (
        <div className="backward__choices" role="group" aria-label="Choose a check to prove">
          {frames.map((f, i) => {
            const l = quantitiesById.get(f.leftQuantityId)!;
            const r = quantitiesById.get(f.rightQuantityId)!;
            const t = quantitiesById.get(f.resultQuantityId)!;
            return (
              <button
                key={f.equationFormId}
                type="button"
                className={`backward__choice${i === selectedIndex ? " backward__choice--selected" : ""}`}
                aria-pressed={i === selectedIndex}
                onClick={() => onSelectChoice(i)}
              >
                {readLabel(l)} {f.operator} {readLabel(r)} = {readLabel(t)}
              </button>
            );
          })}
        </div>
      )}

      <figure className="bar-figure">
        <BackwardBar
          leftValue={left.value}
          rightValue={right.value}
          resultValue={target.value}
          operator={frame.operator}
          unit={target.unit}
          leftCaption={left.label.compact}
          rightCaption={right.label.compact}
          resultCaption={target.label.compact}
        />
      </figure>

      <StackedArithmetic
        key={frame.equationFormId}
        left={left.value}
        right={right.value}
        operator={frame.operator}
        unit={target.unit}
        draft={draft}
        ariaLabel={`Result: ${target.label.child}`}
        submitLabel="Check it"
        onChange={onSetAnswer}
        onSubmit={onSubmit}
      />

      {feedback === "retry" && (
        <div className="note note--nudge" role="status">
          Not reconciled yet. Work out{" "}
          <strong>
            {formatNumber(left.value)} {frame.operator} {formatNumber(right.value)}
          </strong>{" "}
          and try again — it should land on {target.label.compact}.
        </div>
      )}
    </>
  );
}

/**
 * Generalized "field-merge" explanation for any inverse check, so the wording
 * stays consistent and scalable across stories:
 *   Now let's [verb] (amount) [prep] our answer, (derived), and check it equals (original).
 */
function backwardExplanation(
  frame: BackwardCheckFrame,
  derived: Quantity,
  amount: Quantity,
  original: Quantity,
): string {
  const amt = `${formatNumber(amount.value)} ${amount.unit}`;
  if (frame.operator === "+") {
    return `Let's add back ${amt} to our answer for ${derived.label.compact}, to see if it equals ${original.label.compact}.`;
  }
  if (frame.operator === "-") {
    return `Let's take ${amt} away from ${derived.label.compact}, to see if it equals ${original.label.compact}.`;
  }
  return `Let's undo the step on ${derived.label.compact}, to see if it equals ${original.label.compact}.`;
}
