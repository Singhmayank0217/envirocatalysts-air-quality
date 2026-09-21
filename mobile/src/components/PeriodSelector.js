import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FilterChip from "./FilterChip";

const PERIOD_OPTIONS = [
  { key: "24H", label: "24 Hours" },
  { key: "7D", label: "7 Days" },
  { key: "30D", label: "30 Days" },
  { key: "Custom", label: "Custom", disabled: true, badge: "Soon" },
];

export default function PeriodSelector({
  selectedPeriod = "24H",
  onSelectPeriod,
}) {
  const activeOption = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod);
  const activeLabel = activeOption?.label || selectedPeriod;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Select Period
        </Text>
        <Text style={styles.activeText}>
          Viewing: <Text style={styles.activePeriod}>{activeLabel}</Text>
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
        accessibilityLabel="Time period filter"
      >
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = option.key === selectedPeriod;

          return (
            <FilterChip
              key={option.key}
              label={option.label}
              badge={option.badge}
              selected={isSelected}
              disabled={option.disabled}
              onPress={() => onSelectPeriod(option.key)}
              accessibilityLabel={`${option.label}${option.badge ? ` (${option.badge})` : ""}, ${isSelected ? "selected" : "not selected"}${option.disabled ? ", disabled" : ""}`}
              accessibilityHint={
                option.disabled
                  ? "Custom date range selection will be available in a future update"
                  : undefined
              }
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
  activePeriod: {
    fontWeight: "700",
    color: "#102A43",
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
