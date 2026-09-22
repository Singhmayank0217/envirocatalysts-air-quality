"""
Seed script to populate city_metadata table with reference coordinates for the 8 supported cities.

Coordinate Source:
  OpenStreetMap / Nominatim city-level reference coordinates (March 2026).
  These coordinates represent city-level reference / center locations (municipal/geographic center),
  NOT air-quality monitoring station locations.

Supported Cities (8):
  - Ahmedabad, Gujarat:   (23.0215, 72.5801)
  - Bengaluru, Karnataka: (12.9768, 77.5901)
  - Chennai, Tamil Nadu:  (13.0837, 80.2702)
  - Delhi, Delhi:         (28.6665, 77.2170)
  - Hyderabad, Telangana: (17.3606, 78.4741)
  - Kolkata, West Bengal: (22.5726, 88.3639)
  - Mumbai, Maharashtra:  (19.0550, 72.8692)
  - Pune, Maharashtra:    (18.5214, 73.8545)
"""

from pathlib import Path
import sqlite3

DB_PATH = Path("data/database/air_quality.db")

CITY_RECORDS = [
    ("Ahmedabad", "Gujarat", 23.0215, 72.5801),
    ("Bengaluru", "Karnataka", 12.9768, 77.5901),
    ("Chennai", "Tamil Nadu", 13.0837, 80.2702),
    ("Delhi", "Delhi", 28.6665, 77.2170),
    ("Hyderabad", "Telangana", 17.3606, 78.4741),
    ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Mumbai", "Maharashtra", 19.0550, 72.8692),
    ("Pune", "Maharashtra", 18.5214, 73.8545),
]


def seed_city_metadata(db_path: Path = DB_PATH):
    print("=" * 60)
    print("SEEDING CITY METADATA")
    print("=" * 60)
    print(f"Database: {db_path.resolve()}")

    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Ensure city_metadata table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS city_metadata (
                city TEXT PRIMARY KEY,
                state TEXT,
                latitude REAL,
                longitude REAL
            )
        """)

        # Idempotent upsert for the 8 city reference records
        cursor.executemany("""
            INSERT OR REPLACE INTO city_metadata (city, state, latitude, longitude)
            VALUES (?, ?, ?, ?)
        """, CITY_RECORDS)

        conn.commit()
        print(f"Successfully upserted {len(CITY_RECORDS)} city metadata records.")

        # Verification query
        cursor.execute("SELECT city, state, latitude, longitude FROM city_metadata ORDER BY city")
        rows = cursor.fetchall()

        print("\nVerification (SELECT * FROM city_metadata):")
        print(f"{'City':<15} {'State':<18} {'Latitude':>10} {'Longitude':>10}")
        print("-" * 57)
        for city, state, lat, lon in rows:
            print(f"{city:<15} {state:<18} {lat:>10.4f} {lon:>10.4f}")

        if len(rows) != 8:
            raise ValueError(f"Expected exactly 8 rows in city_metadata, found {len(rows)}")

        print("-" * 57)
        print("SEEDING COMPLETED SUCCESSFULLY. Exactly 8 cities present.")

    finally:
        conn.close()


if __name__ == "__main__":
    seed_city_metadata()
