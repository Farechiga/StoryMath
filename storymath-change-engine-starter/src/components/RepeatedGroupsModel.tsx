import { formatNumber } from "../domain";

/**
 * The right picture for multiplication: small products show actual units inside
 * lassoed equal groups; large products collapse to one block per group with a
 * key showing each block's value. No bar comparison — the repeated structure is
 * the point. The page grows to fit.
 */
const MAX_UNIT_BARS = 200;
const MAX_COMPRESSED_BLOCKS = 300;
const MAX_ZOOM_UNITS = 200;

export function RepeatedGroupsModel({
  groupSize,
  groupCount,
  total,
  unit,
  groupNoun,
  hideTotal = false,
}: {
  groupSize: number;
  groupCount: number;
  total: number;
  unit: string;
  groupNoun: string;
  /** Show the structure but not the product — so the child still computes it. */
  hideTotal?: boolean;
}) {
  const normalizedGroupCount = Math.max(0, Math.round(groupCount));
  const normalizedGroupSize = Math.max(0, Math.round(groupSize));
  const unitTotal = normalizedGroupCount * normalizedGroupSize;
  const showUnitGroups = unitTotal > 0 && unitTotal <= MAX_UNIT_BARS;
  const zoomUnitsShown = Math.min(normalizedGroupSize, MAX_ZOOM_UNITS);
  const zoomUnitsRemaining = normalizedGroupSize - zoomUnitsShown;
  const zoomColumns = Math.min(16, Math.max(6, Math.ceil(Math.sqrt(zoomUnitsShown))));
  const shown = Math.min(normalizedGroupCount, MAX_COMPRESSED_BLOCKS);
  const remaining = normalizedGroupCount - shown;

  return (
    <div
      className="groups"
      role="img"
      aria-label={
        showUnitGroups
          ? hideTotal
            ? `${formatNumber(normalizedGroupCount)} groups of ${formatNumber(normalizedGroupSize)} ${unit}.`
            : `${formatNumber(normalizedGroupCount)} groups of ${formatNumber(normalizedGroupSize)} ${unit}, totalling ${formatNumber(total)} ${unit}.`
          : hideTotal
            ? `${formatNumber(groupCount)} blocks, each one ${formatNumber(groupSize)} ${unit} ${groupNoun}.`
            : `${formatNumber(groupCount)} blocks, each one ${formatNumber(groupSize)} ${unit} ${groupNoun}, totalling ${formatNumber(total)} ${unit}.`
      }
    >
      {showUnitGroups ? (
        <div className="groups__key" aria-hidden="true">
          <span className="groups__unit" />
          <span className="groups__keytext">= 1 {unit}</span>
        </div>
      ) : (
        <div className="groups__zoom-key" aria-hidden="true">
          <div className="groups__zoom-source">
            <span className="groups__unit" />
            <span className="groups__keytext">
              = {formatNumber(groupSize)} {unit}
            </span>
          </div>
          <div className="groups__zoom-fan">
            <span className="groups__zoom-line groups__zoom-line--top" />
            <span className="groups__zoom-line groups__zoom-line--bottom" />
          </div>
          <div className="groups__zoom-tile" style={{ gridTemplateColumns: `repeat(${zoomColumns}, 16px)` }}>
            {Array.from({ length: zoomUnitsShown }, (_, unitIndex) => (
              <span className="groups__zoom-unit" key={unitIndex} />
            ))}
            {zoomUnitsRemaining > 0 && <span className="groups__zoom-more">+{formatNumber(zoomUnitsRemaining)}</span>}
          </div>
        </div>
      )}

      {showUnitGroups ? (
        <div className="groups__grid groups__grid--lassoed" aria-hidden="true">
          {Array.from({ length: normalizedGroupCount }, (_, groupIndex) => (
            <span className="groups__lasso" key={groupIndex}>
              {Array.from({ length: normalizedGroupSize }, (_, unitIndex) => (
                <span className="groups__unit" key={unitIndex} />
              ))}
            </span>
          ))}
        </div>
      ) : (
        <div className="groups__grid" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            <span className="groups__unit" key={i} />
          ))}
          {remaining > 0 && <span className="groups__more">+{formatNumber(remaining)} more</span>}
        </div>
      )}

      <p className="groups__total">
        {showUnitGroups ? (
          <>
            {formatNumber(normalizedGroupCount)} groups × {formatNumber(normalizedGroupSize)} {unit} ={" "}
            <b>{hideTotal ? "?" : formatNumber(total)}</b> {unit}
          </>
        ) : (
          <>
            {formatNumber(groupCount)} blocks = <b>{hideTotal ? "?" : formatNumber(total)}</b> {unit}
          </>
        )}
      </p>
    </div>
  );
}
