import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FilterChip from "./FilterChip";

export default function StationSelector({
  stations = [],
  selectedStation = "",
  onSelectStation,
  loading = false,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Select Station
        </Text>
        {loading ? (
          <View style={styles.loadingBadge}>
            <Text style={styles.loadingBadgeText}>Loading...</Text>
          </View>
        ) : (
          <Text style={styles.activeText}>
            Viewing: <Text style={styles.activeStation}>{selectedStation || "None"}</Text>
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
        accessibilityLabel="Available monitoring stations filter"
      >
        {stations.map((station) => {
          const stationId = typeof station === "string" ? station : station.station_id;
          const isSelected = stationId === selectedStation;

          return (
            <FilterChip
              key={stationId}
              label={stationId}
              selected={isSelected}
              onPress={() => onSelectStation(stationId)}
              accessibilityLabel={`Select station ${stationId}, currently ${isSelected ? "selected" : "not selected"}`}
              style={styles.chipSpacing}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },
  activeText: {
    fontSize: 13,
    color: "#627D98",
  },
  activeStation: {
    fontWeight: "700",
    color: "#102A43",
  },
  loadingBadge: {
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BEE3F8",
  },
  loadingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2B6CB0",
  },
  scrollRow: {
    paddingVertical: 4,
    paddingRight: 16,
    gap: 8,
  },
  chipSpacing: {
    marginRight: 2,
  },
});
