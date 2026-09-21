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
            sql += `
        AND period_start >= ?
      `;

            params.push(start);
        }


        if (end) {
            sql += `
        AND period_start <= ?
      `;

            params.push(end);
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
      SELECT DISTINCT
        station_id,
        requested_city AS city
      FROM hourly_measurements
    `;

        const params = [];


        if (city) {

            sql += `
        WHERE requested_city = ?
      `;

            params.push(city);
        }


        sql += `
      ORDER BY requested_city, station_id
    `;


        const rows = db
            .prepare(sql)
            .all(...params);


        res.json(rows);

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
    console.log("");
});