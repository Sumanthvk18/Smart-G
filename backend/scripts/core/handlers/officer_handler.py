import hmac
from datetime import date, datetime, timedelta, timezone

from scripts.constants.app_configuration import BASE_URL, OFFICER_EMAIL, OFFICER_PASSWORD
from scripts.constants.app_constants import TIMEZONE, success
from scripts.core.models.officer_model import DateRange, ListSubmissions
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
    {"key": "meter_no", "label": "Meter No."},
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


def where_clause(filters, skip=None):
    """filters: {name: (sql, params)}. Returns SQL and params, leaving out `skip`."""
    parts = [(sql, params) for name, (sql, params) in filters.items() if name != skip]
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
        start, end = date_bounds(input_json)
        filters = {"date": (f"{DAY} BETWEEN %s AND %s", [start, end])}
        if input_json.search:
            pattern = like_pattern(input_json.search)
            sql = " OR ".join(f"{col} ILIKE %s" for col in SEARCH_COLUMNS)
            filters["search"] = (f"({sql})", [pattern] * len(SEARCH_COLUMNS))
        if input_json.waste_type:
            filters["waste_type"] = ("s.waste_type = %s", [input_json.waste_type])
        if input_json.gps:
            filters["gps"] = ("s.lat IS NOT NULL" if input_json.gps == "with" else "s.lat IS NULL", [])
        if input_json.street:
            filters["street"] = ("lower(trim(h.street)) = lower(%s)", [input_json.street])
        if input_json.vehicle_no:
            filters["vehicle_no"] = ("v.vehicle_no = %s", [input_json.vehicle_no])

        where, params = where_clause(filters)
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

            # Counts for the filter buttons: each ignores its own filter so the options stay visible.
            waste_where, waste_params = where_clause(filters, skip="waste_type")
            cur.execute(
                f"""SELECT s.waste_type AS key, count(*) AS count {FROM_SUBMISSIONS}
                    WHERE {waste_where} GROUP BY s.waste_type""",
                waste_params,
            )
            waste_counts = {r["key"]: r["count"] for r in cur.fetchall()}

            gps_where, gps_params = where_clause(filters, skip="gps")
            cur.execute(
                f"""SELECT count(*) FILTER (WHERE s.lat IS NOT NULL) AS "with",
                           count(*) FILTER (WHERE s.lat IS NULL)     AS "without"
                    {FROM_SUBMISSIONS} WHERE {gps_where}""",
                gps_params,
            )
            gps_counts = cur.fetchone()

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
            "facets": {
                "waste_type": {
                    "all": sum(waste_counts.values()),
                    **{w: waste_counts.get(w, 0) for w in ("wet", "dry", "mixed")},
                },
                "gps": {"all": gps_counts["with"] + gps_counts["without"], **gps_counts},
            },
        }

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

    def submission_photo(self, submission_id):
        with get_cursor() as cur:
            cur.execute("SELECT photo, photo_mime FROM submissions WHERE id = %s", (submission_id,))
            row = cur.fetchone()
        if not row:
            return None, None
        return bytes(row["photo"]), row["photo_mime"]
