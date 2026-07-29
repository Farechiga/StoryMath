import { useMemo } from "react";
import { MathTransformationSpace } from "../components/MathTransformationSpace";
import { compileTransformationSpace } from "../domain";
import { loadProblemById } from "../studio/problemCatalog";

const CHAIR_PROBLEM_ID = "christmas-carol-seat-crisis-v1";
const LEGO_PROBLEM_ID = "lego-architects-periwinkle-blueprint-v1";
const MULTIPLICATION_PROBLEM_ID = "animation-lab-eyebrows-v1";
const DIVISION_PROBLEM_ID = "planning-pudding-treats-v1";

export function TransformationSpaceDemo() {
  const spaces = useMemo(() => {
    const chairs = loadProblemById(CHAIR_PROBLEM_ID);
    const legos = loadProblemById(LEGO_PROBLEM_ID);
    const multiplication = loadProblemById(MULTIPLICATION_PROBLEM_ID);
    const division = loadProblemById(DIVISION_PROBLEM_ID);
    return [
      compileTransformationSpace(chairs, {
        title: "Folding chairs",
        stepIds: ["find_available_folding_chairs", "find_total_available_seats"],
      }),
      compileTransformationSpace(legos, {
        title: "Periwinkle LEGO",
        stepIds: ["find_available_periwinkle_pieces", "find_extra_periwinkle_pieces"],
      }),
      compileTransformationSpace(multiplication, {
        title: "Multiplication",
        stepIds: ["find_eye_eyebrow_expressions", "find_total_face_expressions"],
      }),
      compileTransformationSpace(division, {
        title: "Division",
        stepIds: ["find_needed_arrowroots", "find_market_money_cents"],
      }),
    ];
  }, []);

  return <MathTransformationSpace spaces={spaces} />;
}
