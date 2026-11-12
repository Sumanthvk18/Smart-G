import csv
import hmac
import io
import re
from datetime import date, datetime, timedelta, timezone

from scripts.constants.app_configuration import BASE_URL, OFFICER_EMAIL, OFFICER_PASSWORD
from scripts.constants.app_constants import TIMEZONE, ErrorCodes, failed, success
from scripts.core.models.officer_model import AddVehicle, DateRange, ListSubmissions, SubmissionFilters
from scripts.utils.db import get_cursor

IST = timezone(timedelta(hours=5, minutes=30))

# Submission date in India time, not UTC.
DAY = f"(s.created_at AT TIME ZONE '{TIMEZONE}')::date"

FROM_SUBMISSIONS = """
    FROM submissions s
    JOIN households h ON h.id = s.household_id
    JOIN vehicles v ON v.id = s.vehicle_id
"""

SUBMISSIONS_HEADER = [
    {"key": "photo", "label": "Photo"},
    {"key": "time", "label": "Time"},
    {"key": "name", "label": "Resident"},
    {"key": "street", "label": "Street"},
    {"key": "waste_type", "label": "Waste"},
    {"key": "vehicle_no", "label": "Vehicle"},
    {"key": "gps", "label": "GPS"},
]

SEARCH_COLUMNS = ["h.name", "h.meter_no", "h.mobile", "h.street", "h.address", "v.vehicle_no", "s.waste_type"]


def today_ist():
    return datetime.now(IST).date().isoformat()


def date_bounds(input_json: DateRange):
    start = input_json.date_from or input_json.date_to or today_ist()
    end = input_json.date_to or start
    return (start, end) if start <= end else (end, start)


def like_pattern(text):
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def submission_filters(input_json: SubmissionFilters):
    """WHERE clause and params for the dashboard list and the CSV export."""
    start, end = date_bounds(input_json)
    parts = [(f"{DAY} BETWEEN %s AND %s", [start, end])]
    if input_json.search:
        pattern = like_pattern(input_json.search)
        parts.append(("(" + " OR ".join(f"{col} ILIKE %s" for col in SEARCH_COLUMNS) + ")",
                      [pattern] * len(SEARCH_COLUMNS)))
    if input_json.waste_type:
        parts.append(("s.waste_type = %s", [input_json.waste_type]))
    if input_json.gps:
        parts.append(("s.lat IS NOT NULL" if input_json.gps == "with" else "s.lat IS NULL", []))
    if input_json.street:
        parts.append(("lower(trim(h.street)) = lower(%s)", [input_json.street]))
    if input_json.vehicle_no:
        parts.append(("v.vehicle_no = %s", [input_json.vehicle_no]))
    return " AND ".join(sql for sql, _ in parts), [p for _, params in parts for p in params]


class OfficerHandler:

    def check_login(self, email, password):
        if not OFFICER_EMAIL or not OFFICER_PASSWORD:
            return False
        email_ok = hmac.compare_digest(email.lower().encode(), OFFICER_EMAIL.lower().encode())
        password_ok = hmac.compare_digest(password.encode(), OFFICER_PASSWORD.encode())
        return email_ok and password_ok

    def dashboard_summary(self, input_json: DateRange):
        start, end = date_bounds(input_json)
        in_range = f"{DAY} BETWEEN %s AND %s"
        with get_cursor() as cur:
            cur.execute("SELECT count(*) AS total FROM households")
            households = cur.fetchone()["total"]

            cur.execute(
                f"""SELECT count(*)                                        AS submissions,
                           count(DISTINCT s.household_id)                  AS households_covered,
                           count(*) FILTER (WHERE s.lat IS NOT NULL)       AS with_gps,
                           count(*) FILTER (WHERE s.lat IS NULL)           AS no_gps,
                           count(*) FILTER (WHERE s.waste_type = 'wet')    AS wet,
                           count(*) FILTER (WHERE s.waste_type = 'dry')    AS dry,
                           count(*) FILTER (WHERE s.waste_type = 'mixed')  AS mixed
                    FROM submissions s
                    WHERE {in_range}""",
                (start, end),
            )
            counts = cur.fetchone()

            # Street is free text: group case-insensitively, show the most common spelling.
            cur.execute(
                f"""SELECT mode() WITHIN GROUP (ORDER BY trim(h.street)) AS street, count(*) AS count
                    FROM submissions s JOIN households h ON h.id = s.household_id
                    WHERE {in_range}
                    GROUP BY lower(trim(h.street))
                    ORDER BY count DESC, street""",
                (start, end),
            )
            streets = cur.fetchall()

            cur.execute(
                f"""SELECT v.vehicle_no, count(*) AS count
                    FROM submissions s JOIN vehicles v ON v.id = s.vehicle_id
                    WHERE {in_range}
                    GROUP BY v.vehicle_no
                    ORDER BY count DESC""",
                (start, end),
            )
            vehicles = cur.fetchall()

        return success("Summary fetched", {
            "date_from": start,
            "date_to": end,
            "households": households,
            **counts,
            "streets": streets,
            "vehicles": vehicles,
        })

    def list_submissions(self, input_json: ListSubmissions):
        where, params = submission_filters(input_json)
        offset = (input_json.page - 1) * input_json.limit

        with get_cursor() as cur:
            cur.execute(f"SELECT count(*) AS total {FROM_SUBMISSIONS} WHERE {where}", params)
            total = cur.fetchone()["total"]
            cur.execute(
                f"""SELECT s.id, s.created_at, s.waste_type, s.lat, s.lng,
                           h.name, h.meter_no, h.mobile, h.street, h.address,
                           v.vehicle_no
                    {FROM_SUBMISSIONS}
                    WHERE {where}
                    ORDER BY s.created_at DESC
                    LIMIT %s OFFSET %s""",
                params + [input_json.limit, offset],
            )
            rows = cur.fetchall()

        for row in rows:
            row["created_at"] = row["created_at"].isoformat()
            row["photo_url"] = f"{BASE_URL}/submission_photo/{row['id']}"

        return {
            "status": "success",
            "message": "Submissions fetched" if rows else "No records found",
            "headerContent": SUBMISSIONS_HEADER,
            "bodyContent": rows,
            "total": total,
            "page": input_json.page,
            "end_of_records": offset + len(rows) >= total,
        }

    def export_submissions(self, input_json: SubmissionFilters):
        """All matching submissions as CSV text (no paging). Returns (csv_text, filename)."""
        where, params = submission_filters(input_json)
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT s.created_at, s.waste_type, s.lat, s.lng,
                           h.name, h.mobile, h.meter_no, h.street, h.address, v.vehicle_no
                    {FROM_SUBMISSIONS}
                    WHERE {where}
                    ORDER BY s.created_at DESC
                    LIMIT 50000""",
                params,
            )
            rows = cur.fetchall()

        out = io.StringIO()
        out.write("﻿")  # BOM: Excel then reads Kannada text as UTF-8
        writer = csv.writer(out)
        writer.writerow(["Date", "Time", "Resident", "Mobile", "Meter No.", "Street", "House address",
                         "Waste type", "Vehicle", "Latitude", "Longitude", "Map link"])
        for r in rows:
            at = r["created_at"].astimezone(IST)
            mobile = re.sub(r"\D", "", r["mobile"])[-10:]
            has_gps = r["lat"] is not None
            writer.writerow([
                at.strftime("%d-%m-%Y"), at.strftime("%I:%M %p"), r["name"], f"+91 {mobile}",
                r["meter_no"], r["street"], r["address"], r["waste_type"].capitalize(), r["vehicle_no"],
                r["lat"] if has_gps else "", r["lng"] if has_gps else "",
                f"https://www.google.com/maps?q={r['lat']},{r['lng']}" if has_gps else "",
            ])
        start, end = date_bounds(input_json)
        return out.getvalue(), f"submissions_{start}_to_{end}.csv"

    def submission_calendar(self, month):
        """Submission count per day for one month, for the date picker."""
        first = date.fromisoformat(f"{month}-01")
        next_month = (first + timedelta(days=32)).replace(day=1)
        with get_cursor() as cur:
            cur.execute(
                f"""SELECT {DAY} AS day, count(*) AS count FROM submissions s
                    WHERE {DAY} >= %s AND {DAY} < %s
                    GROUP BY 1""",
                (first, next_month),
            )
            days = {r["day"].isoformat(): r["count"] for r in cur.fetchall()}
        return success("Calendar fetched", {"month": month, "days": days})

    def list_vehicles(self):
        with get_cursor() as cur:
            cur.execute("SELECT code, vehicle_no, created_at FROM vehicles ORDER BY created_at DESC, id DESC")
            rows = cur.fetchall()
        for row in rows:
            row["created_at"] = row["created_at"].isoformat()
        return success("Vehicles fetched", rows)

    def add_vehicle(self, input_json: AddVehicle):
        """Codes run V1, V2, V3… The QR code links to /s/<code>."""
        vehicle_no = " ".join(input_json.vehicle_no.upper().split())
        # "KA01AB1234" / "KA-01-AB-1234" -> "KA 01 AB 1234"; other formats are kept as typed.
        plate = re.fullmatch(r"([A-Z]{2})[ -]*(\d{1,2})[ -]*([A-Z]{0,3})[ -]*(\d{1,4})", vehicle_no)
        if plate:
            vehicle_no = " ".join(part for part in plate.groups() if part)
        with get_cursor() as cur:
            # "ka01ab1234" and "KA 01 AB-1234" are the same vehicle.
            cur.execute(
                "SELECT code FROM vehicles WHERE regexp_replace(upper(vehicle_no), '[^A-Z0-9]', '', 'g') = %s",
                ("".join(c for c in vehicle_no if c.isalnum()),),
            )
            if cur.fetchone():
                return failed("This vehicle is already added", ErrorCodes.vehicle_exists)
            cur.execute(
                """INSERT INTO vehicles (code, vehicle_no)
                   SELECT 'V' || (coalesce(max(substring(code FROM '^V([0-9]+)$')::int), 0) + 1), %s
                   FROM vehicles
                   RETURNING code, vehicle_no, created_at""",
                (vehicle_no,),
            )
            row = cur.fetchone()
        row["created_at"] = row["created_at"].isoformat()
        return success("Vehicle added", row)

    def submission_photo(self, submission_id):
        with get_cursor() as cur:
            cur.execute("SELECT photo, photo_mime FROM submissions WHERE id = %s", (submission_id,))
            row = cur.fetchone()
        if not row:
            return None, None
        return bytes(row["photo"]), row["photo_mime"]
