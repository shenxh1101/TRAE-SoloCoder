import json
import uuid
from urllib.parse import urlparse


def _parse_postman_url(pm_url):
    if isinstance(pm_url, str):
        raw = pm_url
    elif isinstance(pm_url, dict):
        raw = "".join(
            part.get("value", part.get("key", ""))
            for part in pm_url.get("raw", "").split("/")
            if part
        ) if not pm_url.get("raw") else pm_url["raw"]
        if pm_url.get("path"):
            path_parts = pm_url["path"]
            raw_path = "/".join(
                p.get("value", p) if isinstance(p, dict) else p
                for p in path_parts
            )
        else:
            raw_path = ""
        raw = pm_url.get("raw", "")
    else:
        raw = ""

    parsed = urlparse(raw)
    path = parsed.path or ""
    if not path and isinstance(pm_url, dict) and pm_url.get("path"):
        path_parts = pm_url["path"]
        path = "/" + "/".join(
            p.get("value", p) if isinstance(p, dict) else p
            for p in path_parts
        )

    for key in ["host", "protocol", "port"]:
        pass

    return path if path.startswith("/") else "/" + path if path else "/"


def _convert_postman_item(item, priority_offset=0):
    request = item.get("request", {})
    method = request.get("method", "GET")
    pm_url = request.get("url", "")
    path = _parse_postman_url(pm_url)

    responses = request.get("response", [])
    if responses:
        first_resp = responses[0]
        status_code = first_resp.get("code", 200)
        if isinstance(status_code, str):
            try:
                status_code = int(status_code.split()[0])
            except (ValueError, IndexError):
                status_code = 200
        resp_headers = {}
        for h in first_resp.get("header", []):
            resp_headers[h.get("key", h.get("name", ""))] = h.get("value", "")
        body = first_resp.get("body", "")
    else:
        status_code = 200
        resp_headers = {}
        body = ""

    rule = {
        "id": str(uuid.uuid4()),
        "name": item.get("name", ""),
        "method": method,
        "path": path,
        "statusCode": status_code,
        "headers": resp_headers,
        "body": body if isinstance(body, str) else json.dumps(body, ensure_ascii=False),
        "delay": 0,
        "delayMin": 0,
        "delayMax": 0,
        "bodyFile": "",
        "enabled": True,
        "priority": priority_offset,
    }
    return rule


def import_postman_collection(collection_data):
    if isinstance(collection_data, str):
        collection_data = json.loads(collection_data)

    rules = []
    priority = 0

    def process_items(items):
        nonlocal priority
        for item in items:
            if "request" in item:
                rules.append(_convert_postman_item(item, priority))
                priority += 1
            if "item" in item:
                process_items(item["item"])

    if "item" in collection_data:
        process_items(collection_data["item"])
    elif isinstance(collection_data, list):
        process_items(collection_data)

    return rules
