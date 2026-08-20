import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Text, TextClassContext } from "@/components/ui/text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { loadSelectedApps, saveSelectedApps } from "@/constants/selected-apps";
import CoreplyModule from "@/modules/coreply-module/src/CoreplyModule";
import type { InstalledAppInfo } from "@/modules/coreply-module/src/CoreplyModule.types";
import * as Brownfield from "@/utils/brownfield-wrapper";
import { profileGroups } from "libcoreply";

import "../../global.css";

// ** Extracted supported apps from profileGroups instead of separate file
const SUPPORTED_APP_SET = new Set<string>(
  profileGroups.map((group) => group.rule),
);

function sortApps(apps: InstalledAppInfo[], initialSelectedPackages: string[]) {
  const initialSelectedPackageSet = new Set(initialSelectedPackages);

  return [...apps].sort((left, right) => {
    const leftSelected = initialSelectedPackageSet.has(left.packageName);
    const rightSelected = initialSelectedPackageSet.has(right.packageName);

    if (leftSelected !== rightSelected) {
      return leftSelected ? -1 : 1;
    }

    return left.appName.localeCompare(right.appName);
  });
}

function InfoCard({ text }: { text: string }) {
  return (
    <View className="w-full border border-border bg-card px-4 py-4">
      <Text className="text-sm text-card-foreground font-sans">{text}</Text>
    </View>
  );
}

function AppSelectionRow({
  app,
  isSelected,
  onToggle,
}: {
  app: InstalledAppInfo;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="h-auto w-full flex-row items-center justify-between rounded-none px-3 border-x border-b border-border py-3">
      <View className="flex-1 flex-row items-center pr-3">
        <Image
          source={{ uri: app.iconUri }}
          contentFit="contain"
          style={styles.appIcon}
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-left text-base text-foreground">
            {app.appName}
          </Text>
          <Text className="text-left text-xs text-muted-foreground font-sans">
            {app.packageName}
          </Text>
        </View>
      </View>
      <Switch checked={isSelected} onCheckedChange={onToggle} />
    </View>
  );
}

export default function SelectAppsScreen() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [initialSelectedApps, setInitialSelectedApps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadApps = async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);

    try {
      const [apps, savedSelectedApps] = await Promise.all([
        CoreplyModule.getInstalledAppsAsync(),
        loadSelectedApps(),
      ]);

      setInstalledApps(apps);
      setSelectedApps(savedSelectedApps);
      setInitialSelectedApps(savedSelectedApps);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unknown error";
      setLoadError(`Failed to load apps: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadApps();
  }, []);

  const triggerSelectedAppsSync = async (apps: string[]) => {
    if (Platform.OS !== "android") {
      return;
    }

    Brownfield.sendMessage({
      type: "settingsUpdated",
      data: {
        selectedApps: apps,
      },
    });
  };

  const toggleSelectedApp = async (packageName: string) => {
    const nextSelectedApps = selectedApps.includes(packageName)
      ? selectedApps.filter((entry) => entry !== packageName)
      : [...selectedApps, packageName].sort();

    setSelectedApps(nextSelectedApps);
    setSaveError(null);

    try {
      await saveSelectedApps(nextSelectedApps);
      await triggerSelectedAppsSync(nextSelectedApps);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unknown error";
      setSaveError(`Failed to save selected apps: ${message}`);
    }
  };

  // ** Using SUPPORTED_APP_SET derived from profileGroups.rules
  const supportedApps = useMemo(
    () =>
      sortApps(
        installedApps.filter((app) => SUPPORTED_APP_SET.has(app.packageName)),
        initialSelectedApps,
      ),
    [initialSelectedApps, installedApps],
  );
  const otherApps = useMemo(
    () =>
      sortApps(
        installedApps.filter((app) => !SUPPORTED_APP_SET.has(app.packageName)),
        initialSelectedApps,
      ),
    [initialSelectedApps, installedApps],
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Select Apps",
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <TextClassContext.Provider value="font-display">
          {fontsLoaded && (
            <View style={styles.screen}>
              {isLoading ? (
                <View style={styles.centeredState}>
                  <ActivityIndicator size="large" />
                  <Text className="text-sm text-muted-foreground font-sans">
                    Loading installed apps...
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
                  <Button onPress={() => void loadApps()}>
                    <Text className="font-sans">Retry</Text>
                  </Button>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                  {saveError ? (
                    <View className="w-full border border-destructive bg-white px-4 py-4">
                      <Text className="text-sm text-destructive font-sans">
                        {saveError}
                      </Text>
                    </View>
                  ) : null}

                  {supportedApps.length > 0 ? (
                    <View style={styles.section}>
                      <Text className="text-lg text-foreground mb-2 font-semibold">
                        Coreply Supported Apps
                      </Text>
                      <InfoCard text="Coreply is not affiliated with or endorsed by the apps listed here. Because third-party apps can change at any time, Coreply may stop working or behave differently even for apps shown as supported." />
                      {supportedApps.map((app) => (
                        <AppSelectionRow
                          key={app.packageName}
                          app={app}
                          isSelected={selectedApps.includes(app.packageName)}
                          onToggle={() => {
                            void toggleSelectedApp(app.packageName);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {otherApps.length > 0 ? (
                    <View style={styles.section}>
                      <Text className="text-lg text-foreground mb-2 font-semibold">
                        Other Apps
                      </Text>
                      <InfoCard text="Coreply may not work in these apps, or may behave unexpectedly, because every app is different. If enabled, on-screen content from these apps may be sent to the API service you configured to generate suggestions." />
                      {otherApps.map((app) => (
                        <AppSelectionRow
                          key={app.packageName}
                          app={app}
                          isSelected={selectedApps.includes(app.packageName)}
                          onToggle={() => {
                            void toggleSelectedApp(app.packageName);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {supportedApps.length === 0 && otherApps.length === 0 ? (
                    <View style={styles.centeredEmptyState}>
                      <Text className="text-base text-muted-foreground font-sans">
                        No apps found
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              )}
            </View>
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
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centeredEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
  },
  appIcon: {
    width: 48,
    height: 48,
    marginRight: Spacing.three,
  },
});
