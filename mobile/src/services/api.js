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

export async function getCities(state) {
    const query = state && state !== "All States" && state !== "All"
        ? `?state=${encodeURIComponent(state)}`
        : "";
    return request(`/cities${query}`);
}

export async function getOverview(cityOrOptions = "Delhi", baseYear, comparisonYear, state) {
    let targetCity = "Delhi";
    let targetState = null;
    let targetBaseYear = baseYear;
    let targetCompYear = comparisonYear;

    if (typeof cityOrOptions === "object" && cityOrOptions !== null) {
        targetCity = cityOrOptions.city ?? "Delhi";
        targetState = cityOrOptions.state ?? null;
        targetBaseYear = cityOrOptions.baseYear ?? baseYear;
        targetCompYear = cityOrOptions.comparisonYear ?? comparisonYear;
    } else {
        targetCity = cityOrOptions;
        targetState = state ?? null;
    }

    const queryParams = [];

    if (targetCity && targetCity !== "All" && targetCity !== "All Cities") {
        queryParams.push(`city=${encodeURIComponent(targetCity)}`);
    }

    if (targetState && targetState !== "All States" && targetState !== "All") {
        queryParams.push(`state=${encodeURIComponent(targetState)}`);
    }

    if (targetBaseYear) {
        queryParams.push(`baseYear=${encodeURIComponent(targetBaseYear)}`);
    }

    if (targetCompYear) {
        queryParams.push(`comparisonYear=${encodeURIComponent(targetCompYear)}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    return request(`/overview${query}`);
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

export async function getCityMap({ city, state, baseYear, comparisonYear, metric } = {}) {
    const queryParams = [];

    if (city && city !== "All" && city !== "All Cities") {
        queryParams.push(`city=${encodeURIComponent(city)}`);
    }

    if (state && state !== "All States" && state !== "All") {
        queryParams.push(`state=${encodeURIComponent(state)}`);
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

export async function getPublicLatest() {
    return request("/public-data/latest");
}