import json
import time
import uuid
from typing import Any, Dict, Optional, Tuple

import requests
from flask import Request, Response, jsonify, request

from .auth import AuthManager
from .config_manager import ConfigManager
from .logger import GatewayLogger
from .rate_limit import RateLimiter
from .transformer import Transformer


class APIGateway:
    def __init__(
        self,
        config_manager: ConfigManager,
        auth_manager: AuthManager,
        rate_limiter: RateLimiter,
        logger: GatewayLogger
    ):
        self.config_manager = config_manager
        self.auth_manager = auth_manager
        self.rate_limiter = rate_limiter
        self.logger = logger
        self.transformer = Transformer()

    def _get_client_ip(self) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.remote_addr or "unknown"

    def _parse_body(self, req: Request) -> Any:
        content_type = req.headers.get("Content-Type", "")
        if "application/json" in content_type:
            try:
                return req.get_json(silent=True) or {}
            except Exception:
                return {}
        elif "application/x-www-form-urlencoded" in content_type:
            return req.form.to_dict()
        else:
            return req.get_data(as_text=True)

    def _build_request_data(self, req: Request) -> Dict[str, Any]:
        return {
            "method": req.method,
            "path": req.path,
            "headers": dict(req.headers),
            "query_params": dict(req.args),
            "body": self._parse_body(req)
        }

    def handle_request(self) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        client_ip = self._get_client_ip()
        user_agent = request.headers.get("User-Agent", "")
        
        log_data = self.logger.create_request_log(
            request_id=request_id,
            method=request.method,
            path=request.path,
            client_ip=client_ip,
            user_agent=user_agent
        )

        try:
            mock_route = self.config_manager.find_mock_route(request.path)
            if mock_route:
                log_data["mock_mode"] = True
                return self._handle_mock(mock_route, log_data, start_time)

            route = self.config_manager.find_route(request.path)
            if not route:
                return self._error_response(
                    404, "Route not found", log_data, start_time
                )

            log_data["route_prefix"] = route.get("path_prefix")
            log_data["backend_url"] = route.get("backend_url")

            rl_config = self.config_manager.get_route_rate_limit(route.get("path_prefix", ""))
            if rl_config:
                allowed, rl_info = self.rate_limiter.check_rate_limit(
                    route.get("path_prefix", ""), rl_config
                )
                log_data["rate_limit_info"] = rl_info
                if not allowed:
                    log_data["rate_limited"] = True
                    return self._error_response(
                        429, "Rate limit exceeded", log_data, start_time,
                        headers={"Retry-After": str(int(rl_info.get("wait_time", 1)) + 1)}
                    )

            auth_success, auth_method, auth_info = self.auth_manager.authenticate(
                request, route
            )
            log_data["auth_method"] = auth_method
            log_data["auth_success"] = auth_success

            if not auth_success:
                return self._error_response(
                    401, "Authentication failed", log_data, start_time,
                    details=auth_info
                )

            return self._proxy_request(route, log_data, start_time)

        except Exception as e:
            self.logger.error(f"Request handling error: {str(e)}", request_id=request_id)
            return self._error_response(
                500, f"Internal server error: {str(e)}", log_data, start_time
            )

    def _handle_mock(
        self,
        mock_route: Dict[str, Any],
        log_data: Dict[str, Any],
        start_time: float
    ) -> Response:
        request_data = self._build_request_data(request)
        transform_config = mock_route.get("transform", {})
        
        if transform_config:
            request_data = self.transformer.transform_request(
                request_data, transform_config
            )

        status_code = mock_route.get("status_code", 200)
        response_headers = mock_route.get("headers", {})
        response_body = mock_route.get("body", {})
        delay_ms = mock_route.get("delay_ms", 0)

        if delay_ms > 0:
            time.sleep(delay_ms / 1000)

        response_data = {
            "status_code": status_code,
            "headers": response_headers,
            "body": response_body
        }

        if transform_config:
            response_data = self.transformer.transform_response(
                response_data, transform_config
            )

        duration = (time.time() - start_time) * 1000
        log_data["status_code"] = status_code
        log_data["duration_ms"] = round(duration, 2)
        log_data["mock_mode"] = True
        self.logger.log_request(log_data)

        if isinstance(response_data["body"], dict):
            resp = jsonify(response_data["body"])
        else:
            resp = Response(str(response_data["body"]))
        
        resp.status_code = response_data["status_code"]
        for key, value in response_data["headers"].items():
            resp.headers[key] = value
        
        resp.headers["X-Request-ID"] = log_data["request_id"]
        resp.headers["X-Mock-Mode"] = "true"
        
        return resp

    def _proxy_request(
        self,
        route: Dict[str, Any],
        log_data: Dict[str, Any],
        start_time: float
    ) -> Response:
        request_data = self._build_request_data(request)
        transform_config = route.get("transform", {})

        if transform_config:
            request_data = self.transformer.transform_request(
                request_data, transform_config
            )

        path_prefix = route.get("path_prefix", "")
        backend_url = route.get("backend_url", "")
        
        target_path = request_data["path"]
        if target_path.startswith(path_prefix):
            target_path = target_path[len(path_prefix):]
            if not target_path.startswith("/"):
                target_path = "/" + target_path

        target_url = backend_url.rstrip("/") + target_path

        headers = request_data["headers"]
        headers.pop("Host", None)
        headers.pop("Content-Length", None)

        timeout = route.get("timeout", 30)

        try:
            proxy_start = time.time()
            proxy_response = requests.request(
                method=request_data["method"],
                url=target_url,
                headers=headers,
                params=request_data["query_params"],
                json=request_data["body"] if isinstance(request_data["body"], dict) else None,
                data=request_data["body"] if not isinstance(request_data["body"], dict) else None,
                timeout=timeout,
                allow_redirects=route.get("follow_redirects", True),
                stream=True
            )
            proxy_duration = (time.time() - proxy_start) * 1000

            response_headers = dict(proxy_response.headers)
            response_headers.pop("Transfer-Encoding", None)
            response_headers.pop("Content-Encoding", None)

            content_type = response_headers.get("Content-Type", "")
            if "application/json" in content_type:
                try:
                    response_body = proxy_response.json()
                except Exception:
                    response_body = proxy_response.text
            else:
                response_body = proxy_response.text

            response_data = {
                "status_code": proxy_response.status_code,
                "headers": response_headers,
                "body": response_body
            }

            if transform_config:
                response_data = self.transformer.transform_response(
                    response_data, transform_config
                )

            duration = (time.time() - start_time) * 1000
            log_data["status_code"] = response_data["status_code"]
            log_data["duration_ms"] = round(duration, 2)
            self.logger.log_request(log_data)

            if isinstance(response_data["body"], dict):
                resp = jsonify(response_data["body"])
            else:
                resp = Response(str(response_data["body"]))
            
            resp.status_code = response_data["status_code"]
            for key, value in response_data["headers"].items():
                if key.lower() not in ["content-length"]:
                    resp.headers[key] = value
            
            resp.headers["X-Request-ID"] = log_data["request_id"]
            resp.headers["X-Gateway-Duration"] = f"{round(duration, 2)}ms"
            resp.headers["X-Proxy-Duration"] = f"{round(proxy_duration, 2)}ms"
            
            return resp

        except requests.Timeout:
            return self._error_response(
                504, "Gateway timeout", log_data, start_time
            )
        except requests.ConnectionError:
            return self._error_response(
                502, "Bad gateway - connection error", log_data, start_time
            )
        except Exception as e:
            return self._error_response(
                500, f"Proxy error: {str(e)}", log_data, start_time
            )

    def _error_response(
        self,
        status_code: int,
        message: str,
        log_data: Dict[str, Any],
        start_time: float,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Response:
        duration = (time.time() - start_time) * 1000
        log_data["status_code"] = status_code
        log_data["duration_ms"] = round(duration, 2)
        log_data["error"] = message
        self.logger.log_request(log_data)

        response_body = {
            "error": message,
            "status_code": status_code,
            "request_id": log_data["request_id"]
        }
        if details:
            response_body["details"] = details

        resp = jsonify(response_body)
        resp.status_code = status_code
        resp.headers["X-Request-ID"] = log_data["request_id"]
        resp.headers["X-Gateway-Duration"] = f"{round(duration, 2)}ms"
        
        if headers:
            for key, value in headers.items():
                resp.headers[key] = value
        
        return resp
