import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FilterChip from "./FilterChip";

export default function StateSelector({
  states = [],
  selectedState = "All States",
  onSelectState,
  loading = false,
  error = "",
  onRetry,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Select State
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>AUTHORITATIVE METADATA</Text>
          </View>
          {loading ? (
            <View style={styles.updatingBadge}>
              <Text style={styles.updatingText}>Updating...</Text>
            </View>
          ) : (
            <Text style={styles.activeText}>
              Viewing: <Text style={styles.activeState}>{selectedState}</Text>
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.subtitle}>
        Filter air quality data by administrative state boundary.
      </Text>

      {error ? (
        <View
          style={styles.errorBox}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`State filter error: ${error}`}
        >
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <Pressable
              style={styles.retryButton}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading states"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
          accessibilityRole="tablist"
          accessibilityLabel="Available states filter"
        >
          {states.map((st) => {
            const isSelected = st === selectedState;

            return (
              <FilterChip
                key={st}
                label={st}
                selected={isSelected}
                onPress={() => onSelectState && onSelectState(st)}
                accessibilityLabel={`Select state ${st}, currently ${
                  isSelected ? "selected" : "not selected"
                }`}
                style={styles.chipSpacing}
              />
            );
          })}
        </ScrollView>
      )}
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  activeText: {
    fontSize: 13,
    color: "#627D98",
  },
  activeState: {
    fontWeight: "700",
    color: "#102A43",
  },
  updatingBadge: {
    backgroundColor: "#FEFCBF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FAF089",
  },
  updatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#975A16",
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
  errorBox: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#991B1B",
    flex: 1,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: "#DC2626",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
