import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colours, fonts, type as type_, spacing, radius } from "../../constants/theme";
import type { BLEPacket } from "../../lib/types";

interface Props {
  packets: BLEPacket[];
}

const FLEX_COLOURS = {
  flex_1: "#39FF6A", // Thumb — primary green
  flex_2: "#F0F7F1", // Index
  flex_3: "#8A9E8D", // Middle
  flex_4: "#FF4444", // Ring
};

const FINGER_LABELS = ["Thumb", "Index", "Middle", "Ring"];

const SCREEN_WIDTH = Dimensions.get("window").width;

export function FlexChart({ packets }: Props) {
  if (packets.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Waiting for data…</Text>
      </View>
    );
  }

  const step = Math.max(1, Math.floor(packets.length / 100));
  const sampled = packets.filter((_, i) => i % step === 0);

  const labels = sampled
    .filter((_, i) => i % Math.ceil(sampled.length / 6) === 0)
    .map((p) => `${(p.timestamp / 1000).toFixed(0)}s`);

  const datasets = (["flex_1", "flex_2", "flex_3", "flex_4"] as const).map(
    (key, i) => ({
      data: sampled.map((p) => p[key]),
      color: () => FLEX_COLOURS[key],
      strokeWidth: 1.5,
    })
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FLEX SENSORS</Text>

      {/* Legend */}
      <View style={styles.legend}>
        {FINGER_LABELS.map((label, i) => (
          <View key={label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: Object.values(FLEX_COLOURS)[i] },
              ]}
            />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <LineChart
        data={{ labels, datasets }}
        width={SCREEN_WIDTH - spacing.md * 4}
        height={180}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        chartConfig={{
          backgroundColor: colours.secondary,
          backgroundGradientFrom: colours.secondary,
          backgroundGradientTo: colours.secondary,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(240, 247, 241, ${opacity})`,
          labelColor: () => colours.neutral,
          propsForLabels: {
            fontFamily: fonts.mono.regular,
            fontSize: 9,
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: "hidden",
  },
  title: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  legendLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
  },
  chart: {
    borderRadius: radius.md,
    marginLeft: -spacing.md,
  },
  empty: {
    backgroundColor: colours.secondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
  },
});
