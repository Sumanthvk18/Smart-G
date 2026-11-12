import logging
import sys

from scripts.constants.app_configuration import LOG_LEVEL


def get_logger():
    # Console only: Render captures stdout, and its disk is wiped on restart.
    _logger = logging.getLogger("smart-garbage")
    _logger.setLevel(LOG_LEVEL)
    if not _logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(module)s - %(message)s"))
        _logger.addHandler(handler)
    return _logger


logger = get_logger()
