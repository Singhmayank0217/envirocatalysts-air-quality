import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Standard pollutant visual and descriptive configuration
const POLLUTANT_CONFIG = {
  "PM2.5": {
    order: 1,
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    barColor: "#1E3A8A", // Deep Navy
  },
  PM10: {
    order: 2,
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    barColor: "#2563EB", // Royal Blue
  },
  NO2: {
    order: 3,
    name: "NO₂",
    fullName: "Nitrogen Dioxide",
    barColor: "#D97706", // Amber
  },
  SO2: {
    order: 4,
    name: "SO₂",
    fullName: "Sulphur Dioxide",
    barColor: "#059669", // Emerald
  },
  CO: {
    order: 5,
    name: "CO",
    fullName: "Carbon Monoxide",
    barColor: "#DC2626", // Red / Coral
  },
  Ozone: {
    order: 6,
    name: "Ozone (O₃)",
    fullName: "Ground-level Ozone",
    barColor: "#7C3AED", // Violet
  },
};

export default function DominantPollutantDaysCard({
  dominantPollutantDays = [],
  baseYear = "FY2024-25",
  comparisonYear = "FY2025-26",
  city = "Delhi",
  pollutantMetadata = [],
}) {
  const safeItems = Array.isArray(dominantPollutantDays)
    ? dominantPollutantDays
    : [];

  // Filter items matching the requested city (or all if not city-specific)
  const cityItems = safeItems.filter((item) => {
    const itemCity = item.city || item.requested_city;
    return !itemCity || !city || itemCity.toLowerCase() === city.toLowerCase();
  });

  // Segregate into base year and comparison year items
  const baseItems = cityItems.filter((item) => {
    const itemYear = item.financial_year || item.year;
    return itemYear === baseYear;
  });

  const comparisonItems = cityItems.filter((item) => {
    const itemYear = item.financial_year || item.year;
    return itemYear === comparisonYear;
  });

  // Build metadata lookup from API filters / metadata if provided
  const metaMap = new Map();
  if (Array.isArray(pollutantMetadata)) {
    pollutantMetadata.forEach((meta) => {
      if (meta && meta.pollutant) {
        metaMap.set(meta.pollutant, meta);
        metaMap.set(meta.pollutant.toUpperCase(), meta);
      }
    });
  }

  // Index records by pollutant for base and comparison years
  const baseMap = new Map();
  baseItems.forEach((item) => {
    const pol = item.pollutant || item.dominant_pollutant;
    if (pol) {
      baseMap.set(pol, item);
      baseMap.set(pol.toUpperCase(), item);
    }
  });

  const compMap = new Map();
  comparisonItems.forEach((item) => {
    const pol = item.pollutant || item.dominant_pollutant;
    if (pol) {
      compMap.set(pol, item);
      compMap.set(pol.toUpperCase(), item);
    }
  });

  // Dynamically derive total dominant days directly from actual API records
  const totalBaseDays = baseItems.reduce((sum, item) => {
    const val = typeof item.days === "number" ? item.days : Number(item.days);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const hasComparisonData = comparisonItems.length > 0;
  const totalComparisonDays = comparisonItems.reduce((sum, item) => {
    const val = typeof item.days === "number" ? item.days : Number(item.days);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Distinct pollutants present in the backend response for this city
  const presentPollutantKeys = new Set();
  cityItems.forEach((item) => {
    const pol = item.pollutant || item.dominant_pollutant;
    if (pol) presentPollutantKeys.add(pol);
  });

  // Sort pollutants: primary dominant pollutant first (highest days in base year), then others
  const sortedPollutants = Array.from(presentPollutantKeys).sort((a, b) => {
    const itemA = baseMap.get(a) || compMap.get(a);
    const itemB = baseMap.get(b) || compMap.get(b);
    const daysA =
      itemA && typeof itemA.days === "number"
        ? itemA.days
        : Number(itemA?.days) || 0;
    const daysB =
      itemB && typeof itemB.days === "number"
        ? itemB.days
        : Number(itemB?.days) || 0;
    if (daysB !== daysA) return daysB - daysA;
    return a.localeCompare(b);
  });

  // Maximum days across all actual records for proportional bar scaling
  const allDaysList = [
    ...baseItems.map((i) =>
      typeof i.days === "number" ? i.days : Number(i.days) || 0
    ),
    ...comparisonItems.map((i) =>
      typeof i.days === "number" ? i.days : Number(i.days) || 0
    ),
  ];
  const maxDays = Math.max(...allDaysList, 1);

  return (
    <View style={styles.card}>
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>ANALYSIS • SCREEN 1</Text>
          <Text style={styles.title} accessibilityRole="header">
            Dominant Pollutant Days
          </Text>
        </View>
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>{city}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Days on which each pollutant dictated the daily Air Quality Index (AQI) as the primary contributor.
      </Text>

      {/* 2. Summary Grid */}
      <View style={styles.summaryGrid}>
        {/* Base Period Summary */}
        <View
          style={styles.summaryCard}
          accessible
          accessibilityLabel={`Base period ${baseYear}: ${
            totalBaseDays > 0
              ? `${totalBaseDays} dominant pollutant days evaluated`
              : "No data recorded"
          }`}
        >
          <View style={styles.summaryTagRow}>
            <View style={[styles.summaryIndicator, styles.baseIndicator]} />
            <Text style={styles.summaryLabel}>Base: {baseYear}</Text>
          </View>
          <Text style={styles.summaryValue}>
            {totalBaseDays > 0 ? `${totalBaseDays} days` : "No data recorded"}
          </Text>
          <Text style={styles.summaryCaption}>Evaluated dominant days</Text>
        </View>

        {/* Comparison Period Summary */}
        <View
          style={styles.summaryCard}
          accessible
          accessibilityLabel={`Comparison period ${comparisonYear}: ${
            hasComparisonData
              ? `${totalComparisonDays} dominant pollutant days evaluated`
              : "Insufficient AQI data recorded"
          }`}
        >
          <View style={styles.summaryTagRow}>
            <View style={[styles.summaryIndicator, styles.compIndicator]} />
            <Text style={styles.summaryLabel}>Comparison: {comparisonYear}</Text>
          </View>
          <Text style={styles.summaryValue}>
            {hasComparisonData ? `${totalComparisonDays} days` : "No data recorded"}
          </Text>
          <Text style={styles.summaryCaption}>
            {hasComparisonData ? "Evaluation period" : "Insufficient AQI data"}
          </Text>
        </View>
      </View>

      {/* 3. Data Quality Notice Banner */}
      {!hasComparisonData && (
        <View
          style={styles.noticeCard}
          accessible
          accessibilityLabel={`Data quality note: ${comparisonYear} dominant pollutant comparison is limited because sufficient AQI data is not available.`}
        >
          <View style={styles.noticeIconWrap}>
            <Text style={styles.noticeIconText}>ℹ</Text>
          </View>
          <Text style={styles.noticeText}>
            {comparisonYear} dominant pollutant comparison is limited because sufficient AQI data is not available.
          </Text>
        </View>
      )}

      {/* 4. Legend */}
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

      {/* 5. Dominant Pollutant Comparison List */}
      {sortedPollutants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No dominant pollutant records found for {city}.
          </Text>
        </View>
      ) : (
        <View style={styles.pollutantsList}>
          {sortedPollutants.map((pol) => {
            const baseItem = baseMap.get(pol);
            const compItem = compMap.get(pol);
            const apiMeta = metaMap.get(pol);
            const config = POLLUTANT_CONFIG[pol] || {};

            // Resolve display name strictly from API metadata or config
            const displayName =
              apiMeta?.display_name ||
              baseItem?.display_name ||
              config.name ||
              pol;

            const fullName = config.fullName || "";

            // Base day count
            const baseDays =
              baseItem && typeof baseItem.days === "number"
                ? baseItem.days
                : baseItem &&
                  baseItem.days != null &&
                  !isNaN(Number(baseItem.days))
                ? Number(baseItem.days)
                : null;

            // Comparison day count - NEVER convert missing to 0
            const compDays =
              compItem && typeof compItem.days === "number"
                ? compItem.days
                : compItem &&
                  compItem.days != null &&
                  !isNaN(Number(compItem.days))
                ? Number(compItem.days)
                : null;

            const hasComparison = compDays !== null;

            // Share of evaluated dominant-pollutant days in base year
            let sharePct = null;
            if (baseDays !== null && totalBaseDays > 0) {
              sharePct = Math.round((baseDays / totalBaseDays) * 1000) / 10;
            }

            // Proportional bar widths relative to maxDays across displayed pollutants
            const baseWidthPct =
              baseDays !== null && baseDays > 0
                ? Math.max(Math.round((baseDays / maxDays) * 100), 6)
                : 0;

            const compWidthPct =
              compDays !== null && compDays > 0
                ? Math.max(Math.round((compDays / maxDays) * 100), 6)
                : 0;

            const barColor = config.barColor || "#2563EB";

            // Screen reader summary strictly conforming to accessibility guidelines
            let a11ySummary = "";
            if (hasComparison) {
              a11ySummary = `${displayName} was dominant on ${baseDays} days in ${baseYear} and ${compDays} days in ${comparisonYear}.`;
            } else if (baseDays !== null) {
              a11ySummary = `${displayName} was the dominant pollutant on ${baseDays} days in ${baseYear}. No comparable ${comparisonYear} dominant-pollutant data is available.`;
            } else {
              a11ySummary = `No dominant pollutant data available for ${displayName}.`;
            }

            return (
              <View
                key={`dominant-${city}-${pol}`}
                style={styles.pollutantRow}
                accessible
                accessibilityLabel={a11ySummary}
              >
                {/* Pollutant Top Header: Badge, Full Name, and Share Tag */}
                <View style={styles.pollutantHeader}>
                  <View style={styles.nameGroup}>
                    <View style={styles.pollutantBadge}>
                      <Text style={styles.pollutantBadgeText}>{displayName}</Text>
                    </View>
                    {fullName ? (
                      <Text style={styles.fullNameText}>{fullName}</Text>
                    ) : null}
                  </View>

                  {/* Share of Evaluated Dominant Days in Base Year */}
                  {sharePct !== null ? (
                    <View style={styles.shareBadge}>
                      <Text style={styles.shareBadgeText}>
                        {sharePct}% of evaluated days
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Horizontal Paired Bars */}
                <View style={styles.barsContainer}>
                  {/* Base Year Row (FY2024-25) */}
                  <View style={styles.barLine}>
                    <View style={styles.barLabelColumn}>
                      <Text style={styles.periodTag}>{baseYear}</Text>
                    </View>

                    <View style={styles.track}>
                      {baseDays !== null && baseDays > 0 ? (
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${baseWidthPct}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      ) : null}
                    </View>

                    <View style={styles.barValueColumn}>
                      <Text style={styles.daysValueText}>
                        {baseDays !== null ? `${baseDays} days` : "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Comparison Year Row (FY2025-26) */}
                  <View style={styles.barLine}>
                    <View style={styles.barLabelColumn}>
                      <Text style={styles.periodTag}>{comparisonYear}</Text>
                    </View>

                    {hasComparison ? (
                      <>
                        <View style={styles.track}>
                          {compDays > 0 ? (
                            <View
                              style={[
                                styles.fill,
                                {
                                  width: `${compWidthPct}%`,
                                  backgroundColor: "#0D9488",
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <View style={styles.barValueColumn}>
                          <Text style={styles.daysValueText}>
                            {compDays} days
                          </Text>
                        </View>
                      </>
                    ) : (
                      /* Missing comparison data: NEVER show 0 or a bar */
                      <View style={styles.noDataTrack}>
                        <View style={styles.noDataPill}>
                          <Text style={styles.noDataDash}>—</Text>
                          <Text style={styles.noDataLabel}>No data</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
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
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#52606D",
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
    backgroundColor: "#1E3A8A",
  },
  compIndicator: {
    backgroundColor: "#0D9488",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  summaryCaption: {
    fontSize: 11,
    color: "#64748B",
  },

  // Data Quality Notice Banner
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  noticeIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#BAE6FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  noticeIconText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369A1",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: "#0369A1",
  },

  // Legend
  legendContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginBottom: 14,
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
    backgroundColor: "#1E3A8A",
  },
  compLegendDot: {
    backgroundColor: "#0D9488",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#627D98",
  },

  // Pollutants List
  pollutantsList: {
    gap: 14,
  },
  pollutantRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pollutantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  pollutantBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pollutantBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  fullNameText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    flexShrink: 1,
  },
  shareBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  shareBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },

  // Bars Section
  barsContainer: {
    gap: 8,
  },
  barLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabelColumn: {
    width: 78,
  },
  periodTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  track: {
    flex: 1,
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    height: "100%",
    borderRadius: 6,
  },
  barValueColumn: {
    width: 68,
    alignItems: "flex-end",
  },
  daysValueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Missing data styling
  noDataTrack: {
    flex: 1,
    height: 24,
    justifyContent: "center",
  },
  noDataPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    gap: 4,
  },
  noDataDash: {
    fontSize: 12,
    fontWeight: "700",
    color: "#486581",
  },
  noDataLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#486581",
  },

  // Empty state
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
});
