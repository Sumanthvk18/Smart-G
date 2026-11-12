"""Tables are created on startup if they don't exist."""

TABLES = [
    {
        "table_name": "vehicles",
        "query": """
            CREATE TABLE IF NOT EXISTS vehicles (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(20)  NOT NULL UNIQUE,
                vehicle_no  VARCHAR(20)  NOT NULL,
                created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
            );
        """,
    },
    {
        "table_name": "households",
        "query": """
            CREATE TABLE IF NOT EXISTS households (
                id          SERIAL PRIMARY KEY,
                name        VARCHAR(80)  NOT NULL,
                meter_no    VARCHAR(40)  NOT NULL UNIQUE,
                mobile      VARCHAR(15)  NOT NULL,
                street      VARCHAR(100) NOT NULL,
                address     VARCHAR(200) NOT NULL,
                created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
            );
        """,
    },
    {
        "table_name": "submissions",
        "query": """
            CREATE TABLE IF NOT EXISTS submissions (
                id            SERIAL PRIMARY KEY,
                household_id  INT          NOT NULL REFERENCES households(id),
                vehicle_id    INT          NOT NULL REFERENCES vehicles(id),
                waste_type    VARCHAR(10)  NOT NULL,
                photo         BYTEA        NOT NULL,
                photo_mime    VARCHAR(20)  NOT NULL,
                lat           DOUBLE PRECISION,
                lng           DOUBLE PRECISION,
                created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at);
        """,
    },
]
