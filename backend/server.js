const express = require("express");
const cors = require("cors");

const db = require("./db");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// ----------------------------------------------------
// HEALTH
// ----------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "EnviroCatalysts Air Quality API",
        database: "connected"
    });
});


// ----------------------------------------------------
// CITIES
// ----------------------------------------------------

app.get("/api/cities", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT DISTINCT requested_city AS city
      FROM city_daily_metrics
      ORDER BY requested_city
    `).all();

        res.json({
            cities: rows.map(row => row.city)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch cities"
        });
    }
});


// ----------------------------------------------------
// POLLUTANTS
// ----------------------------------------------------

app.get("/api/pollutants", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT pollutant, display_name, unit
      FROM pollutant_metadata
      ORDER BY pollutant
    `).all();

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch pollutants"
        });
    }
});


// ----------------------------------------------------
// FINANCIAL YEARS
// ----------------------------------------------------

app.get("/api/financial-years", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT DISTINCT financial_year
      FROM city_daily_metrics
      ORDER BY financial_year
    `).all();

        res.json(
            rows.map(row => row.financial_year)
        );

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch financial years"
        });
    }
});

// ----------------------------------------------------
// FILTERS
// ----------------------------------------------------

app.get("/api/v1/filters", (req, res) => {
    try {
        const cities = db.prepare(`
            SELECT DISTINCT requested_city AS city
            FROM city_daily_metrics
            ORDER BY requested_city
        `).all();

        const pollutants = db.prepare(`
            SELECT pollutant, display_name, unit
            FROM pollutant_metadata
            ORDER BY pollutant
        `).all();

        const financialYears = db.prepare(`
            SELECT DISTINCT financial_year
            FROM city_daily_metrics
            ORDER BY financial_year
        `).all();

        res.json({
            cities: cities.map(row => row.city),
            pollutants,
            financialYears: financialYears.map(
                row => row.financial_year
            ),
            frequencies: [
                "Financial Year",
                "Calendar Year",
                "Month"
            ]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch filters"
        });
    }
});


// ----------------------------------------------------
// OVERVIEW
// ----------------------------------------------------

app.get("/api/overview", (req, res) => {

    try {

        const {
            city,
            baseYear = "FY2024-25",
            comparisonYear = "FY2025-26"
        } = req.query;

        const concentrationParams = [];

        let concentrationSQL = `
      SELECT
        requested_city AS city,
        financial_year,
        parameter_name AS pollutant,
        ROUND(average_concentration, 2)
          AS average_concentration,
        days_available
      FROM pollutant_concentration_summary
      WHERE financial_year IN (?, ?)
    `;

        concentrationParams.push(
            baseYear,
            comparisonYear
        );

        if (city) {
            concentrationSQL += `
        AND requested_city = ?
      `;

            concentrationParams.push(city);
        }

        concentrationSQL += `
      ORDER BY
        requested_city,
        financial_year,
        parameter_name
    `;

        const concentrations = db
            .prepare(concentrationSQL)
            .all(...concentrationParams);


        // AQI category days

        const categoryParams = [
            baseYear,
            comparisonYear
        ];

        let categorySQL = `
      SELECT
        requested_city AS city,
        financial_year,
        aqi_category,
        days
      FROM aqi_category_days
      WHERE financial_year IN (?, ?)
    `;

        if (city) {
            categorySQL += `
        AND requested_city = ?
      `;

            categoryParams.push(city);
        }

        categorySQL += `
      ORDER BY
        requested_city,
        financial_year,
        aqi_category
    `;

        const aqiCategories = db
            .prepare(categorySQL)
            .all(...categoryParams);


        // Dominant pollutant days

        const dominantParams = [
            baseYear,
            comparisonYear
        ];

        let dominantSQL = `
      SELECT
        requested_city AS city,
        financial_year,
        dominant_pollutant AS pollutant,
        days
      FROM dominant_pollutant_days
      WHERE financial_year IN (?, ?)
    `;

        if (city) {
            dominantSQL += `
        AND requested_city = ?
      `;

            dominantParams.push(city);
        }

        dominantSQL += `
      ORDER BY
        requested_city,
        financial_year,
        days DESC
    `;

        const dominantPollutants = db
            .prepare(dominantSQL)
            .all(...dominantParams);


        res.json({
            filters: {
                city: city || "All",
                baseYear,
                comparisonYear
            },

            averagePollutantConcentration: concentrations,

            aqiCategoryDays: aqiCategories,

            dominantPollutantDays: dominantPollutants
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to fetch overview"
        });
    }
});

app.get("/api/v1/overview", (req, res) => {
    req.url = "/api/overview";
    app._router.handle(req, res);
});

// ----------------------------------------------------
// HOURLY ANALYSIS
// ----------------------------------------------------

app.get("/api/hourly", (req, res) => {

    try {

        const {
            city,
            station,
            pollutant = "PM2.5",
            start,
            end,
            limit = 5000
        } = req.query;


        let sql = `
      SELECT
        station_id,
        requested_city AS city,
        parameter_name AS pollutant,
        period_start,
        mean,
        min,
        max,
        n
      FROM hourly_measurements
      WHERE parameter_name = ?
    `;

        const params = [pollutant];


        if (city) {
            sql += `
        AND requested_city = ?
      `;

            params.push(city);
        }


        if (station) {
            sql += `
        AND station_id = ?
      `;

            params.push(station);
        }


        if (start) {
            let startFilter = String(start).trim().replace("T", " ");
            if (/^\d{4}-\d{2}-\d{2}$/.test(startFilter)) {
                startFilter += " 00:00:00";
            } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(startFilter)) {
                startFilter += ":00";
            }
            sql += `
        AND period_start >= ?
      `;

            params.push(startFilter);
        }


        if (end) {
            let endFilter = String(end).trim().replace("T", " ");
            if (/^\d{4}-\d{2}-\d{2}$/.test(endFilter)) {
                endFilter += " 23:59:59";
            } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(endFilter)) {
                endFilter += ":59";
            }
            sql += `
        AND period_start <= ?
      `;

            params.push(endFilter);
        }


        sql += `
      ORDER BY period_start ASC
      LIMIT ?
    `;

        params.push(
            Math.min(Number(limit) || 5000, 20000)
        );


        const rows = db
            .prepare(sql)
            .all(...params);


        res.json({
            filters: {
                city: city || null,
                station: station || null,
                pollutant,
                start: start || null,
                end: end || null
            },

            count: rows.length,

            data: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to fetch hourly data"
        });
    }
});


app.get("/api/v1/hourly", (req, res) => {
    req.url = "/api/hourly";
    app._router.handle(req, res);
});


// ----------------------------------------------------
// STATIONS
// ----------------------------------------------------

app.get("/api/stations", (req, res) => {

    try {

        const {
            city
        } = req.query;

        let sql = `
      SELECT
        station_id,
        requested_city AS city,
        parameter_name AS pollutant,
        MIN(date) AS min_date,
        MAX(date) AS max_date
      FROM daily_station_measurements
    `;

        const params = [];

        if (city) {
            sql += `
        WHERE requested_city = ?
      `;
            params.push(city);
        }

        sql += `
      GROUP BY requested_city, station_id, parameter_name
      ORDER BY requested_city, station_id, parameter_name
    `;

        const rows = db
            .prepare(sql)
            .all(...params);

        const stationMap = new Map();

        for (const row of rows) {
            let station = stationMap.get(row.station_id);

            if (!station) {
                station = {
                    station_id: row.station_id,
                    city: row.city,
                    min_date: row.min_date,
                    max_date: row.max_date,
                    pollutants: {}
                };
                stationMap.set(row.station_id, station);
            } else {
                if (row.min_date < station.min_date) {
                    station.min_date = row.min_date;
                }
                if (row.max_date > station.max_date) {
                    station.max_date = row.max_date;
                }
            }

            station.pollutants[row.pollutant] = {
                min_date: row.min_date,
                max_date: row.max_date
            };
        }

        res.json(Array.from(stationMap.values()));

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to fetch stations"
        });
    }
});

app.get("/api/v1/stations", (req, res) => {
    req.url = "/api/stations";
    app._router.handle(req, res);
});


// ----------------------------------------------------
// CITY MAP (MILESTONE 6A)
// ----------------------------------------------------

function getAqiCategory(aqi) {
    if (aqi === null || aqi === undefined || isNaN(aqi)) {
        return null;
    }
    const num = Number(aqi);
    if (num <= 50) return "Good";
    if (num <= 100) return "Satisfactory";
    if (num <= 200) return "Moderate";
    if (num <= 300) return "Poor";
    if (num <= 400) return "Very Poor";
    return "Severe";
}

function handleCityMap(req, res) {
    try {
        const {
            city,
            baseYear = "FY2024-25",
            comparisonYear = "FY2025-26",
            metric = "aqi"
        } = req.query;

        // Constraint: Only 'aqi' is supported in Milestone 6A.
        // Return explicit 400 for unsupported metrics (e.g. concentration).
        if (metric && metric.toLowerCase() !== "aqi") {
            return res.status(400).json({
                error: `Unsupported metric '${metric}'. Milestone 6A supports metric='aqi'. Concentration mapping will be supported in a future update.`
            });
        }

        let citySQL = "SELECT DISTINCT requested_city AS city FROM city_daily_metrics";
        const cityParams = [];

        if (city && city !== "All") {
            citySQL += " WHERE requested_city = ?";
            cityParams.push(city);
        }

        citySQL += " ORDER BY requested_city";

        const cities = db.prepare(citySQL).all(...cityParams);

        // Fetch city metadata (state, latitude, longitude) if populated
        const metadataRows = db.prepare("SELECT city, state, latitude, longitude FROM city_metadata").all();
        const metaMap = new Map(metadataRows.map(m => [m.city, m]));

        // Fetch aggregated AQI for base and comparison years
        let aqiSQL = `
            SELECT 
                requested_city AS city,
                financial_year,
                ROUND(AVG(CASE WHEN aqi_available = 1 THEN aqi END), 1) AS avg_aqi,
                SUM(CASE WHEN aqi_available = 1 THEN 1 ELSE 0 END) AS available_days
            FROM city_daily_aqi
            WHERE financial_year IN (?, ?)
        `;
        const aqiParams = [baseYear, comparisonYear];

        if (city && city !== "All") {
            aqiSQL += " AND requested_city = ?";
            aqiParams.push(city);
        }

        aqiSQL += " GROUP BY requested_city, financial_year";

        const aqiRows = db.prepare(aqiSQL).all(...aqiParams);
        const aqiMap = new Map();
        for (const row of aqiRows) {
            aqiMap.set(`${row.city}__${row.financial_year}`, row);
        }

        const data = cities.map(c => {
            const meta = metaMap.get(c.city) || {};
            const baseRow = aqiMap.get(`${c.city}__${baseYear}`);
            const compRow = aqiMap.get(`${c.city}__${comparisonYear}`);

            const baseAvailable = Boolean(baseRow && baseRow.available_days > 0 && baseRow.avg_aqi !== null);
            const compAvailable = Boolean(compRow && compRow.available_days > 0 && compRow.avg_aqi !== null);

            const baseValue = baseAvailable ? baseRow.avg_aqi : null;
            const compValue = compAvailable ? compRow.avg_aqi : null;

            return {
                city: c.city,
                state: meta.state ?? null,
                latitude: meta.latitude ?? null,
                longitude: meta.longitude ?? null,
                base: {
                    value: baseValue,
                    category: getAqiCategory(baseValue),
                    available: baseAvailable,
                    days: baseRow?.available_days ?? 0
                },
                comparison: {
                    value: compValue,
                    category: getAqiCategory(compValue),
                    available: compAvailable,
                    days: compRow?.available_days ?? 0
                }
            };
        });

        res.json({
            filters: {
                city: city || "All",
                baseYear,
                comparisonYear,
                metric: "aqi"
            },
            data
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch city map data"
        });
    }
}

app.get("/api/city-map", handleCityMap);
app.get("/api/v1/city-map", handleCityMap);


// ----------------------------------------------------
// PUBLIC DATA (OPENAQ FRESH OBSERVATIONS)
// ----------------------------------------------------

function handlePublicDataLatest(req, res) {
    try {
        const tableCheck = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='openaq_measurements'
        `).get();

        if (!tableCheck) {
            return res.json({
                source: "OpenAQ",
                location: "New Delhi",
                parameter: "PM2.5",
                latest: null,
                ingested_at: null,
                message: "No public observation available."
            });
        }

        const row = db.prepare(`
            SELECT 
                source,
                location_name,
                city,
                country,
                parameter,
                unit,
                period_start,
                period_end,
                value,
                ingested_at
            FROM openaq_measurements
            WHERE parameter = 'PM2.5'
            ORDER BY period_end DESC, id DESC
            LIMIT 1
        `).get();

        if (!row) {
            return res.json({
                source: "OpenAQ",
                location: "New Delhi",
                parameter: "PM2.5",
                latest: null,
                ingested_at: null,
                message: "No public observation available."
            });
        }

        return res.json({
            source: row.source || "OpenAQ",
            location: row.city || row.location_name || "New Delhi",
            parameter: row.parameter || "PM2.5",
            latest: {
                value: row.value,
                unit: row.unit,
                period_start: row.period_start,
                period_end: row.period_end
            },
            ingested_at: row.ingested_at
        });

    } catch (error) {
        console.error("Error fetching latest public data:", error);
        return res.status(500).json({
            error: "Failed to fetch public air quality observation"
        });
    }
}

app.get("/api/public-data/latest", handlePublicDataLatest);
app.get("/api/v1/public-data/latest", handlePublicDataLatest);


// ----------------------------------------------------
// SERVER
// ----------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("==========================================");
    console.log("EnviroCatalysts Air Quality API");
    console.log("==========================================");
    console.log(`Server running on port ${PORT}`);
    console.log("");
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`Cities:   http://localhost:${PORT}/api/cities`);
    console.log(`Overview: http://localhost:${PORT}/api/overview`);
    console.log(`City Map: http://localhost:${PORT}/api/city-map`);
    console.log("");
});