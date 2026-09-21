import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FilterChip from "./FilterChip";

export default function CityCategorySelector({
  selectedCategory = "All",
  onSelectCategory,
}) {
  // Required categories from assignment specifications:
  // NCAP, MPC, IGP, Delhi NCR, State Capitals.
  // Inspection of SQLite database and /api/v1/filters confirmed category metadata
  // is NOT currently provided by the backend API.
  // To avoid fabricating assignments, specific categories are shown with "Coming from API" badge.
  const categories = [
    { id: "All", label: "All Cities", available: true },
    { id: "NCAP", label: "NCAP", available: false },
    { id: "MPC", label: "MPC", available: false },
    { id: "IGP", label: "IGP", available: false },
    { id: "Delhi NCR", label: "Delhi NCR", available: false },
    { id: "State Capitals", label: "State Capitals", available: false },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          City Category Filter
        </Text>
        <View style={styles.metaBadge}>
          <Text style={styles.metaBadgeText}>METADATA ARCHITECTURE</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Filter by national program or geographic cluster.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
        accessibilityLabel="City category filters"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const isDisabled = !cat.available;

          return (
            <FilterChip
              key={cat.id}
              label={cat.label}
              selected={isSelected}
              disabled={isDisabled}
              badge={!cat.available ? "Coming from API" : null}
              onPress={() => {
                if (cat.available && onSelectCategory) {
                  onSelectCategory(cat.id);
                }
              }}
              accessibilityLabel={`${cat.label} category filter, ${
                cat.available
                  ? isSelected
                    ? "selected"
                    : "not selected"
                  : "disabled, metadata pending from backend API"
              }`}
              style={styles.chipSpacing}
            />
          );
        })}
      </ScrollView>

      <View
        style={styles.infoBox}
        accessible
        accessibilityLabel="Notice: Authoritative category classifications will activate once provided by the backend API. No synthetic categories are fabricated."
      >
        <Text style={styles.infoText}>
          Categories will activate when authoritative metadata is provided by the
          API. No synthetic city classifications are fabricated.
        </Text>
      </View>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },
  metaBadge: {
    backgroundColor: "#EDF2F7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4A5568",
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    color: "#627D98",
  },
  scrollRow: {
    paddingVertical: 4,
    paddingRight: 16,
    gap: 8,
  },
  chipSpacing: {
    marginRight: 2,
  },
  infoBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F7FAFC",
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#CBD5E0",
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#718096",
  },
});
