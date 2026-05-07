import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colours,
  fonts,
  type as type_,
  spacing,
  radius,
} from "../constants/theme";
import {
  POSITION_LABELS,
  POSITION_COLOURS,
  mapAllFlex,
} from "../lib/flexLookup";
import type { FingerPosition } from "../lib/types";

interface Props {
  flex1: number;
  flex2: number;
  flex3: number;
  flex4: number;
}

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring"] as const;

interface SensorRowProps {
  name: string;
  raw: number;
  position: FingerPosition;
}

function SensorRow({ name, raw, position }: SensorRowProps) {
  const positionColour = POSITION_COLOURS[position];

  return (
    <View style={styles.row}>
      {/* Finger name */}
      <Text style={styles.fingerName}>{name}</Text>

      {/* Position bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              // Normalise raw to 0-100% assuming 1000–2000 ADC range
              width: `${Math.min(100, Math.max(0, ((raw - 1000) / 1000) * 100))}%`,
              backgroundColor: positionColour,
            },
          ]}
        />
      </View>

      {/* Raw value */}
      <Text style={styles.rawValue}>{raw.toFixed(0)}</Text>

      {/* Position label */}
      <View style={[styles.positionBadge, { borderColor: positionColour }]}>
        <Text style={[styles.positionText, { color: positionColour }]}>
          {POSITION_LABELS[position]}
        </Text>
      </View>
    </View>
  );
}

export function FlexSensorPanel({ flex1, flex2, flex3, flex4 }: Props) {
  const readings = mapAllFlex(flex1, flex2, flex3, flex4);
  const fingers = [readings.thumb, readings.index, readings.middle, readings.ring];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>FLEX SENSORS</Text>
      {fingers.map((finger, i) => (
        <SensorRow
          key={FINGER_NAMES[i]}
          name={FINGER_NAMES[i]}
          raw={finger.raw}
          position={finger.position}
        />
      ))}
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
  header: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fingerName: {
    fontFamily: fonts.grotesk.medium,
    fontSize: type_.label,
    color: colours.white,
    width: 52,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colours.background,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  rawValue: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    width: 44,
    textAlign: "right",
  },
  positionBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    width: 68,
    alignItems: "center",
  },
  positionText: {
    fontFamily: fonts.mono.regular,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
