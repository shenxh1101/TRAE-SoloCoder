import threading
import time
from collections import defaultdict
from typing import Any, Dict, Optional, Tuple


class RateLimiter:
    def __init__(self):
        self._buckets: Dict[str, Any] = defaultdict(dict)
        self._lock = threading.Lock()

    def _get_client_ip(self) -> str:
        from flask import request
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.remote_addr or "unknown"

    def check_rate_limit(self, route_prefix: str, config: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        if not config.get("enabled", False):
            return True, {"enabled": False}

        client_ip = self._get_client_ip()
        algorithm = config.get("algorithm", "token_bucket")
        key = f"{route_prefix}:{client_ip}"

        info = {
            "client_ip": client_ip,
            "algorithm": algorithm,
            "route_prefix": route_prefix
        }

        if algorithm == "token_bucket":
            allowed, bucket_info = self._token_bucket(key, config)
            info.update(bucket_info)
            return allowed, info
        elif algorithm == "leaky_bucket":
            allowed, bucket_info = self._leaky_bucket(key, config)
            info.update(bucket_info)
            return allowed, info
        else:
            return True, {"error": "unknown_algorithm"}

    def _token_bucket(self, key: str, config: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        capacity = config.get("capacity", 100)
        rate = config.get("rate", 10)

        with self._lock:
            now = time.time()
            bucket = self._buckets.get(key, {
                "tokens": capacity,
                "last_refill": now
            })

            elapsed = now - bucket["last_refill"]
            new_tokens = elapsed * rate
            bucket["tokens"] = min(capacity, bucket["tokens"] + new_tokens)
            bucket["last_refill"] = now

            info = {
                "capacity": capacity,
                "rate": rate,
                "remaining_tokens": bucket["tokens"],
                "wait_time": 0
            }

            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                self._buckets[key] = bucket
                return True, info
            else:
                self._buckets[key] = bucket
                info["wait_time"] = (1 - bucket["tokens"]) / rate
                return False, info

    def _leaky_bucket(self, key: str, config: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        capacity = config.get("capacity", 100)
        rate = config.get("rate", 10)

        with self._lock:
            now = time.time()
            bucket = self._buckets.get(key, {
                "queue": [],
                "last_leak": now
            })

            elapsed = now - bucket["last_leak"]
            leaked = int(elapsed * rate)
            bucket["queue"] = bucket["queue"][leaked:] if leaked < len(bucket["queue"]) else []
            bucket["last_leak"] = now

            queue_size_before = len(bucket["queue"])
            info = {
                "capacity": capacity,
                "rate": rate,
                "wait_time": queue_size_before / rate
            }

            if queue_size_before < capacity:
                bucket["queue"].append(now)
                self._buckets[key] = bucket
                info["queue_size"] = queue_size_before + 1
                return True, info
            else:
                self._buckets[key] = bucket
                info["queue_size"] = queue_size_before
                info["wait_time"] = (queue_size_before - capacity + 1) / rate
                return False, info

    def reset(self, route_prefix: Optional[str] = None, client_ip: Optional[str] = None) -> None:
        with self._lock:
            if route_prefix and client_ip:
                key = f"{route_prefix}:{client_ip}"
                self._buckets.pop(key, None)
            elif route_prefix:
                keys_to_remove = [k for k in self._buckets if k.startswith(f"{route_prefix}:")]
                for k in keys_to_remove:
                    self._buckets.pop(k, None)
            elif client_ip:
                keys_to_remove = [k for k in self._buckets if k.endswith(f":{client_ip}")]
                for k in keys_to_remove:
                    self._buckets.pop(k, None)
            else:
                self._buckets.clear()

    def get_stats(self, route_prefix: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            stats = {}
            for key, bucket in self._buckets.items():
                if route_prefix and not key.startswith(f"{route_prefix}:"):
                    continue
                parts = key.split(":", 1)
                if len(parts) == 2:
                    route, ip = parts
                    if route not in stats:
                        stats[route] = {}
                    if "tokens" in bucket:
                        stats[route][ip] = {
                            "algorithm": "token_bucket",
                            "tokens": bucket["tokens"],
                            "last_refill": bucket["last_refill"]
                        }
                    else:
                        stats[route][ip] = {
                            "algorithm": "leaky_bucket",
                            "queue_size": len(bucket["queue"]),
                            "last_leak": bucket["last_leak"]
                        }
            return stats
