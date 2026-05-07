// Live Session Screen
// Shows: Rep Counter (hero), Flex Sensor Panel, IMU Panel, End Session button

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useGlove } from "./_layout";
import { BLEStatusBar } from "../components/BLEStatusBar";
import { RepCounter } from "../components/RepCounter";
import { FlexSensorPanel } from "../components/FlexSensorPanel";
import { IMUPanel } from "../components/IMUPanel";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function SessionScreen() {
  const { bleState, latestPacket, connect, disconnect, startSession, endSession } =
    useGlove();

  const startTimeRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Start session and reset buffer when screen mounts
  useEffect(() => {
    startSession();
    startTimeRef.current = Date.now();

    const timer = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndSession = () => {
    Alert.alert("End Session", "Save and review this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Session",
        style: "destructive",
        onPress: () => {
          const packets = endSession();
          // Pass packets to review screen via router params (JSON-encoded)
          router.replace({
            pathname: "/review",
            params: {
              packets: JSON.stringify(packets),
              startedAt: new Date(startTimeRef.current).toISOString(),
              endedAt: new Date().toISOString(),
            },
          });
        },
      },
    ]);
  };

  // Fallback zero-packet for display before first BLE packet arrives
  const pkt = latestPacket ?? {
    accel_x: 0, accel_y: 0, accel_z: 0,
    gyro_x: 0,  gyro_y: 0,  gyro_z: 0,
    flex_1: 1000, flex_2: 1000, flex_3: 1000, flex_4: 1000,
    rep_count: 0,
    timestamp: 0,
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Status bar */}
      <BLEStatusBar state={bleState} onConnect={connect} onDisconnect={disconnect} />

      {/* Elapsed timer */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>SESSION TIME</Text>
        <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
      </View>

      {/* Rep Counter (hero) */}
      <RepCounter repCount={pkt.rep_count} />

      {/* Flex sensors */}
      <FlexSensorPanel
        flex1={pkt.flex_1}
        flex2={pkt.flex_2}
        flex3={pkt.flex_3}
        flex4={pkt.flex_4}
      />

      {/* IMU */}
      <IMUPanel
        accel_x={pkt.accel_x}
        accel_y={pkt.accel_y}
        accel_z={pkt.accel_z}
        gyro_x={pkt.gyro_x}
        gyro_y={pkt.gyro_y}
        gyro_z={pkt.gyro_z}
      />

      {/* End Session */}
      <TouchableOpacity
        style={styles.endButton}
        onPress={handleEndSession}
        activeOpacity={0.8}
      >
        <Text style={styles.endButtonText}>End Session</Text>
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
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  timerLabel: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
    letterSpacing: 3,
  },
  timer: {
    fontFamily: fonts.mono.bold,
    fontSize: type_.sectionHeader,
    color: colours.white,
    letterSpacing: 2,
  },
  endButton: {
    backgroundColor: colours.warning,
    borderRadius: radius.md,
    paddingVertical: spacing.md + spacing.xs,
    alignItems: "center",
    marginTop: spacing.md,
  },
  endButtonText: {
    fontFamily: fonts.grotesk.bold,
    fontSize: type_.sectionHeader,
    color: colours.white,
  },
});
