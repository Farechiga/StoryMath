import { formatNumber } from "../domain";

/**
 * A before → change → after bridge for start-change-end relationships.
 *   +  (start + change = end): the starting amount (teal) plus the change
 *      (periwinkle) reaching the end total (cobalt).
 *   -  (start − change = end): the end amount (teal) left inside the starting
 *      bar after the change is taken away (maroon dotted gap).
 */

const X0 = 20;
const X1 = 620;
const W = X1 - X0;
const BAR_H = 34;
const VB_W = 720;
const BAR_Y = 34;
const LABEL_Y = 18;
const CAPTION_Y = BAR_Y + BAR_H + 20;
const HEIGHT = CAPTION_Y + 8;

export function BeforeChangeAfterBridge({
  startValue,
  changeValue,
  endValue,
  operator,
  unit,
  startCaption,
  changeCaption,
  endCaption,
}: {
  startValue: number;
  changeValue: number;
  endValue: number;
  operator: "+" | "-";
  unit: string;
  startCaption: string;
  changeCaption: string;
  endCaption: string;
}) {
  const isAdd = operator === "+";
  const total = isAdd ? endValue : startValue; // the full-length amount
  const max = total || 1;
  const teal = isAdd ? startValue : endValue; // the "before"/"after" teal segment
  const tealCaption = isAdd ? startCaption : endCaption;
  const tealW = (teal / max) * W;
  const changeW = (changeValue / max) * W;
  const rightLabel = isAdd ? endValue : startValue;
  const rightCaption = isAdd ? endCaption : startCaption;

  return (
    <svg
      className="bar-svg"
      viewBox={`0 0 ${VB_W} ${HEIGHT}`}
      role="img"
      aria-label={
        isAdd
          ? `${formatNumber(startValue)} plus ${formatNumber(changeValue)} ${unit} reaches ${formatNumber(endValue)} ${unit}.`
          : `${formatNumber(startValue)} ${unit} minus ${formatNumber(changeValue)} ${unit} leaves ${formatNumber(endValue)} ${unit}.`
      }
    >
      <rect x={X0} y={BAR_Y} width={Math.max(tealW, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-smaller)" }} />
      <text x={X0 + tealW / 2} y={LABEL_Y} textAnchor="middle" className="bm-value" style={{ fill: "var(--q-smaller-ink)" }}>
        {formatNumber(teal)}
      </text>
      <text x={X0 + tealW / 2} y={CAPTION_Y} textAnchor="middle" className="bm-caption">{tealCaption}</text>

      {isAdd ? (
        <rect x={X0 + tealW + 2} y={BAR_Y} width={Math.max(changeW - 2, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-bigger)" }} />
      ) : (
        <rect
          x={X0 + tealW}
          y={BAR_Y}
          width={Math.max(changeW, 3)}
          height={BAR_H}
          rx={7}
          style={{ fill: "var(--q-minus-tint)", stroke: "var(--q-minus)", strokeWidth: 1.6, strokeDasharray: "4 3" }}
        />
      )}
      <text
        x={X0 + tealW + changeW / 2}
        y={LABEL_Y}
        textAnchor="middle"
        className="bm-value"
        style={{ fill: isAdd ? "var(--q-bigger-ink)" : "var(--q-minus)" }}
      >
        {isAdd ? "+" : "−"}
        {formatNumber(changeValue)}
      </text>
      <text x={X0 + tealW + changeW / 2} y={CAPTION_Y} textAnchor="middle" className="bm-caption">{changeCaption}</text>

      <text
        x={X0 + tealW + changeW + 12}
        y={BAR_Y + BAR_H / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="bm-value"
        style={{ fill: "var(--q-whole-ink)" }}
      >
        = {formatNumber(rightLabel)}
        <tspan className="bm-unit" dx="4">{unit}</tspan>
      </text>
      <title>{rightCaption}</title>
    </svg>
  );
}
