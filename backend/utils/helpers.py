"""Module containing helper functions for the backend."""

from land_value.data_manager import all_manager


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

        district = hierarchy.setdefault(d_code, {
            'code': d_code,
            'name': d_name,
            'talukas': {}
        })

        taluka = district['talukas'].setdefault(t_code, {
            'code': t_code,
            'name': t_name,
            'villages': []
        })

        taluka['villages'].append({'code': v_code, 'name': v_name})

    result = []
    for district in hierarchy.values():
        talukas = list(district['talukas'].values())
        for taluka in talukas:
            taluka['villages'].sort(key=lambda v: v['name'])
        talukas.sort(key=lambda t: t['name'])
        result.append({
            'code': district['code'],
            'name': district['name'],
            'talukas': talukas
        })

    result.sort(key=lambda d: d['name'])
    return result
