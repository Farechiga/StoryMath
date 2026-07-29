import { formatNumber, numbersEqual } from "./calculate";
import { getEquationForm } from "./relationships";
import type { Operator, ProblemInstance, ProblemStep, Quantity } from "./types";

export type TransformationRelationshipType =
  | "remove-from-whole"
  | "combine"
  | "compare"
  | "equal-groups"
  | "partition";

export type TransformationVisualModel =
  | "subtraction_span"
  | "part_whole_bar"
  | "comparison_gap_bar"
  | "groups"
  | "shares";

export interface TransformationQuantity {
  id: string;
  value: number;
  unit: string;
  label: string;
  storyLabel: string;
  semanticRole: string;
  color: string;
  source: "given" | "derived";
  firstVisibleState: number;
}

export interface TransformationSegment {
  quantityId: string;
  value: number;
  startRatio: number;
  widthRatio: number;
  semanticRole: "remainder" | "removed" | "part" | "whole" | "group" | "itemsPerGroup";
}

export interface ReferenceWholeMetadata {
  wholeQuantityId: string;
  removedQuantityId: string;
  remainderQuantityId: string;
  wholeValue: number;
  removedValue: number;
  remainderValue: number;
  segments: TransformationSegment[];
  invariant: string;
}

export interface PartWholeMetadata {
  wholeQuantityId: string;
  partQuantityIds: [string, string];
  wholeValue: number;
  partValues: [number, number];
  segments: TransformationSegment[];
  invariant: string;
}

export interface EqualGroupsMetadata {
  groupsQuantityId: string;
  itemsPerGroupQuantityId: string;
  totalQuantityId: string;
  groupsValue: number;
  itemsPerGroupValue: number;
  totalValue: number;
  segments: TransformationSegment[];
  invariant: string;
}

export interface DivisionMetadata {
  totalQuantityId: string;
  divisorQuantityId: string;
  quotientQuantityId: string;
  divisorRole: "groups" | "itemsPerGroup";
  quotientRole: "groups" | "itemsPerGroup";
  totalValue: number;
  divisorValue: number;
  quotientValue: number;
  segments: TransformationSegment[];
  invariant: string;
}

export interface TransformationStep {
  id: string;
  order: number;
  prompt: string;
  relationshipType: TransformationRelationshipType;
  operator: Operator;
  inputQuantityIds: string[];
  outputQuantityId: string;
  visualModel: TransformationVisualModel;
  equation: string;
  stateRange: {
    reference: number;
    result: number;
  };
  referenceWhole?: ReferenceWholeMetadata;
  partWhole?: PartWholeMetadata;
  equalGroups?: EqualGroupsMetadata;
  division?: DivisionMetadata;
}

export type TransformationPhase = "reference" | "result";

export interface TransformationState {
  index: number;
  phase: TransformationPhase;
  label: string;
  stepId?: string;
  stepOrder?: number;
}

export interface TransformationSpace {
  id: string;
  title: string;
  story: string;
  quantities: TransformationQuantity[];
  steps: TransformationStep[];
  states: TransformationState[];
  targetQuantityId: string;
  unit: string;
  maxStateIndex: number;
}

const TRANSFORMATION_COLORS = {
  start: "#4C63D7",
  firstOperand: "#427EA5",
  secondOperand: "#92B6A0",
  addFirst: "#0054DA",
  subtractFirst: "#9562D1",
  addAfterSubtract: "#374F89",
  subtractAfterSubtract: "#964485",
  divideFirst: "#7185DA",
  multiplyFirst: "#3B3598",
  addAfterAdd: "#3E737F",
  subtractAfterAdd: "#3B3598",
  divideAfterSubtract: "#8291C5",
  multiplyAfterSubtract: "#3B3598",
  addAfterDivide: "#0054DA",
  subtractAfterDivide: "#9562D1",
  divideAfterDivide: "#8291C5",
  multiplyAfterDivide: "#3B3598",
  addAfterMultiply: "#3B3598",
  subtractAfterMultiply: "#7E3970",
  divideAfterMultiply: "#4C63D7",
  multiplyAfterMultiply: "#4500B2",
} as const;

const QUANTITY_COLORS = [
  TRANSFORMATION_COLORS.start,
  TRANSFORMATION_COLORS.firstOperand,
  TRANSFORMATION_COLORS.subtractFirst,
  TRANSFORMATION_COLORS.secondOperand,
  TRANSFORMATION_COLORS.subtractAfterSubtract,
  TRANSFORMATION_COLORS.addAfterSubtract,
];

function quantityMap(problem: ProblemInstance): Map<string, Quantity> {
  return new Map(problem.quantities.map((q) => [q.id, q]));
}

function stateForQuantity(quantity: Quantity, includedSteps: ProblemStep[]): number {
  const producingStepIndex = includedSteps.findIndex((s) => s.goalQuantityId === quantity.id);
  if (producingStepIndex >= 0) return producingStepIndex;
  if (quantity.visibility === "given") return 0;
  return Math.max(0, includedSteps.length - 1);
}

function relationshipTypeForStep(step: ProblemStep): TransformationRelationshipType {
  const hinted = step.visualization?.relationshipType;
  if (hinted === "remove-from-whole" || hinted === "combine" || hinted === "compare") return hinted;

  const form = getEquationForm(step.preferredEquationFormId);
  if (form.operator === "-" && step.relationshipTemplateId === "additive_comparison_decrease") return "compare";
  if (form.operator === "-") return "remove-from-whole";
  if (form.operator === "+") return "combine";
  if (form.operator === "×") return "equal-groups";
  return "partition";
}

function visualModelForStep(step: ProblemStep, relationshipType: TransformationRelationshipType): TransformationVisualModel {
  const hinted = step.visualization?.visualModel;
  if (hinted === "subtraction_span") return "subtraction_span";
  if (hinted === "part_whole_bar" || hinted === "comparison_gap_bar") return hinted;
  if (relationshipType === "remove-from-whole") return "subtraction_span";
  if (relationshipType === "compare") return "comparison_gap_bar";
  if (relationshipType === "combine") return "part_whole_bar";
  if (relationshipType === "equal-groups") return "groups";
  return "shares";
}

function idsForRemoveFromWhole(step: ProblemStep): {
  wholeQuantityId: string;
  removedQuantityId: string;
  remainderQuantityId: string;
} {
  const form = getEquationForm(step.preferredEquationFormId);
  const roleMap = step.roleToQuantityId;
  const wholeRole = step.visualization?.referenceWholeRole ?? form.leftRole;
  const removedRole = step.visualization?.removedRole ?? form.rightRole;
  const remainderRole = step.visualization?.remainderRole ?? form.resultRole;

  const wholeQuantityId = roleMap[wholeRole];
  const removedQuantityId = roleMap[removedRole];
  const remainderQuantityId = roleMap[remainderRole];
  if (!wholeQuantityId || !removedQuantityId || !remainderQuantityId) {
    throw new Error(`Step "${step.id}" cannot resolve remove-from-whole roles.`);
  }
  return { wholeQuantityId, removedQuantityId, remainderQuantityId };
}

function buildReferenceWhole(
  step: ProblemStep,
  quantities: Map<string, Quantity>,
): ReferenceWholeMetadata | undefined {
  if (relationshipTypeForStep(step) !== "remove-from-whole") return undefined;

  const ids = idsForRemoveFromWhole(step);
  const whole = quantities.get(ids.wholeQuantityId);
  const removed = quantities.get(ids.removedQuantityId);
  const remainder = quantities.get(ids.remainderQuantityId);
  if (!whole || !removed || !remainder) throw new Error(`Step "${step.id}" references a missing quantity.`);
  if (!numbersEqual(whole.value, removed.value + remainder.value)) {
    throw new Error(
      `Step "${step.id}" breaks subtraction geometry: ${whole.value} does not equal ${removed.value} + ${remainder.value}.`,
    );
  }

  const removedRatio = removed.value / whole.value;
  const remainderRatio = remainder.value / whole.value;
  return {
    ...ids,
    wholeValue: whole.value,
    removedValue: removed.value,
    remainderValue: remainder.value,
    segments: [
      {
        quantityId: ids.remainderQuantityId,
        value: remainder.value,
        startRatio: 0,
        widthRatio: remainderRatio,
        semanticRole: "remainder",
      },
      {
        quantityId: ids.removedQuantityId,
        value: removed.value,
        startRatio: remainderRatio,
        widthRatio: removedRatio,
        semanticRole: "removed",
      },
    ],
    invariant: `${formatNumber(whole.value)} = ${formatNumber(remainder.value)} + ${formatNumber(removed.value)}`,
  };
}

function buildPartWhole(
  step: ProblemStep,
  quantities: Map<string, Quantity>,
): PartWholeMetadata | undefined {
  if (relationshipTypeForStep(step) !== "combine") return undefined;

  const form = getEquationForm(step.preferredEquationFormId);
  const roleMap = step.roleToQuantityId;
  const leftQuantityId = roleMap[form.leftRole];
  const rightQuantityId = roleMap[form.rightRole];
  const wholeQuantityId = roleMap[form.resultRole];
  if (!leftQuantityId || !rightQuantityId || !wholeQuantityId) {
    throw new Error(`Step "${step.id}" cannot resolve part-whole roles.`);
  }

  const left = quantities.get(leftQuantityId);
  const right = quantities.get(rightQuantityId);
  const whole = quantities.get(wholeQuantityId);
  if (!left || !right || !whole) throw new Error(`Step "${step.id}" references a missing quantity.`);
  if (!numbersEqual(whole.value, left.value + right.value)) {
    throw new Error(
      `Step "${step.id}" breaks addition geometry: ${whole.value} does not equal ${left.value} + ${right.value}.`,
    );
  }

  const leftRatio = left.value / whole.value;
  const rightRatio = right.value / whole.value;
  return {
    wholeQuantityId,
    partQuantityIds: [leftQuantityId, rightQuantityId],
    wholeValue: whole.value,
    partValues: [left.value, right.value],
    segments: [
      {
        quantityId: leftQuantityId,
        value: left.value,
        startRatio: 0,
        widthRatio: leftRatio,
        semanticRole: "part",
      },
      {
        quantityId: rightQuantityId,
        value: right.value,
        startRatio: leftRatio,
        widthRatio: rightRatio,
        semanticRole: "part",
      },
    ],
    invariant: `${formatNumber(whole.value)} = ${formatNumber(left.value)} + ${formatNumber(right.value)}`,
  };
}

function buildEqualGroups(
  step: ProblemStep,
  quantities: Map<string, Quantity>,
): EqualGroupsMetadata | undefined {
  if (relationshipTypeForStep(step) !== "equal-groups") return undefined;

  const roleMap = step.roleToQuantityId;
  const groupsQuantityId = roleMap.groups;
  const itemsPerGroupQuantityId = roleMap.itemsPerGroup;
  const totalQuantityId = roleMap.total;
  if (!groupsQuantityId || !itemsPerGroupQuantityId || !totalQuantityId) {
    throw new Error(`Step "${step.id}" cannot resolve equal-groups roles.`);
  }

  const groups = quantities.get(groupsQuantityId);
  const itemsPerGroup = quantities.get(itemsPerGroupQuantityId);
  const total = quantities.get(totalQuantityId);
  if (!groups || !itemsPerGroup || !total) throw new Error(`Step "${step.id}" references a missing quantity.`);
  if (!numbersEqual(total.value, groups.value * itemsPerGroup.value)) {
    throw new Error(
      `Step "${step.id}" breaks multiplication geometry: ${total.value} does not equal ${groups.value} × ${itemsPerGroup.value}.`,
    );
  }

  const groupWidthRatio = total.value === 0 ? 0 : itemsPerGroup.value / total.value;
  return {
    groupsQuantityId,
    itemsPerGroupQuantityId,
    totalQuantityId,
    groupsValue: groups.value,
    itemsPerGroupValue: itemsPerGroup.value,
    totalValue: total.value,
    segments: Array.from({ length: Math.max(0, Math.round(groups.value)) }, (_, index) => ({
      quantityId: itemsPerGroupQuantityId,
      value: itemsPerGroup.value,
      startRatio: groupWidthRatio * index,
      widthRatio: groupWidthRatio,
      semanticRole: "itemsPerGroup",
    })),
    invariant: `${formatNumber(total.value)} = ${formatNumber(groups.value)} × ${formatNumber(itemsPerGroup.value)}`,
  };
}

function buildDivision(
  step: ProblemStep,
  quantities: Map<string, Quantity>,
): DivisionMetadata | undefined {
  if (relationshipTypeForStep(step) !== "partition") return undefined;

  const form = getEquationForm(step.preferredEquationFormId);
  const roleMap = step.roleToQuantityId;
  const totalQuantityId = roleMap.total;
  const divisorRole = form.rightRole === "groups" ? "groups" : "itemsPerGroup";
  const quotientRole = form.resultRole === "groups" ? "groups" : "itemsPerGroup";
  const divisorQuantityId = roleMap[divisorRole];
  const quotientQuantityId = roleMap[quotientRole];
  if (!totalQuantityId || !divisorQuantityId || !quotientQuantityId) {
    throw new Error(`Step "${step.id}" cannot resolve division roles.`);
  }

  const total = quantities.get(totalQuantityId);
  const divisor = quantities.get(divisorQuantityId);
  const quotient = quantities.get(quotientQuantityId);
  if (!total || !divisor || !quotient) throw new Error(`Step "${step.id}" references a missing quantity.`);
  if (!numbersEqual(total.value, divisor.value * quotient.value)) {
    throw new Error(
      `Step "${step.id}" breaks division geometry: ${total.value} does not equal ${divisor.value} × ${quotient.value}.`,
    );
  }

  const groupCount = divisorRole === "groups" ? divisor.value : quotient.value;
  const groupSize = divisorRole === "itemsPerGroup" ? divisor.value : quotient.value;
  const groupWidthRatio = total.value === 0 ? 0 : groupSize / total.value;
  return {
    totalQuantityId,
    divisorQuantityId,
    quotientQuantityId,
    divisorRole,
    quotientRole,
    totalValue: total.value,
    divisorValue: divisor.value,
    quotientValue: quotient.value,
    segments: Array.from({ length: Math.max(0, Math.round(groupCount)) }, (_, index) => ({
      quantityId: divisorRole === "itemsPerGroup" ? divisorQuantityId : quotientQuantityId,
      value: groupSize,
      startRatio: groupWidthRatio * index,
      widthRatio: groupWidthRatio,
      semanticRole: "group",
    })),
    invariant: `${formatNumber(total.value)} = ${formatNumber(groupCount)} × ${formatNumber(groupSize)}`,
  };
}

function operandIds(step: ProblemStep): string[] {
  const form = getEquationForm(step.preferredEquationFormId);
  return [step.roleToQuantityId[form.leftRole]!, step.roleToQuantityId[form.rightRole]!];
}

function equationForStep(step: ProblemStep, quantities: Map<string, Quantity>): string {
  const form = getEquationForm(step.preferredEquationFormId);
  const left = quantities.get(step.roleToQuantityId[form.leftRole]!)!;
  const right = quantities.get(step.roleToQuantityId[form.rightRole]!)!;
  const result = quantities.get(step.roleToQuantityId[form.resultRole]!)!;
  return `${formatNumber(left.value)} ${form.operator} ${formatNumber(right.value)} = ${formatNumber(result.value)}`;
}

function derivedColor(operator: Operator, leftColor: string | undefined): string {
  if (leftColor === TRANSFORMATION_COLORS.addFirst) {
    if (operator === "+") return TRANSFORMATION_COLORS.addAfterAdd;
    if (operator === "-") return TRANSFORMATION_COLORS.subtractAfterAdd;
  }
  if (leftColor === TRANSFORMATION_COLORS.subtractFirst) {
    if (operator === "+") return TRANSFORMATION_COLORS.addAfterSubtract;
    if (operator === "-") return TRANSFORMATION_COLORS.subtractAfterSubtract;
    if (operator === "÷") return TRANSFORMATION_COLORS.divideAfterSubtract;
    return TRANSFORMATION_COLORS.multiplyAfterSubtract;
  }
  if (leftColor === TRANSFORMATION_COLORS.divideFirst) {
    if (operator === "+") return TRANSFORMATION_COLORS.addAfterDivide;
    if (operator === "-") return TRANSFORMATION_COLORS.subtractAfterDivide;
    if (operator === "÷") return TRANSFORMATION_COLORS.divideAfterDivide;
    return TRANSFORMATION_COLORS.multiplyAfterDivide;
  }
  if (leftColor === TRANSFORMATION_COLORS.multiplyFirst) {
    if (operator === "+") return TRANSFORMATION_COLORS.addAfterMultiply;
    if (operator === "-") return TRANSFORMATION_COLORS.subtractAfterMultiply;
    if (operator === "÷") return TRANSFORMATION_COLORS.divideAfterMultiply;
    return TRANSFORMATION_COLORS.multiplyAfterMultiply;
  }
  if (operator === "+") return TRANSFORMATION_COLORS.addFirst;
  if (operator === "-") return TRANSFORMATION_COLORS.subtractFirst;
  if (operator === "÷") return TRANSFORMATION_COLORS.divideFirst;
  return TRANSFORMATION_COLORS.multiplyFirst;
}

function buildTransformationColorMap(problem: ProblemInstance, includedSteps: ProblemStep[]): Map<string, string> {
  const colors = new Map<string, string>();
  problem.quantities.forEach((q) => {
    if (q.visualization?.colorToken) colors.set(q.id, q.visualization.colorToken);
  });

  includedSteps.forEach((step, index) => {
    const form = getEquationForm(step.preferredEquationFormId);
    const leftId = step.roleToQuantityId[form.leftRole]!;
    const rightId = step.roleToQuantityId[form.rightRole]!;
    const resultId = step.roleToQuantityId[form.resultRole]!;

    if (!colors.has(leftId)) {
      colors.set(leftId, index === 0 ? TRANSFORMATION_COLORS.start : TRANSFORMATION_COLORS.subtractFirst);
    }
    if (!colors.has(rightId)) {
      colors.set(rightId, index === 0 ? TRANSFORMATION_COLORS.firstOperand : TRANSFORMATION_COLORS.secondOperand);
    }
    if (!colors.has(resultId)) {
      colors.set(resultId, derivedColor(form.operator, colors.get(leftId)));
    }
  });

  return colors;
}

export function compileTransformationSpace(
  problem: ProblemInstance,
  options: { stepIds?: string[]; title?: string } = {},
): TransformationSpace {
  const includedSteps = options.stepIds
    ? options.stepIds.map((id) => {
        const step = problem.steps.find((s) => s.id === id);
        if (!step) throw new Error(`Unknown transformation step id: ${id}`);
        return step;
      })
    : problem.steps;
  const quantities = quantityMap(problem);
  const states: TransformationState[] = [];
  includedSteps.forEach((step, index) => {
    states.push({
      index,
      phase: "result",
      label: `Step ${index + 1}`,
      stepId: step.id,
      stepOrder: step.order,
    });
  });
  const colorMap = buildTransformationColorMap(problem, problem.steps);

  const transformedQuantities: TransformationQuantity[] = problem.quantities.map((q, index) => ({
    id: q.id,
    value: q.value,
    unit: q.unit,
    label: q.label.compact,
    storyLabel: q.label.child,
    semanticRole: q.semanticRole ?? q.visibility,
    color: colorMap.get(q.id) ?? QUANTITY_COLORS[index % QUANTITY_COLORS.length]!,
    source: q.visibility === "given" ? "given" : "derived",
    firstVisibleState: stateForQuantity(q, includedSteps),
  }));

  const steps: TransformationStep[] = includedSteps.map((step, index) => {
    const relationshipType = relationshipTypeForStep(step);
    const form = getEquationForm(step.preferredEquationFormId);
    const referenceWhole = buildReferenceWhole(step, quantities);
    const partWhole = buildPartWhole(step, quantities);
    const equalGroups = buildEqualGroups(step, quantities);
    const division = buildDivision(step, quantities);
    return {
      id: step.id,
      order: step.order,
      prompt: step.prompt,
      relationshipType,
      operator: form.operator,
      inputQuantityIds: operandIds(step),
      outputQuantityId: step.goalQuantityId,
      visualModel: visualModelForStep(step, relationshipType),
      equation: equationForStep(step, quantities),
      stateRange: {
        reference: index,
        result: index,
      },
      ...(referenceWhole ? { referenceWhole } : {}),
      ...(partWhole ? { partWhole } : {}),
      ...(equalGroups ? { equalGroups } : {}),
      ...(division ? { division } : {}),
    };
  });

  return {
    id: `${problem.id}::transformation-space`,
    title: options.title ?? problem.metadata.title,
    story: problem.story.brief,
    quantities: transformedQuantities,
    steps,
    states,
    targetQuantityId: includedSteps[includedSteps.length - 1]?.goalQuantityId ?? problem.recap.dataQuestion.correctQuantityId,
    unit: transformedQuantities.find((q) => q.id === includedSteps[0]?.goalQuantityId)?.unit ?? problem.dimension.kind,
    maxStateIndex: states[states.length - 1]?.index ?? 0,
  };
}

export function verifySubtractionGeometry(space: TransformationSpace): boolean {
  return space.steps.every((step) => {
    if (!step.referenceWhole) return true;
    const sum = step.referenceWhole.segments.reduce((total, segment) => total + segment.widthRatio, 0);
    return numbersEqual(sum, 1) && numbersEqual(step.referenceWhole.wholeValue, step.referenceWhole.removedValue + step.referenceWhole.remainderValue);
  });
}

export function verifyPartWholeGeometry(space: TransformationSpace): boolean {
  return space.steps.every((step) => {
    if (!step.partWhole) return true;
    const sum = step.partWhole.segments.reduce((total, segment) => total + segment.widthRatio, 0);
    const [left, right] = step.partWhole.partValues;
    return numbersEqual(sum, 1) && numbersEqual(step.partWhole.wholeValue, left + right);
  });
}

export function verifyEqualGroupsGeometry(space: TransformationSpace): boolean {
  return space.steps.every((step) => {
    if (!step.equalGroups) return true;
    const sum = step.equalGroups.segments.reduce((total, segment) => total + segment.widthRatio, 0);
    return numbersEqual(sum, 1) && numbersEqual(step.equalGroups.totalValue, step.equalGroups.groupsValue * step.equalGroups.itemsPerGroupValue);
  });
}

export function verifyDivisionGeometry(space: TransformationSpace): boolean {
  return space.steps.every((step) => {
    if (!step.division) return true;
    const sum = step.division.segments.reduce((total, segment) => total + segment.widthRatio, 0);
    return numbersEqual(sum, 1) && numbersEqual(step.division.totalValue, step.division.divisorValue * step.division.quotientValue);
  });
}
