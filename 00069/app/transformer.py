import copy
import json
import re
from typing import Any, Dict, List, Optional, Tuple


class Transformer:
    @staticmethod
    def transform_request(
        request_data: Dict[str, Any],
        transform_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not transform_config:
            return request_data

        result = copy.deepcopy(request_data)

        headers = result.get("headers", {})
        query_params = result.get("query_params", {})
        body = result.get("body", {})
        method = result.get("method", "GET")
        path = result.get("path", "")

        req_transform = transform_config.get("request", {})

        add_headers = req_transform.get("add_headers", {})
        for key, value in add_headers.items():
            headers[key] = value

        remove_headers = req_transform.get("remove_headers", [])
        for key in remove_headers:
            headers.pop(key, None)

        rename_headers = req_transform.get("rename_headers", {})
        for old_key, new_key in rename_headers.items():
            if old_key in headers:
                headers[new_key] = headers.pop(old_key)

        add_query_params = req_transform.get("add_query_params", {})
        for key, value in add_query_params.items():
            query_params[key] = value

        remove_query_params = req_transform.get("remove_query_params", [])
        for key in remove_query_params:
            query_params.pop(key, None)

        if isinstance(body, dict):
            add_body_fields = req_transform.get("add_body_fields", {})
            for key, value in add_body_fields.items():
                Transformer._set_nested_field(body, key, value)

            remove_body_fields = req_transform.get("remove_body_fields", [])
            for key in remove_body_fields:
                Transformer._remove_nested_field(body, key)

            rename_body_fields = req_transform.get("rename_body_fields", {})
            for old_key, new_key in rename_body_fields.items():
                Transformer._rename_nested_field(body, old_key, new_key)

        rewrite_path = req_transform.get("rewrite_path")
        if rewrite_path:
            path = Transformer._rewrite_path(path, rewrite_path)

        rewrite_method = req_transform.get("rewrite_method")
        if rewrite_method:
            method = rewrite_method.upper()

        result.update({
            "headers": headers,
            "query_params": query_params,
            "body": body,
            "method": method,
            "path": path
        })

        return result

    @staticmethod
    def transform_response(
        response_data: Dict[str, Any],
        transform_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not transform_config:
            return response_data

        result = copy.deepcopy(response_data)

        headers = result.get("headers", {})
        body = result.get("body", {})

        resp_transform = transform_config.get("response", {})

        add_headers = resp_transform.get("add_headers", {})
        for key, value in add_headers.items():
            headers[key] = value

        remove_headers = resp_transform.get("remove_headers", [])
        for key in remove_headers:
            headers.pop(key, None)

        hide_sensitive_fields = resp_transform.get("hide_sensitive_fields", [])
        if isinstance(body, dict):
            for field in hide_sensitive_fields:
                Transformer._mask_nested_field(body, field)

        add_body_fields = resp_transform.get("add_body_fields", {})
        if isinstance(body, dict):
            for key, value in add_body_fields.items():
                Transformer._set_nested_field(body, key, value)

        remove_body_fields = resp_transform.get("remove_body_fields", [])
        if isinstance(body, dict):
            for key in remove_body_fields:
                Transformer._remove_nested_field(body, key)

        result.update({
            "headers": headers,
            "body": body
        })

        return result

    @staticmethod
    def _set_nested_field(obj: Dict[str, Any], path: str, value: Any) -> None:
        keys = path.split(".")
        current = obj
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    @staticmethod
    def _remove_nested_field(obj: Dict[str, Any], path: str) -> None:
        keys = path.split(".")
        current = obj
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                return
            current = current[key]
        current.pop(keys[-1], None)

    @staticmethod
    def _rename_nested_field(obj: Dict[str, Any], old_path: str, new_path: str) -> None:
        value = Transformer._get_nested_field(obj, old_path)
        if value is not None:
            Transformer._remove_nested_field(obj, old_path)
            Transformer._set_nested_field(obj, new_path, value)

    @staticmethod
    def _get_nested_field(obj: Dict[str, Any], path: str) -> Optional[Any]:
        keys = path.split(".")
        current = obj
        for key in keys:
            if key not in current:
                return None
            current = current[key]
        return current

    @staticmethod
    def _mask_nested_field(obj: Dict[str, Any], path: str) -> None:
        keys = path.split(".")
        current = obj
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                return
            current = current[key]
        if keys[-1] in current:
            value = current[keys[-1]]
            if isinstance(value, str):
                current[keys[-1]] = "*" * len(value) if len(value) <= 8 else value[:2] + "*" * (len(value) - 4) + value[-2:]
            elif isinstance(value, (int, float)):
                current[keys[-1]] = "***"
            elif isinstance(value, dict):
                current[keys[-1]] = "***"

    @staticmethod
    def _rewrite_path(path: str, rewrite_config: Dict[str, Any]) -> str:
        pattern = rewrite_config.get("pattern", "")
        replacement = rewrite_config.get("replacement", "")
        
        if pattern and replacement:
            replacement = re.sub(r'\$(\d+)', r'\\\1', replacement)
            return re.sub(pattern, replacement, path)
        return path
