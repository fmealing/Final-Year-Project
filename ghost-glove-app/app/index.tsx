import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useGlove } from "./_layout";
import { BLEStatusBar } from "../components/BLEStatusBar";
import { getSessions } from "../lib/api";
import type { SessionSummary } from "../lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;
}

export default function HomeScreen() {
  const { bleState, connect, disconnect } = useGlove();
  const [lastSession, setLastSession] = useState<SessionSummary | null>(null);

  useEffect(() => {
    getSessions()
      .then((sessions) => {
        if (sessions.length > 0) {
          setLastSession(sessions[0]);
        }
      })
      .catch(() => {
        // Backend offline — degrade gracefully
      });
  }, []);

  const handleStartSession = () => {
    router.push("/session");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* BLE Status */}
      <BLEStatusBar
        state={bleState}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {/* Hero wordmark */}
      <View className="items-center py-12">
        <Image
          source={require("../assets/images/icon.png")}
          style={{ width: 96, height: 96 }}
          resizeMode="contain"
        />
        <Text className="font-mono text-xs text-neutral tracking-[8px] mt-4">
          GHOST
        </Text>
        <Text className="font-grotesk-bold text-[56px] text-primary tracking-[-1px]">
          GLOVE
        </Text>
      </View>

      {/* Last session card */}
      {lastSession ? (
        <View className="bg-secondary rounded-[20px] p-4 gap-2">
          <Text className="font-mono text-xs text-neutral tracking-[3px]">
            LAST SESSION
          </Text>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="font-grotesk-sb text-base text-white">
                {formatDate(lastSession.startedAt)}
              </Text>
              <Text className="font-mono text-xs text-neutral mt-[2px]">
                {formatDuration(lastSession.durationMs)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-mono text-xs text-neutral tracking-[2px]">
                REPS
              </Text>
              <Text className="font-grotesk-bold text-[32px] text-primary">
                {lastSession.repCount}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="self-start py-1"
            onPress={() => router.push(`/history/${lastSession.id}`)}
            activeOpacity={0.7}
          >
            <Text className="font-grotesk-med text-xs text-primary">
              View Session →
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-secondary rounded-[20px] p-4 gap-2">
          <Text className="font-mono text-xs text-neutral tracking-[3px]">
            LAST SESSION
          </Text>
          <Text className="font-grotesk text-base text-neutral">
            No sessions yet — start your first below.
          </Text>
        </View>
      )}

      {/* History shortcut */}
      <TouchableOpacity
        className="self-end"
        onPress={() => router.push("/history")}
        activeOpacity={0.7}
      >
        <Text className="font-grotesk-med text-xs text-neutral">
          View all sessions →
        </Text>
      </TouchableOpacity>

      {/* Start Session CTA */}
      <TouchableOpacity
        className={`bg-primary rounded-xl py-[20px] items-center mt-4 ${
          bleState !== "connected" ? "opacity-35" : ""
        }`}
        onPress={handleStartSession}
        disabled={bleState !== "connected"}
        activeOpacity={0.8}
      >
        <Text className="font-grotesk-bold text-xl text-background tracking-[-0.3px]">
          Start Session
        </Text>
      </TouchableOpacity>

      {bleState !== "connected" && (
        <Text className="font-mono text-xs text-neutral text-center -mt-2">
          Connect your glove to start a session
        </Text>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}
