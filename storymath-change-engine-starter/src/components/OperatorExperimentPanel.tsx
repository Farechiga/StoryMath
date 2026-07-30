import { formatNumber, getQuantity } from "../domain";
import type { Operator, OperatorExperimentResult, ProblemInstance, ProblemStep, Quantity } from "../domain";
import { EqualSharesModel } from "./EqualSharesModel";

type Tone = "fit" | "alt" | "question";

const TONE: Record<string, Tone> = {
  actual: "fit",
  different_story: "alt",
  different_question: "question",
};

const TRANSFORMATION_COLORS = {
  start: "#4C63D7",
  firstOperand: "#427EA5",
  secondOperand: "#92B6A0",
  addFirst: "#0054DA",
  subtractFirst: "#9562D1",
  divideFirst: "#7185DA",
  multiplyFirst: "#3B3598",
} as const;

function attemptColor(operator: Operator): string {
  if (operator === "+") return TRANSFORMATION_COLORS.addFirst;
  if (operator === "-") return TRANSFORMATION_COLORS.subtractFirst;
  if (operator === "÷") return TRANSFORMATION_COLORS.divideFirst;
  return TRANSFORMATION_COLORS.multiplyFirst;
}

function colorFor(quantity: Quantity, quantityColors: Record<string, string>, fallback: string): string {
  return quantityColors[quantity.id] ?? quantity.visualization?.colorToken ?? fallback;
}

function barWidth(value: number, maxValue: number, maxWidth: number): number {
  return Math.max(34, (Math.max(0, value) / Math.max(1, maxValue)) * maxWidth);
}

function AttemptBarLabel({
  x,
  y,
  value,
  label,
  color,
  prefix = "",
  hidden = false,
}: {
  x: number;
  y: number;
  value: number;
  label: string;
  color: string;
  prefix?: string;
  hidden?: boolean;
}) {
  return (
    <>
      <text x={x + 12} y={y + 23} className="attempt-viz__value">
        {hidden ? "?" : `${prefix}${formatNumber(value)}`}
      </text>
      <text x={x} y={y + 52} className="attempt-viz__caption" style={{ fill: color }}>
        {label}
      </text>
    </>
  );
}

function AddSubtractAttempt({
  operator,
  left,
  right,
  target,
  computed,
  leftColor,
  rightColor,
  resultColor,
  hideResult = false,
}: {
  operator: "+" | "-";
  left: Quantity;
  right: Quantity;
  target: Quantity;
  computed: number;
  leftColor: string;
  rightColor: string;
  resultColor: string;
  hideResult?: boolean;
}) {
  const x = 92;
  const y = 20;
  const maxWidth = 560;
  const height = 32;
  const rowGap = 72;
  const maxValue = Math.max(left.value, right.value, computed);
  const leftWidth = barWidth(left.value, maxValue, maxWidth);
  const rightWidth = barWidth(right.value, maxValue, maxWidth);
  const resultWidth = barWidth(computed, maxValue, maxWidth);
  const rightX = operator === "+" ? x + leftWidth : x + Math.max(0, leftWidth - rightWidth);
  const invariant =
    operator === "+"
      ? `${formatNumber(computed)} = ${formatNumber(left.value)} + ${formatNumber(right.value)}`
      : `${formatNumber(left.value)} = ${formatNumber(computed)} + ${formatNumber(right.value)}`;

  return (
    <svg
      className="attempt-viz attempt-viz--bars"
      viewBox="0 0 760 240"
      role="img"
      aria-label={
        hideResult
          ? `${formatNumber(left.value)} ${operator} ${formatNumber(right.value)} equals unknown. The ${target.label.compact} row is aligned to the same scale.`
          : `${formatNumber(left.value)} ${operator} ${formatNumber(right.value)} = ${formatNumber(computed)}. ${invariant}.`
      }
    >
      <rect x={x} y={y} width={leftWidth} height={height} rx={7} className="attempt-viz__bar" style={{ fill: leftColor }} />
      <AttemptBarLabel x={x} y={y} value={left.value} label={left.label.compact} color={leftColor} />

      {operator === "-" && (
        <rect
          x={rightX}
          y={y - 3}
          width={rightWidth}
          height={height + 6}
          rx={7}
          className="attempt-viz__removed-reference"
          style={{ stroke: rightColor }}
        />
      )}

      <g transform={`translate(0 ${rowGap})`}>
        <rect x={rightX} y={y} width={rightWidth} height={height} rx={7} className="attempt-viz__bar" style={{ fill: rightColor }} />
        <AttemptBarLabel x={rightX} y={y} value={right.value} label={right.label.compact} color={rightColor} prefix={operator === "+" ? "+" : "-"} />
      </g>

      <g transform={`translate(0 ${rowGap * 2})`}>
        <rect x={x} y={y} width={resultWidth} height={height} rx={7} className="attempt-viz__bar" style={{ fill: resultColor }} />
        <AttemptBarLabel x={x} y={y} value={computed} label={target.label.compact} color={resultColor} hidden={hideResult} />
      </g>
    </svg>
  );
}

function MultiplicationAttempt({
  left,
  right,
  target,
  computed,
  leftColor,
  rightColor,
  resultColor,
  hideResult = false,
}: {
  left: Quantity;
  right: Quantity;
  target: Quantity;
  computed: number;
  leftColor: string;
  rightColor: string;
  resultColor: string;
  hideResult?: boolean;
}) {
  const factors = [
    { quantity: left, value: left.value, color: leftColor },
    { quantity: right, value: right.value, color: rightColor },
  ].sort((a, b) => b.value - a.value);
  const columns = Math.max(1, Math.round(factors[0]!.value));
  const rows = Math.max(1, Math.round(factors[1]!.value));
  const exact = columns * rows <= 1200 && columns <= 96 && rows <= 24;
  const drawnColumns = exact ? columns : Math.min(columns, 96);
  const drawnRows = exact ? rows : Math.min(rows, Math.max(1, Math.floor(1200 / drawnColumns)));
  const gap = drawnColumns > 48 || drawnRows > 18 ? 1 : 3;
  const gridX = 62;
  const gridY = 48;
  const maxGridWidth = 620;
  const maxGridHeight = 178;
  const cell = Math.max(
    4,
    Math.min(
      20,
      (maxGridWidth - Math.max(0, drawnColumns - 1) * gap) / drawnColumns,
      (maxGridHeight - Math.max(0, drawnRows - 1) * gap) / drawnRows,
    ),
  );
  const gridWidth = drawnColumns * cell + Math.max(0, drawnColumns - 1) * gap;
  const gridHeight = drawnRows * cell + Math.max(0, drawnRows - 1) * gap;
  const cells = Array.from({ length: drawnRows * drawnColumns }, (_, index) => ({
    column: index % drawnColumns,
    row: Math.floor(index / drawnColumns),
  }));

  return (
    <svg
      className="attempt-viz attempt-viz--array"
      viewBox="0 0 760 300"
      role="img"
      aria-label={
        hideResult
          ? `Array model: ${formatNumber(columns)} ${factors[0]!.quantity.label.compact} by ${formatNumber(rows)} ${factors[1]!.quantity.label.compact} make an unknown number of ${target.unit}.`
          : `Array model: ${formatNumber(columns)} ${factors[0]!.quantity.label.compact} by ${formatNumber(rows)} ${factors[1]!.quantity.label.compact} make ${formatNumber(computed)} ${target.unit}.`
      }
    >
      <text x={gridX + gridWidth / 2} y={29} className="mts-array-axis mts-array-axis--columns" style={{ fill: factors[0]!.color }}>
        {formatNumber(columns)} {factors[0]!.quantity.label.compact}
      </text>
      <text x={gridX + gridWidth + 16} y={gridY + gridHeight / 2} className="mts-array-axis mts-array-axis--rows" style={{ fill: factors[1]!.color }}>
        {formatNumber(rows)} {factors[1]!.quantity.label.compact}
      </text>
      <g>
        {cells.map(({ column, row }) => (
          <rect
            key={`${row}-${column}`}
            x={gridX + column * (cell + gap)}
            y={gridY + row * (cell + gap)}
            width={cell}
            height={cell}
            rx={Math.min(3, cell / 4)}
            className="mts-array-cell"
            style={{ fill: resultColor }}
          />
        ))}
      </g>
      <text x={gridX} y={gridY + gridHeight + 34} className="attempt-viz__caption" style={{ fill: resultColor }}>
        {hideResult ? "?" : formatNumber(computed)} {target.label.compact}
      </text>
    </svg>
  );
}

function StandardAttemptVisualization({
  result,
  left,
  right,
  target,
  quantityColors,
}: {
  result: OperatorExperimentResult;
  left: Quantity;
  right: Quantity;
  target: Quantity;
  quantityColors: Record<string, string>;
}) {
  const leftColor = colorFor(left, quantityColors, TRANSFORMATION_COLORS.start);
  const rightColor = colorFor(right, quantityColors, TRANSFORMATION_COLORS.firstOperand);
  const targetColor = result.fitsStory
    ? colorFor(target, quantityColors, attemptColor(result.operator))
    : attemptColor(result.operator);

  if (result.operator === "+" || result.operator === "-") {
    return (
      <AddSubtractAttempt
        operator={result.operator}
        left={left}
        right={right}
        target={target}
        computed={result.computed}
        leftColor={leftColor}
        rightColor={rightColor}
        resultColor={targetColor}
        hideResult={result.fitsStory}
      />
    );
  }

  if (result.operator === "×") {
    return (
      <MultiplicationAttempt
        left={left}
        right={right}
        target={target}
        computed={result.computed}
        leftColor={leftColor}
        rightColor={rightColor}
        resultColor={targetColor}
        hideResult={result.fitsStory}
      />
    );
  }

  return (
    <EqualSharesModel
      dividend={left.value}
      divisor={right.value}
      unit={left.unit}
      tone={result.fitsStory ? "fit" : "wrong"}
      unitColor={rightColor}
      groupColor={targetColor}
      columnLabel={right.label.compact}
      rowLabel={target.label.compact}
    />
  );
}

/**
 * Consequence of an attempted operation: the computed equation (answer hidden
 * when it fits, so the child solves it below), the correct visual model for
 * that operation, and one field-merged alternate-world sentence.
 */
export function OperatorExperimentPanel({
  result,
  problem,
  step,
  quantityColors,
  onAccept,
  onTryAnother,
}: {
  result: OperatorExperimentResult;
  problem: ProblemInstance;
  step: ProblemStep;
  quantityColors: Record<string, string>;
  onAccept: () => void;
  onTryAnother: () => void;
}) {
  const tone = TONE[result.narrativeFit] ?? "question";
  const [leftVal, rightVal] = result.operandValues;
  const left = getQuantity(problem, result.operandQuantityIds[0]);
  const right = getQuantity(problem, result.operandQuantityIds[1]);
  const target = getQuantity(problem, step.goalQuantityId);

  // Division here means making equal groups: the calc line reports the whole
  // number of groups in generic "groups" (never the story's unit, which would be
  // nonsensical), and says "with some left over" whenever it does not divide
  // evenly, so no decimal or false "divides cleanly" impression sneaks in.
  const isDivision = result.operator === "÷";
  const displayResult = isDivision ? Math.floor(leftVal / rightVal) : result.computed;
  const divRemainder = isDivision ? leftVal - displayResult * rightVal : 0;
  const resultText = isDivision
    ? `${formatNumber(displayResult)} group${displayResult === 1 ? "" : "s"}${
        divRemainder > 0 ? " with some left over" : ""
      }`
    : `${formatNumber(displayResult)} ${target.unit}`;

  return (
    <div className={`verdict verdict--${tone}`}>
      {result.worldSentence && <p className="verdict__world">{result.worldSentence}</p>}

      <p className="verdict__calc">
        {formatNumber(leftVal)} {result.operator} {formatNumber(rightVal)} ={" "}
        {result.fitsStory ? "?" : resultText}
      </p>

      <StandardAttemptVisualization
        result={result}
        left={left}
        right={right}
        target={target}
        quantityColors={quantityColors}
      />

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
