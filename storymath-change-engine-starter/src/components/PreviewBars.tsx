import { formatNumber } from "../domain";

/**
 * Aligned preview bars for additive operations (+/−), where the two magnitudes
 * are comparable. Multiplication/division use their own models, so there is no
 * scale-clamping here. When the attempted value is smaller than the reference,
 * the removed amount is shown on the bar as a dark-maroon dotted gap.
 */
export function PreviewBars({
  referenceLabel,
  referenceValue,
  attemptedLabel,
  attemptedValue,
  unit,
}: {
  referenceLabel: string;
  referenceValue: number;
  attemptedLabel: string;
  attemptedValue: number;
  unit: string;
}) {
  const max = Math.max(referenceValue, attemptedValue, 1);
  const refPct = (referenceValue / max) * 100;
  const attPct = (attemptedValue / max) * 100;
  const decreased = attemptedValue < referenceValue;
  const gap = referenceValue - attemptedValue;

  return (
    <>
      <span className="visually-hidden">
        {referenceLabel} is {formatNumber(referenceValue)} {unit}; {attemptedLabel} would be{" "}
        {formatNumber(attemptedValue)} {unit}.
      </span>
      <div className="preview" aria-hidden="true">
        <div className="preview__row">
          <span className="preview__name">{referenceLabel}</span>
          <span className="preview__track">
            <span className="preview__fill" style={{ width: `${refPct}%`, background: "var(--q-bigger)" }} />
          </span>
          <span className="preview__num">{formatNumber(referenceValue)}</span>
        </div>
        <div className="preview__row">
          <span className="preview__name">{attemptedLabel}</span>
          <span className="preview__track">
            <span
              className="preview__fill"
              style={{ width: `${attPct}%`, background: decreased ? "var(--q-smaller)" : "var(--q-whole)" }}
            />
            {decreased && (
              <span
                className="preview__gap"
                style={{ left: `${attPct}%`, width: `${refPct - attPct}%` }}
              >
                −{formatNumber(gap)}
              </span>
            )}
          </span>
          <span className="preview__num">{formatNumber(attemptedValue)}</span>
        </div>
      </div>
    </>
  );
}
