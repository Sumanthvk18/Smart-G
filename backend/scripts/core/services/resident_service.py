from fastapi import APIRouter

from scripts.constants.app_configuration import BASE_URL
from scripts.constants.app_constants import Endpoints, ServiceTags, success
from scripts.core.handlers.resident_handler import ResidentHandler
from scripts.core.models.resident_model import AddSubmission, HouseholdByMeter, RegisterHousehold, VehicleDetails

ResidentService = APIRouter(prefix=BASE_URL, tags=ServiceTags.resident)
handler = ResidentHandler()

# Plain `def` endpoints: FastAPI runs them in a thread pool, so blocking DB calls are fine.


@ResidentService.get(Endpoints.health)
def health():
    return success("ok")


@ResidentService.post(Endpoints.vehicle_details)
def vehicle_details(input_json: VehicleDetails):
    return handler.vehicle_details(input_json.code)


@ResidentService.post(Endpoints.register_household)
def register_household(input_json: RegisterHousehold):
    return handler.register_household(input_json)


@ResidentService.post(Endpoints.household_by_meter)
def household_by_meter(input_json: HouseholdByMeter):
    return handler.household_by_meter(input_json.meter_no)


@ResidentService.post(Endpoints.add_submission)
def add_submission(input_json: AddSubmission):
    return handler.add_submission(input_json)
