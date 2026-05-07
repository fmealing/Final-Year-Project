import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";
import type { SessionSummary } from "../lib/types";

interface Props {
  session: SessionSummary;
  onPress: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function SessionCard({ session, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(session.id)}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.duration}>{formatDuration(session.durationMs)}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.repLabel}>REPS</Text>
        <Text style={styles.repCount}>{session.repCount}</Text>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colours.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  left: {
    flex: 1,
    gap: spacing.xs,
  },
  date: {
    fontFamily: fonts.grotesk.semiBold,
    fontSize: type_.body,
    color: colours.white,
  },
  duration: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  repLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 2,
  },
  repCount: {
    fontFamily: fonts.grotesk.bold,
    fontSize: type_.title,
    color: colours.primary,
  },
  chevron: {
    fontFamily: fonts.grotesk.bold,
    fontSize: 24,
    color: colours.neutral,
  },
});
