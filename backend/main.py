"""FastAPI app: routers, startup table creation and error handlers."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from scripts.constants.app_configuration import ALLOW_ORIGINS
from scripts.constants.app_constants import ErrorCodes, failed
from scripts.core.services.officer_service import OfficerService
from scripts.core.services.resident_service import ResidentService
from scripts.logging.log_module import logger
from scripts.utils.db import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up and preparing the database")
    create_tables()
    yield


app = FastAPI(title="Smart Garbage – Hongasandra Ward (Pilot)", version="1.0", lifespan=lifespan)


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    code = ErrorCodes.session_expired if exc.status_code == 401 else None
    return JSONResponse(failed(str(exc.detail), code), status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    fields = sorted({str(err["loc"][-1]) for err in exc.errors()})
    return JSONResponse(
        failed(f"Please check: {', '.join(fields)}", ErrorCodes.invalid_input) | {"fields": fields},
        status_code=400,
    )


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}")
    return JSONResponse(failed("Something went wrong. Please try again", ErrorCodes.server_error), status_code=500)


app.include_router(ResidentService)
app.include_router(OfficerService)

if ALLOW_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOW_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
