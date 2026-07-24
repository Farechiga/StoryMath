#!/usr/bin/env python3
"""Generate a StoryMath problem pack from a compact authoring recipe.

The recipe names semantic quantities and step relationships once; this script
cascades those choices into labels, derived quantities, step forms, inverse
checks, operator experiments, recap prose, and tokenized story text.
"""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from datetime import date
from pathlib import Path
from typing import Any


OPERATORS = ["+", "-", "\u00d7", "\u00f7"]

RELATIONSHIPS: dict[str, dict[str, Any]] = {
    "part_part_whole": {
        "roles": ["partA", "partB", "whole"],
        "primary": "part_a_plus_part_b_equals_whole",
        "accepted": ["part_a_plus_part_b_equals_whole"],
        "inverse": ["whole_minus_part_a_equals_part_b"],
        "direction": "combine",
        "actual": "+",
    },
    "start_change_end_decrease": {
        "roles": ["start", "change", "end"],
        "primary": "start_minus_change_equals_end",
        "accepted": ["start_minus_change_equals_end"],
        "inverse": ["end_plus_change_equals_start"],
        "direction": "decrease",
        "actual": "-",
    },
    "start_change_end_increase": {
        "roles": ["start", "change", "end"],
        "primary": "start_plus_change_equals_end",
        "accepted": ["start_plus_change_equals_end"],
        "inverse": ["end_minus_start_equals_change"],
        "direction": "increase",
        "actual": "+",
    },
    "additive_comparison_decrease": {
        "roles": ["bigger", "smaller", "difference"],
        "primary": "bigger_minus_smaller_equals_difference",
        "accepted": ["bigger_minus_smaller_equals_difference"],
        "inverse": ["smaller_plus_difference_equals_bigger"],
        "direction": "decrease",
        "actual": "-",
    },
    "additive_comparison_increase": {
        "roles": ["smaller", "difference", "bigger"],
        "primary": "smaller_plus_difference_equals_bigger",
        "accepted": ["smaller_plus_difference_equals_bigger"],
        "inverse": ["bigger_minus_smaller_equals_difference"],
        "direction": "increase",
        "actual": "+",
    },
    "multiplication_equal_groups": {
        "roles": ["groups", "itemsPerGroup", "total"],
        "primary": "groups_times_items_equals_total",
        "accepted": ["groups_times_items_equals_total", "items_times_groups_equals_total"],
        "inverse": ["total_divided_by_groups_equals_items"],
        "direction": "scale",
        "actual": "\u00d7",
        "actualVisualModel": "repeated_groups_grid",
    },
    "division_equal_sharing": {
        "roles": ["total", "groups", "itemsPerGroup"],
        "primary": "total_divided_by_groups_equals_items",
        "accepted": ["total_divided_by_groups_equals_items"],
        "inverse": ["groups_times_items_equals_total"],
        "direction": "split",
        "actual": "\u00f7",
        "actualVisualModel": "equal_shares_tray",
    },
}

FORM_OPERAND_ROLES: dict[str, list[str]] = {
    "part_a_plus_part_b_equals_whole": ["partA", "partB"],
    "start_minus_change_equals_end": ["start", "change"],
    "start_plus_change_equals_end": ["start", "change"],
    "bigger_minus_smaller_equals_difference": ["bigger", "smaller"],
    "smaller_plus_difference_equals_bigger": ["smaller", "difference"],
    "groups_times_items_equals_total": ["groups", "itemsPerGroup"],
    "total_divided_by_groups_equals_items": ["total", "groups"],
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return slug.strip("_")


def title_case_soft(value: str) -> str:
    return value[:1].upper() + value[1:] if value else value


def singular(unit: str) -> str:
    if unit.endswith("ies"):
        return f"{unit[:-3]}y"
    if unit.endswith("s") and not unit.endswith("ss"):
        return unit[:-1]
    return unit


def quantity_token(qid: str) -> str:
    return "{quantity:" + qid + "}"


def replace_once(text: str, needle: str, replacement: str) -> str:
    if not needle:
        return text
    escaped = re.escape(needle)
    return re.sub(escaped, replacement, text, count=1)


def tokenized_story(raw_story: str, quantities: list[dict[str, Any]]) -> str:
    story = raw_story
    for q in quantities:
        for phrase in q.get("mentions", []):
            story = replace_once(story, phrase, quantity_token(q["id"]))
    return story


def quantity_value(qid: str, quantities: dict[str, dict[str, Any]]) -> int:
    q = quantities[qid]
    if q.get("value") is not None:
        return int(q["value"])
    derived = q.get("derived")
    if not derived:
        raise ValueError(f"Quantity {qid} needs a value or derived relationship.")
    operands = derived["operands"]
    formula = derived["formulaId"]
    if formula == "part_a_plus_part_b_equals_whole":
        return quantity_value(operands["partA"], quantities) + quantity_value(operands["partB"], quantities)
    if formula == "start_minus_change_equals_end":
        return quantity_value(operands["start"], quantities) - quantity_value(operands["change"], quantities)
    if formula == "start_plus_change_equals_end":
        return quantity_value(operands["start"], quantities) + quantity_value(operands["change"], quantities)
    if formula == "bigger_minus_smaller_equals_difference":
        return quantity_value(operands["bigger"], quantities) - quantity_value(operands["smaller"], quantities)
    if formula == "smaller_plus_difference_equals_bigger":
        return quantity_value(operands["smaller"], quantities) + quantity_value(operands["difference"], quantities)
    if formula == "groups_times_items_equals_total":
        return quantity_value(operands["groups"], quantities) * quantity_value(operands["itemsPerGroup"], quantities)
    if formula == "total_divided_by_groups_equals_items":
        return quantity_value(operands["total"], quantities) // quantity_value(operands["groups"], quantities)
    raise ValueError(f"Unsupported derived formula for generator: {formula}")


def build_quantity(raw: dict[str, Any], derived: dict[str, Any] | None = None) -> dict[str, Any]:
    qid = raw.get("id") or slugify(raw["name"])
    unit = raw.get("unit", raw.get("unitPlural", "items"))
    unit_plural = raw.get("unitPlural", unit)
    unit_singular = raw.get("unitSingular", singular(unit_plural))
    label_base = raw.get("label", title_case_soft(raw.get("name", qid.replace("_", " "))))
    child = raw.get("childLabel", label_base)
    compact = raw.get("compactLabel", child)
    sentence = raw.get("sentenceLabel", raw.get("name", label_base))

    quantity: dict[str, Any] = {
        "id": qid,
        "label": {
            "child": child,
            "compact": compact,
            "lowercase": sentence,
        },
        "unit": unit,
        "unitSingular": unit_singular,
        "unitPlural": unit_plural,
        "value": raw.get("value"),
        "visibility": raw.get("visibility", "given"),
    }
    if derived:
        quantity["derived"] = derived
    if raw.get("semanticRole"):
        quantity["semanticRole"] = raw["semanticRole"]
    return quantity


def actual_phrase(step: dict[str, Any], quantities_by_id: dict[str, dict[str, Any]]) -> str:
    relationship = step["relationship"]
    role_map = step["roles"]
    if relationship == "part_part_whole":
        a = quantities_by_id[role_map["partA"]]["label"]["lowercase"]
        b = quantities_by_id[role_map["partB"]]["label"]["lowercase"]
        whole = quantities_by_id[role_map["whole"]]["label"]["lowercase"]
        return f"This matches the story: {a} and {b} combine into {whole}."
    if relationship == "start_change_end_decrease":
        change = quantities_by_id[role_map["change"]]["label"]["lowercase"]
        start = quantities_by_id[role_map["start"]]["label"]["lowercase"]
        end = quantities_by_id[role_map["end"]]["label"]["lowercase"]
        return f"This matches the story: removing {change} from {start} leaves {end}."
    if relationship == "multiplication_equal_groups":
        groups = quantities_by_id[role_map["groups"]]["label"]["lowercase"]
        items = quantities_by_id[role_map["itemsPerGroup"]]["label"]["lowercase"]
        return f"This matches the story: each of {groups} has the same {items}."
    if relationship == "additive_comparison_decrease":
        bigger = quantities_by_id[role_map["bigger"]]["label"]["lowercase"]
        smaller = quantities_by_id[role_map["smaller"]]["label"]["lowercase"]
        return f"This matches the story: subtracting {smaller} from {bigger} finds the gap."
    return "This matches the story relationship."


def different_phrase(operator: str) -> str:
    if operator == "+":
        return "Adding would fit a different story where the quantities are combined."
    if operator == "-":
        return "Subtracting would fit a different story where one quantity is taken away or compared."
    if operator == "\u00d7":
        return "Multiplying would fit a different question about equal groups."
    return "Dividing would fit a different question about sharing into equal parts."


def build_step(raw: dict[str, Any]) -> dict[str, Any]:
    rel = RELATIONSHIPS[raw["relationship"]]
    missing = [role for role in rel["roles"] if role not in raw["roles"]]
    if missing:
        raise ValueError(f"Step {raw['id']} is missing role(s): {', '.join(missing)}")
    return {
        "id": raw["id"],
        "order": raw["order"],
        "prompt": raw["prompt"],
        "reasoningPrompt": raw.get("reasoningPrompt", "Which operation matches this story relationship?"),
        "relationshipTemplateId": raw["relationship"],
        "roleToQuantityId": raw["roles"],
        "goalQuantityId": raw["goal"],
        "acceptedEquationFormIds": rel["accepted"],
        "preferredEquationFormId": rel["primary"],
        "expectedDirection": rel["direction"],
        "operatorOptions": OPERATORS,
        "backwardCheck": {
            "prompt": raw.get("backwardPrompt", "Use the inverse operation to check the model."),
            "acceptedEquationFormIds": rel["inverse"],
        },
    }


def build_operator_experiments(steps: list[dict[str, Any]], quantities_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    experiments = []
    for step in steps:
        rel = RELATIONSHIPS[step["relationship"]]
        for operator in OPERATORS:
            exp: dict[str, Any] = {
                "stepId": step["id"],
                "operator": operator,
                "narrativeFit": "actual" if operator == rel["actual"] else "different_question",
                "alternateWorldTemplate": actual_phrase(step, quantities_by_id)
                if operator == rel["actual"]
                else different_phrase(operator),
            }
            if operator == rel["actual"] and rel.get("actualVisualModel"):
                exp["visualModel"] = rel["actualVisualModel"]
            elif operator == "\u00d7":
                exp["visualModel"] = "repeated_groups_grid"
            elif operator == "\u00f7":
                exp["visualModel"] = "equal_shares_tray"
            experiments.append(exp)
    return experiments


def build_problem(recipe: dict[str, Any]) -> dict[str, Any]:
    raw_quantities = deepcopy(recipe["quantities"])
    quantities_by_id = {q["id"]: build_quantity(q) for q in raw_quantities}

    steps = [build_step(step) for step in recipe["steps"]]
    for step in steps:
        goal = step["goalQuantityId"]
        if quantities_by_id[goal].get("derived"):
            continue
        quantities_by_id[goal]["derived"] = {
            "formulaId": step["preferredEquationFormId"],
            "operands": {
                role: step["roleToQuantityId"][role]
                for role in FORM_OPERAND_ROLES[step["preferredEquationFormId"]]
            },
        }
        quantities_by_id[goal]["visibility"] = "find" if step["order"] == 1 else "revealed_after_step"

    for qid, quantity in quantities_by_id.items():
        if quantity.get("derived"):
            quantity["expectedValueForFixture"] = quantity_value(qid, quantities_by_id)

    quantities = [quantities_by_id[q["id"]] for q in raw_quantities]
    story = recipe["story"]
    recap = recipe.get("recap", {})
    final_step = steps[-1]
    final_quantity = quantities_by_id[final_step["goalQuantityId"]]

    return {
        "id": recipe["id"],
        "metadata": {
            "title": recipe["title"],
            "theme": recipe.get("theme", recipe["title"]),
            "gradeBand": recipe.get("gradeBand", "3-4"),
            "factualStatus": recipe.get("factualStatus", "realistic"),
            "tags": recipe.get("tags", []),
            **({"curiosityNote": recipe["curiosityNote"]} if recipe.get("curiosityNote") else {}),
            "catalogOrder": recipe.get("catalogOrder", 1000),
            "publishedAt": recipe.get("publishedAt", date.today().isoformat()),
        },
        "dimension": recipe.get(
            "dimension",
            {
                "kind": "count",
                "increaseLabel": "More",
                "decreaseLabel": "Fewer",
                "sameLabel": "The same",
                "increaseLabelLower": "more",
                "decreaseLabelLower": "fewer",
                "sameLabelLower": "the same",
            },
        ),
        "storyChrome": recipe.get(
            "storyChrome",
            {
                "openingEyebrow": recipe["title"],
                "startCta": "Start the model",
                "finishCta": "Close the model",
                "completionTitle": "Model complete",
                "stepProgressVerb": "model the story",
                "groupNoun": recipe.get("groupNoun", "item"),
                "learnerRole": "model builder",
            },
        ),
        "story": {
            "briefTemplate": story.get("briefTemplate")
            or tokenized_story(story["raw"], raw_quantities),
            **({"causalEvent": story["causalEvent"]} if story.get("causalEvent") else {}),
            **({"closingNoteTemplate": story["closingNoteTemplate"]} if story.get("closingNoteTemplate") else {}),
        },
        "quantities": quantities,
        "steps": steps,
        "operatorExperiments": build_operator_experiments(recipe["steps"], quantities_by_id),
        "recap": {
            "headline": recap.get("headline", f"Why they have {quantity_token(final_quantity['id'])}"),
            "causalChain": recap.get("causalChain", [actual_phrase(step, quantities_by_id) for step in recipe["steps"]]),
            "calcFromStepId": recap.get("calcFromStepId", steps[0]["id"]),
            **({"totalVisualStepId": recap["totalVisualStepId"]} if recap.get("totalVisualStepId") else {}),
            "dataQuestion": {
                "prompt": recap.get(
                    "dataQuestionPrompt",
                    f"What does {quantity_token(final_quantity['id'])} represent in the model?",
                ),
                "correctQuantityId": recap.get("correctQuantityId", final_quantity["id"]),
                "distractorQuantityIds": recap.get(
                    "distractorQuantityIds",
                    [q["id"] for q in quantities if q["id"] != final_quantity["id"]][:3],
                ),
                "correctFeedback": recap.get(
                    "correctFeedback",
                    f"Right. {quantity_token(final_quantity['id'])} is {final_quantity['label']['lowercase']}.",
                ),
                "incorrectFeedback": recap.get(
                    "incorrectFeedback",
                    f"Look back at the model for {quantity_token(final_quantity['id'])}.",
                ),
            },
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a StoryMath problem JSON from a compact recipe.")
    parser.add_argument("recipe", type=Path, help="Path to an authoring recipe JSON file.")
    parser.add_argument("-o", "--output", type=Path, help="Output problem JSON path.")
    args = parser.parse_args()

    recipe = json.loads(args.recipe.read_text())
    problem = build_problem(recipe)
    output = args.output or Path("data/problems") / f"{problem['id'].replace('_', '-')}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(problem, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
