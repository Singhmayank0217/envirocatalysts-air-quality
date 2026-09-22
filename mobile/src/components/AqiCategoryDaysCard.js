import React from "react";
import { StyleSheet, Text, View } from "react-native";

const AQI_CATEGORIES = [
  {
    name: "Good",
    range: "0–50",
    barColor: "#16A34A",
    badgeBg: "#DCFCE7",
    badgeBorder: "#86EFAC",
    textColor: "#15803D",
  },
  {
    name: "Satisfactory",
    range: "51–100",
    barColor: "#65A30D",
    badgeBg: "#ECFCCB",
    badgeBorder: "#BEF264",
    textColor: "#3F6212",
  },
  {
    name: "Moderate",
    range: "101–200",
    barColor: "#D97706",
    badgeBg: "#FEF3C7",
    badgeBorder: "#FDE68A",
    textColor: "#92400E",
  },
  {
    name: "Poor",
    range: "201–300",
    barColor: "#EA580C",
    badgeBg: "#FFEDD5",
    badgeBorder: "#FED7AA",
    textColor: "#9A3412",
  },
  {
    name: "Very Poor",
    range: "301–400",
    barColor: "#DC2626",
    badgeBg: "#FEE2E2",
    badgeBorder: "#FECACA",
    textColor: "#991B1B",
  },
  {
    name: "Severe",
    range: "401–500",
    barColor: "#7F1D1D",
    badgeBg: "#FFE4E6",
    badgeBorder: "#FDA4AF",
    textColor: "#881337",
  },
];

export default function AqiCategoryDaysCard({
  aqiCategoryDays = [],
  baseYear = "FY2024-25",
  comparisonYear = "FY2025-26",
  city = "Delhi",
}) {
  const safeItems = Array.isArray(aqiCategoryDays) ? aqiCategoryDays : [];
  const isAllCities = !city || city === "All" || city === "All Cities";

  // Filter rows for base year and comparison year (scoped to city if present)
  const baseItems = safeItems.filter((item) => {
    const itemYear = item.financial_year || item.year;
    const itemCity = item.city || item.requested_city;
    const yearMatch = itemYear === baseYear;
    const cityMatch = isAllCities || !itemCity || itemCity.toLowerCase() === city.toLowerCase();
    return yearMatch && cityMatch;
  });

  const comparisonItems = safeItems.filter((item) => {
    const itemYear = item.financial_year || item.year;
    const itemCity = item.city || item.requested_city;
    const yearMatch = itemYear === comparisonYear;
    const cityMatch = isAllCities || !itemCity || itemCity.toLowerCase() === city.toLowerCase();
    return yearMatch && cityMatch;
  });

  // Maps for fast, case-insensitive lookup (aggregated by category)
  const baseMap = new Map();
  baseItems.forEach((item) => {
    const cat = (item.aqi_category || item.category || "").toLowerCase();
    if (cat) {
      const existing = baseMap.get(cat);
      if (existing) {
        baseMap.set(cat, {
          ...existing,
          days: (existing.days || 0) + (Number(item.days) || 0),
        });
      } else {
        baseMap.set(cat, { ...item, days: Number(item.days) || 0 });
      }
    }
  });

  const comparisonMap = new Map();
  comparisonItems.forEach((item) => {
    const cat = (item.aqi_category || item.category || "").toLowerCase();
    if (cat) {
      const existing = comparisonMap.get(cat);
      if (existing) {
        comparisonMap.set(cat, {
          ...existing,
          days: (existing.days || 0) + (Number(item.days) || 0),
        });
      } else {
        comparisonMap.set(cat, { ...item, days: Number(item.days) || 0 });
      }
    }
  });

  // Dynamically compute total evaluated days directly from API items
  const totalBaseDays = baseItems.reduce((sum, item) => {
    const val = typeof item.days === "number" ? item.days : Number(item.days);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const hasComparisonData = comparisonItems.length > 0;
  const totalComparisonDays = comparisonItems.reduce((sum, item) => {
    const val = typeof item.days === "number" ? item.days : Number(item.days);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Maximum days across all categories for proportional bar scaling
  const allDaysList = [
    ...baseItems.map((i) => (typeof i.days === "number" ? i.days : Number(i.days) || 0)),
    ...comparisonItems.map((i) => (typeof i.days === "number" ? i.days : Number(i.days) || 0)),
  ];
  const maxDays = Math.max(...allDaysList, 1);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>ANALYSIS • SCREEN 1</Text>
          <Text style={styles.title} accessibilityRole="header">
            AQI Category Days
          </Text>
        </View>
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>{city}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Comparison of daily AQI distribution between benchmark and evaluation periods.
      </Text>

      {/* Summary Section */}
      <View style={styles.summaryGrid}>
        {/* Base Period Summary */}
        <View
          style={styles.summaryCard}
          accessible
          accessibilityLabel={`Base period ${baseYear}: ${
            totalBaseDays > 0 ? `${totalBaseDays} days evaluated` : "No data recorded"
          }`}
        >
          <View style={styles.summaryTagRow}>
            <View style={[styles.summaryIndicator, styles.baseIndicator]} />
            <Text style={styles.summaryLabel}>Base: {baseYear}</Text>
          </View>
          <Text style={styles.summaryValue}>
            {totalBaseDays > 0 ? `${totalBaseDays} days evaluated` : "No data recorded"}
          </Text>
          <Text style={styles.summaryCaption}>CPCB standard benchmark</Text>
        </View>

        {/* Comparison Period Summary */}
        <View
          style={styles.summaryCard}
          accessible
          accessibilityLabel={`Comparison period ${comparisonYear}: ${
            hasComparisonData
              ? `${totalComparisonDays} days evaluated`
              : "AQI comparison limited by available data"
          }`}
        >
          <View style={styles.summaryTagRow}>
            <View style={[styles.summaryIndicator, styles.compIndicator]} />
            <Text style={styles.summaryLabel}>Comparison: {comparisonYear}</Text>
          </View>
          <Text style={styles.summaryValue}>
            {hasComparisonData
              ? `${totalComparisonDays} days evaluated`
              : "AQI comparison limited"}
          </Text>
          <Text style={styles.summaryCaption}>
            {hasComparisonData ? "Evaluation period" : "Limited by pollutant coverage"}
          </Text>
        </View>
      </View>

      {/* Insufficient Data Notice Banner */}
      {!hasComparisonData && (
        <View
          style={styles.noticeCard}
          accessible
          accessibilityLabel={`${comparisonYear} AQI comparison is limited because sufficient pollutant data is not available.`}
        >
          <View style={styles.noticeIconWrap}>
            <Text style={styles.noticeIconText}>ℹ</Text>
          </View>
          <Text style={styles.noticeText}>
            {comparisonYear} AQI comparison is limited because sufficient pollutant data is not available.
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendContainer} accessible={false} importantForAccessibility="no">
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.baseLegendDot]} />
          <Text style={styles.legendText}>Base ({baseYear})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.compLegendDot]} />
          <Text style={styles.legendText}>Comparison ({comparisonYear})</Text>
        </View>
      </View>

      {/* Paired Category Bars */}
      <View style={styles.categoriesList}>
        {AQI_CATEGORIES.map((cat) => {
          const baseItem = baseMap.get(cat.name.toLowerCase());
          const comparisonItem = comparisonMap.get(cat.name.toLowerCase());

          // Extract values strictly from API items — NEVER convert missing into 0
          const baseDays =
            baseItem && typeof baseItem.days === "number"
              ? baseItem.days
              : baseItem && baseItem.days != null && !isNaN(Number(baseItem.days))
              ? Number(baseItem.days)
              : null;

          const comparisonDays =
            comparisonItem && typeof comparisonItem.days === "number"
              ? comparisonItem.days
              : comparisonItem && comparisonItem.days != null && !isNaN(Number(comparisonItem.days))
              ? Number(comparisonItem.days)
              : null;

          // Proportional width for base bar (minimum 6% for visibility if positive)
          const baseWidthPct =
            baseDays !== null && baseDays > 0
              ? Math.max(Math.round((baseDays / maxDays) * 100), 6)
              : 0;

          // Proportional width for comparison bar
          const compWidthPct =
            comparisonDays !== null && comparisonDays > 0
              ? Math.max(Math.round((comparisonDays / maxDays) * 100), 6)
              : 0;

          // Meaningful accessibility label for screen readers
          const baseDaysText =
            baseDays !== null
              ? `${baseDays} ${baseDays === 1 ? "day" : "days"} in ${baseYear}`
              : `no recorded data in ${baseYear}`;

          const comparisonDaysText =
            comparisonDays !== null
              ? `${comparisonDays} ${comparisonDays === 1 ? "day" : "days"} in ${comparisonYear}`
              : `no comparable AQI data in ${comparisonYear}`;

          const accessibilityLabel = `AQI category ${cat.name}: ${baseDaysText} and ${comparisonDaysText}.`;

          return (
            <View
              key={`aqi-category-${cat.name}`}
              style={styles.categoryRow}
              accessible
              accessibilityLabel={accessibilityLabel}
            >
              {/* Category Header Row */}
              <View style={styles.categoryTitleRow}>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: cat.badgeBg,
                      borderColor: cat.badgeBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: cat.barColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryName,
                      { color: cat.textColor },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </View>
                <Text style={styles.categoryRange}>AQI {cat.range}</Text>
              </View>

              {/* Paired Bars Container */}
              <View style={styles.barsContainer}>
                {/* Bar 1: Base Period */}
                <View style={styles.barLine}>
                  <Text style={styles.periodTag}>{baseYear}</Text>
                  <View style={styles.track}>
                    {baseDays !== null && baseDays > 0 ? (
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${baseWidthPct}%`,
                            backgroundColor: cat.barColor,
                          },
                        ]}
                      />
                    ) : (
                      <View style={styles.emptyFill} />
                    )}
                  </View>
                  <Text style={styles.numericValue}>
                    {baseDays !== null ? `${baseDays} d` : "—"}
                  </Text>
                </View>

                {/* Bar 2: Comparison Period */}
                <View style={styles.barLine}>
                  <Text style={[styles.periodTag, styles.compPeriodTag]}>
                    {comparisonYear}
                  </Text>
                  <View
                    style={[
                      styles.track,
                      hasComparisonData ? null : styles.limitedTrack,
                    ]}
                  >
                    {comparisonDays !== null && comparisonDays > 0 ? (
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${compWidthPct}%`,
                            backgroundColor: "#486581",
                          },
                        ]}
                      />
                    ) : (
                      <View style={styles.emptyFill} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.numericValue,
                      comparisonDays === null ? styles.missingValue : null,
                    ]}
                  >
                    {comparisonDays !== null ? `${comparisonDays} d` : "—"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
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
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#627D98",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A43",
  },
  cityBadge: {
    backgroundColor: "#F0F4F8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  cityBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334E68",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#627D98",
    marginTop: 6,
    marginBottom: 16,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  baseIndicator: {
    backgroundColor: "#16A34A",
  },
  compIndicator: {
    backgroundColor: "#94A3B8",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#486581",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102A43",
    lineHeight: 18,
  },
  summaryCaption: {
    fontSize: 11,
    color: "#486581",
    marginTop: 2,
  },

  // Insufficient Data Notice
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noticeIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  noticeIconText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#92400E",
  },

  // Legend
  legendContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  baseLegendDot: {
    backgroundColor: "#16A34A",
  },
  compLegendDot: {
    backgroundColor: "#94A3B8",
    borderWidth: 1,
    borderColor: "#64748B",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#627D98",
  },

  // Category Rows
  categoriesList: {
    gap: 14,
  },
  categoryRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  categoryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryRange: {
    fontSize: 11,
    fontWeight: "600",
    color: "#486581",
  },

  // Bars
  barsContainer: {
    gap: 8,
  },
  barLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodTag: {
    width: 68,
    fontSize: 11,
    fontWeight: "700",
    color: "#334E68",
  },
  compPeriodTag: {
    color: "#486581",
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: "#F0F4F8",
    borderRadius: 5,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  limitedTrack: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
  },
  emptyFill: {
    width: 0,
    height: "100%",
  },
  numericValue: {
    width: 46,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: "#102A43",
  },
  missingValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#486581",
  },
});
