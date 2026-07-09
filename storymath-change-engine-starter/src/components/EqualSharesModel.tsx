import { formatNumber } from "../domain";

/**
 * The picture for division (equal sharing): the same little blocks as the
 * multiplication grid, but gathered into a row of outlined bins that each hold
 * the same number. Whatever will not divide evenly sits outside the bins under a
 * quiet "remainder N" note. The point is to SEE the split, not to be pixel-exact,
 * so very large splits are drawn representatively (a "+N more" marker stands in
 * for the rest). The page grows to fit.
 */
const MAX_BINS = 12;
const MAX_PER_BIN = 24;
const MAX_LOOSE = 60;

export function EqualSharesModel({
  dividend,
  divisor,
  unit,
  groupNoun,
}: {
  /** The whole amount being shared out. */
  dividend: number;
  /** How many equal groups it is shared into. */
  divisor: number;
  unit: string;
  groupNoun: string;
}) {
  const binCount = Math.max(1, Math.round(divisor));
  const perBin = Math.max(0, Math.floor(dividend / binCount));
  const remainder = Math.max(0, Math.round(dividend - binCount * perBin));

  const binsShown = Math.min(binCount, MAX_BINS);
  const moreBins = binCount - binsShown;
  const perBinShown = Math.min(perBin, MAX_PER_BIN);
  const morePerBin = perBin - perBinShown;
  const looseShown = Math.min(remainder, MAX_LOOSE);
  const moreLoose = remainder - looseShown;

  return (
    <div
      className="shares"
      role="img"
      aria-label={
        `Sharing ${formatNumber(dividend)} ${unit} into ${formatNumber(binCount)} ` +
        `${groupNoun} groups: ${formatNumber(perBin)} in each` +
        (remainder > 0 ? `, with ${formatNumber(remainder)} left over.` : ".")
      }
    >
      <div className="shares__bins" aria-hidden="true">
        {Array.from({ length: binsShown }, (_, i) => (
          <div className="shares__bin" key={i}>
            {Array.from({ length: perBinShown }, (_, j) => (
              <span className="groups__unit" key={j} />
            ))}
            {morePerBin > 0 && <span className="shares__plus">+{formatNumber(morePerBin)}</span>}
          </div>
        ))}
        {moreBins > 0 && (
          <span className="shares__morebins">+{formatNumber(moreBins)} more {groupNoun} groups</span>
        )}
      </div>

      {remainder > 0 && (
        <div className="shares__remainder">
          <div className="shares__loose" aria-hidden="true">
            {Array.from({ length: looseShown }, (_, i) => (
              <span className="groups__unit groups__unit--loose" key={i} />
            ))}
            {moreLoose > 0 && <span className="shares__plus">+{formatNumber(moreLoose)}</span>}
          </div>
          <span className="shares__note">remainder {formatNumber(remainder)}</span>
        </div>
      )}
    </div>
  );
}
