class Endpoints:
    health = "/health"

    # resident
    vehicle_details = "/vehicle_details"
    register_household = "/register_household"
    household_by_meter = "/household_by_meter"
    add_submission = "/add_submission"

    # officer
    officer_login = "/officer_login"
    officer_logout = "/officer_logout"
    dashboard_summary = "/dashboard_summary"
    list_submissions = "/list_submissions"
    submission_calendar = "/submission_calendar"
    submission_photo = "/submission_photo/{submission_id}"


class ServiceTags:
    resident = ["Resident"]
    officer = ["Officer"]


class TableNames:
    vehicles = "vehicles"
    households = "households"
    submissions = "submissions"


class WasteTypes:
    all = ["wet", "dry", "mixed"]


class ErrorCodes:
    vehicle_not_found = "vehicle_not_found"
    household_not_found = "household_not_found"
    meter_taken = "meter_taken"
    invalid_photo = "invalid_photo"
    invalid_login = "invalid_login"
    session_expired = "session_expired"
    invalid_input = "invalid_input"
    server_error = "server_error"


MAX_PHOTO_BYTES = 2 * 1024 * 1024
TIMEZONE = "Asia/Kolkata"


def success(message, data=None):
    return {"status": "success", "message": message, "data": data}


def failed(message, code=None):
    return {"status": "failed", "message": message, "code": code, "data": None}
