import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FilterChip from "./FilterChip";

export default function PollutantSelector({
  availablePollutants = [],
  selectedPollutant = "PM2.5",
  onSelectPollutant,
  pollutantMetadata = [],
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Select Pollutant
        </Text>
        <Text style={styles.activeText}>
          Viewing: <Text style={styles.activePollutant}>{selectedPollutant || "None"}</Text>
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
        accessibilityLabel="Available pollutants filter"
      >
        {availablePollutants.map((pollutant) => {
          const isSelected = pollutant === selectedPollutant;
          const meta = pollutantMetadata?.find((p) => p.pollutant === pollutant);
          const badge = meta?.unit || null;

          return (
            <FilterChip
              key={pollutant}
              label={pollutant}
              badge={badge}
              selected={isSelected}
              onPress={() => onSelectPollutant(pollutant)}
              accessibilityLabel={`Select pollutant ${pollutant}${badge ? ` in ${badge}` : ""}, currently ${isSelected ? "selected" : "not selected"}`}
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
  activePollutant: {
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
