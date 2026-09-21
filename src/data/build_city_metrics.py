from pathlib import Path
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np

INPUT_FILE = Path("data/processed/daily_station_measurements.csv")
OUTPUT_DIR = Path("data/processed")

CITY_DAILY_FILE = OUTPUT_DIR / "city_daily_metrics.csv"
SUMMARY_FILE = OUTPUT_DIR / "city_period_summary.csv"

MIN_COVERAGE = 0.70

# CPCB AQI breakpoints.
# Concentrations are in the units used by the source data.
#
# PM10, PM2.5, NO2, SO2 -> 24-hour
#
# CO and O3 are deliberately NOT used here because our current
# daily dataset contains 24-hour means, while CPCB uses 8-hour
# averages for CO and O3.

AQI_BREAKPOINTS = {
    "PM10": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, float("inf"), 401, 500),
    ],

    "PM2.5": [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, float("inf"), 401, 500),
    ],

    "NO2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, float("inf"), 401, 500),
    ],

    "SO2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, float("inf"), 401, 500),
    ],
}


def calculate_subindex(pollutant, concentration):
    """
    Calculate CPCB-style pollutant sub-index using
    linear interpolation between health breakpoints.
    """

    if pd.isna(concentration):
        return np.nan

    concentration = float(concentration)

    if concentration < 0:
        return np.nan

    breakpoints = AQI_BREAKPOINTS.get(pollutant)

    if not breakpoints:
        return np.nan

    for blo, bhi, ilo, ihi in breakpoints:

        if blo <= concentration <= bhi:

            if bhi == float("inf"):
                return float(ihi)

            value = (
                ((ihi - ilo) / (bhi - blo))
                * (concentration - blo)
                + ilo
            )

            return round(value, 2)

    return np.nan


def aqi_category(aqi):
    if pd.isna(aqi):
        return "Insufficient Data"

    aqi = float(aqi)

    if aqi <= 50:
        return "Good"

    if aqi <= 100:
        return "Satisfactory"

    if aqi <= 200:
        return "Moderate"

    if aqi <= 300:
        return "Poor"

    if aqi <= 400:
        return "Very Poor"

    return "Severe"


def build_city_daily_data(df):

    # Only use station-days that pass our 70% coverage rule.
    valid = df[
        df["coverage_pass"].astype(str).str.lower() == "true"
    ].copy()

    print(
        f"Station-day records passing coverage rule: "
        f"{len(valid):,}"
    )

    # City-level daily concentration.
    #
    # Each station contributes once to the city/day/pollutant
    # calculation after passing the station-day coverage test.
    city_daily = (
        valid
        .groupby(
            [
                "requested_city",
                "financial_year",
                "date",
                "parameter_name",
            ],
            as_index=False
        )
        .agg(
            concentration=("daily_mean", "mean"),
            contributing_stations=("station_id", "nunique"),
            average_station_coverage=("coverage_pct", "mean"),
        )
    )

    return city_daily


def add_aqi_metrics(city_daily):

    # AQI-capable pollutants in this version.
    aqi_pollutants = [
        "PM10",
        "PM2.5",
        "NO2",
        "SO2",
    ]

    aqi_data = city_daily[
        city_daily["parameter_name"].isin(aqi_pollutants)
    ].copy()

    # Calculate individual pollutant sub-index.
    aqi_data["sub_index"] = aqi_data.apply(
        lambda row: calculate_subindex(
            row["parameter_name"],
            row["concentration"]
        ),
        axis=1
    )

    # Convert pollutant rows into columns.
    subindices = (
        aqi_data
        .pivot_table(
            index=[
                "requested_city",
                "financial_year",
                "date",
            ],
            columns="parameter_name",
            values="sub_index",
            aggfunc="max"
        )
        .reset_index()
    )

    subindices.columns.name = None

    # Make sure expected columns exist.
    for pollutant in aqi_pollutants:
        if pollutant not in subindices.columns:
            subindices[pollutant] = np.nan

    # Number of available AQI pollutants.
    subindices["aqi_pollutants_available"] = (
        subindices[aqi_pollutants]
        .notna()
        .sum(axis=1)
    )

    # At least one particulate pollutant is mandatory.
    subindices["particulate_available"] = (
        subindices["PM10"].notna()
        | subindices["PM2.5"].notna()
    )

    # CPCB overall AQI requires at least 3 pollutants,
    # including PM10 or PM2.5.
    subindices["aqi_available"] = (
        (subindices["aqi_pollutants_available"] >= 3)
        & subindices["particulate_available"]
    )

    # Determine dominant pollutant from the highest
    # available pollutant sub-index.
    def dominant_pollutant(row):

        values = {
            pollutant: row[pollutant]
            for pollutant in aqi_pollutants
            if pd.notna(row[pollutant])
        }

        if not values:
            return "Insufficient Data"

        return max(values, key=values.get)

    subindices["dominant_pollutant"] = subindices.apply(
        dominant_pollutant,
        axis=1
    )

    def calculate_overall_aqi(row):

        if not row["aqi_available"]:
            return np.nan

        values = [
            row[p]
            for p in aqi_pollutants
            if pd.notna(row[p])
        ]

        if not values:
            return np.nan

        return round(max(values))

    subindices["aqi"] = subindices.apply(
        calculate_overall_aqi,
        axis=1
    )

    subindices["aqi_category"] = (
        subindices["aqi"]
        .apply(aqi_category)
    )

    return subindices


def build_period_summary(city_daily, aqi_daily):

    # Average pollutant concentration for each city/FY.
    concentration_summary = (
        city_daily
        .groupby(
            [
                "requested_city",
                "financial_year",
                "parameter_name",
            ],
            as_index=False
        )
        .agg(
            average_concentration=("concentration", "mean"),
            days_available=("date", "nunique"),
            average_contributing_stations=(
                "contributing_stations",
                "mean"
            ),
            average_station_coverage=(
                "average_station_coverage",
                "mean"
            ),
        )
    )

    # AQI category day counts.
    valid_aqi = aqi_daily[
        aqi_daily["aqi_available"]
    ].copy()

    category_days = (
        valid_aqi
        .groupby(
            [
                "requested_city",
                "financial_year",
                "aqi_category",
            ],
            as_index=False
        )
        .agg(
            days=("date", "nunique")
        )
    )

    # Dominant pollutant day counts.
    dominant_days = (
        valid_aqi
        .groupby(
            [
                "requested_city",
                "financial_year",
                "dominant_pollutant",
            ],
            as_index=False
        )
        .agg(
            days=("date", "nunique")
        )
    )

    return (
        concentration_summary,
        category_days,
        dominant_days
    )


def main():

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    print("=" * 60)
    print("BUILDING CITY METRICS")
    print("=" * 60)

    print(f"Input: {INPUT_FILE}")
    print()

    df = pd.read_csv(INPUT_FILE)

    print(f"Loaded rows: {len(df):,}")

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    df["daily_mean"] = pd.to_numeric(
        df["daily_mean"],
        errors="coerce"
    )

    df["coverage_pct"] = pd.to_numeric(
        df["coverage_pct"],
        errors="coerce"
    )

    print(
        f"Cities: {df['requested_city'].nunique()}"
    )

    print(
        f"Stations: {df['station_id'].nunique()}"
    )

    print(
        f"Pollutants: "
        f"{df['parameter_name'].unique().tolist()}"
    )

    print()

    # -----------------------------------------
    # CITY DAILY CONCENTRATIONS
    # -----------------------------------------

    city_daily = build_city_daily_data(df)

    city_daily.to_csv(
        CITY_DAILY_FILE,
        index=False
    )

    print(
        f"City daily records: "
        f"{len(city_daily):,}"
    )

    # -----------------------------------------
    # AQI
    # -----------------------------------------

    print()
    print("Calculating AQI...")

    aqi_daily = add_aqi_metrics(city_daily)

    print(
        f"City-days: "
        f"{len(aqi_daily):,}"
    )

    print(
        "AQI-available city-days: "
        f"{aqi_daily['aqi_available'].sum():,}"
    )

    print(
        "Insufficient-data city-days: "
        f"{(~aqi_daily['aqi_available']).sum():,}"
    )

    # -----------------------------------------
    # PERIOD SUMMARIES
    # -----------------------------------------

    (
        concentration_summary,
        category_days,
        dominant_days
    ) = build_period_summary(
        city_daily,
        aqi_daily
    )

    # Save supporting files.
    concentration_summary.to_csv(
        OUTPUT_DIR / "pollutant_concentration_summary.csv",
        index=False
    )

    category_days.to_csv(
        OUTPUT_DIR / "aqi_category_days.csv",
        index=False
    )

    dominant_days.to_csv(
        OUTPUT_DIR / "dominant_pollutant_days.csv",
        index=False
    )

    aqi_daily.to_csv(
        OUTPUT_DIR / "city_daily_aqi.csv",
        index=False
    )

    # -----------------------------------------
    # CREATE MASTER SUMMARY
    # -----------------------------------------

    summary_rows = []

    for _, row in concentration_summary.iterrows():

        summary_rows.append({
            "metric_type": "average_concentration",
            "city": row["requested_city"],
            "financial_year": row["financial_year"],
            "pollutant": row["parameter_name"],
            "metric_value": row["average_concentration"],
            "days": row["days_available"],
        })

    for _, row in category_days.iterrows():

        summary_rows.append({
            "metric_type": "aqi_category_days",
            "city": row["requested_city"],
            "financial_year": row["financial_year"],
            "pollutant": None,
            "aqi_category": row["aqi_category"],
            "metric_value": row["days"],
            "days": row["days"],
        })

    for _, row in dominant_days.iterrows():

        summary_rows.append({
            "metric_type": "dominant_pollutant_days",
            "city": row["requested_city"],
            "financial_year": row["financial_year"],
            "pollutant": row["dominant_pollutant"],
            "metric_value": row["days"],
            "days": row["days"],
        })

    master_summary = pd.DataFrame(summary_rows)

    master_summary.to_csv(
        SUMMARY_FILE,
        index=False
    )

    print()
    print("=" * 60)
    print("CITY METRICS COMPLETE")
    print("=" * 60)

    print(
        f"City daily file:              "
        f"{CITY_DAILY_FILE}"
    )

    print(
        "Pollutant concentration:      "
        f"{OUTPUT_DIR / 'pollutant_concentration_summary.csv'}"
    )

    print(
        "AQI category days:             "
        f"{OUTPUT_DIR / 'aqi_category_days.csv'}"
    )

    print(
        "Dominant pollutant days:       "
        f"{OUTPUT_DIR / 'dominant_pollutant_days.csv'}"
    )

    print(
        f"Master summary:                "
        f"{SUMMARY_FILE}"
    )

    print()
    print("AQI CATEGORY COUNTS:")

    if not category_days.empty:
        print(
            category_days
            .groupby(
                ["financial_year", "aqi_category"]
            )["days"]
            .sum()
            .to_string()
        )
    else:
        print("No AQI category data available.")

    print()
    print("FINANCIAL YEAR COVERAGE:")

    print(
        city_daily
        .groupby(
            ["financial_year", "parameter_name"]
        )["date"]
        .nunique()
        .to_string()
    )


if __name__ == "__main__":
    main()