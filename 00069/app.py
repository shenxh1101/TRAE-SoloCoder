import os
from app import create_app
from app.config_manager import ConfigManager
from app.auth import AuthManager
from app.rate_limit import RateLimiter
from app.logger import GatewayLogger
from app.gateway import APIGateway
from app.admin_api import create_admin_blueprint


app = create_app()

config_manager = ConfigManager("config.json")

log_dir = config_manager.get_global("log_dir", "logs")
os.makedirs(log_dir, exist_ok=True)

auth_manager = AuthManager(config_manager)
rate_limiter = RateLimiter()
logger = GatewayLogger(
    log_dir=log_dir,
    log_level=config_manager.get_global("log_level", "INFO")
)
gateway = APIGateway(config_manager, auth_manager, rate_limiter, logger)

if config_manager.get_global("admin_enabled", True):
    admin_prefix = config_manager.get_global("admin_prefix", "/_admin")
    admin_bp = create_admin_blueprint(
        config_manager, rate_limiter, logger, admin_prefix
    )
    app.register_blueprint(admin_bp)


@app.route("/", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
def catch_all(path=""):
    admin_prefix = config_manager.get_global("admin_prefix", "/_admin")
    if path.startswith(admin_prefix.lstrip("/")):
        return "Not Found", 404
    return gateway.handle_request()


if __name__ == "__main__":
    host = config_manager.get_global("host", "0.0.0.0")
    port = config_manager.get_global("port", 5000)
    
    logger.info(f"Starting API Gateway on {host}:{port}")
    logger.info(f"Admin interface available at http://localhost:{port}{config_manager.get_global('admin_prefix', '/_admin')}")
    
    app.run(host=host, port=port, debug=False, threaded=True)
