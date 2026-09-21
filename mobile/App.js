import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const Stack = createNativeStackNavigator();

function OverviewScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <Text style={styles.eyebrow}>ENVIROCATALYSTS</Text>

        <Text style={styles.title}>
          Air Quality{"\n"}Overview
        </Text>

        <Text style={styles.subtitle}>
          Compare air quality across cities and financial years.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Year</Text>

          <View style={styles.yearRow}>
            <View style={styles.yearBox}>
              <Text style={styles.yearLabel}>BASE</Text>
              <Text style={styles.yearValue}>FY2024-25</Text>
            </View>

            <View style={styles.yearBox}>
              <Text style={styles.yearLabel}>COMPARE</Text>
              <Text style={styles.yearValue}>FY2025-26</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Coming next</Text>

        <Text style={styles.feature}>
          • AQI category days by city
        </Text>

        <Text style={styles.feature}>
          • Average pollutant concentration
        </Text>

        <Text style={styles.feature}>
          • Dominant pollutant analysis
        </Text>

        <Text style={styles.feature}>
          • City-level comparison
        </Text>
      </View>
    </SafeAreaView>
  );
}

function HourlyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <Text style={styles.eyebrow}>ENVIROCATALYSTS</Text>

        <Text style={styles.title}>
          Hourly{"\n"}Analysis
        </Text>

        <Text style={styles.subtitle}>
          Explore station-wise hourly air quality trends from 2015 to present.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hourly Trends</Text>
          <Text style={styles.cardText}>
            Station and pollutant filters will be added here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Overview"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#F7F9FC",
          },
          headerShadowVisible: false,
          headerTintColor: "#102A43",
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      >
        <Stack.Screen
          name="Overview"
          component={OverviewScreen}
          options={{
            title: "Air Quality",
          }}
        />

        <Stack.Screen
          name="Hourly"
          component={HourlyScreen}
          options={{
            title: "Hourly Analysis",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#52606D",
    marginBottom: 14,
  },

  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    color: "#102A43",
  },

  subtitle: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: "#627D98",
  },

  card: {
    marginTop: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#102A43",
  },

  cardText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#627D98",
  },

  yearRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  yearBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F0F4F8",
  },

  yearLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#829AB1",
  },

  yearValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: "#102A43",
  },

  sectionTitle: {
    marginTop: 30,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#102A43",
  },

  feature: {
    fontSize: 15,
    lineHeight: 28,
    color: "#486581",
  },
});