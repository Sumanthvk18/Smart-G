from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class VehicleDetails(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    code: str = Field(min_length=1, max_length=20)


class RegisterHousehold(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=80)
    meter_no: str = Field(min_length=1, max_length=40)
    mobile: str = Field(pattern=r"^[0-9+ -]{10,15}$")
    street: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=200)


class HouseholdByMeter(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    meter_no: str = Field(min_length=1, max_length=40)


class AddSubmission(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    household_id: int
    vehicle_code: str = Field(min_length=1, max_length=20)
    waste_type: Literal["wet", "dry", "mixed"]
    photo: str = Field(min_length=1, max_length=3_000_000)  # base64, optionally as a data URL
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
