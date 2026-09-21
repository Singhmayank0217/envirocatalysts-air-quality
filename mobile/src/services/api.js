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