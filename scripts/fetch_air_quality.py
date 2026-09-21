import io
import os
import time
from pathlib import Path

import pandas as pd
import requests
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv


load_dotenv()

API_URL = "https://airquality.xkdr.org/v1/measurements"
API_KEY = os.getenv("AQI_API_KEY")

if not API_KEY:
    raise RuntimeError("AQI_API_KEY is missing from .env")


BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DIR = BASE_DIR / "data" / "raw"
PARTS_DIR = RAW_DIR / "parts"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PARTS_DIR.mkdir(parents=True, exist_ok=True)


CITIES = [
    "Delhi",
    "Mumbai",
    "Kolkata",
    "Chennai",
    "Bengaluru",
    "Hyderabad",
    "Pune",
    "Ahmedabad",
]


POLLUTANTS = [
    "PM2.5",
    "PM10",
    "NO2",
    "SO2",
    "CO",
    "Ozone",
]


PERIODS = [
    {
        "name": "FY2024-25",
        "start": "2024-04-01",
        "end": "2025-03-31",
    },
    {
        "name": "FY2025-26",
        "start": "2025-04-01",
        "end": "2026-03-31",
    },
]


def safe_name(value):
    return (
        value
        .replace(".", "_")
        .replace(" ", "_")
        .replace("/", "_")
    )


def output_path(city, pollutant, period):
    filename = (
        f"{safe_name(city)}__"
        f"{safe_name(pollutant)}__"
        f"{period}.csv"
    )

    return PARTS_DIR / filename


def fetch_data(city, pollutant, start, end):

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    params = {
        "city": city,
        "parameter": pollutant,
        "start": start,
        "end": end,
        "agg": "hourly",
        "format": "csv",
    }

    response = requests.get(
        API_URL,
        headers=headers,
        params=params,
        timeout=(15, 180),
    )

    response.raise_for_status()

    if not response.text.strip():
        return None

    return pd.read_csv(
        io.StringIO(response.text)
    )


def main():

    results = []

    total = (
        len(CITIES)
        * len(POLLUTANTS)
        * len(PERIODS)
    )

    completed = 0

    for period in PERIODS:

        for city in CITIES:

            for pollutant in POLLUTANTS:

                completed += 1

                path = output_path(
                    city,
                    pollutant,
                    period["name"],
                )

                print()
                print(
                    f"[{completed}/{total}] "
                    f"{city} | {pollutant} | "
                    f"{period['name']}"
                )

                # ----------------------------------
                # Already downloaded
                # ----------------------------------

                if path.exists():

                    try:
                        existing = pd.read_csv(path)

                        print(
                            f"  SKIP - already downloaded "
                            f"({len(existing):,} rows)"
                        )

                        results.append({
                            "city": city,
                            "pollutant": pollutant,
                            "financial_year": period["name"],
                            "status": "downloaded",
                            "rows": len(existing),
                            "file": str(path),
                        })

                        continue

                    except Exception:
                        print(
                            "  Existing file is invalid. "
                            "Downloading again..."
                        )

                # ----------------------------------
                # Download with retries
                # ----------------------------------

                success = False

                for attempt in range(1, 4):

                    try:

                        print(
                            f"  Attempt {attempt}/3"
                        )

                        df = fetch_data(
                            city=city,
                            pollutant=pollutant,
                            start=period["start"],
                            end=period["end"],
                        )

                        # No data
                        if df is None or df.empty:

                            print(
                                "  NO DATA"
                            )

                            results.append({
                                "city": city,
                                "pollutant": pollutant,
                                "financial_year": period["name"],
                                "status": "no_data",
                                "rows": 0,
                                "file": "",
                            })

                            success = True
                            break

                        # Add metadata
                        df["requested_city"] = city
                        df["requested_pollutant"] = pollutant
                        df["financial_year"] = period["name"]

                        # Save immediately
                        df.to_csv(
                            path,
                            index=False
                        )

                        print(
                            f"  SUCCESS - "
                            f"{len(df):,} rows"
                        )

                        results.append({
                            "city": city,
                            "pollutant": pollutant,
                            "financial_year": period["name"],
                            "status": "downloaded",
                            "rows": len(df),
                            "file": str(path),
                        })

                        success = True
                        break

                    except requests.exceptions.Timeout:

                        print(
                            "  TIMEOUT"
                        )

                    except requests.exceptions.RequestException as exc:

                        print(
                            f"  REQUEST ERROR: {exc}"
                        )

                    except Exception as exc:

                        print(
                            f"  ERROR: {exc}"
                        )

                    if attempt < 3:

                        print(
                            "  Waiting 5 seconds..."
                        )

                        time.sleep(5)

                if not success:

                    results.append({
                        "city": city,
                        "pollutant": pollutant,
                        "financial_year": period["name"],
                        "status": "failed",
                        "rows": 0,
                        "file": "",
                    })

                    print(
                        "  FAILED - moving to next request"
                    )

                time.sleep(0.5)

    # ----------------------------------
    # Save manifest
    # ----------------------------------

    manifest = pd.DataFrame(results)

    manifest_path = (
        RAW_DIR / "download_manifest.csv"
    )

    manifest.to_csv(
        manifest_path,
        index=False
    )

    print()
    print("=" * 70)
    print("EXTRACTION FINISHED")
    print("=" * 70)

    print(
        f"Manifest: {manifest_path}"
    )

    print()

    print(
        manifest[
            [
                "city",
                "pollutant",
                "financial_year",
                "status",
                "rows",
            ]
        ].to_string(index=False)
    )


if __name__ == "__main__":
    main()