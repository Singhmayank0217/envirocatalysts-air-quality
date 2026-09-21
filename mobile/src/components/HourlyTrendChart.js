import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Consistent pollutant visual theme matching Screen 1 cards
const POLLUTANT_THEMES = {
  "PM2.5": {
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    color: "#1E3A8A", // Deep Navy
  },
  PM10: {
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    color: "#2563EB", // Royal Blue
  },
  NO2: {
    name: "NO₂",
    fullName: "Nitrogen Dioxide",
    color: "#D97706", // Amber
  },
  SO2: {
    name: "SO₂",
    fullName: "Sulphur Dioxide",
    color: "#059669", // Emerald
  },
  CO: {
    name: "CO",
    fullName: "Carbon Monoxide",
    color: "#DC2626", // Red / Coral
  },
  Ozone: {
    name: "Ozone (O₃)",
    fullName: "Ground-level Ozone",
    color: "#7C3AED", // Violet
  },
};

function parsePeriodStart(str) {
  if (!str) return 0;
  const normalized = str.includes("T") ? str : str.replace(" ", "T") + "Z";
  const t = Date.parse(normalized);
  if (!isNaN(t)) return t;
  return new Date(str).getTime() || 0;
}

function formatFullDate(dateStrOrTs) {
  if (!dateStrOrTs) return "";
  let d;
  if (typeof dateStrOrTs === "number") {
    d = new Date(dateStrOrTs);
  } else if (typeof dateStrOrTs === "string") {
    const norm = dateStrOrTs.includes("T") ? dateStrOrTs : dateStrOrTs.replace(" ", "T") + "Z";
    d = new Date(norm);
  } else {
    d = new Date(dateStrOrTs);
  }
  if (isNaN(d.getTime())) return String(dateStrOrTs);
  return `${FULL_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function getAccessibleUnit(unit, pollutant) {
  if (unit) {
    if (unit.includes("mg")) return "milligrams per cubic metre";
    if (unit.includes("µg") || unit.includes("ug")) return "micrograms per cubic metre";
  }
  if (pollutant === "CO") return "milligrams per cubic metre";
  return "micrograms per cubic metre";
}

function formatPeriodLabel(period) {
  if (period === "24H" || period === "24 Hours") return "24 Hours";
  if (period === "7D" || period === "7 Days") return "7 Days";
  if (period === "30D" || period === "30 Days") return "30 Days";
  return period;
}

export default function HourlyTrendChart({
  data,
  pollutant = "PM2.5",
  unit = "µg/m³",
  period = "24H",
  city = "Delhi",
  station = "",
  startDate = "",
  endDate = "",
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback(
    (event) => {
      const { width } = event.nativeEvent.layout;
      if (width > 0 && Math.abs(width - containerWidth) > 1) {
        setContainerWidth(width);
      }
    },
    [containerWidth]
  );

  // Resolved theme
  const theme = POLLUTANT_THEMES[pollutant] || {
    name: pollutant,
    fullName: pollutant,
    color: "#102A43",
  };
  const pollutantColor = theme.color;
  const resolvedUnit = unit || (pollutant === "CO" ? "mg/m³" : "µg/m³");

  // Chronologically sorted copy of data
  const sortedItems = useMemo(() => {
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return [...list]
      .map((item) => {
        const time = parsePeriodStart(item.period_start);
        const meanVal =
          item.mean !== null && item.mean !== undefined && !isNaN(Number(item.mean))
            ? Number(item.mean)
            : null;
        return {
          ...item,
          time,
          meanVal,
        };
      })
      .sort((a, b) => a.time - b.time);
  }, [data]);

  // Valid non-null items with valid timestamps
  const validItems = useMemo(() => {
    return sortedItems.filter(
      (item) => item.meanVal !== null && isFinite(item.meanVal) && item.time > 0
    );
  }, [sortedItems]);

  // Chart dimensions
  const chartWidth = containerWidth > 0 ? containerWidth : 320;
  const chartHeight = 210;
  const marginTop = 22;
  const marginBottom = 28;
  const marginLeft = 44;
  const marginRight = 16;
  const plotWidth = Math.max(10, chartWidth - marginLeft - marginRight);
  const plotHeight = Math.max(10, chartHeight - marginTop - marginBottom);

  // Y-axis bounds & gridline calculations
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (validItems.length === 0) {
      return { yMin: 0, yMax: 10, yTicks: [0, 3.3, 6.7, 10] };
    }
    const vals = validItems.map((item) => item.meanVal);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);

    let min = rawMin;
    let max = rawMax;

    if (rawMin === rawMax) {
      const pad = Math.abs(rawMin) * 0.2 || 1;
      min = Math.max(0, rawMin - pad);
      max = rawMax + pad;
    } else {
      const pad = (rawMax - rawMin) * 0.12;
      min = Math.max(0, rawMin - pad);
      max = rawMax + pad;
    }

    if (max <= min) max = min + 1;
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 100;

    // 4 horizontal gridlines: 0%, 33.3%, 66.7%, 100%
    const ticks = [
      min,
      min + (max - min) * (1 / 3),
      min + (max - min) * (2 / 3),
      max,
    ];

    return { yMin: min, yMax: max, yTicks: ticks };
  }, [validItems]);

  // X-axis time bounds & adaptive tick generation
  const { minTime, maxTime, timeSpan, xTicks } = useMemo(() => {
    if (validItems.length === 0) {
      const now = Date.now();
      return { minTime: now, maxTime: now + 3600000, timeSpan: 3600000, xTicks: [] };
    }

    let minT = validItems[0].time;
    let maxT = validItems[validItems.length - 1].time;

    // Anchor with startDate/endDate props if available
    if (startDate) {
      const sT = parsePeriodStart(startDate.includes(" ") ? startDate : `${startDate} 00:00:00`);
      if (sT > 0 && sT <= minT) minT = sT;
    }
    if (endDate) {
      const eT = parsePeriodStart(endDate.includes(" ") ? endDate : `${endDate} 23:00:00`);
      if (eT > 0 && eT >= maxT) maxT = eT;
    }

    if (maxT <= minT) {
      maxT = minT + 3600000 * 24;
    }

    const span = maxT - minT || 1;

    // Generate adaptive ticks
    const is24H = period === "24H" || period === "24 Hours" || span <= 28 * 3600 * 1000;
    const is7D =
      period === "7D" || period === "7 Days" || (span > 28 * 3600 * 1000 && span <= 9 * 86400 * 1000);

    const ticks = [];
    if (is24H) {
      // 24 Hours: 00:00, 06:00, 12:00, 18:00, 23:00
      const hours = [0, 6, 12, 18, 23];
      hours.forEach((h) => {
        const t = minT + h * 3600 * 1000;
        if (t <= maxT + 1800000) {
          ticks.push({ time: t, label: `${String(h).padStart(2, "0")}:00` });
        }
      });
    } else if (is7D) {
      // 7 Days: ~4 date labels (e.g. Day 0, Day 2, Day 4, Day 6)
      const dayIndices = [0, 2, 4, 6];
      dayIndices.forEach((d) => {
        const t = minT + d * 24 * 3600 * 1000;
        if (t <= maxT + 3600000 * 12) {
          const dt = new Date(t);
          const lbl = `${MONTH_NAMES[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, "0")}`;
          ticks.push({ time: t, label: lbl });
        }
      });
    } else {
      // 30 Days: ~5 spaced date labels (Day 0, Day 7, Day 14, Day 21, Day 29)
      const dayIndices = [0, 7, 14, 21, 29];
      dayIndices.forEach((d) => {
        const t = minT + d * 24 * 3600 * 1000;
        if (t <= maxT + 3600000 * 12) {
          const dt = new Date(t);
          const lbl = `${MONTH_NAMES[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, "0")}`;
          ticks.push({ time: t, label: lbl });
        }
      });
    }

    return { minTime: minT, maxTime: maxT, timeSpan: span, xTicks: ticks };
  }, [validItems, period, startDate, endDate]);

  // Coordinate projection functions
  const getX = useCallback(
    (t) => {
      const ratio = (t - minTime) / timeSpan;
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      return marginLeft + clampedRatio * plotWidth;
    },
    [minTime, timeSpan, marginLeft, plotWidth]
  );

  const getY = useCallback(
    (v) => {
      const ratio = (v - yMin) / (yMax - yMin);
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      return marginTop + plotHeight - clampedRatio * plotHeight;
    },
    [yMin, yMax, marginTop, plotHeight]
  );

  // SVG Path calculation with strict gap preservation (> 1.5 hours gap breaks the path)
  const { pathD, isolatedPoints, allPoints } = useMemo(() => {
    if (validItems.length === 0) {
      return { pathD: "", isolatedPoints: [], allPoints: [] };
    }

    let linePath = "";
    let lastTime = null;
    const isolated = [];
    const points = [];

    // Group valid items into continuous segments (gap threshold: > 1.5h = 5400000 ms)
    const segments = [];
    let currentSegment = [];

    validItems.forEach((item) => {
      const isGap = lastTime !== null && item.time - lastTime > 1.5 * 3600 * 1000;
      if (isGap) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }
        currentSegment = [item];
      } else {
        currentSegment.push(item);
      }
      lastTime = item.time;
    });

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    // Build SVG paths for each segment
    segments.forEach((seg) => {
      if (seg.length === 1) {
        // Isolated single observation (gap before and after)
        const pt = seg[0];
        const x = getX(pt.time);
        const y = getY(pt.meanVal);
        if (isFinite(x) && isFinite(y)) {
          isolated.push({ x, y, item: pt });
        }
      } else {
        seg.forEach((pt, idx) => {
          const x = getX(pt.time);
          const y = getY(pt.meanVal);
          if (isFinite(x) && isFinite(y)) {
            if (idx === 0) {
              linePath += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
            } else {
              linePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }
          }
        });
      }
    });

    // All points mapped for 24H dot display
    validItems.forEach((pt) => {
      const x = getX(pt.time);
      const y = getY(pt.meanVal);
      if (isFinite(x) && isFinite(y)) {
        points.push({ x, y, item: pt });
      }
    });

    return { pathD: linePath, isolatedPoints: isolated, allPoints: points };
  }, [validItems, getX, getY]);

  // Dynamic accessibility label for TalkBack / VoiceOver
  const a11ySummary = useMemo(() => {
    const cityStr = city || data?.filters?.city || "selected city";
    const stationStr = station || data?.filters?.station || "selected station";
    const startFull = formatFullDate(startDate || data?.filters?.start || minTime);
    const endFull = formatFullDate(endDate || data?.filters?.end || maxTime);
    const obsCount = validItems.length;

    if (obsCount === 0) {
      return `Hourly ${pollutant} trend for ${cityStr} station ${stationStr}. No valid hourly readings available.`;
    }

    const vals = validItems.map((d) => d.meanVal);
    const latestVal = vals[vals.length - 1];
    const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);

    const decimals = pollutant === "CO" ? 2 : 1;
    const unitA11y = getAccessibleUnit(resolvedUnit, pollutant);

    return `Hourly ${pollutant} trend for ${cityStr} station ${stationStr} from ${startFull} to ${endFull}. ${obsCount} hourly observations. Latest concentration ${latestVal.toFixed(
      decimals
    )} ${unitA11y}. Period average ${avgVal.toFixed(
      decimals
    )} ${unitA11y}. Minimum ${minVal.toFixed(decimals)} and maximum ${maxVal.toFixed(decimals)}.`;
  }, [
    validItems,
    city,
    station,
    startDate,
    endDate,
    pollutant,
    resolvedUnit,
    minTime,
    maxTime,
    data?.filters,
  ]);

  if (validItems.length === 0) {
    return null;
  }

  const is24H = period === "24H" || period === "24 Hours";

  return (
    <View
      style={styles.card}
      onLayout={onLayout}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={a11ySummary}
    >
      {/* Chart Header */}
      <View style={styles.chartHeaderRow} accessible={false} importantForAccessibility="no">
        <View style={styles.chartTitleWrap}>
          <Text style={styles.chartTitle}>Hourly Trend</Text>
          <Text style={styles.chartSubtitle}>
            Hourly mean concentration ({resolvedUnit})
          </Text>
        </View>
        <View style={[styles.pollutantBadge, { borderColor: pollutantColor + "40" }]}>
          <View style={[styles.colorDot, { backgroundColor: pollutantColor }]} />
          <Text style={[styles.pollutantBadgeText, { color: pollutantColor }]}>
            {pollutant}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.svgContainer} accessible={false} importantForAccessibility="no">
        <Svg width={chartWidth - 32} height={chartHeight}>
          {/* Y-Axis Unit Header */}
          <SvgText
            x={marginLeft}
            y={12}
            fill="#627D98"
            fontSize="10"
            fontWeight="700"
            textAnchor="start"
          >
            {resolvedUnit}
          </SvgText>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tickVal, idx) => {
            const yCoord = getY(tickVal);
            if (!isFinite(yCoord)) return null;

            const labelStr =
              pollutant === "CO"
                ? tickVal.toFixed(1)
                : Math.round(tickVal).toString();

            return (
              <G key={`y-grid-${idx}`}>
                <Line
                  x1={marginLeft}
                  y1={yCoord}
                  x2={marginLeft + plotWidth}
                  y2={yCoord}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <SvgText
                  x={marginLeft - 6}
                  y={yCoord + 3.5}
                  fill="#627D98"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="end"
                >
                  {labelStr}
                </SvgText>
              </G>
            );
          })}

          {/* Plot Outline Base Axis */}
          <Line
            x1={marginLeft}
            y1={marginTop + plotHeight}
            x2={marginLeft + plotWidth}
            y2={marginTop + plotHeight}
            stroke="#CBD2D9"
            strokeWidth="1"
          />

          {/* Trend Line (Hourly Mean) */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke={pollutantColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {/* Isolated Observations (Rendered as dots so gaps are clear and single points are visible) */}
          {isolatedPoints.map((pt, idx) => (
            <Circle
              key={`iso-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={pollutantColor}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          ))}

          {/* 24 Hours: Render small observation dots */}
          {is24H &&
            allPoints.map((pt, idx) => (
              <Circle
                key={`pt-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={3}
                fill={pollutantColor}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}

          {/* X-Axis Adaptive Labels */}
          {xTicks.map((tick, idx) => {
            const xCoord = getX(tick.time);
            if (!isFinite(xCoord)) return null;

            let anchor = "middle";
            if (idx === 0) anchor = "start";
            else if (idx === xTicks.length - 1) anchor = "end";

            return (
              <SvgText
                key={`x-tick-${idx}`}
                x={xCoord}
                y={marginTop + plotHeight + 18}
                fill="#627D98"
                fontSize="10"
                fontWeight="500"
                textAnchor={anchor}
              >
                {tick.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },

  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  chartTitleWrap: {
    flex: 1,
  },

  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102A43",
  },

  chartSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#627D98",
    marginTop: 2,
  },

  pollutantBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#F8FAFC",
  },

  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  pollutantBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
