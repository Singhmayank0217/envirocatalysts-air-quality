import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { INDIA_LAND_PATH, projectCoordinate } from "./indiaMapData";

// CPCB AQI Category color palette consistent with Screen 1
const AQI_COLORS = {
  Good: {
    main: "#15803D",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  Satisfactory: {
    main: "#0369A1",
    bg: "#E0F2FE",
    border: "#BAE6FD",
  },
  Moderate: {
    main: "#B45309",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  Poor: {
    main: "#C2410C",
    bg: "#FFEDD5",
    border: "#FED7AA",
  },
  "Very Poor": {
    main: "#B91C1C",
    bg: "#FEE2E2",
    border: "#FECACA",
  },
  Severe: {
    main: "#6B21A8",
    bg: "#F3E8FF",
    border: "#E9D5FF",
  },
  Unavailable: {
    main: "#64748B",
    bg: "#F1F5F9",
    border: "#CBD5E1",
  },
};

// Strategic label layout configurations to prevent collisions and maximize phone readability
const CITY_LABEL_CONFIG = {
  Delhi: { align: "right", bw: 210, bh: 114, dx: 24, dy: 0 },
  Ahmedabad: { align: "left", bw: 225, bh: 114, dx: -24, dy: 0 },
  Kolkata: { align: "right", bw: 210, bh: 114, dx: 24, dy: 0 },
  Mumbai: { align: "left", bw: 210, bh: 114, dx: -24, dy: 0 },
  Pune: { align: "right", bw: 175, bh: 114, dx: 22, dy: -20 },
  Hyderabad: { align: "right", bw: 220, bh: 114, dx: 24, dy: 10 },
  Bengaluru: { align: "left", bw: 220, bh: 114, dx: -24, dy: 0 },
  Chennai: { align: "right", bw: 210, bh: 114, dx: 24, dy: 0 },
};

const DEFAULT_LABEL_CONFIG = {
  align: "right",
  bw: 210,
  bh: 114,
  dx: 24,
  dy: 0,
};

export default function CityMap({
  cities = [],
  selectedCity = "Delhi",
  onSelectCity = () => {},
  baseYear = "FY2024-25",
}) {
  // Project all cities with coordinates
  const projectedCities = cities
    .map((c) => {
      const coords = projectCoordinate(c.latitude, c.longitude);
      if (!coords) return null;

      const isSelected =
        Boolean(selectedCity) &&
        Boolean(c.city) &&
        c.city.toLowerCase() === selectedCity.toLowerCase();

      const aqiValue = c.base?.value ?? null;
      const category = c.base?.category || "Unavailable";
      const colors = AQI_COLORS[category] || AQI_COLORS.Unavailable;
      const config = CITY_LABEL_CONFIG[c.city] || DEFAULT_LABEL_CONFIG;

      const isLeft = config.align === "left";
      const bx = isLeft ? coords.x + config.dx - config.bw : coords.x + config.dx;
      const by = coords.y - config.bh / 2 + config.dy;

      return {
        ...c,
        x: coords.x,
        y: coords.y,
        leftPercent: (coords.x / 1500) * 100,
        topPercent: (coords.y / 1615) * 100,
        isSelected,
        aqiValue,
        category,
        colors,
        align: config.align,
        bw: config.bw,
        bh: config.bh,
        bx,
        by,
      };
    })
    .filter(Boolean);

  // Split into unselected and selected so selected marker renders on top
  const unselectedMarkers = projectedCities.filter((c) => !c.isSelected);
  const selectedMarkers = projectedCities.filter((c) => c.isSelected);

  // Dynamic accessible description summarizing all 8 cities
  const mapAccessibleLabel = [
    `Interactive city air quality map of India for ${baseYear}.`,
    `Displaying ${projectedCities.length} cities with geographic coordinates.`,
    projectedCities
      .map(
        (c) =>
          `${c.city}: AQI ${c.aqiValue !== null ? c.aqiValue : "unavailable"}, ${c.category}.`
      )
      .join(" "),
    `Selected city is ${selectedCity}. Tap any marker to select.`,
  ].join(" ");

  const renderMarkerSvg = (c) => {
    const aqiText = c.aqiValue !== null ? `AQI ${c.aqiValue}` : "AQI N/A";

    if (c.isSelected) {
      return (
        <G key={`svg-${c.city}`} onPress={() => onSelectCity(c.city)}>
          {/* Selection Halo Ring */}
          <Circle
            cx={c.x}
            cy={c.y}
            r={30}
            fill="#3B82F6"
            fillOpacity={0.25}
            stroke="#1E40AF"
            strokeWidth={3.5}
          />

          {/* White Border Ring */}
          <Circle
            cx={c.x}
            cy={c.y}
            r={20}
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth={2.5}
          />

          {/* AQI Category Fill */}
          <Circle cx={c.x} cy={c.y} r={15} fill={c.colors.main} />

          {/* Inner Core Dot */}
          <Circle cx={c.x} cy={c.y} r={6} fill="#FFFFFF" />

          {/* Selected City Name Badge Background (Stronger outline & larger emphasis) */}
          <Rect
            x={c.bx}
            y={c.by}
            width={c.bw}
            height={c.bh}
            rx={12}
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth={2.5}
          />

          {/* Line 1: Selected City Name Text (Strongest text with star indicator) */}
          <SvgText
            x={c.bx + 16}
            y={c.by + 36}
            textAnchor="start"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={40}
            fontWeight="900"
            fill="#0F172A"
          >
            {c.city} ★
          </SvgText>

          {/* Line 2: AQI Value Subtext */}
          <SvgText
            x={c.bx + 16}
            y={c.by + 70}
            textAnchor="start"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={31}
            fontWeight="800"
            fill="#1E293B"
          >
            {aqiText}
          </SvgText>

          {/* Line 3: Category Subtext */}
          <SvgText
            x={c.bx + 16}
            y={c.by + 100}
            textAnchor="start"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize={25}
            fontWeight="800"
            fill={c.colors.main}
          >
            {c.category}
          </SvgText>
        </G>
      );
    }

    // Unselected Marker: Highly readable badge with dark navy text on semi-opaque white
    return (
      <G key={`svg-${c.city}`} onPress={() => onSelectCity(c.city)}>
        {/* Outer White Glow */}
        <Circle
          cx={c.x}
          cy={c.y}
          r={17}
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth={2}
        />

        {/* Category Color Circle */}
        <Circle cx={c.x} cy={c.y} r={13} fill={c.colors.main} />

        {/* Inner Core */}
        <Circle cx={c.x} cy={c.y} r={5} fill="#FFFFFF" />

        {/* Readable Light/White Semi-Opaque Rounded Badge Background with subtle border */}
        <Rect
          x={c.bx}
          y={c.by}
          width={c.bw}
          height={c.bh}
          rx={10}
          fill="#FFFFFF"
          fillOpacity={0.93}
          stroke="#CBD5E1"
          strokeWidth={1.5}
        />

        {/* Line 1: Readable City Name in Dark Navy (Strongest text ~12-13px on mobile) */}
        <SvgText
          x={c.bx + 16}
          y={c.by + 36}
          textAnchor="start"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={40}
          fontWeight="800"
          fill="#0F172A"
        >
          {c.city}
        </SvgText>

        {/* Line 2: AQI Value in slightly smaller readable size */}
        <SvgText
          x={c.bx + 16}
          y={c.by + 70}
          textAnchor="start"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={31}
          fontWeight="700"
          fill="#334155"
        >
          {aqiText}
        </SvgText>

        {/* Line 3: Category text fitting cleanly */}
        <SvgText
          x={c.bx + 16}
          y={c.by + 100}
          textAnchor="start"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={25}
          fontWeight="700"
          fill={c.colors.main}
        >
          {c.category}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map SVG Canvas & Touch Layer */}
      <View
        style={styles.svgWrapper}
        accessible={true}
        accessibilityLabel={mapAccessibleLabel}
      >
        <Svg
          viewBox="0 0 1500 1615"
          style={styles.svg}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle ocean/background fill */}
          <Rect width="1500" height="1615" fill="#F8FAFC" rx={16} />

          {/* India geographic boundary */}
          <Path
            d={INDIA_LAND_PATH}
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {/* Unselected City Markers */}
          {unselectedMarkers.map(renderMarkerSvg)}

          {/* Selected City Marker (Drawn last for top visual layer) */}
          {selectedMarkers.map(renderMarkerSvg)}
        </Svg>

        {/* Native Touch & Accessibility Overlay (48x48dp target) */}
        {projectedCities.map((c) => {
          const markerA11yLabel = `${c.city}. AQI ${
            c.aqiValue !== null ? c.aqiValue : "unavailable"
          }. ${c.category}. Double tap to select.`;

          return (
            <Pressable
              key={`touch-${c.city}`}
              style={[
                styles.markerTouchTarget,
                {
                  left: `${c.leftPercent}%`,
                  top: `${c.topPercent}%`,
                },
              ]}
              onPress={() => onSelectCity(c.city)}
              accessibilityRole="button"
              accessibilityLabel={markerA11yLabel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
          );
        })}
      </View>

      {/* Map Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>AQI CATEGORY ({baseYear})</Text>
        <View style={styles.legendItemsRow}>
          {Object.entries(AQI_COLORS)
            .filter(([key]) => key !== "Unavailable")
            .map(([category, colors]) => (
              <View key={category} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorDot,
                    { backgroundColor: colors.main },
                  ]}
                />
                <Text style={styles.legendLabel}>{category}</Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  svgWrapper: {
    width: "100%",
    aspectRatio: 1500 / 1615,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  svg: {
    width: "100%",
    height: "100%",
  },
  markerTouchTarget: {
    position: "absolute",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  legendContainer: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#64748B",
    marginBottom: 8,
    textAlign: "center",
  },
  legendItemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
});
