import json
import os
import threading

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
RULES_FILE = os.path.join(DATA_DIR, "rules.json")
LOGS_FILE = os.path.join(DATA_DIR, "request_logs.json")

_lock = threading.Lock()


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def load_rules():
    _ensure_data_dir()
    if not os.path.exists(RULES_FILE):
        return []
    with open(RULES_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_rules(rules):
    _ensure_data_dir()
    with _lock:
        with open(RULES_FILE, "w", encoding="utf-8") as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)


def load_logs():
    _ensure_data_dir()
    if not os.path.exists(LOGS_FILE):
        return []
    with open(LOGS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def append_log(log_entry):
    _ensure_data_dir()
    with _lock:
        logs = load_logs()
        logs.append(log_entry)
        if len(logs) > 1000:
            logs = logs[-1000:]
        with open(LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)


def clear_logs():
    _ensure_data_dir()
    with _lock:
        with open(LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
