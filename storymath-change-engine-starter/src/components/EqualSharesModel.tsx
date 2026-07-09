import { formatNumber } from "../domain";

/**
 * The picture for division: the same little blocks as the multiplication grid,
 * but bundled into full groups. Each complete group of `divisor` blocks gets its
 * own outlined bin, the bins stack vertically, and whatever is left over sits on
 * a final row (no bin) beside a light-grey "remainder = N" note. So 384 ÷ 128
 * reads as three groups of 128, not 128 tiny bins.
 *
 * The groups are always described generically as "groups" (never the story's
 * noun): dividing "tracks into tracks" is nonsensical, so the point is only to
 * show the split. `tone="wrong"` outlines the groups in dark red for a wrong
 * operator being tried; `tone="fit"` (default) is green for a real division.
 */
const MAX_BINS = 12; // full groups drawn before the rest collapse to "+N more"
const MAX_PER_BIN = 150; // blocks drawn inside one group before "+N"
const MAX_LOOSE = 120; // remainder blocks drawn before "+N"
const TOTAL_CAP = 480; // overall block budget, spread across the drawn bins

export function EqualSharesModel({
  dividend,
  divisor,
  unit,
  tone = "fit",
}: {
  /** The whole amount being divided up. */
  dividend: number;
  /** The size of each equal group. */
  divisor: number;
  unit: string;
  /** "wrong" outlines the groups in red (a wrong operator); "fit" is green. */
  tone?: "fit" | "wrong";
}) {
  const groupSize = Math.max(1, Math.round(divisor));
  const fullGroups = Math.max(0, Math.floor(dividend / groupSize));
  const remainder = Math.max(0, Math.round(dividend - fullGroups * groupSize));

  const binsShown = Math.min(fullGroups, MAX_BINS);
  const moreBins = fullGroups - binsShown;
  // Keep the drawn total within budget so a big group count stays legible.
  const perBinCap = Math.min(MAX_PER_BIN, Math.max(6, Math.floor(TOTAL_CAP / Math.max(1, binsShown))));
  const perBinShown = Math.min(groupSize, perBinCap);
  const morePerBin = groupSize - perBinShown;
  const looseShown = Math.min(remainder, MAX_LOOSE);
  const moreLoose = remainder - looseShown;

  return (
    <div
      className={`shares${tone === "wrong" ? " shares--wrong" : ""}`}
      role="img"
      aria-label={
        `${formatNumber(dividend)} ${unit} in groups of ${formatNumber(groupSize)}: ` +
        `${formatNumber(fullGroups)} full group${fullGroups === 1 ? "" : "s"}` +
        (remainder > 0 ? ", with some left over." : ".")
      }
    >
      {binsShown > 0 && (
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
            <span className="shares__morebins">+{formatNumber(moreBins)} more groups</span>
          )}
        </div>
      )}

      {remainder > 0 && (
        <div className="shares__remainder" aria-hidden="true">
          <div className="shares__loose">
            {Array.from({ length: looseShown }, (_, i) => (
              <span className="groups__unit" key={i} />
            ))}
            {moreLoose > 0 && <span className="shares__plus">+{formatNumber(moreLoose)}</span>}
          </div>
          <span className="shares__note">remainder = {formatNumber(remainder)}</span>
        </div>
      )}
    </div>
  );
}
