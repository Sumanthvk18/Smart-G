import time
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from scripts.constants.app_configuration import DATABASE_URL, DEMO_VEHICLE_CODE, DEMO_VEHICLE_NO
from scripts.constants.schemas import TABLES
from scripts.logging.log_module import logger


@contextmanager
def get_cursor():
    """One short-lived connection per request.

    Neon closes idle connections, so a long-lived pool tends to hand out dead
    connections. The connection cost is small at demo traffic.
    Commits on success, rolls back on error.
    """
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=15)
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
    finally:
        conn.close()


def create_tables(retries=5):
    """Create tables and the demo vehicle. Retries because Neon may be waking up."""
    for attempt in range(1, retries + 1):
        try:
            with get_cursor() as cur:
                for table in TABLES:
                    logger.info(f"Creating table if missing: {table['table_name']}")
                    cur.execute(table["query"])
                cur.execute(
                    "INSERT INTO vehicles (code, vehicle_no) VALUES (%s, %s) "
                    "ON CONFLICT (code) DO UPDATE SET vehicle_no = EXCLUDED.vehicle_no",
                    (DEMO_VEHICLE_CODE, DEMO_VEHICLE_NO),
                )
            logger.info("Database ready")
            return True
        except psycopg2.OperationalError as e:
            logger.warning(f"Database not reachable (attempt {attempt}/{retries}): {e}")
            time.sleep(2 * attempt)
    logger.error("Could not initialise the database")
    return False
