# EnviroCatalysts Air Quality Platform

A mobile-first cross-platform application for comparative urban air quality analysis across major Indian metropolitan centers.

---

## Milestone 6B: Interactive City Air Quality Map

### 1. City Reference Coordinates & Data Source
The 8 supported cities are mapped using public, documented geographic reference coordinates:
- **Source**: OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/`), retrieved March 2026.
- **Coordinate Meaning**: These coordinates represent **city-level reference / center locations** (municipal reference centers), **NOT** individual air-quality monitoring stations.

| City | State | Latitude (°N) | Longitude (°E) | Reference Detail |
| :--- | :--- | :---: | :---: | :--- |
| **Ahmedabad** | Gujarat | 23.0215 | 72.5801 | Ahmedabad Municipal Center |
| **Bengaluru** | Karnataka | 12.9768 | 77.5901 | Bengaluru Urban Center |
| **Chennai** | Tamil Nadu | 13.0837 | 80.2702 | Greater Chennai Corporation Center |
| **Delhi** | Delhi | 28.6665 | 77.2170 | National Capital Territory of Delhi Center |
| **Hyderabad** | Telangana | 17.3606 | 78.4741 | Hyderabad Municipal Center |
| **Kolkata** | West Bengal | 22.5726 | 88.3639 | Kolkata Municipal Corporation Center |
| **Mumbai** | Maharashtra | 19.0550 | 72.8692 | Municipal Corporation of Greater Mumbai Center |
| **Pune** | Maharashtra | 18.5214 | 73.8545 | Pune Municipal Corporation Center |

Database seed script: `src/data/seed_city_metadata.py` populates `data/database/air_quality.db` table `city_metadata` via idempotent upsert operations (`INSERT OR REPLACE`).

---

### 2. Geographic Vector Map Asset & Attribution
- **Asset**: Simplified National Geographic Boundary of India (`india.simplified.geo.json`).
- **Source**: DataMeet Indian Maps Community Project (`datameet.org` / `github.com/datameet/maps`).
- **License**: Creative Commons Attribution 2.5 India ([CC BY 2.5 IN](https://creativecommons.org/licenses/by/2.5/in/)) / Open Data.
- **Geometry & Rendering Integrity**: Built with clean multi-ring SVG path geometry where every subpath explicitly opens with an absolute `M x y` and closes with `Z`. This completely prevents the diagonal bridging lines and coordinate drift caused by concatenated relative `m` commands.
- **Projection**: Calibrated Equirectangular Projection:
  - North: $37.5^\circ\text{ N}$
  - South: $5.0^\circ\text{ N}$
  - West: $67.0^\circ\text{ E}$
  - East: $99.0^\circ\text{ E}$
  - ViewBox: `0 0 1500 1615`
- **Projection Function**:
  $$x = \frac{\text{longitude} - 67.0}{99.0 - 67.0} \times 1500$$
  $$y = \frac{37.5 - \text{latitude}}{37.5 - 5.0} \times 1615$$
  Implemented in `mobile/src/components/indiaMapData.js`. All 8 city markers are dynamically projected without hardcoded pixel coordinates.

---

### 3. Interactive Marker Behavior & Two-Way Synchronization
- **CPCB AQI Category Palette**: Markers are colored according to their calculated FY2024-25 CPCB AQI category:
  - Good: `#15803D`
  - Satisfactory: `#0369A1`
  - Moderate: `#B45309`
  - Poor: `#C2410C`
  - Very Poor: `#B91C1C`
  - Severe: `#6B21A8`
- **Selected City State**:
  - `selectedCity` is the single source of truth across the application.
  - Tapping a city marker or its touch target calls `onSelectCity(city)`, updating `selectedCity` immediately.
  - Updating `selectedCity` updates the Selected City Detail card, AQI Category Days card, Average Pollutant Concentration card, and Dominant Pollutant Days card on Screen 1.
  - Selecting a city from the non-map city selector grid highlights the corresponding city marker on the map (two-way synchronization).
- **Selected Marker Styling**: Highlighted with an accent halo ring (radius 34, stroke `#1E40AF`, fill `#3B82F6` 25% opacity), white inner border, enlarged marker pin, and top-layer z-index.
- **Touch Targets**: 48×48 dp native touch targets centered over each city coordinate to ensure comfortable touch accuracy on mobile screens.

---

### 4. FY2025-26 Data Integrity Limitation
- **Period Clarification**: The map explicitly visualizes **FY2024-25 AQI** because that is the benchmark period with complete multi-pollutant measurements required for official CPCB 24-hour AQI calculation (minimum 3 pollutants including PM10 or PM2.5).
- **No Fabricated Data**: For FY2025-26, the available data contains only PM2.5 and PM10 measurements without the required secondary gaseous pollutants (NO2, SO2, CO, Ozone) to calculate standard CPCB AQI.
- Markers are **NOT** colored using PM2.5 or PM10 alone, and no fictitious FY2025-26 AQI values are shown. The evaluation card explicitly displays:
  > *"Insufficient pollutant data for AQI calculation (PM2.5 & PM10 only)"*

---

### 5. Accessibility Compliance
- **Dynamic Accessible Alternative**: The map container includes a dynamically synthesized text description summarizing all 8 cities and their AQI metrics from the live API response.
- **Marker Accessibility**: Each marker is marked as `accessibilityRole="button"` with a complete label, e.g., `"Delhi. FY2024-25 AQI 195.6. Moderate. Double tap to select."`
- **Strict Role Boundaries**: Complies with accessibility restrictions—no forbidden roles (`note`, `status`, `summary`) are used.
- **Fallback Grid**: The accessible city selector grid remains positioned beneath the map for users preferring a non-spatial keyboard/touch navigation interface.

---

---

## Milestone 7A: Fresh Public Air Quality Data (OpenAQ API Ingestion)

### 1. External Public Data Source & API
- **Source**: OpenAQ ([openaq.org](https://openaq.org/)).
- **API Version**: OpenAQ API v3 (`https://api.openaq.org/v3/`).
- **Sanctioned API Ingestion Client**: Data is accessed strictly through official, authenticated OpenAQ API v3 REST endpoints. This implementation is an authorized API client; it does **NOT** scrape OpenAQ web pages, HTML interfaces, or visualization dashboards.
- **Terms of Use**: Data access adheres to the [OpenAQ Terms of Use](https://docs.openaq.org/about/terms).
- **Attribution**: Attribution is maintained for OpenAQ and applicable underlying monitoring data providers. Underlying monitoring networks retain their respective licensing terms.

### 2. API Authentication & Security
- **Authentication Header**: `X-API-Key: ${OPENAQ_API_KEY}`.
- **Environment Variable**: `OPENAQ_API_KEY`.
- **Zero Exposure Guarantee**:
  - The API key is stored strictly on the server/pipeline side (loaded via environment or local `.env`).
  - Never hardcoded into application source code.
  - Never exposed in client-side React Native bundles or API responses.
  - `.env` is ignored by Git and never committed.
  - If `OPENAQ_API_KEY` is not present, scripts fail immediately with the clear message: `"OPENAQ_API_KEY is not configured."`

### 3. Endpoints & Dynamic Sensor Discovery
- **Initial Location**: New Delhi, India (`location_id`: **8118**).
- **Target Pollutant**: **PM2.5**.
- **Dynamic Sensor Discovery**: Rather than hardcoding sensor IDs, the client queries:
  ```http
  GET /v3/locations/8118/sensors
  ```
  It inspects available sensors, dynamically identifies the active sensor measuring `pm25` / `PM2.5` (Sensor ID **23534**, unit `µg/m³`), and extracts its metadata.
- **Measurements Retrieval**:
  ```http
  GET /v3/sensors/{sensor_id}/measurements?datetime_from={24h_ago_iso}&limit=100
  ```
  Retrieves recent hourly observations for the trailing 24 hours with exact start/end period timestamps, with graceful fallback to the sensor's pre-computed `latest` reading if the measurements window is empty.

### 4. Storage & Duplicate Prevention
- **Database**: `data/database/air_quality.db`.
- **Dedicated Table**: `openaq_measurements`.
- **Schema**:
  | Column | Type | Constraints | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record ID |
  | `source` | TEXT | NOT NULL DEFAULT 'OpenAQ' | Origin public source |
  | `location_id` | INTEGER | NOT NULL | OpenAQ station ID (8118) |
  | `location_name` | TEXT | NOT NULL | Location label ("New Delhi") |
  | `city` | TEXT | NOT NULL | City name ("New Delhi") |
  | `country` | TEXT | NOT NULL | Country name ("India") |
  | `parameter` | TEXT | NOT NULL | Pollutant identifier ("PM2.5") |
  | `unit` | TEXT | NOT NULL | Measurement unit ("µg/m³") |
  | `period_start` | TEXT | NOT NULL | Normalized UTC ISO-8601 start timestamp |
  | `period_end` | TEXT | NOT NULL | Normalized UTC ISO-8601 end timestamp |
  | `value` | REAL | NOT NULL | Measured concentration |
  | `ingested_at` | TEXT | NOT NULL | Pipeline UTC ISO-8601 timestamp |
- **Unique Constraint**:
  ```sql
  UNIQUE (source, location_id, parameter, period_start, period_end)
  ```
- **Idempotency**: Observations are inserted with `INSERT OR IGNORE`. Re-running ingestion skips existing records and produces zero duplicate entries.
- **Metadata Catalog**: `data_sources` table in SQLite is cataloged with OpenAQ endpoint, terms, and attribution metadata.

### 5. Backend REST Endpoint
- **Endpoints**:
  - `GET /api/public-data/latest`
  - `GET /api/v1/public-data/latest` (versioned alias)
- **Response Format**:
  ```json
  {
    "source": "OpenAQ",
    "location": "New Delhi",
    "parameter": "PM2.5",
    "latest": {
      "value": 92.0,
      "unit": "µg/m³",
      "period_start": "2026-09-22T06:30:00Z",
      "period_end": "2026-09-22T07:30:00Z"
    },
    "ingested_at": "2026-09-22T09:27:18Z"
  }
  ```
- **Empty State**: If no observations exist, returns `{ "source": "OpenAQ", "location": "New Delhi", "parameter": "PM2.5", "latest": null, "ingested_at": null, "message": "No public observation available." }` without fabricated zero values.

### 6. Mobile Integration (`PublicDataCard`)
- **API Service**: `getPublicLatest()` in `mobile/src/services/api.js`.
- **Card Component**: `mobile/src/components/PublicDataCard.js`.
- **Screen Placement**: Rendered near the top of **Screen 1** (`OverviewScreen`), directly after the primary city/year filter controls and preceding the historical analysis cards.
- **States Supported**:
  - **Loading**: `"Loading public observation..."` with activity indicator.
  - **Error**: `"Fresh public data unavailable."` with a touch retry button.
  - **Empty**: `"No public observation available."`
  - **Loaded**: Displays pollutant (`PM2.5`), latest concentration, unit (`µg/m³`), observation time, ingestion timestamp, and source attribution. Never displays zero as a placeholder.
- **Accessibility**: Strict compliance with React Native accessibility guidelines:
  - Valid roles used (`header`, `button`, `text`, `alert`).
  - Prohibited roles (`note`, `status`, `summary`) are completely avoided.
  - Dynamic descriptive text: e.g., `"Fresh public air quality data from OpenAQ. New Delhi PM2.5 latest observation is 92.0 micrograms per cubic metre at 1:00 PM."`

### 7. Rate Limiting & Scheduling
- **OpenAQ Tier Limit**: 60 requests/minute.
- **Request Economy**: Ingestion requires only 1–2 requests per run (1 for sensor discovery, 1 for trailing 24h measurements). No aggressive loops or full-archive pagination.
- **Recommended Schedule**: Every 1 to 6 hours via cron or task scheduler:
  ```bash
  python src/data/ingest_openaq.py
  ```

### 8. API Error Handling
- **401 / 403 Forbidden**: Cleanly reports `"OpenAQ authentication failed."`
- **429 Rate Limited**: Cleanly reports `"OpenAQ rate limit reached."`
- **5xx Server Error**: Cleanly reports `"OpenAQ service temporarily unavailable."`
- **Network Outage**: Cleanly reports `"Unable to reach OpenAQ."`
- **Malformed Response**: Cleanly reports `"Unexpected OpenAQ response."`
- **Data Hygiene**: Rejects `null`, non-numeric, `NaN`, and negative sensor anomaly codes (e.g. `-999.0`).

### 9. Critical Data Integrity Limitation
- **Dataset Isolation**: OpenAQ observations are stored strictly in `openaq_measurements` and are completely isolated from existing `hourly_measurements`, `daily_station_measurements`, `city_daily_metrics`, and `city_daily_aqi` tables.
- **No AQI Conversion**: OpenAQ PM2.5 readings are **NOT** converted to AQI, as Indian CPCB AQI standards mandate multi-pollutant 24-hour aggregations (minimum 3 pollutants including PM10 or PM2.5).
- **No Aggregation Bleed**: Fresh OpenAQ readings are never merged into FY2024-25 / FY2025-26 historical analysis or station calculations.
- **Point Observation**: The card explicitly labels the reading as a public point observation from an external monitoring station (Location ID 8118) rather than a city-wide aggregate.

---

## Technical Stack & Architecture

- **Mobile**: React Native 0.86.3, React 19.2.3, Expo ~57.0.24, `react-native-svg` 15.15.4.
- **Backend**: Express 5.1, Node.js, `better-sqlite3`.
- **Database**: SQLite WAL mode (`data/database/air_quality.db`).
- **External Public Source**: OpenAQ API v3 (`api.openaq.org/v3/`).

