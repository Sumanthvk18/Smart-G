"""Apply pending database migrations: python migrate.py

The deploy workflow runs this before deploying. The app also runs it on startup.
"""
import sys

from scripts.constants.app_configuration import DATABASE_URL
from scripts.utils.db import run_migrations

if __name__ == "__main__":
    if not DATABASE_URL:
        sys.exit("DATABASE_URL is not set")
    applied = run_migrations()
    print(f"Applied: {', '.join(applied)}" if applied else "Database is already up to date")
