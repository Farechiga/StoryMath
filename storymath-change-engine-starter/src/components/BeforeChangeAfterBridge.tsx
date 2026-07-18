import { formatNumber } from "../domain";

/**
 * A before -> change -> after bridge for start-change-end relationships.
 *   +  (start + change = end): the starting amount (teal) plus the change
 *      (periwinkle) reaching the end total (cobalt).
 *   -  (start - change = end): the starting amount is the full reference span,
 *      with the end amount and removed change aligned underneath as its parts.
 */

const X0 = 20;
const X1 = 620;
const W = X1 - X0;
const BAR_H = 34;
const VB_W = 720;
const BAR_Y = 34;
const LABEL_Y = 18;
const CAPTION_Y = BAR_Y + BAR_H + 20;
const ADD_HEIGHT = CAPTION_Y + 8;
const SUB_TOP_BAR_Y = 30;
const SUB_PART_BAR_Y = 112;
const SUB_TOP_LABEL_Y = 18;
const SUB_TOP_CAPTION_Y = SUB_TOP_BAR_Y + BAR_H + 18;
const SUB_PART_LABEL_Y = SUB_PART_BAR_Y - 12;
const SUB_PART_CAPTION_Y = SUB_PART_BAR_Y + BAR_H + 20;
const SUB_HEIGHT = SUB_PART_CAPTION_Y + 10;

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

  if (!isAdd) {
    return (
      <svg
        className="bar-svg"
        viewBox={`0 0 ${VB_W} ${SUB_HEIGHT}`}
        role="img"
        aria-label={`${formatNumber(startValue)} ${unit} is the full starting amount. ${formatNumber(endValue)} ${unit} remain and ${formatNumber(changeValue)} ${unit} are removed.`}
      >
        <rect
          x={X0}
          y={SUB_TOP_BAR_Y}
          width={W}
          height={BAR_H}
          rx={9}
          style={{ fill: "var(--q-whole)" }}
        />
        <text
          x={X0 + W / 2}
          y={SUB_TOP_LABEL_Y}
          textAnchor="middle"
          className="bm-value"
          style={{ fill: "var(--q-whole-ink)" }}
        >
          {formatNumber(startValue)}
          <tspan className="bm-unit" dx="4">{unit}</tspan>
        </text>
        <text x={X0 + W / 2} y={SUB_TOP_CAPTION_Y} textAnchor="middle" className="bm-caption">
          {startCaption}
        </text>

        <rect
          x={X0}
          y={SUB_PART_BAR_Y}
          width={Math.max(tealW, 3)}
          height={BAR_H}
          rx={9}
          style={{ fill: "var(--q-smaller)" }}
        />
        <text
          x={X0 + tealW / 2}
          y={SUB_PART_LABEL_Y}
          textAnchor="middle"
          className="bm-value"
          style={{ fill: "var(--q-smaller-ink)" }}
        >
          {formatNumber(endValue)}
          <tspan className="bm-unit" dx="4">{unit}</tspan>
        </text>
        <text x={X0 + tealW / 2} y={SUB_PART_CAPTION_Y} textAnchor="middle" className="bm-caption">
          {endCaption}
        </text>

        <rect
          x={X0 + tealW}
          y={SUB_PART_BAR_Y}
          width={Math.max(changeW, 3)}
          height={BAR_H}
          rx={7}
          style={{ fill: "var(--q-minus-tint)", stroke: "var(--q-minus)", strokeWidth: 1.6, strokeDasharray: "4 3" }}
        />
        <text
          x={X0 + tealW + changeW / 2}
          y={SUB_PART_LABEL_Y}
          textAnchor="middle"
          className="bm-value"
          style={{ fill: "var(--q-minus)" }}
        >
          {formatNumber(changeValue)}
          <tspan className="bm-unit" dx="4">{unit}</tspan>
        </text>
        <text x={X0 + tealW + changeW / 2} y={SUB_PART_CAPTION_Y} textAnchor="middle" className="bm-caption">
          {changeCaption}
        </text>
      </svg>
    );
  }

  return (
    <svg
      className="bar-svg"
      viewBox={`0 0 ${VB_W} ${ADD_HEIGHT}`}
      role="img"
      aria-label={`${formatNumber(startValue)} plus ${formatNumber(changeValue)} ${unit} reaches ${formatNumber(endValue)} ${unit}.`}
    >
      <rect x={X0} y={BAR_Y} width={Math.max(tealW, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-smaller)" }} />
      <text x={X0 + tealW / 2} y={LABEL_Y} textAnchor="middle" className="bm-value" style={{ fill: "var(--q-smaller-ink)" }}>
        {formatNumber(teal)}
      </text>
      <text x={X0 + tealW / 2} y={CAPTION_Y} textAnchor="middle" className="bm-caption">{tealCaption}</text>

      <rect x={X0 + tealW + 2} y={BAR_Y} width={Math.max(changeW - 2, 3)} height={BAR_H} rx={9} style={{ fill: "var(--q-bigger)" }} />
      <text
        x={X0 + tealW + changeW / 2}
        y={LABEL_Y}
        textAnchor="middle"
        className="bm-value"
        style={{ fill: "var(--q-bigger-ink)" }}
      >
        +{formatNumber(changeValue)}
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
        = {formatNumber(endValue)}
        <tspan className="bm-unit" dx="4">{unit}</tspan>
      </text>
      <title>{endCaption}</title>
    </svg>
  );
}
