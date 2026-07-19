import { formatNumber } from "../domain";

/**
 * Reusable, dependency-free bar models rendered as inline SVG.
 *
 * Each bar, segment, and bracket is bound to a named quantity so the picture is
 * a genuine "math model", not a decorative chart. A single horizontal scale is
 * shared across bars within a view (docs/05 §6). Text stays real SVG text so it
 * remains selectable and screen-reader friendly.
 */

const TRACK_X0 = 178;
const TRACK_X1 = 636; // leaves room so value labels sit outside bars, always legible
const TRACK_W = TRACK_X1 - TRACK_X0;
const BAR_H = 34;
const ROW_GAP = 30;
const VB_W = 720;

const ROLE_FILL: Record<string, string> = {
  bigger: "var(--q-bigger)",
  smaller: "var(--q-smaller)",
  difference: "var(--q-difference)",
  whole: "var(--q-whole)",
};

// Darker shades for text labels so numbers stay AA-legible on the light figure.
const ROLE_TEXT: Record<string, string> = {
  bigger: "var(--q-bigger-ink)",
  smaller: "var(--q-smaller-ink)",
  difference: "var(--q-difference-ink)",
  whole: "var(--q-whole-ink)",
};

interface Datum {
  label: string;
  value: number;
  unit: string;
}

function rowY(index: number): number {
  return 20 + index * (BAR_H + ROW_GAP);
}

function BarRow({
  y,
  label,
  value,
  unit,
  width,
  fill,
  textFill,
  x0 = TRACK_X0,
  showValue = true,
}: {
  y: number;
  label: string;
  value: number;
  unit: string;
  width: number;
  fill: string;
  textFill: string;
  x0?: number;
  showValue?: boolean;
}) {
  // Values are drawn just past the bar end in the bar's own colour so they are
  // always legible against the light surface (never white-on-bar).
  return (
    <g>
      <text
        x={166}
        y={y + BAR_H / 2}
        textAnchor="end"
        dominantBaseline="middle"
        className="bm-label"
      >
        {label}
      </text>
      <rect
        x={x0}
        y={y}
        width={Math.max(width, 3)}
        height={BAR_H}
        rx={9}
        style={{ fill }}
      />
      {showValue && (
        <text
          x={x0 + width + 12}
          y={y + BAR_H / 2}
          textAnchor="start"
          dominantBaseline="middle"
          className="bm-value"
          style={{ fill: textFill }}
        >
          {formatNumber(value)}
          <tspan className="bm-unit" dx="4">
            {unit}
          </tspan>
        </text>
      )}
    </g>
  );
}

export function ComparisonBarModel({
  bigger,
  smaller,
  difference,
}: {
  bigger: Datum;
  smaller: Datum;
  difference: Datum;
}) {
  const max = bigger.value || 1;
  const scale = (v: number) => (v / max) * TRACK_W;
  const yBig = rowY(0);
  const ySmall = rowY(1);

  const smallW = scale(smaller.value);
  const gapX0 = TRACK_X0 + smallW;
  const gapX1 = TRACK_X0 + scale(bigger.value);
  const height = ySmall + BAR_H + 40;

  return (
    <svg
      className="bar-svg"
      viewBox={`0 0 ${VB_W} ${height}`}
      role="img"
      aria-label={`Comparison bar model. ${bigger.label}: ${bigger.value} ${bigger.unit}. ${smaller.label}: ${smaller.value} ${smaller.unit}. ${difference.label}: ${difference.value} ${difference.unit}.`}
    >
      <BarRow
        y={yBig}
        label={bigger.label}
        value={bigger.value}
        unit={bigger.unit}
        width={scale(bigger.value)}
        fill={ROLE_FILL.bigger!}
        textFill={ROLE_TEXT.bigger!}
      />
      {/* Value drawn to the RIGHT of the subtracted-amount gap so it is never
          hidden behind it. */}
      <BarRow
        y={ySmall}
        label={smaller.label}
        value={smaller.value}
        unit={smaller.unit}
        width={smallW}
        fill={ROLE_FILL.smaller!}
        textFill={ROLE_TEXT.smaller!}
        showValue={false}
      />
      <text
        x={TRACK_X0 + scale(bigger.value) + 12}
        y={ySmall + BAR_H / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="bm-value"
        style={{ fill: ROLE_TEXT.smaller }}
      >
        {formatNumber(smaller.value)}
        <tspan className="bm-unit" dx="4">
          {smaller.unit}
        </tspan>
      </text>

      {/* The amount subtracted: a dark-maroon dotted gap that completes the
          shorter bar back up to the longer one, labelled −value. */}
      <rect
        x={gapX0}
        y={ySmall}
        width={Math.max(gapX1 - gapX0, 3)}
        height={BAR_H}
        rx={7}
        style={{
          fill: "var(--q-minus-tint)",
          stroke: "var(--q-minus)",
          strokeWidth: 1.6,
          strokeDasharray: "4 3",
        }}
      />
      <text
        x={(gapX0 + gapX1) / 2}
        y={ySmall + BAR_H / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="bm-value"
        style={{ fill: "var(--q-minus)" }}
      >
        −{formatNumber(difference.value)}
      </text>
      {/* Caption is data-driven (the difference quantity's own label), so no
          direction word is baked into this generic component. */}
      <text
        x={(gapX0 + gapX1) / 2}
        y={ySmall + BAR_H + 18}
        textAnchor="middle"
        className="bm-caption"
      >
        {difference.label}
      </text>
    </svg>
  );
}

export function PartWholeBarModel({
  partA,
  partB,
  whole,
}: {
  partA: Datum;
  partB: Datum;
  whole: Datum;
}) {
  const max = whole.value || 1;
  const scale = (v: number) => (v / max) * TRACK_W;
  const yWhole = rowY(0);
  const yA = rowY(1);
  const yB = rowY(2);
  const height = yB + BAR_H + 30;

  const aW = scale(partA.value);
  const bW = scale(partB.value);

  return (
    <svg
      className="bar-svg"
      viewBox={`0 0 ${VB_W} ${height}`}
      role="img"
      aria-label={`Part-part-whole bar model. ${partA.label}: ${partA.value} ${partA.unit}. ${partB.label}: ${partB.value} ${partB.unit}. Combined ${whole.label}: ${whole.value} ${whole.unit}.`}
    >
      {/* The whole reference span comes first, with its parts aligned below. */}
      <BarRow
        y={yWhole}
        label={whole.label}
        value={whole.value}
        unit={whole.unit}
        width={aW}
        fill={ROLE_FILL.bigger!}
        textFill={ROLE_TEXT.bigger!}
        showValue={false}
      />
      <rect
        x={TRACK_X0 + aW + 2}
        y={yWhole}
        width={Math.max(bW - 2, 3)}
        height={BAR_H}
        rx={9}
        style={{ fill: ROLE_FILL.smaller }}
      />
      <text
        x={TRACK_X0 + aW + bW + 12}
        y={yWhole + BAR_H / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="bm-value"
        style={{ fill: ROLE_TEXT.whole }}
      >
        {formatNumber(whole.value)}
        <tspan className="bm-unit" dx="4">
          {whole.unit}
        </tspan>
      </text>
      <BarRow
        y={yA}
        label={partA.label}
        value={partA.value}
        unit={partA.unit}
        width={aW}
        fill={ROLE_FILL.bigger!}
        textFill={ROLE_TEXT.bigger!}
      />
      <BarRow
        y={yB}
        label={partB.label}
        value={partB.value}
        unit={partB.unit}
        width={bW}
        fill={ROLE_FILL.smaller!}
        textFill={ROLE_TEXT.smaller!}
      />
    </svg>
  );
}
