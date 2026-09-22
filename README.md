# EnviroCatalysts Air Quality Platform

A mobile-first cross-platform application for comparative urban air quality analysis across major Indian metropolitan centers.

---

# What I Changed and Why

1. **Mobile-first information hierarchy**
   - *Why:* The original desktop dashboard was designed for wide screens and was difficult to navigate and interpret efficiently on a mobile phone.
   - *What changed:* Restructured the application into two focused screens (Screen 1: Overview & Comparison; Screen 2: Hourly Analysis), introduced touch-friendly controls, clearer visual hierarchy, compact information cards, mobile-optimized SVG charts, and interactive city selection with an India vector map.

2. **Faster perceived loading**
   - *Why:* Users should see useful structure and navigation immediately rather than waiting for an entire multi-megabyte dashboard bundle to download and render.
   - *What changed:* Adopted API-driven lightweight REST endpoints with granular parameters, instant skeleton/loading indicators, independent component-level error and empty states, and non-blocking background refreshes.

3. **Better financial-year comparison**
   - *Why:* The project requires FY2024-25 as the authoritative baseline period and FY2025-26 as the evaluation comparison period.
   - *What changed:* Implemented explicit financial-year selector controls, side-by-side metric comparison cards, and strict handling where unavailable comparison metrics are displayed as "No data" rather than zero, preventing misleading claims of zero pollution.

4. **AQI and pollutant analysis**
   - *Why:* Decision-makers and citizens need to understand both broad health risk categories (AQI) and individual pollutant concentrations to identify underlying causes.
   - *What changed:* Added paired AQI category-day distribution bars, annual average pollutant concentration tables with percentage deltas, dominant pollutant frequency tracking, and plain-language health summaries.

5. **Hourly station analysis**
   - *Why:* Station-level diurnal and hourly pollution trends are easily lost in high-level city averages or large tabular desktop layouts.
   - *What changed:* Created a dedicated station analytics screen with station chips, pollutant selectors, period filters (24H, 7D, 30D), a responsive SVG trend chart with missing-data gap handling, and a 5-metric statistical showcase (Latest, Average, Min, Max, Observations).

6. **Interactive city map**
   - *Why:* Users need an intuitive geographic perspective of air quality across Indian regions.
   - *What changed:* Built a calibrated equirectangular India vector map using DataMeet boundaries, rendered interactive 48×48dp city markers colored by CPCB AQI category, established two-way synchronization with city filters, and provided an accessible non-spatial grid alternative.

7. **Public data integration**
   - *Why:* The platform requires fresh, verifiable public environmental observations from an external source.
   - *What changed:* Integrated the official OpenAQ API v3 for New Delhi PM2.5 observations via a dedicated ingestion script, stored records in an isolated SQLite table with duplicate protection, exposed a `/api/public-data/latest` endpoint, rendered a dedicated mobile Public Data card, and maintained full provider attribution.

8. **Accessibility**
   - *Why:* Environmental health information must be usable by everyone, including people using screen readers, keyboard navigation, or one-handed touch interaction.
   - *What changed:* Enforced minimum 44×44dp and 48×48dp touch targets with `hitSlop` protection, declared explicit `accessibilityRole` and `accessibilityLabel` attributes across 100% of interactive controls, bound selection and disabled states, generated rich text alternatives for non-text charts/maps, added polite live-region updates, improved text contrast to WCAG AA (`#486581`), and verified via static AST audits.

9. **Data quality**
   - *Why:* Raw sensor streams contain missing intervals, negative calibration artifacts, and sensor errors that corrupt statistical conclusions.
   - *What changed:* Excluded invalid and negative measurements, removed duplicates, aggregated hourly records to station-days using a strict 70% coverage threshold (≥ 17 valid hours/day), computed CPCB-compliant AQI only when minimum pollutant criteria are satisfied, and introduced explicit insufficient-data states rather than fabricating values.

10. **Transparency**
    - *Why:* Users and auditors must know exactly what data exists and where gaps occur.
    - *What changed:* National program classifications (NCAP, MPC, IGP, Delhi NCR, State Capitals) remain disabled with a "Coming from API" label because authoritative category metadata is not in the schema. Incomplete FY2025-26 AQI is explicitly flagged as "Insufficient Data", and exact verified date ranges are documented.

---

## 1. Project Overview & Problem Solved

Urban air pollution across Indian metropolitan centers varies dramatically by season, meteorology, topography, and local industrial or vehicular emission sources. While the Central Pollution Control Board (CPCB) and state boards operate Continuous Ambient Air Quality Monitoring Stations (CAAQMS), standard data interfaces often present significant challenges:
* **Desktop-centric layouts**: Difficult to read, interact with, or interpret on mobile screens.
* **Misleading zero values**: Sensor downtime, communication dropouts, or unmonitored parameters are frequently visualized as zero, falsely indicating pristine air quality.
* **Unclear baseline comparisons**: Annual comparisons fail to account for differing seasonal monitoring windows or missing gaseous pollutants.
* **Accessibility barriers**: Missing screen-reader attributes, low-contrast text, and sub-standard touch targets exclude users with disabilities.

**EnviroCatalysts Air Quality** solves these problems with a purpose-built mobile-first application:
* **Mobile-First Experience**: Built with React Native and Expo, featuring touch-friendly interactive controls, compact card summaries, and fluid SVG charts.
* **CPCB Scientific Standards**: Strict implementation of official Indian AQI formulas, multi-pollutant completeness thresholds, and 70% station-day coverage rules.
* **Dual-Screen Architecture**: Screen 1 provides macro-level annual comparisons across 8 major metropolitan centers; Screen 2 provides micro-level diurnal station analytics.
* **Fresh Public Observation**: Authenticated integration with OpenAQ API v3 delivering fresh hourly observations for New Delhi with full attribution and dataset isolation.
* **Comprehensive Accessibility**: Validated against WCAG 2.1 AA contrast requirements, 44×44dp touch target guidelines, and zero invalid React Native accessibility roles.

---

## 2. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Mobile Client (React Native / Expo)                  │
│                                                                        │
│   Screen 1: Overview & Comparison      Screen 2: Hourly Station Trend  │
│   • FY Selector & City Chips           • Station / Pollutant / Period  │
│   • OpenAQ Live Observation Card       • 5-Metric Statistical Showcase │
│   • Paired Bar Distribution Cards      • Responsive SVG Trend Chart    │
│   • Interactive SVG India Map          • Data Availability Notes       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Backend REST API (Node.js / Express)              │
│                                                                        │
│   Endpoints: /api/overview, /api/hourly, /api/stations,                │
│              /api/city-map, /api/public-data/latest, /api/health       │
└──────────────────┬────────────────────────────────┬────────────────────┘
                   │                                │
                   ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       SQLite Embedded Database       │  │    External Public Source    │
│       (WAL Mode, Parameterized)      │  │        OpenAQ API v3         │
│                                      │  │  (Authorized REST client,    │
│  • hourly_measurements (5.19M rows)  │  │   dynamic sensor discovery,  │
│  • daily_station_measurements        │  │   trailing 24h measurements) │
│  • city_daily_metrics / aqi          │  └──────────────┬───────────────┘
│  • openaq_measurements               │                 │ Ingestion Script
└──────────────────▲───────────────────┘                 │ (Python)
                   │                                     ▼
┌──────────────────┴─────────────────────────────────────────────────────┐
│                       Data Pipeline (Python 3)                         │
│                                                                        │
│   Raw Hourly ──► 70% Daily Aggregation ──► CPCB AQI ──► SQLite DB      │
└────────────────────────────────────────────────────────────────────────┘
```

### Stack Components

| Layer | Technologies | Key Responsibilities |
|---|---|---|
| **Mobile Frontend** | React Native 0.86.3, React 19.2.3, Expo ~57.0.24, React Navigation Native Stack, `react-native-svg` 15.15.4 | Mobile UI, interactive India vector map, responsive SVG charts, touch interaction, accessibility roles |
| **Backend API** | Express 5.1.0, Node.js v22+, `better-sqlite3` 12.4.1, CORS | High-performance synchronous SQLite queries, parameterized filtering, REST endpoint delivery |
| **Database** | SQLite 3 (`data/database/air_quality.db`) | WAL mode storage, indexing on city/station/pollutant/date, dedicated `openaq_measurements` table |
| **Data Pipeline** | Python 3.10+, Pandas, Requests, Python-dotenv | Chunked processing, 70% coverage validation, CPCB sub-index math, OpenAQ ingestion |
| **External Data** | OpenAQ API v3 (`api.openaq.org/v3`) | Official public environmental data provider for fresh point observations |

---

## 3. Mobile Application Features & Screen Hierarchy

### Screen 1 — Overview & Comparative Dashboard (`OverviewScreen`)

Screen 1 serves as the primary comparative evaluation dashboard, analyzing air quality across 8 major Indian cities (**Ahmedabad**, **Bengaluru**, **Chennai**, **Delhi**, **Hyderabad**, **Kolkata**, **Mumbai**, **Pune**).

1. **Header & Navigation**:
   - Displays the platform title and a touch-friendly navigation button (`Hourly →`) with `hitSlop` protection to transition seamlessly to Screen 2.
2. **Financial Year Selector**:
   - Paired period selection cards: Benchmark Period (`FY2024-25`) vs Evaluation Period (`FY2025-26`).
3. **City Category Selector**:
   - Horizontal filter chips: `All Cities`, `NCAP`, `MPC`, `IGP`, `Delhi NCR`, `State Capitals`.
   - *Data integrity*: Program categories without authoritative schema metadata are rendered with a `"Coming from API"` pill and marked as disabled to prevent synthetic classification fabrication.
4. **City Selector**:
   - Touch-friendly horizontal chips with `minHeight: 44` allowing rapid switching across all 8 monitored metropolitan areas.
5. **Dynamic Live Update Banner**:
   - Non-blocking inline banner with `accessibilityLiveRegion="polite"` announcing background metric refreshes without jarring screen rebuilds.
6. **Fresh Public Air Quality Data Card (`PublicDataCard`)**:
   - Displays live PM2.5 observations from OpenAQ API v3 for New Delhi. Supports full Loading, Error (with retry), Empty, and Loaded states. Clearly labeled as a point observation from an external monitoring station.
7. **AQI Category Days Card**:
   - Paired horizontal proportional bar charts comparing days spent in each CPCB health category (*Good*, *Satisfactory*, *Moderate*, *Poor*, *Very Poor*, *Severe*) between FY2024-25 and FY2025-26.
   - For FY2025-26 where required secondary gases are unavailable, the card accurately presents `"No data"` / `"Insufficient Data"` rather than misleading zero bars.
8. **Average Pollutant Concentration Card**:
   - Annual mean concentrations for PM2.5, PM10, NO2, SO2, CO, and Ozone, with units (`µg/m³` and `mg/m³`) and calculated percentage deltas.
9. **Dominant Pollutant Days Card**:
   - Tracks which pollutant was the primary driver of poor air quality across monitored days.
10. **Interactive City Air Quality Map (`CityMapCard`)**:
    - Calibrated SVG India map with 48×48dp circular touch markers colored by CPCB AQI category. Two-way synchronized with city filter chips. Includes an accessible 2-column city summary grid below the map for non-spatial navigation.
11. **Data Coverage & Attribution Footers**:
    - Plain-language methodology explanations and data source acknowledgments.

### Screen 2 — Hourly Air Quality Analysis (`HourlyScreen`)

Screen 2 provides micro-level diurnal trend analysis at the individual monitoring station level.

1. **Screen Header & Back Navigation**:
   - Header with back button (`← Back`) returning to Screen 1.
2. **City Selector**:
   - Horizontal chips for selecting the metropolitan region.
3. **Dynamic Station Selector**:
   - Populates dynamically based on the active city (e.g., *Anand Vihar*, *ITO*, *R K Puram*, *Punjabi Bagh* for Delhi), queried from `/api/stations`.
4. **Pollutant Selector**:
   - Switchable across `PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, and `Ozone`.
5. **Period Selector**:
   - Standard intervals: `24H`, `7D`, `30D`, and `Custom [Soon]`.
6. **Verified Data Availability Banner**:
   - Informs users of the supported historical range: `Verified data available: 2024-04-01 – 2026-03-27`.
7. **Selection Context Summary**:
   - Summarizes the active city, station name, pollutant parameter, and exact date interval.
8. **Key Metrics Showcase**:
   - 5 high-emphasis statistical cards:
     - `LATEST`: Most recent measured concentration in the selected period.
     - `PERIOD AVERAGE`: Arithmetic mean of all valid hourly readings.
     - `MIN`: Lowest observed concentration.
     - `MAX`: Peak measured concentration.
     - `OBSERVATIONS`: Total valid hourly readings count.
9. **Responsive Hourly Trend Chart (`HourlyTrendChart`)**:
   - Custom SVG polyline chart rendered dynamically via `onLayout` width calculation.
   - Displays min/max horizontal dashed reference gridlines, time labels, and data points.
   - *Missing Data Handling*: Detects temporal gaps between consecutive readings; when a gap exceeds 3 hours, the polyline breaks into disjointed segments rather than drawing a misleading interpolated line across missing observations.
   - *Accessible Text Alternative*: Provides a complete spoken summary of the trend for screen readers while hiding raw SVG paths from assistive focus.
10. **Data Coverage & Notes**:
    - Explanatory note regarding sensor calibration and observation frequency.

---

## 4. Interactive City Air Quality Map

### Reference Coordinates & Geographic Source
The 8 supported cities are located using municipal reference coordinates:
* **Source**: OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/`), retrieved March 2026.
* **Coordinate Meaning**: Coordinates represent **city-level municipal reference centers**, NOT single monitoring stations.

| City | State | Latitude (°N) | Longitude (°E) | Reference Detail |
|:---|:---|:---:|:---:|:---|
| **Ahmedabad** | Gujarat | 23.0215 | 72.5801 | Ahmedabad Municipal Center |
| **Bengaluru** | Karnataka | 12.9768 | 77.5901 | Bengaluru Urban Center |
| **Chennai** | Tamil Nadu | 13.0837 | 80.2702 | Greater Chennai Corporation Center |
| **Delhi** | Delhi | 28.6665 | 77.2170 | National Capital Territory of Delhi Center |
| **Hyderabad** | Telangana | 17.3606 | 78.4741 | Hyderabad Municipal Center |
| **Kolkata** | West Bengal | 22.5726 | 88.3639 | Kolkata Municipal Corporation Center |
| **Mumbai** | Maharashtra | 19.0550 | 72.8692 | Municipal Corporation of Greater Mumbai Center |
| **Pune** | Maharashtra | 18.5214 | 73.8545 | Pune Municipal Corporation Center |

City metadata is seeded into `city_metadata` via `src/data/seed_city_metadata.py`.

### Vector Boundary Asset & Calibrated Projection
* **Asset**: Simplified National Geographic Boundary of India (`india.simplified.geo.json`).
* **Source**: DataMeet Indian Maps Community Project (`datameet.org` / `github.com/datameet/maps`).
* **License**: Creative Commons Attribution 2.5 India ([CC BY 2.5 IN](https://creativecommons.org/licenses/by/2.5/in/)).
* **Geometry Integrity**: Clean multi-ring SVG paths where every subpath opens with absolute `M x y` and closes with `Z`, preventing diagonal bridging lines and relative coordinate drift.
* **Calibrated Equirectangular Projection**:
  - Bounding Box: North $37.5^\circ\text{ N}$, South $5.0^\circ\text{ N}$, West $67.0^\circ\text{ E}$, East $99.0^\circ\text{ E}$. ViewBox: `0 0 1500 1615`.
  - Formulas:
    $$x = \frac{\text{longitude} - 67.0}{99.0 - 67.0} \times 1500$$
    $$y = \frac{37.5 - \text{latitude}}{37.5 - 5.0} \times 1615$$

### Interactive Marker Behavior & Two-Way Sync
* **CPCB AQI Category Palette**: Markers are colored by calculated annual AQI category:
  - Good (`#15803D`) | Satisfactory (`#0369A1`) | Moderate (`#B45309`) | Poor (`#C2410C`) | Very Poor (`#B91C1C`) | Severe (`#6B21A8`)
* **Two-Way Sync**: Tapping a map marker selects that city throughout the app; choosing a city from horizontal chips highlights its map marker with an accent halo ring (radius 34, stroke `#1E40AF`, fill `#3B82F6` 25% opacity).
* **Touch Overlay**: 48×48dp circular touch targets centered over each city coordinate with `hitSlop={10}`.
* **Accessible Summary Grid**: Renders an accessible 2-column card list directly beneath the map for users preferring tabular or linear screen-reader navigation.

---

## 5. Fresh Public Air Quality Data Ingestion (OpenAQ API v3)

### External Public Data Source & REST Client
* **Source**: OpenAQ ([openaq.org](https://openaq.org/)).
* **API Version**: OpenAQ API v3 (`https://api.openaq.org/v3/`).
* **Sanctioned API Ingestion**: Data is retrieved strictly via official, authenticated REST endpoints. This is an authorized API client, **NOT** HTML web scraping.
* **Terms of Use**: Adheres to [OpenAQ Terms of Use](https://docs.openaq.org/about/terms) and data provider attribution standards.

### Authentication & Zero-Exposure Security
* **Authentication Header**: `X-API-Key: ${OPENAQ_API_KEY}`.
* **Storage**: Stored in root `.env` (`OPENAQ_API_KEY=...`) on the server/pipeline side only.
* **Zero Exposure Guarantee**: Never hardcoded, never bundled into mobile JavaScript, never exposed via API responses. The `.env` file is git-ignored and never committed.

### Dynamic Sensor Discovery & Retrieval
* **Target Location**: New Delhi, India (`location_id`: **8118**).
* **Target Pollutant**: **PM2.5**.
* **Discovery Flow**:
  1. `GET /v3/locations/8118/sensors`: Inspects available sensors, dynamically resolves the active sensor measuring PM2.5 (Sensor ID **23534**, unit `µg/m³`).
  2. `GET /v3/sensors/23534/measurements?datetime_from={24h_ago_iso}&limit=100`: Fetches trailing 24h hourly observations with fallback to pre-computed latest reading if empty.

### Storage & Duplicate Prevention
* **Table**: `openaq_measurements` in `data/database/air_quality.db`.
* **Unique Constraint**: `UNIQUE (source, location_id, parameter, period_start, period_end)`.
* **Idempotency**: Observations are inserted with `INSERT OR IGNORE`. Re-running ingestion skips duplicates with zero duplicate count.
* **Data Hygiene**: Rejects nulls, non-numeric values, NaN, and negative sensor error codes (e.g., `-999.0`).

### Backend Endpoint & Mobile Presentation
* **Endpoints**: `GET /api/public-data/latest` and `GET /api/v1/public-data/latest`.
* **Mobile Component**: `PublicDataCard.js` rendered near the top of Screen 1.
* **Dataset Isolation**: OpenAQ observations are stored in `openaq_measurements` and are completely isolated from CPCB historical tables. OpenAQ PM2.5 readings are **NOT** converted to synthetic CPCB AQI, and are clearly labeled as point observations from an external monitoring station.

---

## 6. Data Pipeline & Processing Methodology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE WORKFLOW                          │
│                                                                        │
│  1. Hourly Measurements (data/processed/hourly_measurements.csv)       │
│     • 5,190,209 raw observations across 8 cities                       │
│     • Cleaned: negative values excluded, nulls dropped                 │
│                                                                        │
│  2. Station-Day Aggregation (src/data/build_daily_metrics.py)          │
│     • Processes in 250,000-row chunks                                  │
│     • Computes valid hours per station-day                             │
│     • Applies 70% Hourly Coverage Rule (valid_hours >= 17 of 24)       │
│     • Output: daily_station_measurements.csv (229,818 rows)            │
│                                                                        │
│  3. City-Day Metrics & CPCB AQI (src/data/build_city_metrics.py)       │
│     • Filters for station-days passing coverage threshold              │
│     • Averages station concentrations to city-day level                │
│     • Calculates sub-indices for PM10, PM2.5, NO2, SO2                 │
│     • Enforces CPCB rule: >= 3 pollutants including PM10 or PM2.5      │
│     • Determines dominant pollutant and overall AQI                    │
│     • Generates summary tables (AQI days, dominant days, means)        │
│                                                                        │
│  4. Database Loading & Indexing (src/data/build_database.py)           │
│     • Ingests CSVs into SQLite (data/database/air_quality.db)          │
│     • Builds B-tree indexes for fast queries                           │
│                                                                        │
│  5. City Coordinates & Metadata (src/data/seed_city_metadata.py)       │
│     • Inserts OpenStreetMap reference coordinates into city_metadata   │
│                                                                        │
│  6. Fresh Public Observations (src/data/ingest_openaq.py)              │
│     • Fetches latest PM2.5 from OpenAQ API v3                          │
│     • Stores in isolated openaq_measurements table                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 70% Hourly Coverage Rule
CPCB and international air quality monitoring standards require diurnal representativeness. A single 24-hour station-day must contain observations for at least **70% of the day's hours** ($\ge 17\text{ valid hours}$) to be statistically valid:
$$\text{coverage\_pct} = \frac{\text{valid\_hours}}{24} \ge 0.70$$
Station-days with $< 17$ valid hours are marked `coverage_pass = False` and excluded from city-level daily averages.

### CPCB AQI Calculation Methodology
Daily AQI is computed using the official CPCB linear interpolation formula:
$$I_p = \frac{I_{\text{hi}} - I_{\text{lo}}}{B_{\text{hi}} - B_{\text{lo}}} \times (C_p - B_{\text{lo}}) + I_{\text{lo}}$$

Where $C_p$ is pollutant concentration, $B_{\text{lo}}/B_{\text{hi}}$ are concentration breakpoint limits, and $I_{\text{lo}}/I_{\text{hi}}$ are AQI category index limits.

**CPCB Health Breakpoints (24-hour averages)**:
* **PM10**: 0–50 (*Good*), 51–100 (*Satisfactory*), 101–250 (*Moderate*), 251–350 (*Poor*), 351–430 (*Very Poor*), 431+ (*Severe*)
* **PM2.5**: 0–30 (*Good*), 31–60 (*Satisfactory*), 61–90 (*Moderate*), 91–120 (*Poor*), 121–250 (*Very Poor*), 251+ (*Severe*)
* **NO2**: 0–40 (*Good*), 41–80 (*Satisfactory*), 81–180 (*Moderate*), 181–280 (*Poor*), 281–400 (*Very Poor*), 401+ (*Severe*)
* **SO2**: 0–40 (*Good*), 41–80 (*Satisfactory*), 81–380 (*Moderate*), 381–800 (*Poor*), 801–1600 (*Very Poor*), 1601+ (*Severe*)

**Multi-Pollutant Completeness Rules**:
1. At least one particulate parameter (**PM10** or **PM2.5**) must be present.
2. At least **3 AQI pollutants** must be present on that city-day.
3. The overall AQI is the **maximum** of all valid sub-indices:
   $$\text{AQI} = \max(I_{\text{PM10}}, I_{\text{PM2.5}}, I_{\text{NO2}}, I_{\text{SO2}})$$
4. The pollutant yielding the maximum sub-index is designated as the **dominant pollutant**.
5. **CO and Ozone Rationale**: Although CO and Ozone are measured at stations and included in hourly trend analysis and concentration tables, they are deliberately excluded from daily CPCB AQI calculation because the source data contains 24-hour means, whereas CPCB mandates 8-hour rolling averages for CO and Ozone.

### FY2024-25 and FY2025-26 Handling
* **FY2024-25 (April 1, 2024 – March 31, 2025)**: Contains full multi-pollutant coverage across all 8 cities. Yields **2,198 valid AQI city-days** out of 2,454 possible city-days.
* **FY2025-26 (April 1, 2025 – March 27, 2026)**: The currently extracted dataset has only **PM2.5 and PM10** coverage (gaseous parameters NO2 and SO2 are absent). Because official CPCB AQI requires $\ge 3$ pollutants, AQI cannot be calculated under CPCB rules without fabricating missing gases.
* **Integrity Guarantee**: The platform marks FY2025-26 AQI as `"No data"` / `"Insufficient Data"` rather than calculating an invalid single-pollutant index or displaying zero. Annual pollutant concentration comparisons for PM2.5 and PM10 remain fully valid and available.

---

## 7. Data Availability & Known Limitations

### Exact Data Availability
> **Verified data available: 2024-04-01 – 2026-03-27**

This range is backed by the database:
- `hourly_measurements`: `2024-04-01 00:00:00` to `2026-03-27 23:00:00` (5,190,209 rows)
- `daily_station_measurements`: `2024-04-01` to `2026-03-27` (229,818 rows)
- `city_daily_metrics`: FY2024-25 (`2024-04-01` to `2025-03-31`) and FY2025-26 (`2025-04-01` to `2026-03-27`)

### Documented Limitations
1. **FY2025-26 AQI Comparison**: For FY2025-26, the current dataset has only PM2.5 and PM10 coverage for the comparison period where applicable, so AQI-based comparison is marked unavailable/insufficient rather than calculated incorrectly.
2. **National Program Categorization**: City categories (`NCAP`, `MPC`, `IGP`, `Delhi NCR`, `State Capitals`) are not present in the backend SQLite schema. In accordance with strict anti-fabrication guidelines, these filter chips remain disabled with a `"Coming from API"` indicator until authoritative government classification tables are integrated.
3. **Physical Screen-Reader Verification**: Because verification was conducted inside a headless local Windows development environment without attached physical smartphones or native emulators, physical Google TalkBack (Android) and Apple VoiceOver (iOS) runtime audio testing was **NOT RUN**. All static AST checks, role audits, touch targets, and contrast ratios passed completely.
4. **Web Platform Export**: React Native Web export (`react-native-web` / `react-dom`) is not configured to avoid heavy extraneous dependencies. Native Android bundling (`npx expo export --platform android`) was tested and verified with zero errors.

---

## 8. Accessibility Architecture & Validation

The application was comprehensively audited and remediated in Milestone 8. Complete methodology and evidence are documented in [docs/accessibility-report.md](file:///c:/Users/ironm/Desktop/envirocatalysts-air-quality/docs/accessibility-report.md).

### Summary Audit Results

| Audit Dimension | Measured Value | Standard / Requirement | Status |
|---|---|---|---|
| **Mobile Source Files Scanned** | 18 files | 100% of mobile codebase | **PASS** |
| **Total JSX Elements Parsed** | 529 elements | All rendered components | **PASS** |
| **Total `accessibilityRole` Usages** | 67 declarations | Standard React Native roles | **PASS** |
| **Invalid React Native Roles** | 0 | 0 allowed | **PASS** |
| **Forbidden Roles (`summary`, `note`, `status`)** | 0 | 0 allowed | **PASS** |
| **Interactive Elements (`<Pressable>`)** | 11 instances | 100% with role and label | **PASS** |
| **Touch Target Size** | All $\ge 44\times 44\text{ dp}$ | WCAG 2.5.5 / Apple / Google guidelines | **PASS** |
| **Touch Target Enhancements (`hitSlop`)** | 8 declarations | For compact buttons/markers | **PASS** |
| **Dynamic Live Regions** | 1 declaration | `accessibilityLiveRegion="polite"` | **PASS** |
| **Color Contrast Remediation (`#486581`)** | 29 usages across 8 files | $\ge 4.5:1$ WCAG 2.1 AA | **PASS** |
| **Two-Screen-Size Layout Verification** | 360×800 and 430×932 | No clipping, no overflow | **PASS** |
| **Physical TalkBack / VoiceOver Testing** | Headless environment | Physical audio execution | **NOT RUN** |

### Key Accessibility Features
* **Role Verification**: 67 explicit roles (`text`: 24, `header`: 20, `button`: 11, `tablist`: 5, `alert`: 4, `progressbar`: 3). Non-standard or deprecated roles were eliminated.
* **Selection & Disabled States**: Interactive chips declare `accessibilityState={{ selected, disabled }}` so screen readers announce current state.
* **Touch Targets**: All `<Pressable>` targets are either naturally $\ge 44\times 44\text{ dp}$ (chips, cards) or have explicit `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`. Map markers feature 48×48dp targets.
* **Two Mobile Viewports**: Verified at **360 × 800 dp** (compact mobile) and **430 × 932 dp** (flagship mobile) with zero horizontal clipping or text overlap.
* **Text Alternatives for Visualizations**: SVG trend charts and maps include comprehensive dynamic text descriptions summarizing trends, metrics, and city AQI for non-sighted users. Internal SVG nodes declare `accessible={false}` to prevent focus traps.
* **High Contrast Text**: Secondary readable text color `#486581` provides a 6.5:1 contrast ratio against white cards (surpassing the 4.5:1 WCAG AA threshold).

---

## 9. Backend REST API Reference

The backend runs on Node.js / Express 5.1 on port **3000** (`http://localhost:3000` or `http://<LAN_IP>:3000`).

| Method | Endpoint | Query Parameters | Description |
|:---:|:---|:---|:---|
| `GET` | `/api/health` | None | API service and database health check |
| `GET` | `/api/cities` | None | List of the 8 monitored metropolitan cities |
| `GET` | `/api/pollutants` | None | Monitored pollutants with display names and units |
| `GET` | `/api/financial-years` | None | Distinct financial years available in database |
| `GET` | `/api/v1/filters` | None | Aggregated filter options (cities, pollutants, financial years) |
| `GET` | `/api/overview` | `city`, `baseYear`, `comparisonYear` | Multi-pollutant means, AQI category days, dominant pollutant days |
| `GET` | `/api/stations` | `city` | Monitoring stations and parameter date ranges for a city |
| `GET` | `/api/hourly` | `city`, `station`, `pollutant`, `start`, `end`, `limit` | Time-series hourly observations (default limit 5000, max 20000) |
| `GET` | `/api/city-map` | `city`, `baseYear`, `comparisonYear`, `metric` | Geospatial city coordinates and annual AQI metrics for map visualization |
| `GET` | `/api/public-data/latest` | None | Latest fresh PM2.5 observation from OpenAQ |

All endpoints have versioned aliases under `/api/v1/` (e.g., `/api/v1/overview`).

---

## 10. Local Setup & Running the Project

### Prerequisites
* **Node.js**: v18.0.0+ or v22+
* **npm**: v9+
* **Python**: v3.10+ (for data pipeline and OpenAQ ingestion)
* **Expo Go App**: (Optional) Installed on an Android or iOS smartphone on the same Wi-Fi network for physical testing.
* **No Android Studio Required**: The documented development and testing workflow runs entirely via Expo CLI, Node.js, and Metro Bundler without Android Studio or Xcode.

### Environment Configuration
Create a `.env` file in the repository root (`c:\Users\ironm\Desktop\envirocatalysts-air-quality\.env`):
```env
OPENAQ_API_KEY=your_openaq_api_key_here
PORT=3000
```
> [!IMPORTANT]
> The `.env` file is excluded from Git by `.gitignore` and must never be committed.

---

### Step 1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies (Express, better-sqlite3, cors)
npm install

# Start the API server on port 3000
npm start
```
Verify the backend is running by opening `http://localhost:3000/api/health` in your browser.

---

### Step 2: Mobile Setup & Running with Expo

1. **Configure API Base URL**:
   Open `mobile/src/services/api.js` and set `API_BASE_URL` to your development machine's local IP address so your phone can reach the backend:
   ```javascript
   const API_BASE_URL = "http://<YOUR_LAN_IP>:3000/api";
   // Example: "http://192.168.29.248:3000/api"
   ```

2. **Install Mobile Dependencies**:
   ```bash
   cd mobile
   npm install
   ```

3. **Start Expo Dev Server**:
   ```bash
   # Standard start:
   npx expo start

   # On Windows (PowerShell / Command Prompt):
   npx.cmd expo start
   ```

4. **Run on Device via Expo Go**:
   - Open the **Expo Go** app on your Android or iOS device.
   - Connect the device to the same Wi-Fi network as your computer.
   - Scan the QR code displayed in the terminal.
   - The application will load and connect to your local backend API.

5. **Verify Android Production Bundle (No Android Studio required)**:
   ```bash
   cd mobile
   # On Windows:
   npx.cmd expo export --platform android
   # On macOS / Linux:
   npx expo export --platform android
   ```
   *Expected result: 940+ modules bundled with zero errors, exported to `dist/`.*

---

### Step 3: Reproducing the Data Pipeline (Optional)
The pre-built SQLite database is already supplied at `data/database/air_quality.db`. To reproduce the pipeline from processed CSVs:

```bash
# Install Python dependencies
pip install -r scripts/requirements.txt

# 1. Aggregate hourly measurements to station-days with 70% coverage rule
python src/data/build_daily_metrics.py

# 2. Compute city-level metrics and CPCB AQI sub-indices
python src/data/build_city_metrics.py

# 3. Load CSVs into SQLite and create indexes
python src/data/build_database.py

# 4. Seed city geographic reference coordinates
python src/data/seed_city_metadata.py

# 5. Ingest fresh PM2.5 public observations from OpenAQ API v3
python src/data/ingest_openaq.py
```

---

## 11. Testing & Verification

The repository includes automated static and regression verification scripts:

### 1. Automated Static Accessibility Audit (AST Parser)
Audits all 18 mobile source files for valid React Native accessibility roles, 100% `<Pressable>` labels, touch target dimensions, live regions, and WCAG AA contrast colors:
```bash
node scripts/audit-accessibility.js
```
*Expected result: 0 invalid roles, 0 forbidden roles, 100% interactive controls labeled, PASS.*

### 2. Two-Viewport Responsive Layout Verification
Evaluates container math, inner card dimensions, and element track widths against small (360×800) and large (430×932) mobile viewports:
```bash
node scripts/verify-viewports.js
```
*Expected result: 7/7 responsive layout tests PASS across both viewports.*

### 3. OpenAQ Ingestion Verification
Verifies API key configuration, API endpoint response, database schema, record count, duplicate prevention, and backend REST endpoint synchronization:
```bash
python src/data/verify_openaq.py
```
*Expected result: 6/6 checks passed.*

---

## 12. Git & Commit History

Key verified project milestone commits:
* `926bf8d` — `feat: complete accessibility remediation and validation` (Milestone 8: 44dp touch targets, AST audit, WCAG AA contrast)
* `0b8cdd4` — `feat: add OpenAQ public air quality ingestion` (Milestone 7: OpenAQ API v3 client, `openaq_measurements`, PublicDataCard)
* `7a4be05` — `feat: add interactive city air quality map` (Milestone 6B: India SVG vector map, marker synchronization, summary grid)
* `10ec017` — `feat: add city map data integration` (Milestone 6A: `/api/city-map` backend endpoint, geographic coordinate seed)
* `fdafda6` — `feat: add hourly trend visualization and analysis` (Milestone 5: Station-level diurnal trend chart and statistical showcase)

---

## 13. Legal, Attribution & Terms of Use

1. **Central Pollution Control Board (CPCB)**:
   - Historical monitoring data originates from CPCB and respective State Pollution Control Boards via public CAAQMS portals.
   - AQI calculations strictly implement official CPCB guidelines and health break-point formulations.
2. **OpenStreetMap & Nominatim**:
   - City municipal reference center coordinates retrieved from OpenStreetMap Nominatim API.
   - Mapped data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under the Open Data Commons Open Database License (ODbL).
3. **DataMeet Indian Maps Project**:
   - Simplified national boundary vector geometry from the DataMeet Indian Maps Community Project.
   - Licensed under Creative Commons Attribution 2.5 India ([CC BY 2.5 IN](https://creativecommons.org/licenses/by/2.5/in/)).
4. **OpenAQ**:
   - Public point air quality observations retrieved from the OpenAQ API v3 ([openaq.org](https://openaq.org/)).
   - Ingestion strictly conforms to the [OpenAQ Terms of Use](https://docs.openaq.org/about/terms). Underlying monitoring data providers retain their respective licensing terms.
