import base64
import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple

import jwt
from flask import Request


class AuthManager:
    def __init__(self, config_manager):
        self.config_manager = config_manager

    def authenticate(self, request: Request, route: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        auth_config = route.get("auth", {})
        
        if not auth_config.get("enabled", True):
            return True, "auth_disabled", {}

        auth_methods = auth_config.get("methods", ["api_key", "jwt", "basic_auth"])
        
        auth_info = {}
        for method in auth_methods:
            if method == "api_key":
                success, info = self._check_api_key(request)
                if success:
                    return True, "api_key", info
                auth_info["api_key"] = info
            elif method == "jwt":
                success, info = self._check_jwt(request)
                if success:
                    return True, "jwt", info
                auth_info["jwt"] = info
            elif method == "basic_auth":
                success, info = self._check_basic_auth(request)
                if success:
                    return True, "basic_auth", info
                auth_info["basic_auth"] = info

        return False, "failed", auth_info

    def _check_api_key(self, request: Request) -> Tuple[bool, Dict[str, Any]]:
        auth_config = self.config_manager.get_auth_config()
        api_keys = auth_config.get("api_keys", [])
        
        if not api_keys:
            return False, {"error": "no_api_keys_configured"}

        for key_config in api_keys:
            key_name = key_config.get("name", "X-API-Key")
            location = key_config.get("location", "header")
            valid_keys = key_config.get("keys", [])

            client_key = None
            if location == "header":
                client_key = request.headers.get(key_name)
            elif location == "query":
                client_key = request.args.get(key_name)

            if client_key and client_key in valid_keys:
                return True, {
                    "key_name": key_name,
                    "location": location,
                    "client_key_hash": hashlib.sha256(client_key.encode()).hexdigest()[:16]
                }

        return False, {"error": "invalid_or_missing_api_key"}

    def _check_jwt(self, request: Request) -> Tuple[bool, Dict[str, Any]]:
        auth_config = self.config_manager.get_auth_config()
        jwt_config = auth_config.get("jwt", {})
        
        if not jwt_config.get("enabled", False):
            return False, {"error": "jwt_not_enabled"}

        header_name = jwt_config.get("header", "Authorization")
        prefix = jwt_config.get("prefix", "Bearer ")
        secret_or_key = jwt_config.get("secret", "") or jwt_config.get("public_key", "")
        algorithm = jwt_config.get("algorithm", "RS256")
        algorithms = jwt_config.get("algorithms", [algorithm])
        issuer = jwt_config.get("issuer")
        audience = jwt_config.get("audience")

        auth_header = request.headers.get(header_name, "")
        if not auth_header.startswith(prefix):
            return False, {"error": "invalid_authorization_header"}

        token = auth_header[len(prefix):].strip()
        
        if not token:
            return False, {"error": "empty_token"}
        
        try:
            if not secret_or_key:
                return False, {"error": "jwt_secret_or_public_key_not_configured"}
            
            decode_kwargs = {
                "algorithms": algorithms,
            }
            if issuer:
                decode_kwargs["issuer"] = issuer
            if audience:
                decode_kwargs["audience"] = audience
            
            payload = jwt.decode(token, secret_or_key, **decode_kwargs)
            return True, {
                "payload": payload,
                "algorithm": algorithm
            }
        except jwt.ExpiredSignatureError:
            return False, {"error": "jwt_token_expired"}
        except jwt.InvalidAudienceError:
            return False, {"error": "jwt_invalid_audience"}
        except jwt.InvalidIssuerError:
            return False, {"error": "jwt_invalid_issuer"}
        except jwt.DecodeError as e:
            return False, {"error": f"jwt_decode_error: {str(e)}"}
        except jwt.InvalidTokenError as e:
            return False, {"error": f"jwt_invalid: {str(e)}"}

    def _check_basic_auth(self, request: Request) -> Tuple[bool, Dict[str, Any]]:
        auth_config = self.config_manager.get_auth_config()
        basic_config = auth_config.get("basic_auth", {})
        
        if not basic_config.get("enabled", False):
            return False, {"error": "basic_auth_not_enabled"}

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Basic "):
            return False, {"error": "missing_basic_auth_header"}

        try:
            encoded = auth_header[6:]
            decoded = base64.b64decode(encoded).decode("utf-8")
            if ":" not in decoded:
                return False, {"error": "invalid_basic_auth_format"}
            username, password = decoded.split(":", 1)
        except Exception:
            return False, {"error": "invalid_basic_auth_format"}

        if not username or not password:
            return False, {"error": "empty_username_or_password"}

        users = basic_config.get("users", [])
        for user in users:
            if user.get("username") == username:
                stored_password = user.get("password", "")
                password_hash = user.get("password_hash", "")
                
                if password_hash:
                    input_hash = hashlib.sha256(password.encode()).hexdigest()
                    if input_hash == password_hash:
                        return True, {
                            "username": username,
                            "roles": user.get("roles", [])
                        }
                elif stored_password and stored_password == password:
                    return True, {
                        "username": username,
                        "roles": user.get("roles", [])
                    }

        return False, {"error": "invalid_username_or_password"}
