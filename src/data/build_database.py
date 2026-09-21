from pathlib import Path
import sqlite3
import pandas as pd

PROCESSED_DIR = Path("data/processed")
DB_DIR = Path("data/database")

DB_DIR.mkdir(parents=True, exist_ok=True)

DB_FILE = DB_DIR / "air_quality.db"

FILES = {
    "hourly_measurements": "hourly_measurements.csv",
    "daily_station_measurements": "daily_station_measurements.csv",
    "city_daily_metrics": "city_daily_metrics.csv",
    "city_daily_aqi": "city_daily_aqi.csv",
    "pollutant_concentration_summary": "pollutant_concentration_summary.csv",
    "aqi_category_days": "aqi_category_days.csv",
    "dominant_pollutant_days": "dominant_pollutant_days.csv",
    "city_period_summary": "city_period_summary.csv",
}


def load_csv_to_sqlite(
    connection,
    table_name,
    file_path,
    chunksize=100_000
):
    print(f"\nLoading {table_name}")

    first_chunk = True
    total_rows = 0

    for chunk in pd.read_csv(
        file_path,
        chunksize=chunksize
    ):

        chunk.to_sql(
            table_name,
            connection,
            if_exists="replace" if first_chunk else "append",
            index=False
        )

        total_rows += len(chunk)
        first_chunk = False

        print(
            f"  Loaded {total_rows:,} rows",
            end="\r"
        )

    print()
    print(f"  Complete: {total_rows:,} rows")


def create_indexes(connection):

    print("\nCreating database indexes...")

    indexes = [
        """
        CREATE INDEX IF NOT EXISTS
        idx_hourly_city_time
        ON hourly_measurements
        (requested_city, period_start)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_hourly_station_time
        ON hourly_measurements
        (station_id, period_start)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_hourly_pollutant
        ON hourly_measurements
        (parameter_name)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_daily_city_date
        ON daily_station_measurements
        (requested_city, date)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_daily_station_date
        ON daily_station_measurements
        (station_id, date)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_city_daily
        ON city_daily_metrics
        (requested_city, financial_year, date)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_city_aqi
        ON city_daily_aqi
        (requested_city, financial_year, date)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_concentration_summary
        ON pollutant_concentration_summary
        (requested_city, financial_year, parameter_name)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_category_days
        ON aqi_category_days
        (requested_city, financial_year)
        """,

        """
        CREATE INDEX IF NOT EXISTS
        idx_dominant_days
        ON dominant_pollutant_days
        (requested_city, financial_year)
        """,
    ]

    cursor = connection.cursor()

    for index_sql in indexes:
        cursor.execute(index_sql)

    connection.commit()

    print("Indexes created.")


def create_metadata_tables(connection):

    print("\nCreating metadata tables...")

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            base_url TEXT,
            description TEXT,
            attribution TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS city_metadata (
            city TEXT PRIMARY KEY,
            state TEXT,
            latitude REAL,
            longitude REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pollutant_metadata (
            pollutant TEXT PRIMARY KEY,
            display_name TEXT,
            unit TEXT
        )
    """)

    cursor.execute("""
        INSERT OR REPLACE INTO data_sources
        (id, name, base_url, description, attribution)
        VALUES
        (
            1,
            'India Air Quality API - XKDR Forum',
            'https://airquality.xkdr.org/',
            'Public air quality measurements used for the project data pipeline.',
            'India Air Quality API / XKDR Forum'
        )
    """)

    pollutants = [
        ("PM2.5", "PM2.5", "µg/m³"),
        ("PM10", "PM10", "µg/m³"),
        ("NO2", "NO₂", "µg/m³"),
        ("SO2", "SO₂", "µg/m³"),
        ("CO", "CO", "mg/m³"),
        ("Ozone", "O₃", "µg/m³"),
    ]

    cursor.executemany(
        """
        INSERT OR REPLACE INTO pollutant_metadata
        (pollutant, display_name, unit)
        VALUES (?, ?, ?)
        """,
        pollutants
    )

    connection.commit()

    print("Metadata tables created.")


def main():

    print("=" * 60)
    print("BUILDING SQLITE DATABASE")
    print("=" * 60)

    if DB_FILE.exists():
        print(f"\nRemoving existing database: {DB_FILE}")
        DB_FILE.unlink()

    connection = sqlite3.connect(DB_FILE)

    try:

        for table_name, filename in FILES.items():

            file_path = PROCESSED_DIR / filename

            if not file_path.exists():
                print(
                    f"\nWARNING: Missing {file_path}"
                )
                continue

            load_csv_to_sqlite(
                connection,
                table_name,
                file_path
            )

        create_metadata_tables(connection)

        create_indexes(connection)

        connection.commit()

        # Database verification
        print("\n" + "=" * 60)
        print("DATABASE VERIFICATION")
        print("=" * 60)

        cursor = connection.cursor()

        for table_name in FILES:

            try:
                cursor.execute(
                    f"SELECT COUNT(*) FROM {table_name}"
                )

                count = cursor.fetchone()[0]

                print(
                    f"{table_name:<40} {count:>12,}"
                )

            except sqlite3.Error:
                print(
                    f"{table_name:<40} NOT FOUND"
                )

        print()
        print(f"Database: {DB_FILE}")

    finally:
        connection.close()

    print("\nDATABASE BUILD COMPLETE.")


if __name__ == "__main__":
    main()