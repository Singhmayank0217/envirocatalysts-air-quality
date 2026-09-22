import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { getFilters, getOverview, getStations, getHourly, getCityMap } from "./src/services/api";
import FinancialYearSelector from "./src/components/FinancialYearSelector";
import CitySelector from "./src/components/CitySelector";
import CityCategorySelector from "./src/components/CityCategorySelector";
import AqiCategoryDaysCard from "./src/components/AqiCategoryDaysCard";
import AveragePollutantConcentrationCard from "./src/components/AveragePollutantConcentrationCard";
import DominantPollutantDaysCard from "./src/components/DominantPollutantDaysCard";
import CityMapCard from "./src/components/CityMapCard";
import StationSelector from "./src/components/StationSelector";
import PollutantSelector from "./src/components/PollutantSelector";
import PeriodSelector from "./src/components/PeriodSelector";
import HourlyTrendChart from "./src/components/HourlyTrendChart";
import PublicDataCard from "./src/components/PublicDataCard";

const Stack = createNativeStackNavigator();

function OverviewScreen({ navigation }) {
  const [filters, setFilters] = useState(null);
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingCity, setUpdatingCity] = useState(false);
  const [error, setError] = useState("");

  const [cityMapData, setCityMapData] = useState(null);
  const [cityMapLoading, setCityMapLoading] = useState(false);
  const [cityMapError, setCityMapError] = useState("");

  const baseYear = overview?.filters?.baseYear || "FY2024-25";
  const comparisonYear = overview?.filters?.comparisonYear || "FY2025-26";

  // Ref to track latest request ID for race-condition prevention
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadFilters();
  }, []);

  async function loadCityMapData(bYear = baseYear, cYear = comparisonYear) {
    try {
      setCityMapLoading(true);
      setCityMapError("");
      const data = await getCityMap({
        baseYear: bYear,
        comparisonYear: cYear,
        metric: "aqi",
      });
      setCityMapData(data);
    } catch (err) {
      console.error(err);
      setCityMapError("Unable to load city map data.");
    } finally {
      setCityMapLoading(false);
    }
  }

  useEffect(() => {
    loadCityMapData(baseYear, comparisonYear);
  }, [baseYear, comparisonYear]);

  useEffect(() => {
    if (navigation) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate("Hourly", { city: selectedCity })}
            accessibilityRole="button"
            accessibilityLabel={`Go to Hourly Analysis for ${selectedCity}`}
            style={styles.headerRightButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerRightButtonText}>Hourly →</Text>
          </Pressable>
        ),
      });
    }
  }, [navigation, selectedCity]);

  useEffect(() => {
    if (filters) {
      loadOverview(selectedCity);
    }
  }, [selectedCity, filters]);

  async function loadFilters() {
    try {
      setError("");

      const data = await getFilters();

      setFilters(data);

      if (data.cities?.length > 0) {
        setSelectedCity(data.cities.includes("Delhi") ? "Delhi" : data.cities[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the air quality API.");
    }
  }

  async function loadOverview(city) {
    const currentRequestId = ++requestIdRef.current;

    try {
      // Preserve previous overview on screen during city updates
      if (overview) {
        setUpdatingCity(true);
      } else {
        setLoading(true);
      }
      setError("");

      const data = await getOverview(city);

      // Discard stale responses from older requests
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setOverview(data);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      console.error(err);
      setError("Unable to load overview data.");
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setUpdatingCity(false);
      }
    }
  }

  function handleCitySelect(city) {
    // Avoid redundant API requests when tapping the already selected city
    if (city === selectedCity && overview) {
      return;
    }
    setSelectedCity(city);
  }

  if (loading && !overview) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading air quality data">
          <ActivityIndicator size="large" color="#102A43" />
          <Text style={styles.loadingText}>
            Loading air quality data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        accessibilityLabel="Air quality overview screen"
      >
        <Text style={styles.eyebrow} accessibilityRole="text">
          ENVIROCATALYSTS
        </Text>

        <Text style={styles.title} accessibilityRole="header">
          Air Quality{"\n"}Overview
        </Text>

        <Text style={styles.subtitle} accessibilityRole="text">
          Compare air quality across cities and financial years.
        </Text>

        <Pressable
          style={styles.navCard}
          onPress={() => navigation.navigate("Hourly", { city: selectedCity })}
          accessibilityRole="button"
          accessibilityLabel={`Open Hourly Air Quality Analysis for ${selectedCity}`}
        >
          <View style={styles.navCardRow}>
            <View style={styles.navCardTextContainer}>
              <Text style={styles.navCardEyebrow}>SCREEN 2</Text>
              <Text style={styles.navCardTitle}>Hourly Air Quality Analysis</Text>
              <Text style={styles.navCardSubtitle}>
                Explore station-level hourly trends for {selectedCity}
              </Text>
            </View>
            <View style={styles.navCardBadge}>
              <Text style={styles.navCardBadgeText}>Hourly →</Text>
            </View>
          </View>
        </Pressable>

        {error ? (
          <View
            style={styles.errorCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`Connection problem: ${error}`}
          >
            <Text style={styles.errorTitle}>Connection problem</Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadOverview(selectedCity)}
              accessibilityRole="button"
              accessibilityLabel="Retry loading air quality data"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 1. FINANCIAL YEAR FILTER */}
        <FinancialYearSelector
          availableYears={filters?.financialYears}
          baseYear="FY2024-25"
          comparisonYear="FY2025-26"
        />

        {/* 2. CITY CATEGORY FILTER */}
        <CityCategorySelector
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* 3. CITY SELECTOR */}
        <CitySelector
          cities={filters?.cities}
          selectedCity={selectedCity}
          onSelectCity={handleCitySelect}
          updating={updatingCity}
        />

        {/* Soft loading indicator while switching cities */}
        {updatingCity ? (
          <View
            style={styles.updatingBanner}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Updating air quality metrics for ${selectedCity}`}
          >
            <ActivityIndicator size="small" color="#102A43" />
            <Text style={styles.updatingBannerText}>
              Updating data for {selectedCity}...
            </Text>
          </View>
        ) : null}

        {/* FRESH PUBLIC AIR QUALITY DATA (OPENAQ MILESTONE 7A) */}
        <PublicDataCard />

        {overview ? (
          <>
            {/* 1. AQI CATEGORY DAYS (FIRST MAJOR ANALYSIS SECTION) */}
            <AqiCategoryDaysCard
              aqiCategoryDays={overview.aqiCategoryDays}
              baseYear={overview.filters?.baseYear || "FY2024-25"}
              comparisonYear={overview.filters?.comparisonYear || "FY2025-26"}
              city={selectedCity}
            />

            {/* 2. AVERAGE POLLUTANT CONCENTRATION (SECOND MAJOR ANALYSIS SECTION) */}
            <AveragePollutantConcentrationCard
              averagePollutantConcentration={overview.averagePollutantConcentration}
              baseYear={overview.filters?.baseYear || "FY2024-25"}
              comparisonYear={overview.filters?.comparisonYear || "FY2025-26"}
              city={selectedCity}
              pollutantMetadata={filters?.pollutants}
            />

            {/* 3. DOMINANT POLLUTANT DAYS (THIRD MAJOR ANALYSIS SECTION) */}
            <DominantPollutantDaysCard
              dominantPollutantDays={overview.dominantPollutantDays}
              baseYear={overview.filters?.baseYear || "FY2024-25"}
              comparisonYear={overview.filters?.comparisonYear || "FY2025-26"}
              city={selectedCity}
              pollutantMetadata={filters?.pollutants}
            />

            {/* 4. CITY AIR QUALITY MAP (MILESTONE 6A) */}
            <CityMapCard
              data={cityMapData}
              loading={cityMapLoading}
              error={cityMapError}
              selectedCity={selectedCity}
              onSelectCity={handleCitySelect}
              baseYear={baseYear}
              comparisonYear={comparisonYear}
              onRetry={() => loadCityMapData(baseYear, comparisonYear)}
            />
          </>
        ) : null}

        <View
          style={styles.noteCard}
          accessible
          accessibilityLabel="Data coverage note: AQI results are shown only when the required data coverage is available. FY2025-26 currently contains partial data in the available source."
        >
          <Text style={styles.noteTitle}>Data coverage note</Text>

          <Text style={styles.noteText}>
            AQI results are shown only when the required data coverage is
            available. FY2025-26 currently contains partial data in the
            available source.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PERIOD_LIMITS = {
  "24H": 48,
  "7D": 200,
  "30D": 750,
};

function calculatePeriodRange(minDateStr, maxDateStr, period) {
  if (!maxDateStr) {
    return { start: null, end: null };
  }

  const parse = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };

  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const endDate = parse(maxDateStr);
  const startDate = parse(maxDateStr);

  if (period === "24H" || period === "24 Hours") {
    // 24 Hours: calendar day containing max_date (max_date to max_date)
  } else if (period === "7D" || period === "7 Days") {
    // 7 Days: max_date - 6 days to max_date (7 calendar days inclusive)
    startDate.setUTCDate(endDate.getUTCDate() - 6);
  } else if (period === "30D" || period === "30 Days") {
    // 30 Days: max_date - 29 days to max_date (30 calendar days inclusive)
    startDate.setUTCDate(endDate.getUTCDate() - 29);
  }

  // Clamp start date to min_date
  if (minDateStr) {
    const minDate = parse(minDateStr);
    if (startDate < minDate) {
      startDate.setTime(minDate.getTime());
    }
  }

  return {
    start: fmt(startDate),
    end: fmt(endDate),
  };
}

function HourlyScreen({ route, navigation }) {
  const [filters, setFilters] = useState(null);
  const [selectedCity, setSelectedCity] = useState(route.params?.city || "Delhi");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedPollutant, setSelectedPollutant] = useState("PM2.5");
  const [selectedPeriod, setSelectedPeriod] = useState("24H");
  const [hourlyData, setHourlyData] = useState(null);
  const [loadingHourly, setLoadingHourly] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [hourlyError, setHourlyError] = useState("");

  const hourlyRequestIdRef = useRef(0);

  useEffect(() => {
    async function init() {
      try {
        const filterData = await getFilters();
        setFilters(filterData);

        const initialCity =
          route.params?.city ||
          (filterData.cities?.includes("Delhi") ? "Delhi" : filterData.cities?.[0]) ||
          "Delhi";
        setSelectedCity(initialCity);
        await loadStationsForCity(initialCity, "24H");
      } catch (err) {
        console.error(err);
        setHourlyError("Unable to load filter options.");
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (route.params?.city && route.params.city !== selectedCity) {
      handleCityChange(route.params.city);
    }
  }, [route.params?.city]);

  async function loadStationsForCity(city, period) {
    setLoadingStations(true);
    setHourlyError("");

    try {
      const stationData = await getStations(city);
      setStations(stationData || []);
      setLoadingStations(false);

      if (stationData && stationData.length > 0) {
        const firstStation = stationData[0];
        const stationId = firstStation.station_id;
        setSelectedStation(stationId);

        const availablePollutants = Object.keys(firstStation.pollutants || {});
        const nextPollutant = availablePollutants.includes("PM2.5")
          ? "PM2.5"
          : availablePollutants[0] || "PM2.5";
        setSelectedPollutant(nextPollutant);

        const avail = firstStation.pollutants?.[nextPollutant];
        if (avail?.max_date) {
          const range = calculatePeriodRange(avail.min_date, avail.max_date, period);
          await fetchHourlyReadings(city, stationId, nextPollutant, range.start, range.end, period);
        } else {
          setHourlyData({ count: 0, data: [] });
        }
      } else {
        setSelectedStation("");
        setHourlyData({ count: 0, data: [] });
      }
    } catch (err) {
      console.error(err);
      setLoadingStations(false);
      setHourlyError("Unable to load hourly readings.");
    }
  }

  async function fetchHourlyReadings(city, station, pollutant, start, end, period) {
    if (!station || !start || !end) {
      return;
    }

    const currentRequestId = ++hourlyRequestIdRef.current;
    setHourlyData(null);
    setLoadingHourly(true);
    setHourlyError("");

    try {
      const limit = PERIOD_LIMITS[period] || 48;
      const data = await getHourly({
        city,
        station,
        pollutant,
        start,
        end,
        limit,
      });

      if (currentRequestId !== hourlyRequestIdRef.current) {
        return;
      }

      setHourlyData(data);
    } catch (err) {
      if (currentRequestId !== hourlyRequestIdRef.current) {
        return;
      }
      console.error(err);
      setHourlyError("Unable to load hourly readings.");
    } finally {
      if (currentRequestId === hourlyRequestIdRef.current) {
        setLoadingHourly(false);
      }
    }
  }

  async function handleCityChange(newCity) {
    if (newCity === selectedCity && stations.length > 0) return;
    setSelectedCity(newCity);
    await loadStationsForCity(newCity, selectedPeriod);
  }

  function handleStationChange(newStationId) {
    if (newStationId === selectedStation) return;
    setSelectedStation(newStationId);

    const stationObj = stations.find((s) => s.station_id === newStationId);
    const availablePollutants = Object.keys(stationObj?.pollutants || {});

    const nextPollutant = availablePollutants.includes(selectedPollutant)
      ? selectedPollutant
      : availablePollutants[0] || "PM2.5";
    setSelectedPollutant(nextPollutant);

    const avail = stationObj?.pollutants?.[nextPollutant];
    if (avail?.max_date) {
      const range = calculatePeriodRange(avail.min_date, avail.max_date, selectedPeriod);
      fetchHourlyReadings(selectedCity, newStationId, nextPollutant, range.start, range.end, selectedPeriod);
    } else {
      setHourlyData({ count: 0, data: [] });
    }
  }

  function handlePollutantChange(newPollutant) {
    if (newPollutant === selectedPollutant) return;
    setSelectedPollutant(newPollutant);

    const stationObj = stations.find((s) => s.station_id === selectedStation);
    const avail = stationObj?.pollutants?.[newPollutant];
    if (avail?.max_date) {
      const range = calculatePeriodRange(avail.min_date, avail.max_date, selectedPeriod);
      fetchHourlyReadings(selectedCity, selectedStation, newPollutant, range.start, range.end, selectedPeriod);
    } else {
      setHourlyData({ count: 0, data: [] });
    }
  }

  function handlePeriodChange(newPeriod) {
    if (newPeriod === selectedPeriod) return;
    setSelectedPeriod(newPeriod);

    const stationObj = stations.find((s) => s.station_id === selectedStation);
    const avail = stationObj?.pollutants?.[selectedPollutant];
    if (avail?.max_date) {
      const range = calculatePeriodRange(avail.min_date, avail.max_date, newPeriod);
      fetchHourlyReadings(selectedCity, selectedStation, selectedPollutant, range.start, range.end, newPeriod);
    }
  }

  const currentStationObj = stations.find((s) => s.station_id === selectedStation);
  const availablePollutants = Object.keys(currentStationObj?.pollutants || {});
  const currentAvailability = currentStationObj?.pollutants?.[selectedPollutant];
  const activeRange = currentAvailability
    ? calculatePeriodRange(currentAvailability.min_date, currentAvailability.max_date, selectedPeriod)
    : { start: null, end: null };

  const selectedPollutantMetadata = filters?.pollutants?.find(
    (p) => p.pollutant === selectedPollutant
  );
  const unit =
    selectedPollutantMetadata?.unit || (selectedPollutant === "CO" ? "mg/m³" : "µg/m³");
  const unitA11y =
    selectedPollutant === "CO" || unit.includes("mg")
      ? "milligrams per cubic metre"
      : "micrograms per cubic metre";

  const decimals = selectedPollutant === "CO" ? 2 : 1;
  const formatConcentration = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return Number(val).toFixed(decimals);
  };

  const sortedHourlyList = useMemo(() => {
    const raw = Array.isArray(hourlyData?.data) ? hourlyData.data : [];
    return [...raw].sort((a, b) => {
      const tA = new Date(
        a.period_start?.includes("T") ? a.period_start : a.period_start?.replace(" ", "T") + "Z"
      ).getTime();
      const tB = new Date(
        b.period_start?.includes("T") ? b.period_start : b.period_start?.replace(" ", "T") + "Z"
      ).getTime();
      return tA - tB;
    });
  }, [hourlyData]);

  const validHourlyMeans = useMemo(() => {
    return sortedHourlyList
      .map((d) => d.mean)
      .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));
  }, [sortedHourlyList]);

  const latestReading =
    validHourlyMeans.length > 0 ? validHourlyMeans[validHourlyMeans.length - 1] : null;
  const periodAverage =
    validHourlyMeans.length > 0
      ? validHourlyMeans.reduce((acc, v) => acc + Number(v), 0) / validHourlyMeans.length
      : null;
  const minReading =
    validHourlyMeans.length > 0 ? Math.min(...validHourlyMeans.map(Number)) : null;
  const maxReading =
    validHourlyMeans.length > 0 ? Math.max(...validHourlyMeans.map(Number)) : null;
  const observationsCount = validHourlyMeans.length;

  const expectedObservations =
    selectedPeriod === "24H" || selectedPeriod === "24 Hours"
      ? 24
      : selectedPeriod === "7D" || selectedPeriod === "7 Days"
      ? 168
      : 720;

  const isPartialData = observationsCount < expectedObservations;
  const coverageNote = isPartialData
    ? "Some hourly observations are unavailable in this period."
    : "Showing available hourly observations for the selected period.";

  const periodDisplayName =
    selectedPeriod === "24H"
      ? "24 Hours"
      : selectedPeriod === "7D"
      ? "7 Days"
      : selectedPeriod === "30D"
      ? "30 Days"
      : selectedPeriod;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        accessibilityLabel="Hourly air quality analysis screen"
      >
        <Text style={styles.eyebrow} accessibilityRole="text">
          ENVIROCATALYSTS
        </Text>

        <Text style={styles.title} accessibilityRole="header">
          Hourly Air Quality{"\n"}Analysis
        </Text>

        <Text style={styles.subtitle} accessibilityRole="text">
          Station-wise hourly air quality trends and observations.
        </Text>

        {/* 1. CITY SELECTOR */}
        <CitySelector
          cities={filters?.cities}
          selectedCity={selectedCity}
          onSelectCity={handleCityChange}
          updating={loadingStations}
        />

        {/* 2. STATION SELECTOR */}
        <StationSelector
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={handleStationChange}
          loading={loadingStations}
        />

        {/* 3. POLLUTANT SELECTOR */}
        <PollutantSelector
          availablePollutants={availablePollutants}
          selectedPollutant={selectedPollutant}
          onSelectPollutant={handlePollutantChange}
          pollutantMetadata={filters?.pollutants}
        />

        {/* 4. PERIOD SELECTOR */}
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onSelectPeriod={handlePeriodChange}
        />

        {/* 5. VERIFIED DATA AVAILABILITY BANNER */}
        {currentAvailability?.min_date && currentAvailability?.max_date ? (
          <View
            style={styles.availabilityCard}
            accessible
            accessibilityLabel={`Verified data available from ${currentAvailability.min_date} to ${currentAvailability.max_date}`}
          >
            <View style={styles.availabilityHeaderRow}>
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityBadgeText}>Data Coverage</Text>
              </View>
            </View>
            <Text style={styles.availabilityTitleText}>
              Verified data available: {currentAvailability.min_date} – {currentAvailability.max_date}
            </Text>
            <Text style={styles.availabilitySubtext}>
              Showing latest available {selectedPeriod === "24H" ? "24 hours" : selectedPeriod === "7D" ? "7 days" : "30 days"} within verified range ({activeRange.start} to {activeRange.end}).
            </Text>
          </View>
        ) : null}

        {/* 6. LOADING / ERROR / EMPTY / LOADED STATES */}
        {loadingHourly ? (
          <View
            style={styles.statusStateCard}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading hourly readings"
          >
            <ActivityIndicator size="large" color="#102A43" />
            <Text style={styles.loadingStatusText}>Loading hourly readings…</Text>
          </View>
        ) : hourlyError ? (
          <View
            style={styles.errorCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`Error: ${hourlyError}`}
          >
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>Unable to load hourly readings.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                if (activeRange.start && activeRange.end) {
                  fetchHourlyReadings(
                    selectedCity,
                    selectedStation,
                    selectedPollutant,
                    activeRange.start,
                    activeRange.end,
                    selectedPeriod
                  );
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading hourly readings"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : !hourlyData || hourlyData.count === 0 || !hourlyData.data || hourlyData.data.length === 0 ? (
          <View
            style={styles.emptyCard}
            accessible
            accessibilityRole="text"
            accessibilityLabel="No hourly readings available for this selection"
          >
            <Text style={styles.emptyTitle}>No Readings</Text>
            <Text style={styles.emptyText}>
              No hourly readings available for this selection.
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                if (activeRange.start && activeRange.end) {
                  fetchHourlyReadings(
                    selectedCity,
                    selectedStation,
                    selectedPollutant,
                    activeRange.start,
                    activeRange.end,
                    selectedPeriod
                  );
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading hourly readings"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 7. CURRENT SELECTION / CONTEXT */}
            <View
              style={styles.contextCard}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Hourly analysis for ${selectedCity}, station ${selectedStation}, ${selectedPollutant}. Period: ${periodDisplayName}, from ${activeRange.start} to ${activeRange.end}.`}
            >
              <View style={styles.contextHeaderRow}>
                <Text style={styles.contextEyebrow}>CURRENT SELECTION</Text>
                <View style={styles.contextPeriodPill}>
                  <Text style={styles.contextPeriodText}>{periodDisplayName}</Text>
                </View>
              </View>

              <Text style={styles.contextCityStation}>
                {selectedCity} • {selectedStation}
              </Text>

              <View style={styles.contextMetaRow}>
                <View style={styles.contextPollutantBadge}>
                  <Text style={styles.contextPollutantText}>{selectedPollutant}</Text>
                  <Text style={styles.contextUnitText}>({unit})</Text>
                </View>

                <View style={styles.contextRangeBadge}>
                  <Text style={styles.contextRangeText}>
                    {activeRange.start} → {activeRange.end}
                  </Text>
                </View>
              </View>
            </View>

            {/* 8. KEY METRICS SUMMARY */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricsRow}>
                {/* LATEST */}
                <View
                  style={styles.metricTile}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Latest reading: ${formatConcentration(latestReading)} ${unitA11y}`}
                >
                  <Text style={styles.metricLabel}>LATEST</Text>
                  <Text style={styles.metricValue}>
                    {formatConcentration(latestReading)}
                    <Text style={styles.metricUnitText}> {unit}</Text>
                  </Text>
                </View>

                {/* PERIOD AVERAGE */}
                <View
                  style={styles.metricTile}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Period average: ${formatConcentration(periodAverage)} ${unitA11y}`}
                >
                  <Text style={styles.metricLabel}>PERIOD AVERAGE</Text>
                  <Text style={styles.metricValue}>
                    {formatConcentration(periodAverage)}
                    <Text style={styles.metricUnitText}> {unit}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                {/* MIN */}
                <View
                  style={styles.metricTile}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Minimum reading: ${formatConcentration(minReading)} ${unitA11y}`}
                >
                  <Text style={styles.metricLabel}>MIN</Text>
                  <Text style={styles.metricValue}>
                    {formatConcentration(minReading)}
                    <Text style={styles.metricUnitText}> {unit}</Text>
                  </Text>
                </View>

                {/* MAX */}
                <View
                  style={styles.metricTile}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Maximum reading: ${formatConcentration(maxReading)} ${unitA11y}`}
                >
                  <Text style={styles.metricLabel}>MAX</Text>
                  <Text style={styles.metricValue}>
                    {formatConcentration(maxReading)}
                    <Text style={styles.metricUnitText}> {unit}</Text>
                  </Text>
                </View>

                {/* OBSERVATIONS */}
                <View
                  style={styles.metricTile}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Observations count: ${observationsCount}`}
                >
                  <Text style={styles.metricLabel}>OBSERVATIONS</Text>
                  <Text style={styles.metricValue}>{observationsCount}</Text>
                </View>
              </View>
            </View>

            {/* 9. HOURLY TREND CHART */}
            <HourlyTrendChart
              data={hourlyData}
              pollutant={selectedPollutant}
              unit={unit}
              period={selectedPeriod}
              city={selectedCity}
              station={selectedStation}
              startDate={activeRange.start}
              endDate={activeRange.end}
            />

            {/* 10. DATA COVERAGE / OBSERVATION NOTE */}
            <View
              style={styles.coverageNoteCard}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Data coverage note: ${coverageNote}`}
            >
              <View style={styles.coverageNoteIconWrap}>
                <Text style={styles.coverageNoteIcon}>ℹ</Text>
              </View>
              <Text style={styles.coverageNoteText}>{coverageNote}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Overview"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#F7F9FC",
            },
            headerShadowVisible: false,
            headerTintColor: "#102A43",
            headerTitleStyle: {
              fontWeight: "700",
            },
          }}
        >
          <Stack.Screen
            name="Overview"
            component={OverviewScreen}
            options={{ title: "Air Quality" }}
          />

          <Stack.Screen
            name="Hourly"
            component={HourlyScreen}
            options={{ title: "Hourly Analysis" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#486581",
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#52606D",
    marginBottom: 10,
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#102A43",
  },

  subtitle: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    color: "#627D98",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },

  updatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#BEE3F8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },

  updatingBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2B6CB0",
  },

  periodCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },

  cardText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#627D98",
  },

  metricCard: {
    marginBottom: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  metricName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#102A43",
  },

  metricYear: {
    fontSize: 12,
    fontWeight: "700",
    color: "#627D98",
    backgroundColor: "#F0F4F8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  metricValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
  },

  metricUnit: {
    fontSize: 13,
    fontWeight: "500",
    color: "#627D98",
  },

  metricDays: {
    marginTop: 8,
    fontSize: 12,
    color: "#486581",
  },

  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334E68",
  },

  categoryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
  },

  noteCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FEFCBF",
  },

  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C5E10",
  },

  noteText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5A1E",
  },

  errorCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FED7D7",
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9B2C2C",
  },

  errorText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#742A2A",
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#9B2C2C",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  headerRightButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#102A43",
  },
  headerRightButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  navCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D9E2EC",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  navCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navCardTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  navCardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#2B6CB0",
    marginBottom: 2,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43",
  },
  navCardSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#627D98",
  },
  navCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#102A43",
  },
  navCardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  availabilityCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  availabilityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  availabilityBadge: {
    backgroundColor: "#D9E2EC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  availabilityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334E68",
    letterSpacing: 0.5,
  },
  availabilityTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A43",
  },
  availabilitySubtext: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#627D98",
  },
  statusStateCard: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  loadingStatusText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#486581",
  },
  emptyCard: {
    marginTop: 4,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#486581",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#486581",
    textAlign: "center",
  },
  readingsCard: {
    marginTop: 4,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contextCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contextHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  contextEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#627D98",
  },
  contextPeriodPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  contextPeriodText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  contextCityStation: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 10,
  },
  contextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  contextPollutantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contextPollutantText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A43",
    marginRight: 4,
  },
  contextUnitText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#627D98",
  },
  contextRangeBadge: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contextRangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#486581",
  },
  metricsContainer: {
    marginTop: 14,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#627D98",
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
  },
  metricUnitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#627D98",
  },
  coverageNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  coverageNoteIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  coverageNoteIcon: {
    fontSize: 12,
    color: "#486581",
    fontWeight: "700",
  },
  coverageNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#486581",
    lineHeight: 17,
  },
});