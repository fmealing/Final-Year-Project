// History Screen — lists all past sessions

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SessionCard } from "../../components/SessionCard";
import { colours, fonts, type as type_, spacing } from "../../constants/theme";
import { getSessions } from "../../lib/api";
import type { SessionSummary } from "../../lib/types";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No sessions yet.</Text>
        <Text style={styles.emptySubtext}>Start a session to see history here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <SessionCard
          session={item}
          onPress={(id) => router.push(`/history/${id}`)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colours.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 64,
  },
  separator: {
    height: spacing.sm,
  },
  center: {
    flex: 1,
    backgroundColor: colours.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.body,
    color: colours.warning,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.grotesk.semiBold,
    fontSize: type_.sectionHeader,
    color: colours.white,
  },
  emptySubtext: {
    fontFamily: fonts.mono.regular,
    fontSize: type_.label,
    color: colours.neutral,
  },
});
