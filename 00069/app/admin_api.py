from flask import Blueprint, jsonify, request, render_template
from typing import Any, Dict

from .config_manager import ConfigManager
from .logger import GatewayLogger
from .rate_limit import RateLimiter


def create_admin_blueprint(
    config_manager: ConfigManager,
    rate_limiter: RateLimiter,
    logger: GatewayLogger,
    admin_prefix: str = "/_admin"
) -> Blueprint:
    admin_bp = Blueprint("admin", __name__, url_prefix=admin_prefix)

    @admin_bp.route("/")
    def index():
        return render_template("admin.html")

    @admin_bp.route("/api/config")
    def get_config():
        return jsonify(config_manager.get_config())

    @admin_bp.route("/api/config", methods=["PUT"])
    def update_config():
        new_config = request.get_json()
        config_manager.update_config(new_config)
        return jsonify({"message": "Config updated successfully"})

    @admin_bp.route("/api/config/reload", methods=["POST"])
    def reload_config():
        reloaded = config_manager.reload_if_needed()
        return jsonify({
            "message": "Config checked",
            "reloaded": reloaded
        })

    @admin_bp.route("/api/routes")
    def get_routes():
        return jsonify(config_manager.get_routes())

    @admin_bp.route("/api/routes", methods=["POST"])
    def add_route():
        route = request.get_json()
        if not route.get("path_prefix") or not route.get("backend_url"):
            return jsonify({"error": "path_prefix and backend_url are required"}), 400
        config_manager.add_route(route)
        return jsonify({"message": "Route added successfully", "route": route}), 201

    @admin_bp.route("/api/routes/<path:path_prefix>", methods=["GET"])
    def get_route(path_prefix):
        routes = config_manager.get_routes()
        for route in routes:
            if route.get("path_prefix") == "/" + path_prefix:
                return jsonify(route)
        return jsonify({"error": "Route not found"}), 404

    @admin_bp.route("/api/routes/<path:path_prefix>", methods=["PUT"])
    def update_route(path_prefix):
        route = request.get_json()
        full_prefix = "/" + path_prefix
        if config_manager.update_route(full_prefix, route):
            return jsonify({"message": "Route updated successfully"})
        return jsonify({"error": "Route not found"}), 404

    @admin_bp.route("/api/routes/<path:path_prefix>", methods=["DELETE"])
    def delete_route(path_prefix):
        full_prefix = "/" + path_prefix
        if config_manager.delete_route(full_prefix):
            rate_limiter.reset(route_prefix=full_prefix)
            return jsonify({"message": "Route deleted successfully"})
        return jsonify({"error": "Route not found"}), 404

    @admin_bp.route("/api/mock-routes")
    def get_mock_routes():
        return jsonify(config_manager.get_mock_routes())

    @admin_bp.route("/api/mock-routes", methods=["POST"])
    def add_mock_route():
        mock_route = request.get_json()
        if not mock_route.get("path"):
            return jsonify({"error": "path is required"}), 400
        config_manager.add_mock_route(mock_route)
        return jsonify({"message": "Mock route added successfully", "mock_route": mock_route}), 201

    @admin_bp.route("/api/mock-routes/<path:path>", methods=["GET"])
    def get_mock_route(path):
        mock_routes = config_manager.get_mock_routes()
        for mock in mock_routes:
            if mock.get("path") == "/" + path:
                return jsonify(mock)
        return jsonify({"error": "Mock route not found"}), 404

    @admin_bp.route("/api/mock-routes/<path:path>", methods=["PUT"])
    def update_mock_route(path):
        mock_route = request.get_json()
        full_path = "/" + path
        if config_manager.update_mock_route(full_path, mock_route):
            return jsonify({"message": "Mock route updated successfully"})
        return jsonify({"error": "Mock route not found"}), 404

    @admin_bp.route("/api/mock-routes/<path:path>", methods=["DELETE"])
    def delete_mock_route(path):
        full_path = "/" + path
        if config_manager.delete_mock_route(full_path):
            return jsonify({"message": "Mock route deleted successfully"})
        return jsonify({"error": "Mock route not found"}), 404

    @admin_bp.route("/api/auth")
    def get_auth_config():
        return jsonify(config_manager.get_auth_config())

    @admin_bp.route("/api/auth", methods=["PUT"])
    def update_auth_config():
        auth_config = request.get_json()
        config_manager.update_auth_config(auth_config)
        return jsonify({"message": "Auth config updated successfully"})

    @admin_bp.route("/api/rate-limit")
    def get_rate_limit_config():
        return jsonify(config_manager.get_rate_limit_config())

    @admin_bp.route("/api/rate-limit", methods=["PUT"])
    def update_rate_limit_config():
        rl_config = request.get_json()
        config_manager.update_rate_limit_config(rl_config)
        rate_limiter.reset()
        return jsonify({"message": "Rate limit config updated successfully"})

    @admin_bp.route("/api/rate-limit/stats")
    def get_rate_limit_stats():
        route_prefix = request.args.get("route_prefix")
        stats = rate_limiter.get_stats(route_prefix)
        return jsonify(stats)

    @admin_bp.route("/api/rate-limit/reset", methods=["POST"])
    def reset_rate_limit():
        data = request.get_json(silent=True) or {}
        route_prefix = data.get("route_prefix")
        client_ip = data.get("client_ip")
        rate_limiter.reset(route_prefix=route_prefix, client_ip=client_ip)
        return jsonify({"message": "Rate limit counters reset successfully"})

    @admin_bp.route("/api/logs")
    def get_logs():
        date = request.args.get("date")
        path = request.args.get("path")
        status_code = request.args.get("status_code", type=int)
        client_ip = request.args.get("client_ip")
        limit = request.args.get("limit", 100, type=int)
        
        logs = logger.query_logs(
            date=date,
            path=path,
            status_code=status_code,
            client_ip=client_ip,
            limit=limit
        )
        return jsonify(logs)

    @admin_bp.route("/api/logs/files")
    def get_log_files():
        return jsonify(logger.get_log_files())

    @admin_bp.route("/api/logs/files/<filename>")
    def read_log_file(filename):
        lines = request.args.get("lines", 100, type=int)
        content = logger.read_log_file(filename, lines)
        return jsonify({"filename": filename, "lines": content})

    @admin_bp.route("/api/health")
    def health_check():
        return jsonify({
            "status": "healthy",
            "config_loaded": config_manager.get_config() is not None
        })

    return admin_bp
