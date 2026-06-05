import json
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, render_template, Response

from postman_import import import_postman_collection
from response_builder import build_response
from rule_engine import find_matching_rule
from storage import append_log, clear_logs, load_logs, load_rules, save_rules

app = Flask(__name__, static_folder=None, static_url_path=None)

MANAGEMENT_PREFIX = "/__manage"


@app.route("/")
def index():
    return render_template("index.html")


@app.route(f"{MANAGEMENT_PREFIX}/rules", methods=["GET"])
def get_rules():
    return jsonify(load_rules())


@app.route(f"{MANAGEMENT_PREFIX}/rules", methods=["POST"])
def create_rule():
    data = request.get_json(force=True)
    data["id"] = data.get("id") or str(uuid.uuid4())
    data["enabled"] = data.get("enabled", True)
    data["priority"] = data.get("priority", 0)
    rules = load_rules()
    rules.append(data)
    save_rules(rules)
    return jsonify(data), 201


@app.route(f"{MANAGEMENT_PREFIX}/rules/<rule_id>", methods=["PUT"])
def update_rule(rule_id):
    data = request.get_json(force=True)
    rules = load_rules()
    for i, r in enumerate(rules):
        if r.get("id") == rule_id:
            data["id"] = rule_id
            rules[i] = data
            save_rules(rules)
            return jsonify(data)
    return jsonify({"error": "Rule not found"}), 404


@app.route(f"{MANAGEMENT_PREFIX}/rules/<rule_id>", methods=["DELETE"])
def delete_rule(rule_id):
    rules = load_rules()
    new_rules = [r for r in rules if r.get("id") != rule_id]
    if len(new_rules) == len(rules):
        return jsonify({"error": "Rule not found"}), 404
    save_rules(new_rules)
    return jsonify({"message": "Deleted"}), 200


@app.route(f"{MANAGEMENT_PREFIX}/rules/<rule_id>/toggle", methods=["POST"])
def toggle_rule(rule_id):
    rules = load_rules()
    for r in rules:
        if r.get("id") == rule_id:
            r["enabled"] = not r.get("enabled", True)
            save_rules(rules)
            return jsonify(r)
    return jsonify({"error": "Rule not found"}), 404


@app.route(f"{MANAGEMENT_PREFIX}/rules/reorder", methods=["POST"])
def reorder_rules():
    data = request.get_json(force=True)
    order = data.get("order", [])
    rules = load_rules()
    rule_map = {r["id"]: r for r in rules}
    reordered = []
    for idx, rule_id in enumerate(order):
        if rule_id in rule_map:
            rule_map[rule_id]["priority"] = len(order) - idx
            reordered.append(rule_map[rule_id])
    remaining = [r for r in rules if r["id"] not in order]
    reordered.extend(remaining)
    save_rules(reordered)
    return jsonify(reordered)


@app.route(f"{MANAGEMENT_PREFIX}/logs", methods=["GET"])
def get_logs():
    return jsonify(load_logs())


@app.route(f"{MANAGEMENT_PREFIX}/logs", methods=["DELETE"])
def delete_logs():
    clear_logs()
    return jsonify({"message": "Logs cleared"})


@app.route(f"{MANAGEMENT_PREFIX}/import/postman", methods=["POST"])
def import_postman():
    data = request.get_json(force=True)
    new_rules = import_postman_collection(data)
    rules = load_rules()
    max_priority = max((r.get("priority", 0) for r in rules), default=0)
    for i, r in enumerate(new_rules):
        r["priority"] = max_priority + i + 1
    rules.extend(new_rules)
    save_rules(rules)
    return jsonify({"imported": len(new_rules), "rules": new_rules}), 201


@app.route(f"{MANAGEMENT_PREFIX}/export", methods=["GET"])
def export_rules():
    return jsonify(load_rules())


@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
def mock_handler(path):
    full_path = "/" + path
    method = request.method
    rules = load_rules()
    rule, path_params = find_matching_rule(rules, method, full_path)

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "method": method,
        "path": full_path,
        "matchedRuleId": rule.get("id") if rule else None,
        "matchedRuleName": rule.get("name") if rule else None,
    }
    append_log(log_entry)

    if rule is None:
        return jsonify({"error": "No matching rule found", "path": full_path, "method": method}), 404

    status_code, headers, body = build_response(rule, path_params)
    return Response(body, status=status_code, headers=headers)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
