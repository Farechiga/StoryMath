// src/model/relationshipRegistry.ts
//
// The single source of truth for relationship families, equation forms, the
// direction each form produces, and the default visual model. Components ask
// this registry instead of hardcoding "bigger − difference = smaller" or
// "partA + partB = whole". Adding a new story means picking a template + forms,
// not editing component logic.

export type QuantityId = string;

export type Operator = "+" | "-" | "×" | "÷";

export type DirectionKind =
  | "increase"
  | "decrease"
  | "same"
  | "combine"
  | "scale"
  | "split"
  | "unknown";

export type VisualModelType =
  | "comparison_gap_bar"
  | "part_whole_bar"
  | "before_change_after_bridge"
  | "number_line_jump"
  | "repeated_groups_grid"
  | "equal_shares_tray"
  | "array_grid"
  | "ratio_strip"
  | "causal_chain_formula"
  | "data_table"
  | "dot_plot"
  | "pictograph"
  | "line_over_time";

export type FormulaId =
  | "bigger_minus_difference_equals_smaller"
  | "smaller_plus_difference_equals_bigger"
  | "bigger_minus_smaller_equals_difference"
  | "part_a_plus_part_b_equals_whole"
  | "whole_minus_part_a_equals_part_b"
  | "whole_minus_part_b_equals_part_a"
  | "start_plus_change_equals_end"
  | "start_minus_change_equals_end"
  | "end_minus_start_equals_change"
  | "end_plus_change_equals_start"
  | "groups_times_items_equals_total"
  | "items_times_groups_equals_total"
  | "total_divided_by_groups_equals_items"
  | "total_divided_by_items_equals_groups";

export type RelationshipTemplateId =
  | "additive_comparison_decrease"
  | "additive_comparison_increase"
  | "part_part_whole"
  | "start_change_end_increase"
  | "start_change_end_decrease"
  | "multiplication_equal_groups"
  | "division_equal_sharing";

export interface EquationForm {
  id: FormulaId;
  operator: Operator;
  leftRole: string;
  rightRole: string;
  resultRole: string;
  directionProduced: DirectionKind;
  defaultVisualModel: VisualModelType;
  childFacingPattern?: string;
}

export interface RelationshipTemplate {
  id: RelationshipTemplateId;
  family:
    | "additive_comparison"
    | "part_part_whole"
    | "start_change_end"
    | "multiplication_division";
  roles: string[];
  primaryForms: FormulaId[];
  inverseForms: FormulaId[];
  experimentForms: Partial<Record<Operator, FormulaId>>;
  defaultVisualModels: VisualModelType[];
  recapModelType: VisualModelType;
}

export const EQUATION_FORMS: Record<FormulaId, EquationForm> = {
  bigger_minus_difference_equals_smaller: {
    id: "bigger_minus_difference_equals_smaller",
    operator: "-",
    leftRole: "bigger",
    rightRole: "difference",
    resultRole: "smaller",
    directionProduced: "decrease",
    defaultVisualModel: "comparison_gap_bar",
    childFacingPattern: "Bigger amount − difference = smaller amount",
  },

  smaller_plus_difference_equals_bigger: {
    id: "smaller_plus_difference_equals_bigger",
    operator: "+",
    leftRole: "smaller",
    rightRole: "difference",
    resultRole: "bigger",
    directionProduced: "increase",
    defaultVisualModel: "comparison_gap_bar",
    childFacingPattern: "Smaller amount + difference = bigger amount",
  },

  bigger_minus_smaller_equals_difference: {
    id: "bigger_minus_smaller_equals_difference",
    operator: "-",
    leftRole: "bigger",
    rightRole: "smaller",
    resultRole: "difference",
    directionProduced: "decrease",
    defaultVisualModel: "comparison_gap_bar",
    childFacingPattern: "Bigger amount − smaller amount = difference",
  },

  part_a_plus_part_b_equals_whole: {
    id: "part_a_plus_part_b_equals_whole",
    operator: "+",
    leftRole: "partA",
    rightRole: "partB",
    resultRole: "whole",
    directionProduced: "combine",
    defaultVisualModel: "part_whole_bar",
    childFacingPattern: "Part + part = whole",
  },

  whole_minus_part_a_equals_part_b: {
    id: "whole_minus_part_a_equals_part_b",
    operator: "-",
    leftRole: "whole",
    rightRole: "partA",
    resultRole: "partB",
    directionProduced: "decrease",
    defaultVisualModel: "part_whole_bar",
    childFacingPattern: "Whole − one part = other part",
  },

  whole_minus_part_b_equals_part_a: {
    id: "whole_minus_part_b_equals_part_a",
    operator: "-",
    leftRole: "whole",
    rightRole: "partB",
    resultRole: "partA",
    directionProduced: "decrease",
    defaultVisualModel: "part_whole_bar",
    childFacingPattern: "Whole − one part = other part",
  },

  start_plus_change_equals_end: {
    id: "start_plus_change_equals_end",
    operator: "+",
    leftRole: "start",
    rightRole: "change",
    resultRole: "end",
    directionProduced: "increase",
    defaultVisualModel: "before_change_after_bridge",
    childFacingPattern: "Start + change = end",
  },

  start_minus_change_equals_end: {
    id: "start_minus_change_equals_end",
    operator: "-",
    leftRole: "start",
    rightRole: "change",
    resultRole: "end",
    directionProduced: "decrease",
    defaultVisualModel: "before_change_after_bridge",
    childFacingPattern: "Start − change = end",
  },

  end_minus_start_equals_change: {
    id: "end_minus_start_equals_change",
    operator: "-",
    leftRole: "end",
    rightRole: "start",
    resultRole: "change",
    directionProduced: "decrease",
    defaultVisualModel: "before_change_after_bridge",
    childFacingPattern: "End − start = change",
  },

  // Inverse (backward check) form for start_change_end_decrease.
  end_plus_change_equals_start: {
    id: "end_plus_change_equals_start",
    operator: "+",
    leftRole: "end",
    rightRole: "change",
    resultRole: "start",
    directionProduced: "increase",
    defaultVisualModel: "before_change_after_bridge",
    childFacingPattern: "End + change = start",
  },

  groups_times_items_equals_total: {
    id: "groups_times_items_equals_total",
    operator: "×",
    leftRole: "groups",
    rightRole: "itemsPerGroup",
    resultRole: "total",
    directionProduced: "scale",
    defaultVisualModel: "repeated_groups_grid",
    childFacingPattern: "Groups × items in each group = total",
  },

  items_times_groups_equals_total: {
    id: "items_times_groups_equals_total",
    operator: "×",
    leftRole: "itemsPerGroup",
    rightRole: "groups",
    resultRole: "total",
    directionProduced: "scale",
    defaultVisualModel: "repeated_groups_grid",
    childFacingPattern: "Items in each group × groups = total",
  },

  total_divided_by_groups_equals_items: {
    id: "total_divided_by_groups_equals_items",
    operator: "÷",
    leftRole: "total",
    rightRole: "groups",
    resultRole: "itemsPerGroup",
    directionProduced: "split",
    defaultVisualModel: "equal_shares_tray",
    childFacingPattern: "Total ÷ groups = items in each group",
  },

  total_divided_by_items_equals_groups: {
    id: "total_divided_by_items_equals_groups",
    operator: "÷",
    leftRole: "total",
    rightRole: "itemsPerGroup",
    resultRole: "groups",
    directionProduced: "split",
    defaultVisualModel: "equal_shares_tray",
    childFacingPattern: "Total ÷ items in each group = groups",
  },
};

export const RELATIONSHIP_TEMPLATES: Record<RelationshipTemplateId, RelationshipTemplate> = {
  additive_comparison_decrease: {
    id: "additive_comparison_decrease",
    family: "additive_comparison",
    roles: ["bigger", "difference", "smaller"],
    primaryForms: ["bigger_minus_difference_equals_smaller"],
    inverseForms: [
      "smaller_plus_difference_equals_bigger",
      "bigger_minus_smaller_equals_difference",
    ],
    experimentForms: {
      "+": "smaller_plus_difference_equals_bigger",
      "-": "bigger_minus_difference_equals_smaller",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["comparison_gap_bar", "number_line_jump"],
    recapModelType: "causal_chain_formula",
  },

  additive_comparison_increase: {
    id: "additive_comparison_increase",
    family: "additive_comparison",
    roles: ["smaller", "difference", "bigger"],
    primaryForms: ["smaller_plus_difference_equals_bigger"],
    inverseForms: [
      "bigger_minus_difference_equals_smaller",
      "bigger_minus_smaller_equals_difference",
    ],
    experimentForms: {
      "+": "smaller_plus_difference_equals_bigger",
      "-": "bigger_minus_difference_equals_smaller",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["comparison_gap_bar", "number_line_jump"],
    recapModelType: "causal_chain_formula",
  },

  part_part_whole: {
    id: "part_part_whole",
    family: "part_part_whole",
    roles: ["partA", "partB", "whole"],
    primaryForms: ["part_a_plus_part_b_equals_whole"],
    inverseForms: [
      "whole_minus_part_a_equals_part_b",
      "whole_minus_part_b_equals_part_a",
    ],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["part_whole_bar", "pictograph"],
    recapModelType: "causal_chain_formula",
  },

  start_change_end_increase: {
    id: "start_change_end_increase",
    family: "start_change_end",
    roles: ["start", "change", "end"],
    primaryForms: ["start_plus_change_equals_end"],
    inverseForms: ["end_minus_start_equals_change"],
    experimentForms: {
      "+": "start_plus_change_equals_end",
      "-": "start_minus_change_equals_end",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["before_change_after_bridge", "number_line_jump"],
    recapModelType: "causal_chain_formula",
  },

  start_change_end_decrease: {
    id: "start_change_end_decrease",
    family: "start_change_end",
    roles: ["start", "change", "end"],
    primaryForms: ["start_minus_change_equals_end"],
    inverseForms: ["end_plus_change_equals_start"],
    experimentForms: {
      "+": "start_plus_change_equals_end",
      "-": "start_minus_change_equals_end",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["before_change_after_bridge", "number_line_jump"],
    recapModelType: "causal_chain_formula",
  },

  multiplication_equal_groups: {
    id: "multiplication_equal_groups",
    family: "multiplication_division",
    roles: ["groups", "itemsPerGroup", "total"],
    primaryForms: ["groups_times_items_equals_total", "items_times_groups_equals_total"],
    inverseForms: [
      "total_divided_by_groups_equals_items",
      "total_divided_by_items_equals_groups",
    ],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["repeated_groups_grid", "array_grid"],
    recapModelType: "causal_chain_formula",
  },

  division_equal_sharing: {
    id: "division_equal_sharing",
    family: "multiplication_division",
    roles: ["total", "groups", "itemsPerGroup"],
    primaryForms: ["total_divided_by_groups_equals_items"],
    inverseForms: ["groups_times_items_equals_total"],
    experimentForms: {
      "+": "part_a_plus_part_b_equals_whole",
      "-": "whole_minus_part_a_equals_part_b",
      "×": "groups_times_items_equals_total",
      "÷": "total_divided_by_groups_equals_items",
    },
    defaultVisualModels: ["equal_shares_tray", "array_grid"],
    recapModelType: "causal_chain_formula",
  },
};

export function getEquationForm(id: FormulaId): EquationForm {
  const form = EQUATION_FORMS[id];
  if (!form) throw new Error(`Unknown formulaId: ${id}`);
  return form;
}

export function getRelationshipTemplate(id: RelationshipTemplateId): RelationshipTemplate {
  const t = RELATIONSHIP_TEMPLATES[id];
  if (!t) throw new Error(`Unknown relationshipTemplateId: ${id}`);
  return t;
}
