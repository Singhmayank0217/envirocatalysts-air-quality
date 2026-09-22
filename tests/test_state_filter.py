import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:3000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            return status, body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
        return e.code, body

def run_tests():
    passed = 0
    failed = 0

    def assert_eq(test_name, actual, expected):
        nonlocal passed, failed
        if actual == expected:
            print(f"  PASS: {test_name}")
            passed += 1
        else:
            print(f"  FAIL: {test_name} -> expected {expected}, got {actual}")
            failed += 1

    print("=== RUNNING MILESTONE 9D TEST SUITE ===")

    # 1. Filters endpoint includes dynamic states
    status, body = get("/api/v1/filters")
    assert_eq("GET /api/v1/filters status 200", status, 200)
    expected_states = [
        "All States",
        "Delhi",
        "Gujarat",
        "Karnataka",
        "Maharashtra",
        "Tamil Nadu",
        "Telangana",
        "West Bengal"
    ]
    assert_eq("Filters states list matches city_metadata", body.get("states"), expected_states)
    assert_eq("Filters cities list has 8 cities", len(body.get("cities", [])), 8)

    # 2. Cities by state
    status, body = get("/api/cities?state=Maharashtra")
    assert_eq("GET /api/cities?state=Maharashtra status 200", status, 200)
    assert_eq("Maharashtra cities are Mumbai and Pune", body.get("cities"), ["Mumbai", "Pune"])

    status, body = get("/api/cities?state=maharashtra")
    assert_eq("GET /api/cities?state=maharashtra case-insensitive", body.get("cities"), ["Mumbai", "Pune"])

    status, body = get("/api/cities?state=Gujarat")
    assert_eq("Gujarat city is Ahmedabad", body.get("cities"), ["Ahmedabad"])

    status, body = get("/api/cities?state=Karnataka")
    assert_eq("Karnataka city is Bengaluru", body.get("cities"), ["Bengaluru"])

    status, body = get("/api/cities?state=Tamil%20Nadu")
    assert_eq("Tamil Nadu city is Chennai", body.get("cities"), ["Chennai"])

    status, body = get("/api/cities?state=Telangana")
    assert_eq("Telangana city is Hyderabad", body.get("cities"), ["Hyderabad"])

    status, body = get("/api/cities?state=West%20Bengal")
    assert_eq("West Bengal city is Kolkata", body.get("cities"), ["Kolkata"])

    status, body = get("/api/cities?state=Delhi")
    assert_eq("Delhi city is Delhi", body.get("cities"), ["Delhi"])

    status, body = get("/api/cities?state=All%20States")
    assert_eq("All States returns 8 cities", len(body.get("cities", [])), 8)

    # 3. Invalid state on /api/cities
    status, body = get("/api/cities?state=Atlantis")
    assert_eq("Invalid state returns HTTP 400", status, 400)
    assert_eq("Invalid state error message", body.get("error"), "Invalid state 'Atlantis'")

    # 4. Overview with valid state and city
    status, body = get("/api/overview?state=Maharashtra&city=Mumbai")
    assert_eq("Overview Mumbai in Maharashtra status 200", status, 200)
    assert_eq("Overview filters city", body.get("filters", {}).get("city"), "Mumbai")
    assert_eq("Overview filters state", body.get("filters", {}).get("state"), "Maharashtra")

    # 5. Overview with city mismatching state
    status, body = get("/api/overview?state=Maharashtra&city=Delhi")
    assert_eq("Overview city mismatch status 400", status, 400)
    assert_eq("Overview mismatch error message", body.get("error"), "City 'Delhi' does not belong to state 'Maharashtra'")

    # 6. Overview with invalid state
    status, body = get("/api/overview?state=Narnia")
    assert_eq("Overview invalid state status 400", status, 400)
    assert_eq("Overview invalid state error message", body.get("error"), "Invalid state 'Narnia'")

    # 7. Overview with state and All Cities
    status, body = get("/api/overview?state=Maharashtra&city=All%20Cities")
    assert_eq("Overview Maharashtra All Cities status 200", status, 200)
    conc_cities = set(x["city"] for x in body.get("averagePollutantConcentration", []))
    assert_eq("Concentration filtered to state cities", conc_cities, {"Mumbai", "Pune"})

    # 8. City Map with state
    status, body = get("/api/city-map?state=Maharashtra")
    assert_eq("City map with state status 200", status, 200)
    assert_eq("City map filter state echoed", body.get("filters", {}).get("state"), "Maharashtra")
    assert_eq("City map returns all 8 cities for coordinate plotting", len(body.get("data", [])), 8)

    status, body = get("/api/city-map?state=InvalidState")
    assert_eq("City map invalid state status 400", status, 400)

    # 9. Regression endpoints
    status, _ = get("/api/health")
    assert_eq("Health check status 200", status, 200)

    status, _ = get("/api/pollutants")
    assert_eq("Pollutants list status 200", status, 200)

    status, _ = get("/api/financial-years")
    assert_eq("Financial years status 200", status, 200)

    status, _ = get("/api/stations?city=Delhi")
    assert_eq("Stations Delhi status 200", status, 200)

    status, _ = get("/api/public-data/latest")
    assert_eq("Public data latest status 200", status, 200)

    print("\n" + "="*50)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("="*50)

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
