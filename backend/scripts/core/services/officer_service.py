from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse

from scripts.constants.app_configuration import BASE_URL, COOKIE_NAME, COOKIE_SECURE, SESSION_HOURS
from scripts.constants.app_constants import Endpoints, ErrorCodes, ServiceTags, failed, success
from scripts.core.handlers.officer_handler import OfficerHandler
from scripts.core.models.officer_model import DashboardSummary, ListSubmissions, OfficerLogin, SubmissionCalendar
from scripts.logging.log_module import logger
from scripts.utils.auth import create_token, officer_required

OfficerService = APIRouter(prefix=BASE_URL, tags=ServiceTags.officer)
handler = OfficerHandler()


@OfficerService.post(Endpoints.officer_login)
def officer_login(input_json: OfficerLogin):
    if not handler.check_login(input_json.email, input_json.password):
        logger.info("Failed officer login")
        return JSONResponse(failed("Incorrect email or password", ErrorCodes.invalid_login), status_code=401)
    response = JSONResponse(success("Logged in", {"email": input_json.email.lower()}))
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_token(input_json.email.lower()),
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return response


@OfficerService.post(Endpoints.officer_logout)
def officer_logout():
    response = JSONResponse(success("Logged out"))
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


@OfficerService.post(Endpoints.dashboard_summary)
def dashboard_summary(input_json: DashboardSummary, officer=Depends(officer_required)):
    return handler.dashboard_summary(input_json)


@OfficerService.post(Endpoints.list_submissions)
def list_submissions(input_json: ListSubmissions, officer=Depends(officer_required)):
    return handler.list_submissions(input_json)


@OfficerService.post(Endpoints.submission_calendar)
def submission_calendar(input_json: SubmissionCalendar, officer=Depends(officer_required)):
    return handler.submission_calendar(input_json.month)


# GET, because an <img> tag can't send a POST.
@OfficerService.get(Endpoints.submission_photo)
def submission_photo(submission_id: int, officer=Depends(officer_required)):
    photo, mime = handler.submission_photo(submission_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    return Response(content=photo, media_type=mime, headers={"Cache-Control": "private, max-age=86400"})
