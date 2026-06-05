import json
import os
import threading
import time
from typing import Any, Dict, List, Optional


class ConfigManager:
    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self._config: Dict[str, Any] = {}
        self._last_modified: float = 0
        self._lock = threading.RLock()
        self._load_config()

    def _load_config(self) -> None:
        if not os.path.exists(self.config_path):
            self._config = self._default_config()
            self._save_config()
        else:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self._config = json.load(f)
            self._last_modified = os.path.getmtime(self.config_path)

    def _default_config(self) -> Dict[str, Any]:
        return {
            "global": {
                "port": 5000,
                "host": "0.0.0.0",
                "log_level": "INFO",
                "log_dir": "logs",
                "admin_enabled": True,
                "admin_prefix": "/_admin",
                "hot_reload_interval": 5
            },
            "auth": {
                "api_keys": [],
                "jwt": {
                    "enabled": False,
                    "public_key": "",
                    "algorithm": "RS256",
                    "header": "Authorization",
                    "prefix": "Bearer "
                },
                "basic_auth": {
                    "enabled": False,
                    "users": []
                }
            },
            "rate_limit": {
                "default": {
                    "enabled": False,
                    "algorithm": "token_bucket",
                    "capacity": 100,
                    "rate": 10,
                    "per_route": {}
                }
            },
            "routes": [],
            "mock_routes": []
        }

    def _save_config(self) -> None:
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(self._config, f, indent=2, ensure_ascii=False)
        self._last_modified = os.path.getmtime(self.config_path)

    def reload_if_needed(self) -> bool:
        with self._lock:
            if not os.path.exists(self.config_path):
                return False
            current_mtime = os.path.getmtime(self.config_path)
            if current_mtime > self._last_modified:
                self._load_config()
                return True
            return False

    def get_config(self) -> Dict[str, Any]:
        self.reload_if_needed()
        with self._lock:
            return json.loads(json.dumps(self._config))

    def update_config(self, new_config: Dict[str, Any]) -> None:
        with self._lock:
            self._config = new_config
            self._save_config()

    def get_global(self, key: str, default: Any = None) -> Any:
        self.reload_if_needed()
        with self._lock:
            return self._config.get("global", {}).get(key, default)

    def get_routes(self) -> List[Dict[str, Any]]:
        self.reload_if_needed()
        with self._lock:
            return json.loads(json.dumps(self._config.get("routes", [])))

    def add_route(self, route: Dict[str, Any]) -> None:
        with self._lock:
            self._config.setdefault("routes", []).append(route)
            self._save_config()

    def update_route(self, path_prefix: str, route: Dict[str, Any]) -> bool:
        with self._lock:
            routes = self._config.get("routes", [])
            for i, r in enumerate(routes):
                if r.get("path_prefix") == path_prefix:
                    routes[i] = route
                    self._save_config()
                    return True
            return False

    def delete_route(self, path_prefix: str) -> bool:
        with self._lock:
            routes = self._config.get("routes", [])
            for i, r in enumerate(routes):
                if r.get("path_prefix") == path_prefix:
                    del routes[i]
                    self._save_config()
                    return True
            return False

    def get_mock_routes(self) -> List[Dict[str, Any]]:
        self.reload_if_needed()
        with self._lock:
            return json.loads(json.dumps(self._config.get("mock_routes", [])))

    def add_mock_route(self, mock_route: Dict[str, Any]) -> None:
        with self._lock:
            self._config.setdefault("mock_routes", []).append(mock_route)
            self._save_config()

    def update_mock_route(self, path: str, mock_route: Dict[str, Any]) -> bool:
        with self._lock:
            mock_routes = self._config.get("mock_routes", [])
            for i, r in enumerate(mock_routes):
                if r.get("path") == path:
                    mock_routes[i] = mock_route
                    self._save_config()
                    return True
            return False

    def delete_mock_route(self, path: str) -> bool:
        with self._lock:
            mock_routes = self._config.get("mock_routes", [])
            for i, r in enumerate(mock_routes):
                if r.get("path") == path:
                    del mock_routes[i]
                    self._save_config()
                    return True
            return False

    def get_auth_config(self) -> Dict[str, Any]:
        self.reload_if_needed()
        with self._lock:
            return json.loads(json.dumps(self._config.get("auth", {})))

    def update_auth_config(self, auth_config: Dict[str, Any]) -> None:
        with self._lock:
            self._config["auth"] = auth_config
            self._save_config()

    def get_rate_limit_config(self) -> Dict[str, Any]:
        self.reload_if_needed()
        with self._lock:
            return json.loads(json.dumps(self._config.get("rate_limit", {})))

    def update_rate_limit_config(self, rate_limit_config: Dict[str, Any]) -> None:
        with self._lock:
            self._config["rate_limit"] = rate_limit_config
            self._save_config()

    def get_route_rate_limit(self, path_prefix: str) -> Optional[Dict[str, Any]]:
        self.reload_if_needed()
        with self._lock:
            rl_config = self._config.get("rate_limit", {})
            default = rl_config.get("default", {})
            per_route = default.get("per_route", {})
            if path_prefix in per_route:
                return json.loads(json.dumps(per_route[path_prefix]))
            return json.loads(json.dumps(default)) if default.get("enabled") else None

    def find_route(self, path: str) -> Optional[Dict[str, Any]]:
        self.reload_if_needed()
        with self._lock:
            routes = self._config.get("routes", [])
            for route in routes:
                prefix = route.get("path_prefix", "")
                if path.startswith(prefix):
                    return json.loads(json.dumps(route))
            return None

    def find_mock_route(self, path: str) -> Optional[Dict[str, Any]]:
        self.reload_if_needed()
        with self._lock:
            mock_routes = self._config.get("mock_routes", [])
            for mock in mock_routes:
                if path == mock.get("path"):
                    return json.loads(json.dumps(mock))
            return None
