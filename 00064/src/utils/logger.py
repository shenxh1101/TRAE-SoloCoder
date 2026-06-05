import logging
import os
from datetime import datetime
from src.models.database import SessionLocal
from src.models.models import OperationLog

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, f'training_system_{datetime.now().strftime("%Y%m")}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('TrainingSystem')


def log_operation(operator, operation, target_type=None, target_id=None, details=None, ip_address=None):
    db = SessionLocal()
    try:
        log_entry = OperationLog(
            operator=operator,
            operation=operation,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
        logger.info(f"Operation: {operation} | Operator: {operator} | Target: {target_type}:{target_id}")
        return log_entry
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log operation: {e}")
        return None
    finally:
        db.close()


def log_error(message, exception=None):
    if exception:
        logger.error(f"{message}: {str(exception)}", exc_info=True)
    else:
        logger.error(message)


def log_info(message):
    logger.info(message)


def log_warning(message):
    logger.warning(message)
