from __future__ import annotations

import re


def parse_version(version: str) -> list[int]:
    version = version.strip()

    if version.startswith("v"):
        version = version[1:]

    if "-" in version:
        version = version.split("-")[0]

    match = re.search(r'(\d+)\.(\d+)\.(\d+)', version)
    if match:
        return [int(match.group(1)), int(match.group(2)), int(match.group(3))]

    match_two = re.search(r'(\d+)\.(\d+)', version)
    if match_two:
        return [int(match_two.group(1)), int(match_two.group(2)), 0]

    match_one = re.search(r'(\d+)', version)
    if match_one:
        return [int(match_one.group(1)), 0, 0]

    return [0, 0, 0]


def compare_versions(v1: str, v2: str) -> int:
    p1 = parse_version(v1)
    p2 = parse_version(v2)

    if p1 > p2:
        return 1
    elif p1 < p2:
        return -1
    return 0


def is_version_greater(v1: str, v2: str) -> bool:
    return compare_versions(v1, v2) > 0


def is_version_less(v1: str, v2: str) -> bool:
    return compare_versions(v1, v2) < 0


def is_version_equal(v1: str, v2: str) -> bool:
    return compare_versions(v1, v2) == 0


def is_version_in_range(version: str, range_str: str) -> bool:
    version_parts = parse_version(version)

    conditions = range_str.split(",")
    for condition in conditions:
        condition = condition.strip()

        match = re.match(r'([<>=!~]+)\s*(.+)', condition)
        if not match:
            continue

        operator = match.group(1)
        target = match.group(2)
        target_parts = parse_version(target)

        if operator in ["<", "<="]:
            if not (version_parts < target_parts or (operator == "<=" and version_parts == target_parts)):
                return False
        elif operator in [">", ">="]:
            if not (version_parts > target_parts or (operator == ">=" and version_parts == target_parts)):
                return False
        elif operator == "==":
            if version_parts != target_parts:
                return False
        elif operator == "!=":
            if version_parts == target_parts:
                return False

    return True
