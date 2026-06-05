import re


def _pattern_to_regex(pattern):
    regex = ""
    i = 0
    while i < len(pattern):
        if pattern[i] == ":" and (i == 0 or pattern[i - 1] != "\\"):
            j = i + 1
            while j < len(pattern) and (pattern[j].isalnum() or pattern[j] == "_"):
                j += 1
            param_name = pattern[i + 1 : j]
            regex += f"(?P<{param_name}>[^/]+)"
            i = j
        else:
            if pattern[i] in r"\.^$*+?{}[]|()":
                regex += "\\"
            regex += pattern[i]
            i += 1
    return regex


def match_rule(rule, method, path):
    if not rule.get("enabled", True):
        return None
    if rule.get("method", "GET").upper() != method.upper():
        return None
    pattern = rule.get("path", "")
    regex_str = _pattern_to_regex(pattern)
    regex_str = f"^{regex_str}$"
    m = re.match(regex_str, path)
    if m:
        return m.groupdict()
    return None


def find_matching_rule(rules, method, path):
    sorted_rules = sorted(rules, key=lambda r: r.get("priority", 0), reverse=True)
    for rule in sorted_rules:
        params = match_rule(rule, method, path)
        if params is not None:
            return rule, params
    return None, None
