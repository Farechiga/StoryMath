import { useState, type CSSProperties } from "react";
import { applyOperator } from "../domain";
import type { Operator } from "../domain";

/**
 * Column ("stacked") arithmetic as a real workspace — one field per place value,
 * a "regroup" row on top, and a small borrow box to the left of each digit.
 * Nothing is auto-calculated: the child writes every mark. The only automatic
 * behaviour is a strikethrough on a top digit once its regroup box is filled
 * (writing 7 above strikes the 8 it replaced). The answer is reconstructed from
 * the per-column answer digits.
 */

const PLACE_NAMES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten-thousands",
  "hundred-thousands",
  "millions",
  "ten-millions",
  "hundred-millions",
  "billions",
];

function digitsOf(value: number, cols: number): string[] {
  return String(value)
    .padStart(cols, " ")
    .split("")
    .map((c) => (c === " " ? "" : c));
}

function placeName(i: number, cols: number): string {
  const power = cols - 1 - i;
  // Beyond the named list, describe by magnitude rather than "place N".
  return PLACE_NAMES[power] ?? `${(10 ** power).toLocaleString("en-US")}s`;
}

const oneDigit = (raw: string) => raw.replace(/[^0-9]/g, "").slice(-1);

function setAt(arr: string[], i: number, value: string): string[] {
  const next = arr.slice();
  next[i] = value;
  return next;
}

export function StackedArithmetic({
  left,
  right,
  operator,
  unit,
  ariaLabel,
  submitLabel,
  onChange,
  onSubmit,
}: {
  left: number;
  right: number;
  operator: Operator;
  unit: string;
  /** kept for API symmetry; per-column state is the source of truth */
  draft?: string;
  ariaLabel: string;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  // In multiplication the larger (multi-digit) number conventionally sits on top.
  // Multiplication is commutative, so this is display-only. Addition/subtraction
  // keep their given order (subtraction is not commutative).
  const topVal = operator === "×" ? Math.max(left, right) : left;
  const bottomVal = operator === "×" ? Math.min(left, right) : right;

  // Enough columns for the operands AND the result (a product/carry can be
  // wider than either operand). Computed for sizing only — never displayed.
  const intLen = (n: number) => String(Math.trunc(Math.abs(n))).length;
  const cols = Math.max(intLen(topVal), intLen(bottomVal), intLen(applyOperator(topVal, operator, bottomVal)));

  const [answer, setAnswer] = useState<string[]>(() => Array(cols).fill(""));
  const [regroup, setRegroup] = useState<string[]>(() => Array(cols).fill(""));
  const [borrow, setBorrow] = useState<string[]>(() => Array(cols).fill(""));

  // The regroup/carry row on top is useful for both operations. The left borrow
  // boxes and the strikethrough are subtraction-specific.
  const showBorrow = operator === "-";

  const leftDigits = digitsOf(topVal, cols);
  const rightDigits = digitsOf(bottomVal, cols);
  const hasAnswer = answer.join("").length > 0;

  const handleAnswer = (i: number, raw: string) => {
    const next = setAt(answer, i, oneDigit(raw));
    setAnswer(next);
    onChange(next.join(""));
  };

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `40px repeat(${cols}, 52px)`,
  };

  return (
    <form
      className="colsum"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="colsum__grid" style={gridStyle} role="group" aria-label={`${topVal} ${operator} ${bottomVal}`}>
        {/* regroup / carry row — used for both operations */}
        <span className="colsum__gutter colsum__hint" aria-hidden="true">regroup</span>
        {Array.from({ length: cols }, (_, i) => (
          <input
            key={`r${i}`}
            className="colsum__regroup"
            inputMode="numeric"
            aria-label={`Regroup, ${placeName(i, cols)} place`}
            value={regroup[i] ?? ""}
            onChange={(e) => setRegroup(setAt(regroup, i, oneDigit(e.target.value)))}
            autoComplete="off"
          />
        ))}

        {/* top operand — for subtraction each digit gets a borrow box on its
            left and is struck through once its regroup box above is written */}
        <span className="colsum__gutter" aria-hidden="true" />
        {leftDigits.map((d, i) => (
          <span className="colsum__topcell" key={`l${i}`}>
            {showBorrow && (
              <input
                className="colsum__borrow"
                inputMode="numeric"
                aria-label={`Borrow into ${placeName(i, cols)} place`}
                value={borrow[i] ?? ""}
                onChange={(e) => setBorrow(setAt(borrow, i, oneDigit(e.target.value)))}
                autoComplete="off"
              />
            )}
            <span className={`colsum__digit${showBorrow && regroup[i] ? " colsum__digit--struck" : ""}`}>{d}</span>
          </span>
        ))}

        {/* operator + bottom operand */}
        <span className="colsum__gutter colsum__op" aria-hidden="true">{operator}</span>
        {rightDigits.map((d, i) => (
          <span className="colsum__digit" key={`b${i}`}>{d}</span>
        ))}

        {/* rule */}
        <span className="colsum__rule" />

        {/* answer row — one field per place */}
        <span className="colsum__gutter" aria-hidden="true" />
        {Array.from({ length: cols }, (_, i) => (
          <input
            key={`a${i}`}
            className="colsum__answer"
            inputMode="numeric"
            aria-label={`${ariaLabel}, ${placeName(i, cols)} place`}
            value={answer[i] ?? ""}
            onChange={(e) => handleAnswer(i, e.target.value)}
            autoComplete="off"
          />
        ))}
      </div>

      <div className="colsum__side">
        <span className="colsum__unit">{unit}</span>
        <button type="submit" className="btn btn--primary" disabled={!hasAnswer}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
