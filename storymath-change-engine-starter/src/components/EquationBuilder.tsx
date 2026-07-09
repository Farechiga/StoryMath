import { formatNumber } from "../domain";
import type { Operator, Quantity } from "../domain";

/**
 * The relationship is pre-assembled — the two operands are guided into their
 * semantic slots automatically (there is no real choice in placing them), so the
 * child's one decision here is the operator:
 *   [ Monday distance · 384 m ] [ op ] [ Tuesday shorter by · 128 m ] = [ Tuesday · ? ]
 */

const ROLE_ACCENT: Record<string, string> = {
  bigger: "var(--q-bigger)",
  smaller: "var(--q-smaller)",
  difference: "var(--q-difference)",
  whole: "var(--q-whole)",
};
export const accentFor = (role?: string): string =>
  (role ? ROLE_ACCENT[role] : undefined) ?? "var(--accent)";

function Tile({ quantity, unknown = false }: { quantity: Quantity; unknown?: boolean }) {
  const style = { ["--tile-accent" as string]: accentFor(quantity.semanticRole) };
  return (
    <span className={`tile${unknown ? " tile--target" : ""}`} style={style}>
      <span className="tile__name">{quantity.label.compact}</span>
      <span className="tile__value">
        {unknown ? "?" : formatNumber(quantity.value)}
        <small>{quantity.unit}</small>
      </span>
    </span>
  );
}

export function EquationBuilder({
  leftQuantity,
  rightQuantity,
  targetQuantity,
  selectedOperator,
  operatorOptions,
  triedOperators,
  locked = false,
  onSelectOperator,
}: {
  leftQuantity: Quantity;
  rightQuantity: Quantity;
  targetQuantity: Quantity;
  selectedOperator?: Operator;
  operatorOptions: Operator[];
  triedOperators: Operator[];
  locked?: boolean;
  onSelectOperator: (op: Operator) => void;
}) {
  return (
    <div className="builder">
      <div className="eqline" role="group" aria-label="The relationship you are testing">
        <Tile quantity={leftQuantity} />
        {/* Empty until an operator is chosen: a dotted placeholder box, not a
            character (a low bar / underscore reads as a minus sign). */}
        <span className={`eqline__op${selectedOperator ? " eqline__op--set" : ""}`} aria-hidden="true">
          {selectedOperator}
        </span>
        <Tile quantity={rightQuantity} />
        <span className="eqline__eq" aria-hidden="true">=</span>
        <Tile quantity={targetQuantity} unknown />
      </div>

      <div className="op-picker" role="group" aria-label="Choose an operation to try">
        {operatorOptions.map((op) => {
          const cls = [
            "op-btn",
            selectedOperator === op ? "op-btn--selected" : "",
            triedOperators.includes(op) ? "op-btn--tried" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={op}
              type="button"
              className={cls}
              disabled={locked}
              aria-pressed={selectedOperator === op}
              aria-label={`Try ${op}`}
              onClick={() => onSelectOperator(op)}
            >
              {op}
            </button>
          );
        })}
      </div>
      {!selectedOperator && (
        <p className="hint-inline">Choose an operation to see what it does.</p>
      )}
    </div>
  );
}
