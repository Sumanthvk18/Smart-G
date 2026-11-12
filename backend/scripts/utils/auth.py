from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request

from scripts.constants.app_configuration import COOKIE_NAME, JWT_ALGORITHM, JWT_SECRET, SESSION_HOURS


def create_token(email):
    payload = {
        "sub": email,
        "role": "officer",
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def officer_required(request: Request):
    """FastAPI dependency: returns the officer email or raises 401."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Please log in")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again")
    return payload["sub"]
