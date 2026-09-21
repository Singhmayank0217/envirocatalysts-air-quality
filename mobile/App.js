import React, { useEffect, useRef, useState } from "react";
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

import { getFilters, getOverview } from "./src/services/api";
import FinancialYearSelector from "./src/components/FinancialYearSelector";
import CitySelector from "./src/components/CitySelector";
import CityCategorySelector from "./src/components/CityCategorySelector";

const Stack = createNativeStackNavigator();

function OverviewScreen() {
  const [filters, setFilters] = useState(null);
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingCity, setUpdatingCity] = useState(false);
  const [error, setError] = useState("");

  // Ref to track latest request ID for race-condition prevention
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadFilters();
  }, []);

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
            accessibilityLabel={`Updating air quality metrics for ${selectedCity}`}
          >
            <ActivityIndicator size="small" color="#102A43" />
            <Text style={styles.updatingBannerText}>
              Updating data for {selectedCity}...
            </Text>
          </View>
        ) : null}

        {overview ? (
          <>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Average pollutant concentration
            </Text>

            {overview.averagePollutantConcentration?.map((item, index) => {
              const pollutant = item.pollutant || item.parameter_name || "Unknown";
              const key = `${item.city || selectedCity}-${item.financial_year || "FY"}-${pollutant}-${index}`;

              return (
                <View
                  key={key}
                  style={styles.metricCard}
                  accessible
                  accessibilityRole="summary"
                  accessibilityLabel={`${pollutant} in ${item.financial_year}: average concentration ${item.average_concentration} ${item.unit || "µg/m³"}, based on ${item.days_available} available days`}
                >
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricName}>
                      {pollutant}
                    </Text>

                    <Text style={styles.metricYear}>
                      {item.financial_year}
                    </Text>
                  </View>

                  <Text style={styles.metricValue}>
                    {item.average_concentration}
                  </Text>

                  <Text style={styles.metricUnit}>
                    {item.unit || "µg/m³"}
                  </Text>

                  <Text style={styles.metricDays}>
                    Based on {item.days_available} available days
                  </Text>
                </View>
              );
            })}

            <Text style={styles.sectionTitle} accessibilityRole="header">
              AQI category days
            </Text>

            {overview.aqiCategoryDays?.map((item, index) => {
              const category = item.aqi_category || item.category || "Unknown";
              const key = `${item.city || selectedCity}-${item.financial_year || "FY"}-${category}-${index}`;

              return (
                <View
                  key={key}
                  style={styles.categoryRow}
                  accessible
                  accessibilityRole="summary"
                  accessibilityLabel={`${category} AQI days in ${item.financial_year}: ${item.days} days`}
                >
                  <Text style={styles.categoryName}>
                    {category} ({item.financial_year})
                  </Text>

                  <Text style={styles.categoryValue}>
                    {item.days}
                  </Text>
                </View>
              );
            })}

            <Text style={styles.sectionTitle} accessibilityRole="header">
              Dominant pollutant days
            </Text>

            {overview.dominantPollutantDays?.map((item, index) => {
              const pollutant = item.pollutant || item.dominant_pollutant || "Unknown";
              const key = `${item.city || selectedCity}-${item.financial_year || "FY"}-${pollutant}-${index}`;

              return (
                <View
                  key={key}
                  style={styles.categoryRow}
                  accessible
                  accessibilityRole="summary"
                  accessibilityLabel={`${pollutant} dominant pollutant in ${item.financial_year}: ${item.days} days`}
                >
                  <Text style={styles.categoryName}>
                    {pollutant} ({item.financial_year})
                  </Text>

                  <Text style={styles.categoryValue}>
                    {item.days}
                  </Text>
                </View>
              );
            })}
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

function HourlyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>ENVIROCATALYSTS</Text>

        <Text style={styles.title}>
          Hourly{"\n"}Analysis
        </Text>

        <Text style={styles.subtitle}>
          Station-wise hourly air quality trends.
        </Text>

        <View style={styles.periodCard}>
          <Text style={styles.cardTitle}>Hourly trends</Text>

          <Text style={styles.cardText}>
            Station and pollutant filters will be connected to the backend
            next.
          </Text>
        </View>
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
    color: "#829AB1",
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
});