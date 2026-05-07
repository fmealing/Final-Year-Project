import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colours, fonts, type as type_, spacing, radius } from "../constants/theme";
import type { BLEConnectionState } from "../lib/types";

interface Props {
  state: BLEConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATE_LABELS: Record<BLEConnectionState, string> = {
  disconnected: "Disconnected",
  scanning:     "Scanning…",
  connecting:   "Connecting…",
  connected:    "Connected",
  error:        "Connection Error",
};

const STATE_COLOURS: Record<BLEConnectionState, string> = {
  disconnected: colours.neutral,
  scanning:     colours.white,
  connecting:   colours.white,
  connected:    colours.primary,
  error:        colours.warning,
};

export function BLEStatusBar({ state, onConnect, onDisconnect }: Props) {
  const isConnected = state === "connected";
  const isBusy      = state === "scanning" || state === "connecting";
  const dotColour   = STATE_COLOURS[state];

  return (
    <View style={styles.container}>
      {/* Status dot + label */}
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dotColour }]} />
        <Text style={[styles.label, { color: dotColour }]}>
          {STATE_LABELS[state]}
        </Text>
      </View>

      {/* Action button */}
      {!isBusy && (
        <TouchableOpacity
          style={[
            styles.button,
            isConnected ? styles.buttonDisconnect : styles.buttonConnect,
          ]}
          onPress={isConnected ? onDisconnect : onConnect}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {isConnected ? "Disconnect" : "Connect"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colours.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    letterSpacing: 0.5,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  buttonConnect: {
    backgroundColor: colours.primary,
  },
  buttonDisconnect: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colours.neutral,
  },
  buttonText: {
    fontFamily: fonts.grotesk.semiBold,
    fontSize: type_.label,
    color: colours.background,
  },
});
