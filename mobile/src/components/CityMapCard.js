import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CityMap from "./CityMap";

// CPCB AQI Category color palette
const AQI_CATEGORY_COLORS = {
  Good: {
    bg: "#DCFCE7",
    text: "#15803D",
    border: "#BBF7D0",
  },
  Satisfactory: {
    bg: "#E0F2FE",
    text: "#0369A1",
    border: "#BAE6FD",
  },
  Moderate: {
    bg: "#FEF3C7",
    text: "#B45309",
    border: "#FDE68A",
  },
  Poor: {
    bg: "#FFEDD5",
    text: "#C2410C",
    border: "#FED7AA",
  },
  "Very Poor": {
    bg: "#FEE2E2",
    text: "#B91C1C",
    border: "#FECACA",
  },
  Severe: {
    bg: "#F3E8FF",
    text: "#6B21A8",
    border: "#E9D5FF",
  },
  Unavailable: {
    bg: "#F1F5F9",
    text: "#64748B",
    border: "#E2E8F0",
  },
};

export default function CityMapCard({
  data = null,
  loading = false,
  error = "",
  selectedCity = "Delhi",
  selectedState = "All States",
  onSelectCity = () => {},
  baseYear = "FY2024-25",
  comparisonYear = "FY2025-26",
  onRetry = () => {},
}) {
  const cityList = Array.isArray(data?.data) ? data.data : [];
  const filters = data?.filters || {};
  const resolvedBaseYear = filters.baseYear || baseYear || "FY2024-25";
  const resolvedCompYear = filters.comparisonYear || comparisonYear || "FY2025-26";
  const resolvedState = filters.state || selectedState || "All States";

  const isStateFiltered = Boolean(
    resolvedState && resolvedState !== "All States" && resolvedState !== "All"
  );

  const stateCities = isStateFiltered
    ? cityList.filter(
        (c) => c.state && c.state.toLowerCase() === resolvedState.toLowerCase()
      )
    : cityList;

  // Check coordinates availability from real DB data
  const mappedCities = cityList.filter(
    (c) => c.latitude !== null && c.longitude !== null && !isNaN(c.latitude) && !isNaN(c.longitude)
  );
  const mappedCount = mappedCities.length;
  const totalCities = cityList.length;

  // Find selected city record
  const selectedRecord =
    (selectedCity && selectedCity !== "All Cities" && selectedCity !== "All"
      ? cityList.find(
          (c) => c.city && c.city.toLowerCase() === selectedCity.toLowerCase()
        )
      : null) ||
    (isStateFiltered ? stateCities[0] : cityList[0]) ||
    null;

  const selectedBaseValue = selectedRecord?.base?.value;
  const selectedBaseCategory = selectedRecord?.base?.category || "N/A";
  const selectedCompAvailable = selectedRecord?.comparison?.available === true;
  const selectedCompValue = selectedRecord?.comparison?.value;
  const selectedCompCategory = selectedRecord?.comparison?.category;

  // Construct dynamic accessible description from real API values
  const accessibleDescription = [
    `Interactive city air quality map for ${resolvedBaseYear}.`,
    `Showing ${totalCities || 8} cities across India.`,
    selectedRecord
      ? `${selectedRecord.city} AQI category: ${selectedBaseCategory}${
          selectedBaseValue !== null && selectedBaseValue !== undefined
            ? ` with AQI value ${selectedBaseValue}`
            : ""
        }.`
      : "",
    selectedCompAvailable
      ? `${resolvedCompYear} AQI is ${selectedCompValue} (${selectedCompCategory}).`
      : `${resolvedCompYear} AQI is unavailable because sufficient pollutant data is not available.`,
    `${mappedCount} of ${totalCities || 8} cities mapped with verified geographic reference coordinates.`,
  ]
    .filter(Boolean)
    .join(" ");

  // Loading State
  if (loading && !data) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SCREEN 1 · SPATIAL ANALYSIS</Text>
          <Text style={styles.cardTitle} accessibilityRole="header">
            City Air Quality Map
          </Text>
        </View>
        <View
          style={styles.centerContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading city map data"
        >
          <ActivityIndicator size="large" color="#102A43" />
          <Text style={styles.stateText} accessibilityRole="text">
            Loading city air quality map data...
          </Text>
        </View>
      </View>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <View
        style={styles.card}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`City map data error: ${error}`}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SCREEN 1 · SPATIAL ANALYSIS</Text>
          <Text style={styles.cardTitle} accessibilityRole="header">
            City Air Quality Map
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load map data</Text>
          <Text style={styles.errorText} accessibilityRole="text">
            {error}
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading city map data"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={accessibleDescription}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>SCREEN 1 · SPATIAL ANALYSIS</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>INTERACTIVE MAP</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          City Air Quality Map
        </Text>
        <Text style={styles.cardSubtitle} accessibilityRole="text">
          Spatial overview of air quality benchmarks across {totalCities || 8} key Indian cities.
        </Text>
      </View>

      {/* Map Period Header */}
      <View style={styles.mapSectionHeader}>
        <View style={styles.mapPeriodBadge}>
          <Text style={styles.mapPeriodBadgeText}>{resolvedBaseYear} AQI</Text>
        </View>
        <Text style={styles.mapPeriodNote}>
          Tap any city marker to inspect
        </Text>
      </View>

      {/* Interactive Geographic City Map */}
      <CityMap
        cities={cityList}
        selectedCity={selectedCity}
        selectedState={resolvedState}
        onSelectCity={onSelectCity}
        baseYear={resolvedBaseYear}
      />

      {/* Empty State */}
      {cityList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText} accessibilityRole="text">
            No city map data available for {resolvedBaseYear}.
          </Text>
        </View>
      ) : (
        <>
          {/* Selected City Detail Card */}
          {selectedRecord ? (
            <View style={styles.selectedCityCard}>
              <View style={styles.selectedCityHeader}>
                <View>
                  <Text style={styles.selectedCityLabel}>SELECTED CITY</Text>
                  <Text style={styles.selectedCityName} accessibilityRole="header">
                    {selectedRecord.city}
                  </Text>
                </View>
                <View style={styles.coordBadge}>
                  <Text style={styles.coordBadgeText}>
                    {selectedRecord.latitude !== null && selectedRecord.longitude !== null
                      ? `${selectedRecord.latitude.toFixed(2)}°, ${selectedRecord.longitude.toFixed(2)}°`
                      : "Coordinates Pending"}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                {/* Base Year Metric */}
                <View style={styles.metricBox}>
                  <Text style={styles.metricPeriodLabel}>{resolvedBaseYear}</Text>
                  <Text style={styles.metricPeriodTag}>BENCHMARK</Text>

                  {selectedRecord.base?.available && selectedBaseValue !== null ? (
                    <>
                      <Text style={styles.metricValue}>
                        {selectedBaseValue}
                      </Text>
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor:
                              AQI_CATEGORY_COLORS[selectedBaseCategory]?.bg || "#F1F5F9",
                            borderColor:
                              AQI_CATEGORY_COLORS[selectedBaseCategory]?.border || "#CBD5E1",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            {
                              color:
                                AQI_CATEGORY_COLORS[selectedBaseCategory]?.text || "#334155",
                            },
                          ]}
                        >
                          {selectedBaseCategory}
                        </Text>
                      </View>
                      {selectedRecord.base?.days ? (
                        <Text style={styles.daysAvailableText}>
                          {selectedRecord.base.days} valid days
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.unavailableGroup}>
                      <Text style={styles.unavailableValue}>--</Text>
                      <Text style={styles.unavailableLabel}>Data unavailable</Text>
                    </View>
                  )}
                </View>

                {/* Comparison Year Metric */}
                <View style={[styles.metricBox, styles.comparisonMetricBox]}>
                  <Text style={styles.metricPeriodLabel}>{resolvedCompYear}</Text>
                  <Text style={[styles.metricPeriodTag, styles.comparisonPeriodTag]}>
                    EVALUATION
                  </Text>

                  {selectedCompAvailable && selectedCompValue !== null ? (
                    <>
                      <Text style={styles.metricValue}>
                        {selectedCompValue}
                      </Text>
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor:
                              AQI_CATEGORY_COLORS[selectedCompCategory]?.bg || "#F1F5F9",
                            borderColor:
                              AQI_CATEGORY_COLORS[selectedCompCategory]?.border || "#CBD5E1",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            {
                              color:
                                AQI_CATEGORY_COLORS[selectedCompCategory]?.text || "#334155",
                            },
                          ]}
                        >
                          {selectedCompCategory}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.unavailableGroup}>
                      <Text style={styles.unavailableValue}>Unavailable</Text>
                      <Text style={styles.insufficientText} accessibilityRole="text">
                        Insufficient pollutant data for AQI calculation (PM2.5 & PM10 only)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : null}

          {/* City Selection Grid */}
          <Text style={styles.gridSectionTitle} accessibilityRole="header">
            {isStateFiltered ? `${resolvedState} Cities` : "All Cities"} AQI Summary ({stateCities.length})
          </Text>

          <View style={styles.cityGrid}>
            {stateCities.map((item) => {
              const isSelected =
                item.city &&
                selectedCity &&
                item.city.toLowerCase() === selectedCity.toLowerCase();
              const category = item.base?.category || "Unavailable";
              const colors = AQI_CATEGORY_COLORS[category] || AQI_CATEGORY_COLORS.Unavailable;

              return (
                <Pressable
                  key={item.city}
                  style={[
                    styles.cityCard,
                    isSelected ? styles.cityCardSelected : null,
                  ]}
                  onPress={() => onSelectCity(item.city)}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                  }}
                  accessibilityLabel={`Select ${item.city}. ${resolvedBaseYear} AQI is ${
                    item.base?.value ?? "unavailable"
                  }, category ${category}. ${
                    isSelected ? "Currently selected." : ""
                  }`}
                >
                  <View style={styles.cityCardTopRow}>
                    <Text
                      style={[
                        styles.cityName,
                        isSelected ? styles.cityNameSelected : null,
                      ]}
                      numberOfLines={1}
                    >
                      {item.city}
                    </Text>
                    {isSelected ? (
                      <View style={styles.selectedCheck}>
                        <Text style={styles.selectedCheckText}>✓</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cityCardBottomRow}>
                    <Text style={styles.cityCardValue}>
                      {item.base?.available && item.base?.value !== null
                        ? item.base.value
                        : "--"}
                    </Text>
                    <View
                      style={[
                        styles.cityMiniPill,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cityMiniPillText,
                          { color: colors.text },
                        ]}
                      >
                        {category}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Map Attribution & Coordinate Metadata Footer */}
          <View style={styles.attributionFooter}>
            <Text style={styles.attributionTag}>MAP &amp; COORDINATE METADATA</Text>
            <Text style={styles.attributionText}>
              Coordinates: OpenStreetMap Nominatim city reference locations (March 2026).{"\n"}
              Vector Asset: DataMeet Indian Maps Project (CC BY 2.5 IN / Open Data).
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#64748B",
  },
  badge: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369A1",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // Map Section Header
  mapSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  mapPeriodBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapPeriodBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E40AF",
    letterSpacing: 0.5,
  },
  mapPeriodNote: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },

  // Selected City Card
  selectedCityCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedCityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  selectedCityLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#64748B",
  },
  selectedCityName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  coordBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  coordBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  comparisonMetricBox: {
    backgroundColor: "#F9FAFB",
  },
  metricPeriodLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricPeriodTag: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1E3A8A",
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 8,
  },
  comparisonPeriodTag: {
    color: "#0D9488",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  daysAvailableText: {
    fontSize: 10,
    color: "#486581",
    marginTop: 4,
  },
  unavailableGroup: {
    paddingVertical: 6,
  },
  unavailableValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#486581",
    marginBottom: 4,
  },
  unavailableLabel: {
    fontSize: 11,
    color: "#486581",
  },
  insufficientText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },

  // Grid
  gridSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  cityCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cityCardSelected: {
    borderColor: "#1E3A8A",
    backgroundColor: "#F0F7FF",
    borderWidth: 2,
  },
  cityCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cityName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  cityNameSelected: {
    color: "#1E3A8A",
    fontWeight: "800",
  },
  selectedCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1E3A8A",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 14,
  },
  cityCardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cityCardValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cityMiniPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  cityMiniPillText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Attribution Footer
  attributionFooter: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  attributionTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#475569",
    marginBottom: 4,
  },
  attributionText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },

  // States
  centerContainer: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 24,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#991B1B",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
});
