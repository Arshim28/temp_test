"""Module containing helper functions for the backend."""

from land_value.data_manager.all_manager.mh_all_manager import mh_all_manager

from utils.models import Plan, ReportPlan
from django.db.models import Sum
from django.db.models import Count, F

def get_metadata_state():

    mh_all_manager_obj = mh_all_manager()
    entries = mh_all_manager_obj.get_active_metadata()

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


def has_plan_access(user, table) -> bool:
    """Check if the user has access to the requested data."""

    metadata = {d["name"]: d for d in get_metadata_state()}

    district = table.split(".", 1)[0] if "." in table else None
    taluka = None
    layer = None
    if district and "_" in district:
        taluka = district.split("_")[0]
        layer = district.split("_")[1]
        district = None

    args = {}
    if district:
        district = district.upper()
        taluka = table.split(".")[1].split("_")[0]
        if taluka in metadata[district]["talukas"]:
            args = {"entity_type": "taluka", "entity_name": taluka}
        else:
            args = {"entity_type": "district", "entity_name": district}

    plans = Plan.objects.filter(user=user)
    if not plans.exists():
        return False

    village_accessible, talukas_accessible, districts_accessible = set(), set(), set()

    for plan in plans:
        entity_name = plan.entity_name
        print(entity_name)
        if plan.plan_type == "Village":
            village_accessible.add(entity_name)
        elif plan.plan_type == "Taluka":
            talukas_accessible.add(entity_name)
            for district in metadata.values():
                for taluka in district["talukas"]:
                    if taluka["name"] == entity_name:
                        village_accessible.update(v["name"] for v in taluka["villages"])
        elif plan.plan_type == "District":
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


def has_report_access(user, quantity=1):
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

def get_report_access_plan(user) -> ReportPlan | None:
    """
    Returns the first available ReportPlan where the user has remaining transactions.
    If no such plan exists, returns None.
    """

    report_plans = ReportPlan.objects.filter(user=user).annotate(
        used_transactions=Count("transactions")
    ).filter(used_transactions__lt=F("quantity")).order_by("id")  # Order by ID for consistency

    return report_plans.first()

if __name__ == "__main__":

    user = "random"
    quantity = 10
    print(has_plan_access(user, quantity))
