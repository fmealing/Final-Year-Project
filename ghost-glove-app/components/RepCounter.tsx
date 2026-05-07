import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";

interface Props {
  repCount: number;
}

export function RepCounter({ repCount }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>REPS</Text>
      <Text style={styles.count}>{repCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colours.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1,
    borderColor: colours.primary + "33", // 20% opacity green border
  },
  label: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  count: {
    fontFamily: fonts.grotesk.bold,
    fontSize: type_.hero,
    color: colours.primary,
    lineHeight: type_.hero * 1.1,
  },
});
