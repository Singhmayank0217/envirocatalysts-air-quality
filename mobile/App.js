import React, { useEffect, useState } from "react";
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

const Stack = createNativeStackNavigator();

function OverviewScreen() {
  const [filters, setFilters] = useState(null);
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    try {
      setLoading(true);
      setError("");

      const data = await getOverview(city);

      setOverview(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load overview data.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !overview) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
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
        accessibilityLabel="Air quality overview"
      >
        <Text style={styles.eyebrow}>ENVIROCATALYSTS</Text>

        <Text style={styles.title}>
          Air Quality{"\n"}Overview
        </Text>

        <Text style={styles.subtitle}>
          Compare air quality across cities and financial years.
        </Text>

        {error ? (
          <View style={styles.errorCard}>
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

        <Text style={styles.sectionTitle}>Select city</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}
          accessibilityLabel="City selection"
        >
          {filters?.cities?.map((city) => {
            const selected = city === selectedCity;

            return (
              <Pressable
                key={city}
                onPress={() => setSelectedCity(city)}
                style={[
                  styles.cityButton,
                  selected && styles.cityButtonSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${city}`}
              >
                <Text
                  style={[
                    styles.cityButtonText,
                    selected && styles.cityButtonTextSelected,
                  ]}
                >
                  {city}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.periodCard}>
          <Text style={styles.cardTitle}>Comparison period</Text>

          <View style={styles.yearRow}>
            <View style={styles.yearBox}>
              <Text style={styles.yearLabel}>BASE</Text>
              <Text style={styles.yearValue}>FY2024-25</Text>
            </View>

            <View style={styles.yearBox}>
              <Text style={styles.yearLabel}>COMPARE</Text>
              <Text style={styles.yearValue}>FY2025-26</Text>
            </View>
          </View>
        </View>

        {overview ? (
          <>
            <Text style={styles.sectionTitle}>
              Average pollutant concentration
            </Text>

            {overview.averagePollutantConcentration?.map((item) => {
              const pollutant = item.pollutant || item.parameter_name;

              return (
                <View
                  key={`${item.financial_year}-${pollutant}`}
                  style={styles.metricCard}
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

            <Text style={styles.sectionTitle}>
              AQI category days
            </Text>

            {overview.aqiCategoryDays?.map((item) => {
              const category = item.aqi_category || item.category;

              return (
                <View
                  key={`${item.financial_year}-${category}`}
                  style={styles.categoryRow}
                >
                  <Text style={styles.categoryName}>
                    {category}
                  </Text>

                  <Text style={styles.categoryValue}>
                    {item.days}
                  </Text>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>
              Dominant pollutant days
            </Text>

            {overview.dominantPollutantDays?.map((item) => {
              const pollutant = item.pollutant || item.dominant_pollutant;

              return (
                <View
                  key={`${item.financial_year}-${pollutant}`}
                  style={styles.categoryRow}
                >
                  <Text style={styles.categoryName}>
                    {pollutant}
                  </Text>

                  <Text style={styles.categoryValue}>
                    {item.days}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        <View style={styles.noteCard}>
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
    paddingTop: 28,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#627D98",
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#52606D",
    marginBottom: 12,
  },

  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    color: "#102A43",
  },

  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: "#627D98",
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 19,
    fontWeight: "700",
    color: "#102A43",
  },

  cityRow: {
    gap: 10,
    paddingRight: 10,
  },

  cityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },

  cityButtonSelected: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
  },

  cityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#486581",
  },

  cityButtonTextSelected: {
    color: "#FFFFFF",
  },

  periodCard: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#102A43",
  },

  cardText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#627D98",
  },

  yearRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  yearBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F0F4F8",
  },

  yearLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#829AB1",
  },

  yearValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#102A43",
  },

  metricCard: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },

  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  metricName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102A43",
  },

  metricYear: {
    fontSize: 13,
    color: "#829AB1",
  },

  metricValue: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
  },

  metricUnit: {
    fontSize: 13,
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
    padding: 16,
    marginBottom: 8,
    borderRadius: 14,
  },

  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334E68",
  },

  categoryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A43",
  },

  noteCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF8E1",
  },

  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7C5E10",
  },

  noteText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#6B5A1E",
  },

  errorCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9B2C2C",
  },

  errorText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
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
  },
});