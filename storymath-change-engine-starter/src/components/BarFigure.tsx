import { getEquationForm, getQuantity, getRelationshipTemplate } from "../domain";
import type { ProblemInstance, ProblemStep, Quantity } from "../domain";
import { ComparisonBarModel, PartWholeBarModel } from "./BarModel";
import { BeforeChangeAfterBridge } from "./BeforeChangeAfterBridge";
import { RepeatedGroupsModel } from "./RepeatedGroupsModel";
import { EqualSharesModel } from "./EqualSharesModel";

/**
 * Renders the visual model a step's relationship template calls for. The model
 * is chosen from the registry (template.defaultVisualModels), and roles resolve
 * to quantities via the step's explicit roleToQuantityId — no story ids.
 */
export function BarFigure({
  problem,
  step,
  caption,
}: {
  problem: ProblemInstance;
  step: ProblemStep;
  caption?: string;
}) {
  const template = getRelationshipTemplate(step.relationshipTemplateId);
  const model = template.defaultVisualModels[0];
  const roleQ = (role: string): Quantity | undefined => {
    const id = step.roleToQuantityId[role];
    return id ? getQuantity(problem, id) : undefined;
  };
  const datum = (q: Quantity | undefined) =>
    q ? { label: q.label.compact, value: q.value, unit: q.unit } : { label: "—", value: 0, unit: "" };

  let figure: React.ReactNode = null;

  if (model === "comparison_gap_bar") {
    figure = (
      <ComparisonBarModel bigger={datum(roleQ("bigger"))} smaller={datum(roleQ("smaller"))} difference={datum(roleQ("difference"))} />
    );
  } else if (model === "part_whole_bar") {
    figure = (
      <PartWholeBarModel partA={datum(roleQ("partA"))} partB={datum(roleQ("partB"))} whole={datum(roleQ("whole"))} />
    );
  } else if (model === "before_change_after_bridge") {
    const start = roleQ("start");
    const change = roleQ("change");
    const end = roleQ("end");
    const op = getEquationForm(step.preferredEquationFormId).operator;
    if (start && change && end && (op === "+" || op === "-")) {
      figure = (
        <BeforeChangeAfterBridge
          startValue={start.value}
          changeValue={change.value}
          endValue={end.value}
          operator={op}
          unit={end.unit}
          startCaption={start.label.compact}
          changeCaption={change.label.compact}
          endCaption={end.label.compact}
        />
      );
    }
  } else if (model === "repeated_groups_grid") {
    const items = roleQ("itemsPerGroup");
    const groups = roleQ("groups");
    const total = roleQ("total");
    if (items && groups && total) {
      figure = (
        <RepeatedGroupsModel
          groupSize={items.value}
          groupCount={groups.value}
          total={total.value}
          unit={total.unit}
          groupNoun={problem.storyChrome.groupNoun ?? "group"}
        />
      );
    }
  } else if (model === "equal_shares_tray") {
    const total = roleQ("total");
    const groups = roleQ("groups");
    if (total && groups) {
      figure = (
        <EqualSharesModel dividend={total.value} divisor={groups.value} unit={total.unit} />
      );
    }
  }
  // Other models are a later pass; render nothing rather than a wrong picture.
  if (!figure) return null;

  return (
    <figure className="bar-figure">
      {figure}
      {caption && <figcaption className="bar-figure__caption">{caption}</figcaption>}
    </figure>
  );
}
