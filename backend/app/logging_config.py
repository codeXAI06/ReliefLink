"""
Structured logging configuration for ReliefLink
"""
import logging
import sys
from datetime import datetime


class ReliefLinkFormatter(logging.Formatter):
    """Custom formatter with colors and structured output"""

    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[1;31m" # Bold Red
    }
    RESET = "\033[0m"
    ICONS = {
        "DEBUG": "🔍",
        "INFO": "✅",
        "WARNING": "⚠️",
        "ERROR": "❌",
        "CRITICAL": "🚨"
    }

    def format(self, record):
        color = self.COLORS.get(record.levelname, "")
        icon = self.ICONS.get(record.levelname, "")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        module = record.module[:15].ljust(15)

        formatted = (
            f"{color}{icon} [{timestamp}] "
            f"{record.levelname:8s} | {module} | "
            f"{record.getMessage()}{self.RESET}"
        )
        if record.exc_info and record.exc_info[0]:
            formatted += f"\n{self.formatException(record.exc_info)}"
        return formatted


def setup_logging(debug: bool = False):
    """Configure application-wide logging"""
    level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ReliefLinkFormatter())

    # Root logger
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a module"""
    return logging.getLogger(f"relieflink.{name}")
