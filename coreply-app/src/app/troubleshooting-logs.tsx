import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Text, TextClassContext } from "@/components/ui/text";
import {
  clearSuggestionFetchLogs,
  loadSuggestionFetchLogs,
} from "@/constants/troubleshooting-logs";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import type { SuggestionFetchLog } from "coreply-wrapper/schemas";

export default function TroubleshootingLogsScreen() {
  const [logs, setLogs] = useState<SuggestionFetchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestionFetchLogs()
      .then((storedLogs) => {
        setLogs(storedLogs.slice().reverse());
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load logs",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Troubleshooting Logs",
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <TextClassContext.Provider value="font-display">
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isLoading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" />
                <Text className="text-sm text-muted-foreground font-sans">
                  Loading logs...
                </Text>
              </View>
            ) : loadError ? (
              <View style={styles.centeredState}>
                <Text className="text-lg text-destructive font-semibold">
                  Error
                </Text>
                <Text className="text-center text-sm text-muted-foreground font-sans">
                  {loadError}
                </Text>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.centeredState}>
                <Text className="text-base text-muted-foreground font-sans">
                  No logs yet
                </Text>
              </View>
            ) : (
              logs.map((log, index) => (
                <View
                  key={`${log.timestamp}-${log.providerId}-${index}`}
                  className="border border-border bg-form px-4 py-4"
                  style={styles.logCard}
                >
                  <Text className="text-base font-semibold text-foreground">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                  <View style={styles.logSection}>
                    <Text className="font-sans text-sm text-foreground">
                      Provider: {log.providerId}
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      Typing: {log.currentTyping || "(empty)"}
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      {log.result.type === "success"
                        ? `Suggestion: ${log.result.suggestion}`
                        : `Error: ${log.result.message}`}
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      Duration: {log.durationMs}ms
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      Good suggestion: {log.isGood ? "Yes" : "No"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          <View className="px-3 pb-3">
            <Button
              variant="destructive"
              disabled={isLoading || logs.length === 0}
              onPress={async () => {
                try {
                  await clearSuggestionFetchLogs();
                  setLogs([]);
                } catch (error) {
                  setLoadError(
                    error instanceof Error ? error.message : "Failed to delete logs",
                  );
                }
              }}
            >
              <Text>Delete All Logs</Text>
            </Button>
          </View>
        </TextClassContext.Provider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  centeredState: {
    flex: 1,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  logCard: {
    gap: Spacing.two,
  },
  logSection: {
    gap: Spacing.one,
  },
});
