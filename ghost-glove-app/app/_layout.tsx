import "../global.css";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { colours } from "../constants/theme";
import { GhostGloveBLE } from "../lib/ble";
import { RingBuffer, DEFAULT_BUFFER_SIZE } from "../lib/ringBuffer";
import type { BLEPacket, BLEConnectionState } from "../lib/types";

// ─── Global Session State ──────────────────────────────────────────────────────
// Passed via React Context so all screens can access live data.
export interface SessionContext {
  bleState: BLEConnectionState;
  latestPacket: BLEPacket | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  buffer: RingBuffer<BLEPacket>;
  startSession: () => void;
  endSession: () => BLEPacket[];
}

import { createContext, useContext } from "react";
export const GloveContext = createContext<SessionContext | null>(null);

export function useGlove(): SessionContext {
  const ctx = useContext(GloveContext);
  if (!ctx) throw new Error("useGlove must be used inside GloveProvider");
  return ctx;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const [bleState, setBleState] = useState<BLEConnectionState>("disconnected");
  const [latestPacket, setLatestPacket] = useState<BLEPacket | null>(null);
  const bufferRef = useRef(new RingBuffer<BLEPacket>(DEFAULT_BUFFER_SIZE));
  const bleRef = useRef<GhostGloveBLE | null>(null);

  useEffect(() => {
    bleRef.current = new GhostGloveBLE((packet) => {
      setLatestPacket(packet);
      bufferRef.current.push(packet);
    }, setBleState);
    return () => bleRef.current?.destroy();
  }, []);

  const connect = useCallback(async () => {
    await bleRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    bleRef.current?.disconnect();
  }, []);

  const startSession = useCallback(() => {
    bufferRef.current.reset();
  }, []);

  const endSession = useCallback((): BLEPacket[] => {
    return bufferRef.current.flush();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GloveContext.Provider
      value={{
        bleState,
        latestPacket,
        connect,
        disconnect,
        buffer: bufferRef.current,
        startSession,
        endSession,
      }}
    >
      <StatusBar style="light" backgroundColor={colours.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colours.background },
          headerTintColor: colours.white,
          headerTitleStyle: {
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 18,
          },
          contentStyle: { backgroundColor: colours.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Ghost Glove", headerShown: false }}
        />
        <Stack.Screen
          name="session"
          options={{ title: "Live Session", headerBackVisible: false }}
        />
        <Stack.Screen name="review" options={{ title: "Session Review" }} />
        <Stack.Screen name="history/index" options={{ title: "History" }} />
        <Stack.Screen
          name="history/[id]"
          options={{ title: "Session Detail" }}
        />
      </Stack>
    </GloveContext.Provider>
  );
}
