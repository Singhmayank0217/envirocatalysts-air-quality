import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FilterChip from "./FilterChip";

export default function CitySelector({
  cities = [],
  selectedCity = "Delhi",
  onSelectCity,
  updating = false,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Select City
        </Text>
        {updating ? (
          <View style={styles.updatingBadge}>
            <Text style={styles.updatingText}>Updating...</Text>
          </View>
        ) : (
          <Text style={styles.activeText}>
            Viewing: <Text style={styles.activeCity}>{selectedCity}</Text>
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
        accessibilityLabel="Available cities filter"
      >
        {cities.map((city) => {
          const isSelected = city === selectedCity;

          return (
            <FilterChip
              key={city}
              label={city}
              selected={isSelected}
              onPress={() => onSelectCity(city)}
              accessibilityLabel={`Select ${city}, currently ${isSelected ? "selected" : "not selected"}`}
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
  activeCity: {
    fontWeight: "700",
    color: "#102A43",
  },
  updatingBadge: {
    backgroundColor: "#FEFCBF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FAF089",
  },
  updatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#975A16",
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
