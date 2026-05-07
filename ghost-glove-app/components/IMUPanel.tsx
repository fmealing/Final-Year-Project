import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";
import type { BLEPacket } from "../lib/types";

type IMUProps = Pick<
  BLEPacket,
  "accel_x" | "accel_y" | "accel_z" | "gyro_x" | "gyro_y" | "gyro_z"
>;

interface ValueCellProps {
  label: string;
  value: number;
  unit: string;
}

function ValueCell({ label, value, unit }: ValueCellProps) {
  const isNegative = value < 0;
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <View style={styles.cellValueRow}>
        <Text style={[styles.cellValue, isNegative && styles.cellValueNegative]}>
          {value >= 0 ? " " : ""}
          {value.toFixed(3)}
        </Text>
        <Text style={styles.cellUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export function IMUPanel({
  accel_x, accel_y, accel_z,
  gyro_x, gyro_y, gyro_z,
}: IMUProps) {
  return (
    <View style={styles.container}>
      {/* Accelerometer */}
      <Text style={styles.groupLabel}>ACCELEROMETER</Text>
      <View style={styles.grid}>
        <ValueCell label="X" value={accel_x} unit="m/s²" />
        <ValueCell label="Y" value={accel_y} unit="m/s²" />
        <ValueCell label="Z" value={accel_z} unit="m/s²" />
      </View>

      <View style={styles.divider} />

      {/* Gyroscope */}
      <Text style={styles.groupLabel}>GYROSCOPE</Text>
      <View style={styles.grid}>
        <ValueCell label="X" value={gyro_x} unit="°/s" />
        <ValueCell label="Y" value={gyro_y} unit="°/s" />
        <ValueCell label="Z" value={gyro_z} unit="°/s" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  groupLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 3,
  },
  grid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colours.background,
    marginVertical: spacing.xs,
  },
  cell: {
    flex: 1,
    backgroundColor: colours.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
  },
  cellLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 1,
  },
  cellValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  cellValue: {
    fontFamily: fonts.mono.bold,
    fontSize: type_.body,
    color: colours.white,
  },
  cellValueNegative: {
    color: colours.warning,
  },
  cellUnit: {
    fontFamily: fonts.mono.regular,
    fontSize: 10,
    color: colours.neutral,
  },
});
