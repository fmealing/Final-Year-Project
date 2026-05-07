import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colours, fonts, type as type_, spacing, radius } from "../../constants/theme";
import type { BLEPacket } from "../../lib/types";

interface Props {
  packets: BLEPacket[];
  // Which axes to show — default: all accel
  axes?: ("accel_x" | "accel_y" | "accel_z" | "gyro_x" | "gyro_y" | "gyro_z")[];
}

const AXIS_COLOURS: Record<string, string> = {
  accel_x: "#39FF6A",
  accel_y: "#F0F7F1",
  accel_z: "#8A9E8D",
  gyro_x:  "#FF4444",
  gyro_y:  "#FFB444",
  gyro_z:  "#44B4FF",
};

const DEFAULT_AXES = ["accel_x", "accel_y", "accel_z"] as const;

const SCREEN_WIDTH = Dimensions.get("window").width;

export function IMUChart({ packets, axes = DEFAULT_AXES }: Props) {
  if (packets.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Waiting for data…</Text>
      </View>
    );
  }

  // Downsample to max 100 points for performance
  const step = Math.max(1, Math.floor(packets.length / 100));
  const sampled = packets.filter((_, i) => i % step === 0);

  const labels = sampled
    .filter((_, i) => i % Math.ceil(sampled.length / 6) === 0)
    .map((p) => `${(p.timestamp / 1000).toFixed(0)}s`);

  const datasets = axes.map((axis) => ({
    data: sampled.map((p) => p[axis as keyof BLEPacket] as number),
    color: () => AXIS_COLOURS[axis] ?? colours.white,
    strokeWidth: 1.5,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IMU — {axes.join(" / ").toUpperCase()}</Text>
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
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(240, 247, 241, ${opacity})`,
          labelColor: () => colours.neutral,
          style: { borderRadius: radius.md },
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
