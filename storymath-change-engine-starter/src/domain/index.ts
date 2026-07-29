/** Public surface of the framework-independent domain engine. */
export * from "./types";
export { calculate, applyOperator, formatNumber, numbersEqual, unitsCompatible } from "./calculate";
export {
  loadProblem,
  loadProblemSpec,
  quantitiesById,
  getQuantity,
  valueMap,
  getStep,
  getStepTemplate,
  roleToQuantityId,
  stepOperandIds,
} from "./loadProblem";
export {
  EQUATION_FORMS,
  RELATIONSHIP_TEMPLATES,
  getEquationForm,
  getRelationshipTemplate,
} from "./relationships";
export { evaluateEquation, acceptedConcreteForms } from "./evaluateEquation";
export { findExperiment, runOperatorExperiment, actualOperatorFor } from "./operatorExperiment";
export {
  buildBackwardChecks,
  buildBackwardCheck,
  isBackwardCheckCorrect,
  backwardCheckReconciles,
} from "./backwardCheck";
export { validateProblem, isProblemValid, type ValidationIssue } from "./validateProblem";
export {
  compileTransformationSpace,
  verifyDivisionGeometry,
  verifyEqualGroupsGeometry,
  verifyPartWholeGeometry,
  verifySubtractionGeometry,
  type DivisionMetadata,
  type EqualGroupsMetadata,
  type PartWholeMetadata,
  type ReferenceWholeMetadata,
  type TransformationQuantity,
  type TransformationPhase,
  type TransformationRelationshipType,
  type TransformationSegment,
  type TransformationSpace,
  type TransformationState,
  type TransformationStep,
  type TransformationVisualModel,
} from "./transformationSpace";
