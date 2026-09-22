import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getPublicLatest } from "../services/api";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatTimestamp(isoString) {
  if (!isoString) return "Unknown";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch (e) {
    return isoString;
  }
}

function formatTimeOnly(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return "";
  }
}

/**
 * Formats ISO timestamps into a compact human-readable UTC interval.
 * Same day: "22 Sep 2026, 06:30–07:30 UTC"
 * Different days: "22 Sep 2026, 23:30 UTC → 23 Sep 2026, 00:30 UTC"
 */
function formatMeasurementInterval(startIso, endIso) {
  if (!startIso || !endIso) return null;
  try {
    const dStart = new Date(startIso);
    const dEnd = new Date(endIso);
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      return `${startIso} → ${endIso}`;
    }

    const sYear = dStart.getUTCFullYear();
    const sMonth = MONTH_NAMES[dStart.getUTCMonth()];
    const sDay = dStart.getUTCDate();
    const sHour = pad2(dStart.getUTCHours());
    const sMin = pad2(dStart.getUTCMinutes());

    const eYear = dEnd.getUTCFullYear();
    const eMonth = MONTH_NAMES[dEnd.getUTCMonth()];
    const eDay = dEnd.getUTCDate();
    const eHour = pad2(dEnd.getUTCHours());
    const eMin = pad2(dEnd.getUTCMinutes());

    if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
      return `${sDay} ${sMonth} ${sYear}, ${sHour}:${sMin}–${eHour}:${eMin} UTC`;
    }

    return `${sDay} ${sMonth} ${sYear}, ${sHour}:${sMin} UTC → ${eDay} ${eMonth} ${eYear}, ${eHour}:${eMin} UTC`;
  } catch (e) {
    return `${startIso} → ${endIso}`;
  }
}

/**
 * Creates a human-readable TalkBack accessibility string for measurement interval.
 */
function formatMeasurementIntervalA11y(startIso, endIso) {
  if (!startIso || !endIso) return "";
  try {
    const dStart = new Date(startIso);
    const dEnd = new Date(endIso);
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return "";

    const sDay = dStart.getUTCDate();
    const sMonth = FULL_MONTH_NAMES[dStart.getUTCMonth()];
    const sYear = dStart.getUTCFullYear();
    const sHour = pad2(dStart.getUTCHours());
    const sMin = pad2(dStart.getUTCMinutes());

    const eDay = dEnd.getUTCDate();
    const eMonth = FULL_MONTH_NAMES[dEnd.getUTCMonth()];
    const eYear = dEnd.getUTCFullYear();
    const eHour = pad2(dEnd.getUTCHours());
    const eMin = pad2(dEnd.getUTCMinutes());

    if (sYear === eYear && sMonth === eMonth && sDay === eDay) {
      return `${sDay} ${sMonth} ${sYear}, from ${sHour}:${sMin} to ${eHour}:${eMin} UTC`;
    }

    return `from ${sDay} ${sMonth} ${sYear}, ${sHour}:${sMin} UTC to ${eDay} ${eMonth} ${eYear}, ${eHour}:${eMin} UTC`;
  } catch (e) {
    return "";
  }
}

export default function PublicDataCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const resp = await getPublicLatest();
      setData(resp);
    } catch (err) {
      console.error("PublicDataCard fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // 1. Loading State
  if (loading) {
    return (
      <View
        style={styles.card}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="Loading fresh public air quality data from OpenAQ"
      >
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EXTERNAL PUBLIC API</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Fresh Public Air Quality Data
        </Text>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading public observation...</Text>
        </View>
      </View>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <View
        style={styles.card}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel="Fresh public data unavailable"
      >
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EXTERNAL PUBLIC API</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Fresh Public Air Quality Data
        </Text>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Fresh public data unavailable.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={loadData}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching fresh public air quality data"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const latest = data?.latest;

  // 3. Empty State (Never show 0 as fallback for missing data)
  if (!latest || latest.value === null || latest.value === undefined) {
    return (
      <View
        style={styles.card}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="No public air quality observation available"
      >
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EXTERNAL PUBLIC API</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Fresh Public Air Quality Data
        </Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No public observation available.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={loadData}
            accessibilityRole="button"
            accessibilityLabel="Refresh public air quality data"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.retryButtonText}>Check Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 4. Loaded State
  const timeFormatted = formatTimeOnly(latest.period_end);
  const intervalDisplay = formatMeasurementInterval(
    latest.period_start,
    latest.period_end
  );
  const intervalA11y = formatMeasurementIntervalA11y(
    latest.period_start,
    latest.period_end
  );

  const accessibleDescription = `Fresh public air quality data from OpenAQ. ${
    data.location || "New Delhi"
  } ${data.parameter || "PM2.5"} latest observation is ${
    latest.value
  } micrograms per cubic metre${
    timeFormatted ? ` at ${timeFormatted}` : ""
  }.${intervalA11y ? ` Measurement interval ${intervalA11y}.` : ""}`;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibleDescription}
    >
      {/* Top Header & Badges */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EXTERNAL PUBLIC API</Text>
        </View>
        <View style={styles.sourceTag}>
          <Text style={styles.sourceTagText}>Source: OpenAQ</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} accessibilityRole="header">
        Fresh Public Air Quality Data
      </Text>
      <Text style={styles.cardSubtitle}>
        Sanctioned OpenAQ API v3 ingestion feed for New Delhi
      </Text>

      {/* Main Metric Showcase */}
      <View style={styles.metricContainer}>
        <View style={styles.metricLeft}>
          <Text style={styles.metricEyebrow}>Latest public observation</Text>
          <View style={styles.valueRow}>
            <Text style={styles.metricValue}>{latest.value}</Text>
            <Text style={styles.metricUnit}>{latest.unit || "µg/m³"}</Text>
          </View>
          <View style={styles.pollutantPill}>
            <Text style={styles.pollutantPillText}>
              Pollutant: {data.parameter || "PM2.5"}
            </Text>
          </View>
        </View>

        <View style={styles.metricRight}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Source:</Text>
            <Text style={styles.metaValue}>{data.source || "OpenAQ"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Location:</Text>
            <Text style={styles.metaValue}>{data.location || "New Delhi"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Observed:</Text>
            <Text style={styles.metaValue}>
              {formatTimestamp(latest.period_end)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ingested:</Text>
            <Text style={styles.metaValue}>
              {formatTimestamp(data.ingested_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* Observation Time Interval (Responsive Two-Line Layout) */}
      {intervalDisplay ? (
        <View
          style={styles.intervalBox}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Measurement interval: ${intervalA11y || intervalDisplay}`}
        >
          <Text style={styles.intervalLabel}>Measurement interval (UTC)</Text>
          <Text style={styles.intervalValue}>{intervalDisplay}</Text>
        </View>
      ) : null}

      {/* Footer / Attribution & Isolation Notice */}
      <View style={styles.footerContainer}>
        <Text style={styles.attributionText}>
          Source: OpenAQ API v3 • Location ID: 8118
        </Text>
        <Text style={styles.disclaimerText}>
          Independent point observation from an external monitoring station.
          Not used to calculate FY AQI metrics and does not represent Delhi-wide air quality.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  sourceTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 1,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 14,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  metricContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLeft: {
    flex: 1,
    paddingRight: 8,
  },
  metricEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: -1,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 6,
  },
  pollutantPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  pollutantPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3730A3",
  },
  metricRight: {
    flex: 1.2,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginVertical: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    flexShrink: 1,
  },
  metaValue: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
    flexWrap: "wrap",
    marginLeft: 6,
    maxWidth: "70%",
  },
  intervalBox: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    flexDirection: "column",
    alignItems: "flex-start",
    flexShrink: 1,
  },
  intervalLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 3,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  intervalValue: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 16,
  },
  footerContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  attributionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  disclaimerText: {
    fontSize: 10,
    color: "#486581",
    lineHeight: 14,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    fontWeight: "500",
  },
  errorBox: {
    paddingVertical: 18,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 10,
  },
  emptyBox: {
    paddingVertical: 18,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
