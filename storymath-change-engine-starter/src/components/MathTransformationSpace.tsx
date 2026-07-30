import { useMemo, useState } from "react";
import {
  formatNumber,
  type TransformationQuantity,
  type TransformationSpace,
  type TransformationStep,
} from "../domain";
import { EqualSharesModel } from "./EqualSharesModel";

function quantity(space: TransformationSpace, id: string): TransformationQuantity {
  const q = space.quantities.find((item) => item.id === id);
  if (!q) throw new Error(`Missing transformation quantity: ${id}`);
  return q;
}

function maxValueForSpace(space: TransformationSpace): number {
  return Math.max(1, ...space.quantities.map((q) => q.value));
}

function barWidth(value: number, maxValue: number, maxWidth: number): number {
  return Math.max(28, (value / maxValue) * maxWidth);
}

function ModeButton<T extends string | number>({
  value,
  active,
  children,
  onSelect,
}: {
  value: T;
  active: boolean;
  children: React.ReactNode;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      className={`mts-toggle__button${active ? " mts-toggle__button--active" : ""}`}
      aria-pressed={active}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}

function QuantityRail({
  space,
  selectedQuantityId,
  onSelect,
  compact = false,
}: {
  space: TransformationSpace;
  selectedQuantityId: string | null;
  onSelect: (id: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`mts-quantities${compact ? " mts-quantities--key" : ""}`} aria-label="Color key">
      {space.quantities.map((q) => (
        <button
          key={q.id}
          type="button"
          className={`mts-quantity${selectedQuantityId === q.id ? " mts-quantity--active" : ""}`}
          style={{
            ["--mts-color" as string]: q.color,
            opacity: selectedQuantityId && selectedQuantityId !== q.id ? 0.42 : 0.9,
          }}
          onClick={() => onSelect(selectedQuantityId === q.id ? null : q.id)}
          aria-pressed={selectedQuantityId === q.id}
        >
          <span className="mts-quantity__swatch" aria-hidden="true" />
          <span className="mts-quantity__label">{q.label}</span>
          <span className="mts-quantity__value">
            {formatNumber(q.value)} {q.unit}
          </span>
        </button>
      ))}
    </div>
  );
}

function BarValue({
  x,
  y,
  value,
  prefix = "",
}: {
  x: number;
  y: number;
  value: number;
  prefix?: string;
}) {
  return (
    <text x={x + 12} y={y + 23} className="mts-svg-value mts-svg-value--inside">
      {prefix}{formatNumber(value)}
    </text>
  );
}

function BarCaption({
  x,
  y,
  label,
  color,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
}) {
  return (
    <text x={x} y={y} className="mts-svg-caption" style={{ fill: color }}>
      {label}
    </text>
  );
}

function SubtractionScene({
  space,
  step,
  maxValue,
  selectedQuantityId,
  onSelectQuantity,
}: {
  space: TransformationSpace;
  step: TransformationStep;
  maxValue: number;
  selectedQuantityId: string | null;
  onSelectQuantity: (id: string) => void;
}) {
  if (!step.referenceWhole) return null;
  const ref = step.referenceWhole;
  const whole = quantity(space, ref.wholeQuantityId);
  const removed = quantity(space, ref.removedQuantityId);
  const remainder = quantity(space, ref.remainderQuantityId);
  const x = 110;
  const y = 44;
  const maxWidth = 560;
  const height = 32;
  const rowGap = 60;
  const wholeWidth = barWidth(ref.wholeValue, maxValue, maxWidth);
  const remainderWidth = barWidth(ref.remainderValue, maxValue, maxWidth);
  const removedWidth = Math.max(28, wholeWidth - remainderWidth);
  const removedX = x + remainderWidth;
  const dim = (id: string) => selectedQuantityId && selectedQuantityId !== id;

  return (
    <svg
      className="mts-scene"
      viewBox="0 0 760 230"
      role="img"
      aria-label={`${step.prompt} ${step.equation}. Reference invariant: ${ref.invariant}.`}
    >
      <rect
        x={x}
        y={y}
        width={wholeWidth}
        height={height}
        rx={7}
        data-bar-role="whole"
        data-quantity-id={whole.id}
        className="mts-solid-reference"
        style={{ fill: whole.color, opacity: dim(whole.id) ? 0.34 : 0.9 }}
        onClick={() => onSelectQuantity(whole.id)}
      />
      <BarValue x={x} y={y} value={whole.value} />
      <BarCaption x={x} y={y + height + 20} label={whole.label} color={whole.color} />

      <rect
        x={removedX}
        y={y - 3}
        width={removedWidth}
        height={height + 6}
        rx={7}
        data-bar-role="removed-reference"
        data-quantity-id={removed.id}
        className="mts-removed-reference"
        style={{ stroke: removed.color, opacity: dim(removed.id) ? 0.28 : 0.86 }}
        onClick={() => onSelectQuantity(removed.id)}
      />

      <g transform={`translate(0 ${rowGap})`}>
        <rect
          x={removedX}
          y={y}
          width={removedWidth}
          height={height}
          rx={7}
          data-bar-role="removed-row"
          data-quantity-id={removed.id}
          style={{ fill: removed.color, opacity: dim(removed.id) ? 0.34 : 0.94 }}
          onClick={() => onSelectQuantity(removed.id)}
        />
        <BarValue x={removedX} y={y} value={removed.value} prefix="-" />
        <BarCaption x={removedX} y={y + height + 20} label={removed.label} color={removed.color} />
      </g>

      <g transform={`translate(0 ${rowGap * 2})`}>
        <rect
          x={x}
          y={y}
          width={remainderWidth}
          height={height}
          rx={7}
          data-bar-role="remainder"
          data-quantity-id={remainder.id}
          style={{ fill: remainder.color, opacity: dim(remainder.id) ? 0.34 : 0.94 }}
          onClick={() => onSelectQuantity(remainder.id)}
        />
        <BarValue x={x} y={y} value={remainder.value} />
        <BarCaption x={x} y={y + height + 20} label={remainder.label} color={remainder.color} />
      </g>
    </svg>
  );
}

function AdditionScene({
  space,
  step,
  maxValue,
  selectedQuantityId,
  onSelectQuantity,
}: {
  space: TransformationSpace;
  step: TransformationStep;
  maxValue: number;
  selectedQuantityId: string | null;
  onSelectQuantity: (id: string) => void;
}) {
  if (!step.partWhole) return null;
  const ref = step.partWhole;
  const left = quantity(space, ref.partQuantityIds[0]);
  const right = quantity(space, ref.partQuantityIds[1]);
  const whole = quantity(space, ref.wholeQuantityId);
  const x = 110;
  const y = 44;
  const maxWidth = 560;
  const height = 32;
  const rowGap = 60;
  const leftWidth = barWidth(ref.partValues[0], maxValue, maxWidth);
  const rightWidth = barWidth(ref.partValues[1], maxValue, maxWidth);
  const wholeWidth = barWidth(ref.wholeValue, maxValue, maxWidth);
  const rightX = x + leftWidth;
  const dim = (id: string) => selectedQuantityId && selectedQuantityId !== id;

  return (
    <svg
      className="mts-scene"
      viewBox="0 0 760 230"
      role="img"
      aria-label={`${step.prompt} ${step.equation}. Part-whole invariant: ${ref.invariant}.`}
    >
      <rect
        x={x}
        y={y}
        width={leftWidth}
        height={height}
        rx={7}
        data-bar-role="part-left"
        data-quantity-id={left.id}
        style={{ fill: left.color, opacity: dim(left.id) ? 0.34 : 0.94 }}
        onClick={() => onSelectQuantity(left.id)}
      />
      <BarValue x={x} y={y} value={left.value} />
      <BarCaption x={x} y={y + height + 20} label={left.label} color={left.color} />

      <g transform={`translate(0 ${rowGap})`}>
        <rect
          x={rightX}
          y={y}
          width={rightWidth}
          height={height}
          rx={7}
          data-bar-role="part-right"
          data-quantity-id={right.id}
          style={{ fill: right.color, opacity: dim(right.id) ? 0.34 : 0.94 }}
          onClick={() => onSelectQuantity(right.id)}
        />
        <BarValue x={rightX} y={y} value={right.value} prefix="+" />
        <BarCaption x={rightX} y={y + height + 20} label={right.label} color={right.color} />
      </g>

      <g transform={`translate(0 ${rowGap * 2})`}>
        <rect
          x={x}
          y={y}
          width={wholeWidth}
          height={height}
          rx={7}
          data-bar-role="combined-whole"
          data-quantity-id={whole.id}
          style={{ fill: whole.color, opacity: dim(whole.id) ? 0.34 : 0.94 }}
          onClick={() => onSelectQuantity(whole.id)}
        />
        <BarValue x={x} y={y} value={whole.value} />
        <BarCaption x={x} y={y + height + 20} label={whole.label} color={whole.color} />
      </g>
    </svg>
  );
}

function MultiplicationScene({
  space,
  step,
  selectedQuantityId,
  onSelectQuantity,
}: {
  space: TransformationSpace;
  step: TransformationStep;
  selectedQuantityId: string | null;
  onSelectQuantity: (id: string) => void;
}) {
  if (!step.equalGroups) return null;
  const ref = step.equalGroups;
  const groups = quantity(space, ref.groupsQuantityId);
  const itemsPerGroup = quantity(space, ref.itemsPerGroupQuantityId);
  const total = quantity(space, ref.totalQuantityId);
  const factors = [
    { quantity: groups, value: ref.groupsValue },
    { quantity: itemsPerGroup, value: ref.itemsPerGroupValue },
  ];
  const [columnsFactor, rowsFactor] = [...factors].sort((a, b) => b.value - a.value);
  const columns = Math.max(1, Math.round(columnsFactor!.value));
  const rows = Math.max(1, Math.round(rowsFactor!.value));
  const gridX = 48;
  const gridY = 64;
  const maxGridWidth = 690;
  const maxGridHeight = 224;
  const gap = columns > 48 || rows > 24 ? 1 : 3;
  const cell = Math.max(
      3,
      Math.min(
      24,
      (maxGridWidth - Math.max(0, columns - 1) * gap) / columns,
      (maxGridHeight - Math.max(0, rows - 1) * gap) / rows,
    ),
  );
  const gridWidth = columns * cell + Math.max(0, columns - 1) * gap;
  const gridHeight = rows * cell + Math.max(0, rows - 1) * gap;
  const drawnGridX = gridWidth < maxGridWidth * 0.72 ? gridX + (maxGridWidth - gridWidth) / 2 : gridX;
  const dimTotal = selectedQuantityId && selectedQuantityId !== total.id;
  const cells = Array.from({ length: rows * columns }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
  }));

  return (
    <svg
      className="mts-scene mts-scene--array"
      viewBox="0 0 760 320"
      role="img"
      aria-label={`${step.prompt} ${step.equation}. Array model: ${formatNumber(columns)} ${columnsFactor!.quantity.label} by ${formatNumber(rows)} ${rowsFactor!.quantity.label} make ${formatNumber(total.value)} ${total.unit}. Equal-groups invariant: ${ref.invariant}.`}
    >
      <text
        x={drawnGridX + gridWidth / 2}
        y={44}
        className="mts-array-axis mts-array-axis--columns"
        style={{ fill: columnsFactor!.quantity.color }}
        onClick={() => onSelectQuantity(columnsFactor!.quantity.id)}
      >
        {formatNumber(columns)} {columnsFactor!.quantity.label}
      </text>
      <text
        x={drawnGridX + gridWidth + 18}
        y={gridY + gridHeight / 2}
        className="mts-array-axis mts-array-axis--rows"
        style={{ fill: rowsFactor!.quantity.color }}
        onClick={() => onSelectQuantity(rowsFactor!.quantity.id)}
      >
        {formatNumber(rows)} {rowsFactor!.quantity.label}
      </text>

      <g
        data-bar-role="product-array"
        data-quantity-id={total.id}
        style={{ opacity: dimTotal ? 0.34 : 0.96 }}
        onClick={() => onSelectQuantity(total.id)}
      >
        {cells.map(({ column, row }) => (
          <rect
            key={`${row}-${column}`}
            x={drawnGridX + column * (cell + gap)}
            y={gridY + row * (cell + gap)}
            width={cell}
            height={cell}
            rx={Math.min(3, cell / 4)}
            data-bar-role="array-cell"
            data-quantity-id={total.id}
            className="mts-array-cell"
            style={{ fill: total.color }}
          />
        ))}
      </g>

      <text x={drawnGridX} y={gridY + gridHeight + 34} className="mts-svg-value" style={{ fill: total.color }}>
        {formatNumber(total.value)}
      </text>
      <text x={drawnGridX + 68} y={gridY + gridHeight + 34} className="mts-svg-caption" style={{ fill: total.color }}>
        {total.label}
      </text>
    </svg>
  );
}

function DivisionScene({
  space,
  step,
}: {
  space: TransformationSpace;
  step: TransformationStep;
}) {
  if (!step.division) return null;
  const ref = step.division;
  const total = quantity(space, ref.totalQuantityId);
  const divisor = quantity(space, ref.divisorQuantityId);
  const quotient = quantity(space, ref.quotientQuantityId);

  return (
    <div className="mts-division-scene mts-division-scene--shares">
      <EqualSharesModel
        dividend={total.value}
        divisor={divisor.value}
        unit={total.unit}
        unitColor={divisor.color}
        groupColor={quotient.color}
        columnLabel={divisor.label}
        rowLabel={quotient.label}
      />
    </div>
  );
}

function canRenderStep(step: TransformationStep): boolean {
  return Boolean(step.referenceWhole || step.partWhole || step.equalGroups || step.division);
}

function TransformationSteps({
  space,
  selectedQuantityId,
  onSelectQuantity,
}: {
  space: TransformationSpace;
  selectedQuantityId: string | null;
  onSelectQuantity: (id: string) => void;
}) {
  const maxValue = useMemo(() => maxValueForSpace(space), [space]);
  const renderableSteps = space.steps.filter(canRenderStep);
  if (renderableSteps.length === 0) return null;

  return (
    <div className="mts-scenes" aria-label="Proportional transformation steps">
      {renderableSteps.map((step, index) => (
        <section key={step.id} className="mts-step-card" aria-label={`Step ${index + 1}`}>
          <div className="mts-step-card__header">
            <span>Step {index + 1}</span>
            <strong>{step.equation}</strong>
          </div>
          {step.referenceWhole ? (
            <SubtractionScene
              space={space}
              step={step}
              maxValue={maxValue}
              selectedQuantityId={selectedQuantityId}
              onSelectQuantity={onSelectQuantity}
            />
          ) : step.partWhole ? (
            <AdditionScene
              space={space}
              step={step}
              maxValue={maxValue}
              selectedQuantityId={selectedQuantityId}
              onSelectQuantity={onSelectQuantity}
            />
          ) : step.equalGroups ? (
            <MultiplicationScene
              space={space}
              step={step}
              selectedQuantityId={selectedQuantityId}
              onSelectQuantity={onSelectQuantity}
            />
          ) : (
            <DivisionScene
              space={space}
              step={step}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mts-timeline" aria-label="Story timeline">
      <span className="eyebrow">Story timeline</span>
      <ol>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>
            <span>{index + 1}</span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StoryRail({
  space,
  timeline,
  selectedQuantityId,
  onSelectQuantity,
  showColorKey,
}: {
  space: TransformationSpace;
  timeline: string[];
  selectedQuantityId: string | null;
  onSelectQuantity: (id: string | null) => void;
  showColorKey: boolean;
}) {
  return (
    <aside className="mts-story-rail">
      <Timeline items={timeline} />
      {showColorKey && (
        <div className="mts-color-key">
          <span className="eyebrow">Color key</span>
          <QuantityRail
            space={space}
            selectedQuantityId={selectedQuantityId}
            onSelect={onSelectQuantity}
            compact
          />
        </div>
      )}
    </aside>
  );
}

export function MathTransformationFigure({
  space,
}: {
  space: TransformationSpace;
}) {
  const [selectedQuantityId, setSelectedQuantityId] = useState<string | null>(null);
  return (
    <div className="mts-figure">
      <TransformationSteps
        space={space}
        selectedQuantityId={selectedQuantityId}
        onSelectQuantity={setSelectedQuantityId}
      />
    </div>
  );
}

export function MathTransformationSpace({
  spaces,
  embedded = false,
  timeline = [],
}: {
  spaces: TransformationSpace[];
  embedded?: boolean;
  timeline?: string[];
}) {
  const [spaceIndex, setSpaceIndex] = useState(0);
  const [selectedQuantityId, setSelectedQuantityId] = useState<string | null>(null);
  const space = spaces[spaceIndex]!;
  const showProblemSwitch = !embedded && spaces.length > 1;
  const Wrapper = embedded ? "div" : "main";

  const setProblemIndex = (index: number) => {
    setSpaceIndex(index);
    setSelectedQuantityId(null);
  };

  return (
    <Wrapper className={`${embedded ? "mts mts--embedded" : "app-shell mts"}`}>
      {!embedded && (
        <>
          <header className="masthead">
            <a className="brand brand--link mts-back" href="#" aria-label="Back to the problem menu">
              <span className="brand__title">StoryMath</span>
            </a>
            <span className="masthead__progress">Prototype</span>
          </header>

          <section className="brief">
            <span className="eyebrow">Abstract quantitative model</span>
            <h1 className="brief__title">Math Transformation Space</h1>
            <p className="brief__story">{space.story}</p>
          </section>
        </>
      )}

      {showProblemSwitch && (
        <div className="mts-toolbar" aria-label="Transformation controls">
          <div className="mts-toggle" role="group" aria-label="Problem">
            {spaces.map((item, index) => (
              <ModeButton key={item.id} value={index} active={index === spaceIndex} onSelect={setProblemIndex}>
                {item.title}
              </ModeButton>
            ))}
          </div>
        </div>
      )}

      <section className="mts-stage" aria-label="Math transformation space">
        <div className="mts-stage__header">
          <div>
            <span className="eyebrow">Transformation space</span>
            <h2 className="stage-title">Problem overview</h2>
          </div>
        </div>

        {!embedded && (
          <QuantityRail
            space={space}
            selectedQuantityId={selectedQuantityId}
            onSelect={setSelectedQuantityId}
          />
        )}

        <div className="mts-overview-grid">
          <StoryRail
            space={space}
            timeline={timeline}
            selectedQuantityId={selectedQuantityId}
            onSelectQuantity={setSelectedQuantityId}
            showColorKey={embedded}
          />
          <TransformationSteps
            space={space}
            selectedQuantityId={selectedQuantityId}
            onSelectQuantity={setSelectedQuantityId}
          />
        </div>
      </section>
    </Wrapper>
  );
}
