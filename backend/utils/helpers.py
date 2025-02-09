"""Module containing helper functions for the backend."""

from land_value.data_manager import all_manager
from utils.models import Plan, ReportPlan
from django.db.models import Sum


def get_metadata_state(args):
    state = "maharashtra"
    if "state" in args:
        state = args["state"]
    all_manager_obj = all_manager()
    entries = all_manager_obj.get_active_metadata(state)

    hierarchy = {}

    for entry in entries:
        d_code = entry[0]
        d_name = entry[1]
        t_code = entry[3]
        t_name = entry[4]
        v_code = entry[6]
        v_name = entry[7]

        district = hierarchy.setdefault(
            d_code, {"code": d_code, "name": d_name, "talukas": {}}
        )

        taluka = district["talukas"].setdefault(
            t_code, {"code": t_code, "name": t_name, "villages": []}
        )

        taluka["villages"].append({"code": v_code, "name": v_name})

    result = []
    for district in hierarchy.values():
        talukas = list(district["talukas"].values())
        for taluka in talukas:
            taluka["villages"].sort(key=lambda v: v["name"])
        talukas.sort(key=lambda t: t["name"])
        result.append(
            {"code": district["code"], "name": district["name"], "talukas": talukas}
        )

    result.sort(key=lambda d: d["name"])
    return result


def has_plan_access(user, args) -> bool:
    """Check if the user has access to the requested data."""

    plans = Plan.objects.filter(user=user)
    if not plans.exists():
        return False

    metadata = {d["name"]: d for d in get_metadata_state({"state": "maharashtra"})}

    village_accessible, talukas_accessible, districts_accessible = set(), set(), set()

    for plan in plans:
        entity_name = plan.entity_name
        if plan.entity_type == "village":
            village_accessible.add(entity_name)
        elif plan.entity_type == "taluka":
            talukas_accessible.add(entity_name)
            for district in metadata.values():
                for taluka in district["talukas"]:
                    if taluka["name"] == entity_name:
                        village_accessible.update(v["name"] for v in taluka["villages"])
        elif plan.entity_type == "district":
            districts_accessible.add(entity_name)
            if entity_name in metadata:
                for taluka in metadata[entity_name]["talukas"]:
                    talukas_accessible.add(taluka["name"])
                    village_accessible.update(v["name"] for v in taluka["villages"])

    access_map = {
        "village": village_accessible,
        "taluka": talukas_accessible,
        "district": districts_accessible,
    }

    return args["entity_name"] in access_map.get(args["entity_type"], set())


def has_report_access(user, quantity):
    """Checks if the user has access to the requested report and determines how much to deduct from each plan."""

    report_plans = ReportPlan.objects.filter(user=user)

    if not report_plans.exists():
        return False, {}

    total_quantity = report_plans.aggregate(total=Sum("quantity"))["total"] or 0

    if total_quantity < quantity:
        return False, {}

    plans_quantity = {}
    for report_plan in report_plans:
        if quantity == 0:
            break

        deduct = min(report_plan.quantity, quantity)
        plans_quantity[report_plan.plan_id] = deduct
        quantity -= deduct

    return True, plans_quantity
