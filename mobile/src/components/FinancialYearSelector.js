import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function FinancialYearSelector({
  availableYears = [],
  baseYear = "FY2024-25",
  comparisonYear = "FY2025-26",
}) {
  // Use available financial years from API if present
  const resolvedBaseYear =
    baseYear || (availableYears.length > 0 ? availableYears[0] : "FY2024-25");
  const resolvedComparisonYear =
    comparisonYear ||
    (availableYears.length > 1
      ? availableYears[1]
      : availableYears[0] || "FY2025-26");

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Comparison Period: Base period ${resolvedBaseYear} compared against evaluation period ${resolvedComparisonYear}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Financial Year Filter
        </Text>
        <View style={styles.apiBadge}>
          <Text style={styles.apiBadgeText}>API FILTER</Text>
        </View>
      </View>

      <Text style={styles.cardSubtitle}>
        Air quality metrics compare base benchmark against evaluation period.
      </Text>

      <View style={styles.periodRow}>
        <View
          style={[styles.yearBox, styles.baseBox]}
          accessible
          accessibilityLabel={`Base Period: ${resolvedBaseYear}`}
        >
          <View style={styles.pillTag}>
            <Text style={styles.pillText}>BASE PERIOD</Text>
          </View>
          <Text style={styles.yearValue}>{resolvedBaseYear}</Text>
          <Text style={styles.yearCaption}>Benchmark reference</Text>
        </View>

        <View style={styles.vsContainer} accessible={false} importantForAccessibility="no">
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View
          style={[styles.yearBox, styles.compareBox]}
          accessible
          accessibilityLabel={`Comparison Period: ${resolvedComparisonYear}`}
        >
          <View style={[styles.pillTag, styles.comparePill]}>
            <Text style={[styles.pillText, styles.comparePillText]}>
              COMPARISON PERIOD
            </Text>
          </View>
          <Text style={styles.yearValue}>{resolvedComparisonYear}</Text>
          <Text style={styles.yearCaption}>Evaluation timeline</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },
  apiBadge: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#BEE3F8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  apiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2B6CB0",
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#627D98",
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 8,
  },
  yearBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  baseBox: {
    backgroundColor: "#F0F4F8",
    borderColor: "#D9E2EC",
  },
  compareBox: {
    backgroundColor: "#F7FAFC",
    borderColor: "#CBD5E0",
  },
  pillTag: {
    alignSelf: "flex-start",
    backgroundColor: "#D9E2EC",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#486581",
    letterSpacing: 0.6,
  },
  comparePill: {
    backgroundColor: "#E2E8F0",
  },
  comparePillText: {
    color: "#243B53",
  },
  yearValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43",
  },
  yearCaption: {
    marginTop: 4,
    fontSize: 11,
    color: "#486581",
  },
  vsContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  vsText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#486581",
  },
});
