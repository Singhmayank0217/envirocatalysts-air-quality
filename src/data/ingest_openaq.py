"""
OpenAQ Public Air Quality Data Ingestion Client

Performs sanctioned API data ingestion from the official OpenAQ API v3.
This is a sanctioned API ingestion client, NOT webpage scraping.
Fetches fresh PM2.5 observations for New Delhi (Location ID 8118),
normalizes measurements, validates data integrity, and stores records
in the dedicated SQLite table `openaq_measurements`.

Does NOT alter or merge into existing FY2024-25 / FY2025-26 CPCB datasets.
"""

import os
import sys
import json
import math
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Configure utf-8 stdout/stderr for reliable terminal output across platforms
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Paths
REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "database" / "air_quality.db"
ENV_PATH = REPO_ROOT / ".env"

# OpenAQ Configuration
OPENAQ_BASE_URL = "https://api.openaq.org/v3"
LOCATION_ID = 8118
LOCATION_NAME = "New Delhi"
CITY_NAME = "New Delhi"
COUNTRY_NAME = "India"
PARAMETER_TARGET = "PM2.5"
STANDARD_UNIT = "\u00b5g/m\u00b3"  # µg/m³


def load_api_key():
    """
    Load OPENAQ_API_KEY from environment or .env file.
    Fails with exact message if not configured.
    Never prints or logs the API key.
    """
    api_key = os.getenv("OPENAQ_API_KEY")
    if not api_key and ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OPENAQ_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip("\"'")
                        if val:
                            api_key = val
                            break
        except Exception:
            pass

    if not api_key:
        print("OPENAQ_API_KEY is not configured.", file=sys.stderr)
        sys.exit(1)

    return api_key


def make_openaq_request(endpoint, api_key):
    """
    Execute authenticated GET request to OpenAQ API v3.
    Enforces required error handling:
      - 401/403: "OpenAQ authentication failed."
      - 429: "OpenAQ rate limit reached."
      - 5xx: "OpenAQ service temporarily unavailable."
      - Network failure: "Unable to reach OpenAQ."
      - Malformed response: "Unexpected OpenAQ response."
    """
    url = f"{OPENAQ_BASE_URL}/{endpoint.lstrip('/')}"
    headers = {
        "X-API-Key": api_key,
        "User-Agent": "EnviroCatalysts-AirQuality-Ingestion/1.0",
        "Accept": "application/json",
    }

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data_bytes = resp.read()
            try:
                data = json.loads(data_bytes.decode("utf-8"))
                return data
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"Unexpected OpenAQ response: {e}", file=sys.stderr)
                sys.exit(1)

    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print("OpenAQ authentication failed.", file=sys.stderr)
        elif e.code == 429:
            print("OpenAQ rate limit reached.", file=sys.stderr)
        elif 500 <= e.code < 600:
            print("OpenAQ service temporarily unavailable.", file=sys.stderr)
        else:
            print(f"OpenAQ API HTTP error: {e.code} {e.reason}", file=sys.stderr)
        sys.exit(1)

    except urllib.error.URLError as e:
        print(f"Unable to reach OpenAQ: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unable to reach OpenAQ: {e}", file=sys.stderr)
        sys.exit(1)


def normalize_unit(unit_str):
    """
    Normalize unit representation to standard microgram per cubic meter string.
    """
    if not unit_str:
        return STANDARD_UNIT
    if "g/m" in unit_str or "ug/m" in unit_str or "\ufffd" in unit_str:
        return STANDARD_UNIT
    return unit_str


def discover_pm25_sensor(api_key):
    """
    Dynamically discover the active PM2.5 sensor for Location ID 8118.
    Calls /v3/locations/8118/sensors and identifies sensor with PM2.5 parameter.
    Does NOT assume any hardcoded sensor ID.
    """
    endpoint = f"locations/{LOCATION_ID}/sensors"
    data = make_openaq_request(endpoint, api_key)

    results = data.get("results", [])
    if not results:
        print(f"No sensors found for location {LOCATION_ID}.", file=sys.stderr)
        sys.exit(1)

    discovered_sensor = None
    for s in results:
        param = s.get("parameter", {})
        param_name = str(param.get("name", "")).lower()
        display_name = str(param.get("displayName", "")).upper()
        param_id = param.get("id")

        if param_name in ("pm25", "pm2.5") or display_name in ("PM25", "PM2.5") or param_id == 2:
            discovered_sensor = s
            break

    if not discovered_sensor:
        print(f"Could not discover PM2.5 sensor for location {LOCATION_ID}.", file=sys.stderr)
        sys.exit(1)

    sensor_id = discovered_sensor["id"]
    param_meta = discovered_sensor.get("parameter", {})
    raw_unit = param_meta.get("units")
    unit = normalize_unit(raw_unit)
    latest_info = discovered_sensor.get("latest")

    return sensor_id, unit, latest_info, discovered_sensor


def fetch_recent_measurements(api_key, sensor_id, hours=24):
    """
    Fetch recent measurements for the discovered sensor.
    Limits query to recent time window to respect rate limits and prevent 408 timeouts.
    """
    since_dt = datetime.now(timezone.utc) - timedelta(hours=hours)
    since_iso = since_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    endpoint = f"sensors/{sensor_id}/measurements?datetime_from={since_iso}&limit=100"
    data = make_openaq_request(endpoint, api_key)
    return data.get("results", [])


def normalize_iso_timestamp(ts_str):
    """
    Normalize any ISO timestamp into UTC ISO-8601 string (e.g. 2026-09-22T06:30:00Z).
    """
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        dt_utc = dt.astimezone(timezone.utc)
        return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return ts_str


def init_database(conn):
    """
    Initialize openaq_measurements table with unique constraint and indexes.
    Also update data_sources metadata table.
    """
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS openaq_measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL DEFAULT 'OpenAQ',
            location_id INTEGER NOT NULL,
            location_name TEXT NOT NULL,
            city TEXT NOT NULL,
            country TEXT NOT NULL,
            parameter TEXT NOT NULL,
            unit TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            value REAL NOT NULL,
            ingested_at TEXT NOT NULL,
            UNIQUE (source, location_id, parameter, period_start, period_end)
        );
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_openaq_latest 
        ON openaq_measurements (period_end DESC, id DESC);
    """)

    # Check if data_sources table exists and update/insert OpenAQ metadata
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='data_sources';")
    if cursor.fetchone():
        cursor.execute("""
            INSERT OR REPLACE INTO data_sources (id, name, base_url, description, attribution)
            VALUES (
                2,
                'OpenAQ',
                'https://api.openaq.org/v3/',
                'Sanctioned external public air quality API ingestion client for New Delhi (Location ID 8118, PM2.5). Governed by OpenAQ Terms of Use.',
                'OpenAQ and underlying data source providers'
            );
        """)

    conn.commit()


def main():
    print("=" * 60)
    print("OpenAQ Public Air Quality Data Ingestion Client")
    print("=" * 60)

    # 1. Load API Key
    api_key = load_api_key()
    print("[1/5] API Authentication: Validated OPENAQ_API_KEY from environment.")

    # 2. Dynamic Sensor Discovery
    print(f"[2/5] Discovering active PM2.5 sensor for Location ID {LOCATION_ID} ({LOCATION_NAME})...")
    sensor_id, unit, latest_fallback, sensor_obj = discover_pm25_sensor(api_key)
    print(f"      Discovered Sensor ID: {sensor_id} (Parameter: {PARAMETER_TARGET}, Unit: {unit})")

    # 3. Fetch Recent Measurements
    print(f"[3/5] Requesting recent {PARAMETER_TARGET} measurements from OpenAQ API v3...")
    measurements = fetch_recent_measurements(api_key, sensor_id, hours=24)
    print(f"      Retrieved {len(measurements)} raw measurement records.")

    # Normalize observations list
    ingested_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    observations = []

    if measurements:
        for m in measurements:
            val = m.get("value")
            # 7. Reject null/non-numeric/negative values
            if val is None:
                continue
            try:
                num_val = float(val)
                if math.isnan(num_val) or math.isinf(num_val) or num_val < 0:
                    continue
            except (ValueError, TypeError):
                continue

            period = m.get("period", {})
            dt_from = period.get("datetimeFrom", {}).get("utc")
            dt_to = period.get("datetimeTo", {}).get("utc")

            if not dt_to:
                continue

            period_end = normalize_iso_timestamp(dt_to)
            period_start = normalize_iso_timestamp(dt_from) if dt_from else period_end

            observations.append({
                "source": "OpenAQ",
                "location_id": LOCATION_ID,
                "location_name": LOCATION_NAME,
                "city": CITY_NAME,
                "country": COUNTRY_NAME,
                "parameter": PARAMETER_TARGET,
                "unit": unit,
                "period_start": period_start,
                "period_end": period_end,
                "value": round(num_val, 2),
                "ingested_at": ingested_at,
            })
    elif latest_fallback and latest_fallback.get("value") is not None:
        # Fallback to latest sensor reading if measurements endpoint is empty
        val = latest_fallback.get("value")
        try:
            num_val = float(val)
            if not math.isnan(num_val) and not math.isinf(num_val) and num_val >= 0:
                dt_utc = latest_fallback.get("datetime", {}).get("utc")
                period_end = normalize_iso_timestamp(dt_utc)
                dt_obj = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                period_start = (dt_obj - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

                observations.append({
                    "source": "OpenAQ",
                    "location_id": LOCATION_ID,
                    "location_name": LOCATION_NAME,
                    "city": CITY_NAME,
                    "country": COUNTRY_NAME,
                    "parameter": PARAMETER_TARGET,
                    "unit": unit,
                    "period_start": period_start,
                    "period_end": period_end,
                    "value": round(num_val, 2),
                    "ingested_at": ingested_at,
                })
        except Exception:
            pass

    if not observations:
        print("No valid positive observations to ingest.", file=sys.stderr)
        sys.exit(1)

    print(f"      Normalized {len(observations)} valid observations (rejected null/negative).")

    # 4. Store in SQLite with duplicate protection
    print(f"[4/5] Connecting to SQLite database at {DB_PATH.name}...")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    init_database(conn)

    cursor = conn.cursor()
    inserted_count = 0
    skipped_count = 0

    for obs in observations:
        cursor.execute("""
            INSERT OR IGNORE INTO openaq_measurements (
                source, location_id, location_name, city, country,
                parameter, unit, period_start, period_end, value, ingested_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            obs["source"],
            obs["location_id"],
            obs["location_name"],
            obs["city"],
            obs["country"],
            obs["parameter"],
            obs["unit"],
            obs["period_start"],
            obs["period_end"],
            obs["value"],
            obs["ingested_at"],
        ))
        if cursor.rowcount > 0:
            inserted_count += 1
        else:
            skipped_count += 1

    conn.commit()

    # Query latest record for summary
    cursor.execute("""
        SELECT value, unit, period_start, period_end, ingested_at
        FROM openaq_measurements
        WHERE parameter = ?
        ORDER BY period_end DESC, id DESC
        LIMIT 1;
    """, (PARAMETER_TARGET,))
    latest_db = cursor.fetchone()
    conn.close()

    # 5. Print Ingestion Summary
    print("[5/5] Ingestion Summary:")
    print("=" * 60)
    print(f"Source:                     OpenAQ (API v3 Sanctioned Client)")
    print(f"Location:                   {LOCATION_NAME}, {COUNTRY_NAME} (ID: {LOCATION_ID})")
    print(f"Discovered Sensor ID:       {sensor_id}")
    print(f"Parameter / Unit:           {PARAMETER_TARGET} ({unit})")
    print(f"Raw Records Fetched:        {len(measurements)}")
    print(f"Valid Observations:         {len(observations)}")
    print(f"Newly Inserted Records:     {inserted_count}")
    print(f"Duplicate Records Skipped:  {skipped_count}")
    if latest_db:
        print(f"Latest Stored Reading:      {latest_db[0]} {latest_db[1]}")
        print(f"Observation Period:         {latest_db[2]} -> {latest_db[3]}")
        print(f"Database Ingested At:       {latest_db[4]}")
    print("=" * 60)
    print("OpenAQ Ingestion completed successfully.")


if __name__ == "__main__":
    main()
