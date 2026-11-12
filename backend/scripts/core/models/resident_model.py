import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VehicleDetails(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    code: str = Field(min_length=1, max_length=20)


class RegisterHousehold(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=80)
    meter_no: str = Field(min_length=1, max_length=40)
    mobile: str
    street: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=200)

    @field_validator("mobile")
    @classmethod
    def indian_mobile(cls, value):
        """Accepts 9876543210, +91 98765 43210 or 09876543210; stores the 10 digits."""
        digits = re.sub(r"\D", "", value)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if not re.fullmatch(r"[6-9][0-9]{9}", digits):
            raise ValueError("Enter a 10-digit Indian mobile number")
        return digits


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
