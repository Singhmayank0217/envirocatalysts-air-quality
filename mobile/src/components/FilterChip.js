import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function FilterChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  badge = null,
  subtext = null,
  accessibilityLabel,
  accessibilityHint,
  style,
}) {
  const computedAccessibilityLabel =
    accessibilityLabel ||
    `${label}${badge ? ` (${badge})` : ""}, ${selected ? "selected" : "not selected"}${disabled ? ", disabled" : ""}`;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={computedAccessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
        pressed && !disabled && styles.chipPressed,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <Text
          style={[
            styles.label,
            selected && styles.labelSelected,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>

        {badge ? (
          <View
            style={[
              styles.badge,
              selected ? styles.badgeSelected : styles.badgeDefault,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selected ? styles.badgeTextSelected : styles.badgeTextDefault,
              ]}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      {subtext ? (
        <Text
          style={[
            styles.subtext,
            selected && styles.subtextSelected,
            disabled && styles.subtextDisabled,
          ]}
        >
          {subtext}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D9E2EC",
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
  },
  chipDisabled: {
    backgroundColor: "#F0F4F8",
    borderColor: "#E2E8F0",
    opacity: 0.75,
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334E68",
  },
  labelSelected: {
    color: "#FFFFFF",
  },
  labelDisabled: {
    color: "#829AB1",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeDefault: {
    backgroundColor: "#E2E8F0",
  },
  badgeSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeTextDefault: {
    color: "#627D98",
  },
  badgeTextSelected: {
    color: "#FFFFFF",
  },
  subtext: {
    marginTop: 2,
    fontSize: 11,
    color: "#829AB1",
  },
  subtextSelected: {
    color: "#BCCCDC",
  },
  subtextDisabled: {
    color: "#9FB3C8",
  },
});
