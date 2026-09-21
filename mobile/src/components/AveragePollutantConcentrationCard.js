import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Standard environmental reporting order for pollutants
const POLLUTANT_DISPLAY_CONFIG = {
  "PM2.5": {
    order: 1,
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    unitA11y: "micrograms per cubic meter",
    barColor: "#1E3A8A", // Deep Navy
  },
  PM10: {
    order: 2,
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    unitA11y: "micrograms per cubic meter",
    barColor: "#2563EB", // Royal Blue
  },
  NO2: {
    order: 3,
    name: "NO₂",
    fullName: "Nitrogen Dioxide",
    unitA11y: "micrograms per cubic meter",
    barColor: "#D97706", // Amber
  },
  SO2: {
    order: 4,
    name: "SO₂",
    fullName: "Sulphur Dioxide",
    unitA11y: "micrograms per cubic meter",
    barColor: "#059669", // Emerald
  },
  CO: {
    order: 5,
    name: "CO",
    fullName: "Carbon Monoxide",
    unitA11y: "milligrams per cubic meter",
    barColor: "#DC2626", // Red / Coral
  },
  Ozone: {
    order: 6,
    name: "Ozone (O₃)",
    fullName: "Ground-level Ozone",
    unitA11y: "micrograms per cubic meter",
    barColor: "#7C3AED", // Violet
  },
};

export default function AveragePollutantConcentrationCard({
  averagePollutantConcentration = [],
  baseYear = "FY2024-25",
  comparisonYear = "FY2025-26",
  city = "Delhi",
  pollutantMetadata = [],
}) {
  const safeItems = Array.isArray(averagePollutantConcentration)
    ? averagePollutantConcentration
    : [];

  // Filter items matching the requested city (or all if not city-specific)
  const cityItems = safeItems.filter((item) => {
    const itemCity = item.city || item.requested_city;
    return !itemCity || !city || itemCity.toLowerCase() === city.toLowerCase();
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

  // Index records by financial year and pollutant
  const baseMap = new Map();
  const compMap = new Map();

  cityItems.forEach((item) => {
    const pol = item.pollutant || item.parameter_name;
    const year = item.financial_year;
    if (!pol || !year) return;

    if (year === baseYear) {
      baseMap.set(pol, item);
      baseMap.set(pol.toUpperCase(), item);
    } else if (year === comparisonYear) {
      compMap.set(pol, item);
      compMap.set(pol.toUpperCase(), item);
    }
  });

  // Gather distinct pollutants present in data
  const presentPollutantKeys = new Set();
  cityItems.forEach((item) => {
    const pol = item.pollutant || item.parameter_name;
    if (pol) presentPollutantKeys.add(pol);
  });

  // Fallback to metadata pollutants if cityItems is empty
  if (presentPollutantKeys.size === 0 && Array.isArray(pollutantMetadata)) {
    pollutantMetadata.forEach((m) => {
      if (m?.pollutant) presentPollutantKeys.add(m.pollutant);
    });
  }

  // Sort pollutants in standard order (PM2.5, PM10, NO2, SO2, CO, Ozone, then others)
  const sortedPollutants = Array.from(presentPollutantKeys).sort((a, b) => {
    const orderA = POLLUTANT_DISPLAY_CONFIG[a]?.order ?? 99;
    const orderB = POLLUTANT_DISPLAY_CONFIG[b]?.order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  // Count how many pollutants have comparison records
  const pollutantsWithComparison = sortedPollutants.filter((pol) => {
    const item = compMap.get(pol);
    return item && item.average_concentration != null;
  });

  return (
    <View style={styles.card}>
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>ANALYSIS • SCREEN 1</Text>
          <Text style={styles.title} accessibilityRole="header">
            Average Pollutant Concentration
          </Text>
        </View>
        <View style={styles.cityBadge}>
          <Text style={styles.cityBadgeText}>{city}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Annual mean pollutant concentration compared between benchmark ({baseYear}) and evaluation ({comparisonYear}) periods.
      </Text>

      {/* 2. Coverage Notice Banner */}
      <View
        style={styles.noticeCard}
        accessible
        accessibilityLabel={`Data availability note: ${comparisonYear} comparison is currently available for pollutants with sufficient source data (${pollutantsWithComparison.join(
          ", "
        ) || "PM2.5 and PM10"}). Other pollutants reflect ${baseYear} benchmark coverage.`}
      >
        <View style={styles.noticeIconWrap}>
          <Text style={styles.noticeIconText}>ℹ</Text>
        </View>
        <Text style={styles.noticeText}>
          {comparisonYear} comparison is currently available for pollutants with sufficient source data (
          <Text style={styles.noticeTextBold}>
            {pollutantsWithComparison.join(", ") || "PM2.5, PM10"}
          </Text>
          ). Other pollutants show {baseYear} benchmark values.
        </Text>
      </View>

      {/* 3. Legend */}
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

      {/* 4. Pollutant Comparison List */}
      <View style={styles.pollutantsList}>
        {sortedPollutants.map((pol) => {
          const baseItem = baseMap.get(pol);
          const compItem = compMap.get(pol);
          const apiMeta = metaMap.get(pol);
          const config = POLLUTANT_DISPLAY_CONFIG[pol] || {};

          // Resolve display name strictly from API or standard config
          const displayName =
            baseItem?.display_name ||
            apiMeta?.display_name ||
            config.name ||
            pol;

          // Resolve unit strictly from API (item.unit -> apiMeta.unit -> config fallback)
          const unit =
            baseItem?.unit ||
            compItem?.unit ||
            apiMeta?.unit ||
            (pol === "CO" ? "mg/m³" : "µg/m³");

          const unitA11y =
            config.unitA11y ||
            (unit === "mg/m³"
              ? "milligrams per cubic meter"
              : "micrograms per cubic meter");

          // Extract Base Values
          const baseVal =
            baseItem && typeof baseItem.average_concentration === "number"
              ? baseItem.average_concentration
              : baseItem &&
                baseItem.average_concentration != null &&
                !isNaN(Number(baseItem.average_concentration))
              ? Number(baseItem.average_concentration)
              : null;

          const baseDays =
            baseItem && typeof baseItem.days_available === "number"
              ? baseItem.days_available
              : baseItem &&
                baseItem.days_available != null &&
                !isNaN(Number(baseItem.days_available))
              ? Number(baseItem.days_available)
              : null;

          // Extract Comparison Values — NEVER convert missing into 0
          const compVal =
            compItem && typeof compItem.average_concentration === "number"
              ? compItem.average_concentration
              : compItem &&
                compItem.average_concentration != null &&
                !isNaN(Number(compItem.average_concentration))
              ? Number(compItem.average_concentration)
              : null;

          const compDays =
            compItem && typeof compItem.days_available === "number"
              ? compItem.days_available
              : compItem &&
                compItem.days_available != null &&
                !isNaN(Number(compItem.days_available))
              ? Number(compItem.days_available)
              : null;

          const hasComparison = compVal !== null;

          // Calculate proportional bar scaling relative to the max of base & comp for this pollutant
          const maxVal = Math.max(
            baseVal !== null ? baseVal : 0,
            compVal !== null ? compVal : 0,
            0.001
          );

          const baseWidthPct =
            baseVal !== null && baseVal > 0
              ? Math.max(Math.round((baseVal / maxVal) * 100), 10)
              : 0;

          const compWidthPct =
            compVal !== null && compVal > 0
              ? Math.max(Math.round((compVal / maxVal) * 100), 10)
              : 0;

          // Calculate delta if both exist
          let deltaPct = null;
          if (baseVal !== null && compVal !== null && baseVal > 0) {
            deltaPct = Math.round(((compVal - baseVal) / baseVal) * 1000) / 10;
          }

          // Construct screen reader summary strictly conforming to accessibility guidelines
          const baseText =
            baseVal !== null
              ? `${baseVal} ${unitA11y}${
                  baseDays !== null ? ` over ${baseDays} available days` : ""
                } in ${baseYear}`
              : `no data in ${baseYear}`;

          const compText =
            compVal !== null
              ? `${compVal} ${unitA11y}${
                  compDays !== null ? ` over ${compDays} available days` : ""
                } in ${comparisonYear}`
              : `no ${comparisonYear} comparison data available`;

          const a11ySummary = `${displayName} average concentration: ${baseText}; ${compText}.`;

          const barColor = config.barColor || "#2563EB";

          return (
            <View
              key={`pollutant-comparison-${pol}`}
              style={styles.pollutantRow}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={a11ySummary}
            >
              {/* Pollutant Card Top Row: Name, Unit, and Change Tag */}
              <View style={styles.pollutantHeader}>
                <View style={styles.nameGroup}>
                  <View style={styles.pollutantBadge}>
                    <Text style={styles.pollutantBadgeText}>{displayName}</Text>
                  </View>
                  <View style={styles.unitChip}>
                    <Text style={styles.unitChipText}>{unit}</Text>
                  </View>
                </View>

                {/* Delta / Status Pill */}
                {hasComparison && deltaPct !== null ? (
                  <View
                    style={[
                      styles.deltaBadge,
                      deltaPct <= 0 ? styles.deltaReduction : styles.deltaIncrease,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaText,
                        deltaPct <= 0 ? styles.deltaTextReduction : styles.deltaTextIncrease,
                      ]}
                    >
                      {deltaPct <= 0 ? `↓ ${Math.abs(deltaPct)}%` : `↑ +${deltaPct}%`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.benchmarkOnlyBadge}>
                    <Text style={styles.benchmarkOnlyText}>Benchmark only</Text>
                  </View>
                )}
              </View>

              {/* Comparison Bars Section */}
              <View style={styles.barsContainer}>
                {/* 1. Base Year Bar (FY2024-25) */}
                <View style={styles.barLine}>
                  <View style={styles.barLabelColumn}>
                    <Text style={styles.periodTag}>{baseYear}</Text>
                    {baseDays !== null ? (
                      <Text style={styles.daysTag}>{baseDays} d</Text>
                    ) : null}
                  </View>

                  <View style={styles.track}>
                    {baseVal !== null && baseVal > 0 ? (
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${baseWidthPct}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    ) : (
                      <View style={styles.emptyFill} />
                    )}
                  </View>

                  <View style={styles.valueColumn}>
                    <Text style={styles.numericValue}>
                      {baseVal !== null ? `${baseVal}` : "—"}
                    </Text>
                    <Text style={styles.valueUnit}>{unit}</Text>
                  </View>
                </View>

                {/* 2. Comparison Year Bar (FY2025-26) */}
                <View style={styles.barLine}>
                  <View style={styles.barLabelColumn}>
                    <Text style={[styles.periodTag, styles.compPeriodTag]}>
                      {comparisonYear}
                    </Text>
                    {compDays !== null ? (
                      <Text style={styles.daysTag}>{compDays} d</Text>
                    ) : null}
                  </View>

                  {hasComparison ? (
                    <View style={styles.track}>
                      {compVal !== null && compVal > 0 ? (
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${compWidthPct}%`,
                              backgroundColor: "#0D9488", // Modern Teal
                            },
                          ]}
                        />
                      ) : (
                        <View style={styles.emptyFill} />
                      )}
                    </View>
                  ) : (
                    /* Styled empty state when comparison record is missing — NO ZERO-FILL BAR */
                    <View style={styles.noDataTrack}>
                      <Text style={styles.noDataTrackText}>— No data available</Text>
                    </View>
                  )}

                  <View style={styles.valueColumn}>
                    <Text
                      style={[
                        styles.numericValue,
                        !hasComparison ? styles.missingValueText : null,
                      ]}
                    >
                      {hasComparison ? `${compVal}` : "—"}
                    </Text>
                    {hasComparison ? (
                      <Text style={styles.valueUnit}>{unit}</Text>
                    ) : (
                      <Text style={styles.missingLabelText}>No data</Text>
                    )}
                  </View>
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

  // Notice Card
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
  noticeTextBold: {
    fontWeight: "700",
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
  unitChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  unitChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  deltaReduction: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  deltaIncrease: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "700",
  },
  deltaTextReduction: {
    color: "#15803D",
  },
  deltaTextIncrease: {
    color: "#B91C1C",
  },
  benchmarkOnlyBadge: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  benchmarkOnlyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // Bars Container
  barsContainer: {
    gap: 8,
  },
  barLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  barLabelColumn: {
    width: 68,
    marginRight: 8,
  },
  periodTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  compPeriodTag: {
    color: "#0D9488",
  },
  daysTag: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 1,
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
  emptyFill: {
    width: 0,
    height: "100%",
  },
  noDataTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  noDataTrackText: {
    fontSize: 10,
    color: "#94A3B8",
    fontStyle: "italic",
    fontWeight: "500",
  },
  valueColumn: {
    width: 74,
    alignItems: "flex-end",
    marginLeft: 10,
  },
  numericValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102A43",
  },
  valueUnit: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  missingValueText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  missingLabelText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#94A3B8",
    fontStyle: "italic",
  },
});
