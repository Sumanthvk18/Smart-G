import os

from dotenv import load_dotenv

load_dotenv()

BASE_URL = "/api"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))

DATABASE_URL = os.environ.get("DATABASE_URL", "")

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
SESSION_HOURS = 12

OFFICER_EMAIL = os.environ.get("OFFICER_EMAIL", "")
OFFICER_PASSWORD = os.environ.get("OFFICER_PASSWORD", "")

COOKIE_NAME = "sg_officer"
# True in production (HTTPS). Set COOKIE_SECURE=false for local http testing.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"

# Only needed if the frontend calls the API directly instead of via the Netlify proxy.
ALLOW_ORIGINS = [o.strip() for o in os.environ.get("ALLOW_ORIGINS", "").split(",") if o.strip()]

DEMO_VEHICLE_CODE = os.environ.get("DEMO_VEHICLE_CODE", "V1")
DEMO_VEHICLE_NO = os.environ.get("DEMO_VEHICLE_NO", "KA 01 AB 1234")

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
