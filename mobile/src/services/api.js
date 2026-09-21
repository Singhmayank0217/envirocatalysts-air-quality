const API_BASE_URL = "http://192.168.29.248:3000/api";

async function request(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export async function getFilters() {
    return request("/v1/filters");
}

export async function getOverview(city = "Delhi", baseYear, comparisonYear) {
    const queryParams = [`city=${encodeURIComponent(city)}`];

    if (baseYear) {
        queryParams.push(`baseYear=${encodeURIComponent(baseYear)}`);
    }

    if (comparisonYear) {
        queryParams.push(`comparisonYear=${encodeURIComponent(comparisonYear)}`);
    }

    return request(`/overview?${queryParams.join("&")}`);
}

export async function getStations(city) {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    return request(`/stations${query}`);
}

export async function getHourly({ city, station, pollutant, start, end, limit } = {}) {
    const queryParams = [];

    if (city) {
        queryParams.push(`city=${encodeURIComponent(city)}`);
    }

    if (station) {
        queryParams.push(`station=${encodeURIComponent(station)}`);
    }

    if (pollutant) {
        queryParams.push(`pollutant=${encodeURIComponent(pollutant)}`);
    }

    if (start) {
        queryParams.push(`start=${encodeURIComponent(start)}`);
    }

    if (end) {
        queryParams.push(`end=${encodeURIComponent(end)}`);
    }

    if (limit !== undefined && limit !== null) {
        queryParams.push(`limit=${encodeURIComponent(limit)}`);
    }

    return request(`/hourly?${queryParams.join("&")}`);
}

export async function getCityMap({ city, baseYear, comparisonYear, metric } = {}) {
    const queryParams = [];

    if (city && city !== "All") {
        queryParams.push(`city=${encodeURIComponent(city)}`);
    }

    if (baseYear) {
        queryParams.push(`baseYear=${encodeURIComponent(baseYear)}`);
    }

    if (comparisonYear) {
        queryParams.push(`comparisonYear=${encodeURIComponent(comparisonYear)}`);
    }

    if (metric) {
        queryParams.push(`metric=${encodeURIComponent(metric)}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    return request(`/city-map${query}`);
}