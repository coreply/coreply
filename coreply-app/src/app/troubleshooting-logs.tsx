import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { Text, TextClassContext } from "@/components/ui/text";
import { loadSuggestionFetchLogs } from "@/constants/troubleshooting-logs";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import type { SuggestionFetchLog } from "../../../coreply-wrapper/src/schemas";

export default function TroubleshootingLogsScreen() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
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
          {fontsLoaded && (
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
                    key={`${log.completedAt}-${index}`}
                    className="border border-border bg-form px-4 py-4"
                    style={styles.logCard}
                  >
                    <Text className="text-base font-semibold text-foreground">
                      {log.completedAt}
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      {JSON.stringify(log, null, 2)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
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
});
