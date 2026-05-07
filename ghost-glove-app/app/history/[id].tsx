// Session Detail Screen — full graphs + stats for a historical session

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { IMUChart } from "../../components/charts/IMUChart";
import { FlexChart } from "../../components/charts/FlexChart";
import {
  colours,
  fonts,
  type as type_,
  spacing,
  radius,
} from "../../constants/theme";
import { getSession } from "../../lib/api";
import type { Session } from "../../lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSession(id)
      .then(setSession)
      .catch((e) => setError(e.message ?? "Failed to load session"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} size="large" />
      </View>
    );
  }

  if (error || !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Session not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header info */}
      <View style={styles.headerCard}>
        <Text style={styles.dateText}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.timeText}>
          {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>REPS</Text>
          <Text style={[styles.statValue, styles.statValueGreen]}>
            {session.repCount}
          </Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>DURATION</Text>
          <Text style={styles.statValue}>{formatDuration(session.durationMs)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>PACKETS</Text>
          <Text style={styles.statValue}>{session.packets.length}</Text>
        </View>
      </View>

      {/* IMU — Accelerometer */}
      <IMUChart
        packets={session.packets}
        axes={["accel_x", "accel_y", "accel_z"]}
      />

      {/* IMU — Gyroscope */}
      <IMUChart
        packets={session.packets}
        axes={["gyro_x", "gyro_y", "gyro_z"]}
      />

      {/* Flex sensors */}
      <FlexChart packets={session.packets} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colours.background,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    backgroundColor: colours.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  dateText: {
    fontFamily: fonts.grotesk.bold,
    fontSize: type_.sectionHeader,
    color: colours.white,
  },
  timeText: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statBlock: {
    flex: 1,
    backgroundColor: colours.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 2,
  },
  statValue: {
    fontFamily: fonts.mono.bold,
    fontSize: type_.sectionHeader,
    color: colours.white,
  },
  statValueGreen: {
    color: colours.primary,
  },
  center: {
    flex: 1,
    backgroundColor: colours.background,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.body,
    color: colours.warning,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
