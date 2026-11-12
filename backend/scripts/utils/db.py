import time
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

from scripts.constants.app_configuration import DATABASE_URL, DEMO_VEHICLE_CODE, DEMO_VEHICLE_NO
from scripts.logging.log_module import logger

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
# Any fixed number. Stops the deploy workflow and app startup from migrating at the same time.
MIGRATION_LOCK_ID = 7_210_001


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


def run_migrations():
    """Apply the .sql files in migrations/ that have not run yet, in name order.

    All pending files run in one transaction: if one fails, none are applied.
    Returns the names of the files applied.
    """
    applied = []
    with get_cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK_ID,))
        cur.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " filename VARCHAR(200) PRIMARY KEY,"
            " applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
        cur.execute("SELECT filename FROM schema_migrations")
        done = {row["filename"] for row in cur.fetchall()}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in done:
                continue
            logger.info(f"Applying migration {path.name}")
            cur.execute(path.read_text(encoding="utf-8"))
            cur.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,))
            applied.append(path.name)
    return applied


def init_db(retries=5):
    """Apply pending migrations and add the demo vehicle. Retries because Neon may be waking up."""
    for attempt in range(1, retries + 1):
        try:
            run_migrations()
            with get_cursor() as cur:
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
