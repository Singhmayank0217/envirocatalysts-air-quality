from pathlib import Path
import pandas as pd

RAW_DIR = Path("data/raw/parts")
PROCESSED_DIR = Path("data/processed")

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def normalize_file(file_path: Path) -> pd.DataFrame:
    df = pd.read_csv(file_path)

    # Standardize column names
    df.columns = [c.strip().lower() for c in df.columns]

    # Convert timestamp
    df["period_start"] = pd.to_datetime(
        df["period_start"],
        errors="coerce"
    )

    # Numeric fields
    numeric_columns = ["mean", "min", "max", "n"]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # Remove rows without essential information
    df = df.dropna(
        subset=[
            "station_id",
            "parameter_name",
            "period_start",
            "mean"
        ]
    )

    # Normalize text
    df["station_id"] = df["station_id"].astype(str).str.strip()
    df["parameter_name"] = df["parameter_name"].astype(str).str.strip()
    df["requested_city"] = df["requested_city"].astype(str).str.strip()

    # Keep only valid non-negative concentrations
    df = df[df["mean"] >= 0]

    # Create useful date/time dimensions
    df["date"] = df["period_start"].dt.date
    df["hour"] = df["period_start"].dt.hour
    df["year"] = df["period_start"].dt.year
    df["month"] = df["period_start"].dt.month

    # Sort
    df = df.sort_values(
        ["requested_city", "station_id", "parameter_name", "period_start"]
    )

    return df


def main():
    files = sorted(RAW_DIR.glob("*.csv"))

    if not files:
        raise FileNotFoundError(
            f"No CSV files found in {RAW_DIR}"
        )

    print(f"Found {len(files)} raw files")

    all_data = []

    for file_path in files:
        print(f"Processing: {file_path.name}")

        try:
            df = normalize_file(file_path)

            if not df.empty:
                all_data.append(df)

            print(f"  Rows: {len(df):,}")

        except Exception as e:
            print(f"  ERROR: {e}")

    if not all_data:
        raise RuntimeError("No valid data found.")

    combined = pd.concat(
        all_data,
        ignore_index=True
    )

    # Remove exact duplicates
    before = len(combined)

    combined = combined.drop_duplicates(
        subset=[
            "station_id",
            "parameter_name",
            "period_start"
        ]
    )

    duplicates_removed = before - len(combined)

    # Save normalized dataset
    output = PROCESSED_DIR / "hourly_measurements.csv"

    combined.to_csv(
        output,
        index=False
    )

    print("\n==============================")
    print("NORMALIZATION COMPLETE")
    print("==============================")
    print(f"Input files:        {len(files)}")
    print(f"Final rows:         {len(combined):,}")
    print(f"Duplicates removed: {duplicates_removed:,}")
    print(f"Cities:             {combined['requested_city'].nunique()}")
    print(f"Stations:           {combined['station_id'].nunique()}")
    print(f"Pollutants:         {combined['parameter_name'].unique().tolist()}")
    print(f"Output:             {output}")


if __name__ == "__main__":
    main()