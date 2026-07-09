import { formatNumber } from "../domain";

/**
 * The right picture for multiplication: one small block per group, drawn for
 * real (128 blocks for 384 × 128), with a key showing what a single block is
 * worth. No bar comparison — the sheer count is the point. The page grows to fit.
 */
const MAX_BLOCKS = 300;

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
  const shown = Math.min(groupCount, MAX_BLOCKS);
  const remaining = groupCount - shown;

  return (
    <div
      className="groups"
      role="img"
      aria-label={
        hideTotal
          ? `${formatNumber(groupCount)} blocks, each one ${formatNumber(groupSize)} ${unit} ${groupNoun}.`
          : `${formatNumber(groupCount)} blocks, each one ${formatNumber(groupSize)} ${unit} ${groupNoun}, totalling ${formatNumber(total)} ${unit}.`
      }
    >
      <div className="groups__key" aria-hidden="true">
        <span className="groups__unit" />
        <span className="groups__keytext">
          = {formatNumber(groupSize)} {unit} (one {groupNoun})
        </span>
      </div>

      <div className="groups__grid" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <span className="groups__unit" key={i} />
        ))}
        {remaining > 0 && <span className="groups__more">+{formatNumber(remaining)} more</span>}
      </div>

      <p className="groups__total">
        {formatNumber(groupCount)} blocks = <b>{hideTotal ? "?" : formatNumber(total)}</b> {unit}
      </p>
    </div>
  );
}
