from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class OfficerLogin(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=120)


class DateRange(BaseModel):
    """Both dates inclusive, India time. Missing dates default to today."""
    date_from: Optional[str] = Field(default=None, pattern=DATE_PATTERN)
    date_to: Optional[str] = Field(default=None, pattern=DATE_PATTERN)


class DashboardSummary(DateRange):
    pass


class SubmissionFilters(DateRange):
    model_config = ConfigDict(str_strip_whitespace=True)
    search: Optional[str] = Field(default=None, max_length=100)
    waste_type: Optional[Literal["wet", "dry", "mixed"]] = None
    gps: Optional[Literal["with", "without"]] = None
    street: Optional[str] = Field(default=None, max_length=100)
    vehicle_no: Optional[str] = Field(default=None, max_length=20)


class ListSubmissions(SubmissionFilters):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class AddVehicle(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    vehicle_no: str = Field(min_length=4, max_length=20, pattern=r"^[A-Za-z0-9 -]+$")


class SubmissionCalendar(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
