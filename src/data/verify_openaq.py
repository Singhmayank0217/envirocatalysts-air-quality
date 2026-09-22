"""
OpenAQ Verification Script

Verifies:
1. OPENAQ_API_KEY exists (never prints the key).
2. OpenAQ API request succeeds with authentication.
3. At least one valid PM2.5 observation is returned.
4. Database contains OpenAQ records.
5. No duplicate records were created in SQLite.
6. /api/public-data/latest returns the latest stored record (HTTP 200).
"""

import os
import sys
import json
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

# Configure utf-8 stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "database" / "air_quality.db"
ENV_PATH = REPO_ROOT / ".env"
BACKEND_URL = "http://localhost:3000/api/public-data/latest"


def load_api_key():
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
    return api_key


def main():
    print("=" * 65)
    print("OpenAQ Ingestion Verification")
    print("=" * 65)

    passed_checks = 0
    total_checks = 6

    # -------------------------------------------------------------
    # Check 1: Verify OPENAQ_API_KEY exists
    # -------------------------------------------------------------
    api_key = load_api_key()
    if api_key and len(api_key) > 5:
        print("[PASS] Check 1: OPENAQ_API_KEY is configured (key hidden).")
        passed_checks += 1
    else:
        print("[FAIL] Check 1: OPENAQ_API_KEY is missing or empty.", file=sys.stderr)
        sys.exit(1)

    # -------------------------------------------------------------
    # Check 2 & 3: OpenAQ request succeeds & valid PM2.5 returned
    # -------------------------------------------------------------
    url = "https://api.openaq.org/v3/locations/8118/sensors"
    headers = {
        "X-API-Key": api_key,
        "User-Agent": "EnviroCatalysts-Verifier/1.0",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                print(f"[PASS] Check 2: OpenAQ API request succeeded (HTTP {resp.status}).")
                passed_checks += 1
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])
                pm25_sensor = None
                for s in results:
                    p = s.get("parameter", {})
                    p_name = str(p.get("name", "")).lower()
                    d_name = str(p.get("displayName", "")).upper()
                    if p_name in ("pm25", "pm2.5") or d_name in ("PM25", "PM2.5") or p.get("id") == 2:
                        pm25_sensor = s
                        break

                if pm25_sensor:
                    latest = pm25_sensor.get("latest")
                    val = latest.get("value") if latest else None
                    print(f"[PASS] Check 3: Valid PM2.5 sensor verified (ID {pm25_sensor.get('id')}, latest value: {val}).")
                    passed_checks += 1
                else:
                    print("[FAIL] Check 3: No PM2.5 sensor found in results.", file=sys.stderr)
            else:
                print(f"[FAIL] Check 2: OpenAQ API returned status {resp.status}.", file=sys.stderr)
    except Exception as e:
        print(f"[FAIL] Check 2/3: OpenAQ API request failed: {e}", file=sys.stderr)

    # -------------------------------------------------------------
    # Check 4: Database contains OpenAQ records
    # -------------------------------------------------------------
    if not DB_PATH.exists():
        print(f"[FAIL] Check 4: Database not found at {DB_PATH}.", file=sys.stderr)
    else:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM openaq_measurements;")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"[PASS] Check 4: Database contains {count} OpenAQ records in openaq_measurements.")
            passed_checks += 1
        else:
            print("[FAIL] Check 4: openaq_measurements table is empty.", file=sys.stderr)

        # -------------------------------------------------------------
        # Check 5: No duplicate records were created
        # -------------------------------------------------------------
        cursor.execute("""
            SELECT source, location_id, parameter, period_start, period_end, COUNT(*) as cnt
            FROM openaq_measurements
            GROUP BY source, location_id, parameter, period_start, period_end
            HAVING cnt > 1;
        """)
        dupes = cursor.fetchall()
        if len(dupes) == 0:
            print("[PASS] Check 5: Zero duplicate records found in openaq_measurements.")
            passed_checks += 1
        else:
            print(f"[FAIL] Check 5: Found {len(dupes)} duplicate records!", file=sys.stderr)

        # Query latest record for comparison with API
        cursor.execute("""
            SELECT value, unit, period_start, period_end
            FROM openaq_measurements
            WHERE parameter = 'PM2.5'
            ORDER BY period_end DESC, id DESC
            LIMIT 1;
        """)
        latest_db = cursor.fetchone()
        conn.close()

    # -------------------------------------------------------------
    # Check 6: /api/public-data/latest returns latest stored record
    # -------------------------------------------------------------
    try:
        api_req = urllib.request.Request(BACKEND_URL, headers={"Accept": "application/json"})
        with urllib.request.urlopen(api_req, timeout=10) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                latest_obj = body.get("latest")
                if latest_obj and latest_db:
                    api_val = latest_obj.get("value")
                    api_start = latest_obj.get("period_start")
                    api_end = latest_obj.get("period_end")
                    if api_val == latest_db[0] and api_end == latest_db[3]:
                        print(f"[PASS] Check 6: Backend endpoint returned latest observation matching DB (Value: {api_val} {latest_obj.get('unit')}, Period: {api_start} -> {api_end}).")
                        passed_checks += 1
                    else:
                        print(f"[FAIL] Check 6: Backend data mismatch (API val: {api_val}, DB val: {latest_db[0]}).", file=sys.stderr)
                else:
                    print("[FAIL] Check 6: Backend returned null or empty latest object.", file=sys.stderr)
            else:
                print(f"[FAIL] Check 6: Backend returned status {resp.status}.", file=sys.stderr)
    except Exception as e:
        print(f"[FAIL] Check 6: Could not query backend at {BACKEND_URL}: {e}", file=sys.stderr)

    print("=" * 65)
    print(f"Verification Results: {passed_checks}/{total_checks} checks passed.")
    print("=" * 65)

    if passed_checks == total_checks:
        print("ALL VERIFICATION CHECKS PASSED.")
        sys.exit(0)
    else:
        print("VERIFICATION FAILED.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
