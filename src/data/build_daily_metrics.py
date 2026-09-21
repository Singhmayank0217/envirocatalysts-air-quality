from pathlib import Path
import pandas as pd

INPUT_FILE = Path("data/processed/hourly_measurements.csv")
OUTPUT_DIR = Path("data/processed")
OUTPUT_FILE = OUTPUT_DIR / "daily_station_measurements.csv"

CHUNK_SIZE = 250_000

REQUIRED_HOURS_PER_DAY = 24
MIN_COVERAGE = 0.70


def process_chunk(df):

    df["period_start"] = pd.to_datetime(
        df["period_start"],
        errors="coerce"
    )

    df = df.dropna(
        subset=[
            "station_id",
            "requested_city",
            "parameter_name",
            "period_start",
            "mean"
        ]
    )

    df["date"] = df["period_start"].dt.date

    # IMPORTANT:
    # Store SUM + COUNT instead of averaging here.
    # This allows us to correctly combine chunks later.
    grouped = (
        df.groupby(
            [
                "requested_city",
                "station_id",
                "parameter_name",
                "financial_year",
                "date"
            ],
            as_index=False
        )
        .agg(
            sum_value=("mean", "sum"),
            valid_hours=("period_start", "nunique"),
            min_value=("mean", "min"),
            max_value=("mean", "max")
        )
    )

    return grouped


def main():

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    print("Reading hourly measurements in chunks...")
    print(f"Input: {INPUT_FILE}")
    print()

    daily_chunks = []
    total_rows = 0

    for chunk_number, chunk in enumerate(
        pd.read_csv(
            INPUT_FILE,
            chunksize=CHUNK_SIZE
        ),
        start=1
    ):

        total_rows += len(chunk)

        print(
            f"Processing chunk {chunk_number}: "
            f"{len(chunk):,} rows"
        )

        daily = process_chunk(chunk)

        daily_chunks.append(daily)

    print()
    print("Combining daily results...")

    daily_data = pd.concat(
        daily_chunks,
        ignore_index=True
    )

    # Combine records that were split between chunks.
    daily_data = (
        daily_data.groupby(
            [
                "requested_city",
                "station_id",
                "parameter_name",
                "financial_year",
                "date"
            ],
            as_index=False
        )
        .agg(
            sum_value=("sum_value", "sum"),
            valid_hours=("valid_hours", "sum"),
            min_value=("min_value", "min"),
            max_value=("max_value", "max")
        )
    )

    # Correct daily mean after all chunks are combined.
    daily_data["daily_mean"] = (
        daily_data["sum_value"] /
        daily_data["valid_hours"]
    )

    # Coverage
    daily_data["coverage_pct"] = (
        daily_data["valid_hours"] /
        REQUIRED_HOURS_PER_DAY
    )

    daily_data["coverage_pass"] = (
        daily_data["coverage_pct"] >= MIN_COVERAGE
    )

    # Remove helper column
    daily_data = daily_data.drop(
        columns=["sum_value"]
    )

    daily_data = daily_data.sort_values(
        [
            "requested_city",
            "station_id",
            "parameter_name",
            "date"
        ]
    )

    daily_data.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print()
    print("=" * 50)
    print("DAILY PROCESSING COMPLETE")
    print("=" * 50)

    print(f"Hourly rows processed: {total_rows:,}")
    print(f"Daily station rows:    {len(daily_data):,}")

    print(
        f"Cities:                "
        f"{daily_data['requested_city'].nunique()}"
    )

    print(
        f"Stations:              "
        f"{daily_data['station_id'].nunique()}"
    )

    print(
        f"Pollutants:            "
        f"{daily_data['parameter_name'].nunique()}"
    )

    passed = daily_data["coverage_pass"].sum()
    total = len(daily_data)

    print(
        f"Coverage >= 70%:       "
        f"{passed:,} / {total:,}"
    )

    print(f"Output:                {OUTPUT_FILE}")


if __name__ == "__main__":
    main()