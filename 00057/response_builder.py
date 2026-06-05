import json
import os
import random
import re
import time
import uuid


def _resolve_path_vars(template, path_params):
    def replacer(m):
        key = m.group(1)
        return str(path_params.get(key, m.group(0)))
    return re.sub(r"\$path\.(\w+)", replacer, template)


def _resolve_dynamic_vars(template):
    def replacer(m):
        func = m.group(1)
        if func == "timestamp":
            return str(int(time.time()))
        elif func == "timestamp_ms":
            return str(int(time.time() * 1000))
        elif func == "uuid":
            return str(uuid.uuid4())
        elif func.startswith("random_int"):
            inner = m.group(0)
            args_match = re.match(r"\$(random_int\((\d+),\s*(\d+)\))", inner)
            if args_match:
                lo = int(args_match.group(2))
                hi = int(args_match.group(3))
                return str(random.randint(lo, hi))
            return str(random.randint(0, 9999))
        elif func == "random_float":
            return str(round(random.random(), 6))
        elif func.startswith("random_str"):
            inner = m.group(0)
            args_match = re.match(r"\$(random_str\((\d+)\))", inner)
            length = int(args_match.group(2)) if args_match else 8
            chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            return "".join(random.choice(chars) for _ in range(length))
        return m.group(0)

    template = re.sub(
        r"\$(random_int\(\d+,\s*\d+\))", replacer, template
    )
    template = re.sub(r"\$(random_int\b)", replacer, template)
    template = re.sub(r"\$(random_str\(\d+\))", replacer, template)
    template = re.sub(r"\$(random_str\b)", replacer, template)
    for func_name in ["timestamp_ms", "timestamp", "uuid", "random_float"]:
        template = re.sub(rf"\$({func_name})\b", replacer, template)
    return template


def _load_json_file(file_path):
    if not os.path.isabs(file_path):
        base = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base, file_path)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    return json.dumps({"error": f"File not found: {file_path}"})


def build_response(rule, path_params):
    status_code = rule.get("statusCode", 200)
    headers = rule.get("headers", {})
    body_template = rule.get("body", "")

    if rule.get("bodyFile"):
        body_template = _load_json_file(rule["bodyFile"])

    body = _resolve_path_vars(body_template, path_params)
    body = _resolve_dynamic_vars(body)

    delay = rule.get("delay", 0)
    delay_min = rule.get("delayMin", 0)
    delay_max = rule.get("delayMax", 0)

    if delay_min and delay_max and delay_max > delay_min:
        actual_delay = random.uniform(delay_min / 1000.0, delay_max / 1000.0)
    elif delay:
        actual_delay = delay / 1000.0
    else:
        actual_delay = 0

    if actual_delay > 0:
        time.sleep(actual_delay)

    is_json = False
    content_type = headers.get("Content-Type", headers.get("content-type", ""))
    if content_type and "json" in content_type:
        is_json = True
    else:
        try:
            json.loads(body)
            is_json = True
        except (json.JSONDecodeError, TypeError):
            pass

    if is_json and not content_type:
        headers["Content-Type"] = "application/json"

    return status_code, headers, body
