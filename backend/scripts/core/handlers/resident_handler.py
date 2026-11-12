import base64
import binascii
import re

from scripts.constants.app_constants import MAX_PHOTO_BYTES, ErrorCodes, failed, success
from scripts.core.models.resident_model import AddSubmission, RegisterHousehold
from scripts.logging.log_module import logger
from scripts.utils.db import get_cursor

HOUSEHOLD_COLUMNS = "id, name, meter_no, street, address"


def normalise_meter(meter_no):
    return re.sub(r"\s+", "", meter_no).upper()


def mobile_digits(mobile):
    return re.sub(r"\D", "", mobile)[-10:]


def decode_photo(data):
    """Returns (bytes, mime) or (None, None) if it isn't a usable image."""
    if data.startswith("data:"):
        data = data.split(",", 1)[-1]
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        return None, None
    if not raw or len(raw) > MAX_PHOTO_BYTES:
        return None, None
    if raw.startswith(b"\xff\xd8\xff"):
        return raw, "image/jpeg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return raw, "image/png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return raw, "image/webp"
    return None, None


class ResidentHandler:

    def vehicle_details(self, code):
        with get_cursor() as cur:
            cur.execute("SELECT code, vehicle_no FROM vehicles WHERE upper(code) = upper(%s)", (code,))
            vehicle = cur.fetchone()
        if not vehicle:
            return failed("This QR code is not linked to any vehicle", ErrorCodes.vehicle_not_found)
        return success("Vehicle found", vehicle)

    def register_household(self, input_json: RegisterHousehold):
        meter_no = normalise_meter(input_json.meter_no)
        with get_cursor() as cur:
            cur.execute(
                f"SELECT {HOUSEHOLD_COLUMNS}, mobile FROM households WHERE meter_no = %s", (meter_no,)
            )
            existing = cur.fetchone()
            if existing:
                # Same meter + same mobile: the resident is on a new phone, let them continue.
                if mobile_digits(existing.pop("mobile")) == mobile_digits(input_json.mobile):
                    return success("Welcome back", existing)
                return failed(
                    "This meter number is already registered with a different mobile number",
                    ErrorCodes.meter_taken,
                )
            cur.execute(
                f"""INSERT INTO households (name, meter_no, mobile, street, address)
                    VALUES (%s, %s, %s, %s, %s) RETURNING {HOUSEHOLD_COLUMNS}""",
                (input_json.name, meter_no, input_json.mobile, input_json.street, input_json.address),
            )
            household = cur.fetchone()
        logger.info(f"Registered household {household['id']}")
        return success("Household registered", household)

    def household_by_meter(self, meter_no):
        with get_cursor() as cur:
            cur.execute(
                f"SELECT {HOUSEHOLD_COLUMNS} FROM households WHERE meter_no = %s", (normalise_meter(meter_no),)
            )
            household = cur.fetchone()
        if not household:
            return failed("Household not found", ErrorCodes.household_not_found)
        return success("Household found", household)

    def add_submission(self, input_json: AddSubmission):
        photo, mime = decode_photo(input_json.photo)
        if photo is None:
            return failed("Photo is missing, too large or not an image", ErrorCodes.invalid_photo)

        # Keep a location only if both coordinates are present.
        lat, lng = input_json.lat, input_json.lng
        if lat is None or lng is None:
            lat = lng = None

        with get_cursor() as cur:
            cur.execute("SELECT id FROM vehicles WHERE upper(code) = upper(%s)", (input_json.vehicle_code,))
            vehicle = cur.fetchone()
            if not vehicle:
                return failed("This QR code is not linked to any vehicle", ErrorCodes.vehicle_not_found)
            cur.execute("SELECT id FROM households WHERE id = %s", (input_json.household_id,))
            if not cur.fetchone():
                return failed("Household not found", ErrorCodes.household_not_found)
            cur.execute(
                """INSERT INTO submissions (household_id, vehicle_id, waste_type, photo, photo_mime, lat, lng)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at""",
                (input_json.household_id, vehicle["id"], input_json.waste_type, photo, mime, lat, lng),
            )
            row = cur.fetchone()
        logger.info(f"Submission {row['id']} from household {input_json.household_id} ({len(photo)} bytes)")
        return success("Submission saved", {"id": row["id"], "created_at": row["created_at"].isoformat()})
