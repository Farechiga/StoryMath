import { formatNumber } from "../domain";

/**
 * Visual for the "check your work" step — the *inverse* operation, WITHOUT the
 * total (the child computes that below). Segment values sit above; small grey
 * captions naming each segment sit below.
 *   +  → answer (teal) plus the amount added back (periwinkle).
 *   -  → the derived amount (teal) with the taken-away amount as a maroon gap.
 */

const X0 = 20;
const X1 = 620;
const W = X1 - X0;
const BAR_H = 34;
const VB_W = 660;
const BAR_Y = 34;
const LABEL_Y = 18;
const CAPTION_Y = BAR_Y + BAR_H + 20;
const HEIGHT = CAPTION_Y + 8;

export function BackwardBar({
  leftValue,
  rightValue,
  resultValue,
  operator,
  unit,
  leftCaption,
  rightCaption,
  resultCaption,
}: {
  leftValue: number;
  rightValue: number;
  resultValue: number;
  operator: "+" | "-" | "×" | "÷";
  unit: string;
  leftCaption: string;
  rightCaption: string;
  resultCaption: string;
}) {
  const isAdd = operator === "+";
  // Addition: [answer(left) + addedBack(right)] reaches the total.
  // Subtraction: the minuend (left) bar holds the result(teal) + taken-away gap.
  const max = (isAdd ? resultValue : leftValue) || 1;
  const teal = isAdd ? leftValue : resultValue; // the teal segment's value
  const tealCaption = isAdd ? leftCaption : resultCaption;
  const other = rightValue; // added back (+) or taken away (−)
  const tealW = (teal / max) * W;
  const otherW = (other / max) * W;

  return (
    <svg
      className="bar-svg"
      viewBox={`0 0 ${VB_W} ${HEIGHT}`}
      role="img"
      aria-label={
        isAdd
          ? `${formatNumber(leftValue)} plus ${formatNumber(rightValue)} ${unit}, to be added.`
          : `${formatNumber(leftValue)} ${unit} minus ${formatNumber(rightValue)} ${unit} leaves ${formatNumber(resultValue)} ${unit}.`
      }
    >
      {/* answer segment (teal) */}
      <rect x={X0} y={BAR_Y} width={Math.max(tealW, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-smaller)" }} />
      <text x={X0 + tealW / 2} y={LABEL_Y} textAnchor="middle" className="bm-value" style={{ fill: "var(--q-smaller-ink)" }}>
        {formatNumber(teal)}
      </text>
      <text x={X0 + tealW / 2} y={CAPTION_Y} textAnchor="middle" className="bm-caption">
        {tealCaption}
      </text>

      {/* the amount added back (periwinkle) or taken away (maroon gap) */}
      {isAdd ? (
        <rect x={X0 + tealW + 2} y={BAR_Y} width={Math.max(otherW - 2, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-bigger)" }} />
      ) : (
        <rect
          x={X0 + tealW}
          y={BAR_Y}
          width={Math.max(otherW, 3)}
          height={BAR_H}
          rx={7}
          style={{ fill: "var(--q-minus-tint)", stroke: "var(--q-minus)", strokeWidth: 1.6, strokeDasharray: "4 3" }}
        />
      )}
      <text
        x={X0 + tealW + otherW / 2}
        y={LABEL_Y}
        textAnchor="middle"
        className="bm-value"
        style={{ fill: isAdd ? "var(--q-bigger-ink)" : "var(--q-minus)" }}
      >
        {isAdd ? "+" : "−"}
        {formatNumber(other)}
      </text>
      <text x={X0 + tealW + otherW / 2} y={CAPTION_Y} textAnchor="middle" className="bm-caption">
        {rightCaption}
      </text>
    </svg>
  );
}
