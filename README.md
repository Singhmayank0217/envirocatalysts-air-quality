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

## Technical Stack & Architecture

- **Mobile**: React Native 0.86.3, React 19.2.3, Expo ~57.0.24, `react-native-svg` 15.15.4.
- **Backend**: Express 5.1, Node.js, `better-sqlite3`.
- **Database**: SQLite WAL mode (`data/database/air_quality.db`).
