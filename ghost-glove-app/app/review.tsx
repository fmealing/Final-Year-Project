// Session Review Screen
// Shows: rep total, IMU graph, flex graph, upload/save options

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { IMUChart } from "../components/charts/IMUChart";
import { FlexChart } from "../components/charts/FlexChart";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";
import { postSession } from "../lib/api";
import type { BLEPacket } from "../lib/types";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    packets: string;
    startedAt: string;
    endedAt: string;
  }>();

  const packets: BLEPacket[] = useMemo(() => {
    try {
      return JSON.parse(params.packets ?? "[]");
    } catch {
      return [];
    }
  }, [params.packets]);

  const repCount = packets.length > 0 ? packets[packets.length - 1].rep_count : 0;
  const durationMs = params.startedAt && params.endedAt
    ? new Date(params.endedAt).getTime() - new Date(params.startedAt).getTime()
    : 0;

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState(false);

  const handleUpload = async () => {
    if (!params.startedAt || !params.endedAt) {
      Alert.alert("Error", "Session timestamps missing.");
      return;
    }
    setUploading(true);
    try {
      await postSession({
        startedAt: params.startedAt,
        endedAt: params.endedAt,
        packets,
      });
      setUploaded(true);
      Alert.alert("Saved", "Session uploaded successfully.");
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message ?? "Could not reach server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    router.replace("/");
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>REPS</Text>
          <Text style={styles.repCount}>{repCount}</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>DURATION</Text>
          <Text style={styles.summaryValue}>{formatDuration(durationMs)}</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>PACKETS</Text>
          <Text style={styles.summaryValue}>{packets.length}</Text>
        </View>
      </View>

      {/* IMU graph — accel */}
      <IMUChart
        packets={packets}
        axes={["accel_x", "accel_y", "accel_z"]}
      />

      {/* IMU graph — gyro */}
      <IMUChart
        packets={packets}
        axes={["gyro_x", "gyro_y", "gyro_z"]}
      />

      {/* Flex sensor graph */}
      <FlexChart packets={packets} />

      {/* Actions */}
      <TouchableOpacity
        style={[styles.uploadButton, uploaded && styles.uploadButtonDone]}
        onPress={uploaded ? handleDone : handleUpload}
        disabled={uploading}
        activeOpacity={0.8}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? "Uploading…" : uploaded ? "Done" : "Upload to Cloud"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleDone}
        activeOpacity={0.7}
      >
        <Text style={styles.skipButtonText}>Skip — Back to Home</Text>
      </TouchableOpacity>
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
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryBlock: {
    flex: 1,
    backgroundColor: colours.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryLabel: {
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
  summaryValue: {
    fontFamily: fonts.mono.bold,
    fontSize: type_.sectionHeader,
    color: colours.white,
  },
  uploadButton: {
    backgroundColor: colours.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + spacing.xs,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  uploadButtonDone: {
    backgroundColor: colours.secondary,
    borderWidth: 1,
    borderColor: colours.primary,
  },
  uploadButtonText: {
    fontFamily: fonts.grotesk.bold,
    fontSize: type_.sectionHeader,
    color: colours.background,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontFamily: fonts.grotesk.medium,
    fontSize: type_.body,
    color: colours.neutral,
  },
});
