import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { Image } from "expo-image";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text, TextClassContext } from "@/components/ui/text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import CoreplyModule from "@/modules/coreply-module/src/CoreplyModule";
import * as Brownfield from "@/utils/brownfield-wrapper";
import { builtInProfiles } from "libcoreply";
import { storageManager } from "@/constants/storage-manager";
import { syncStoredSettings } from "@/utils/sync-stored-settings";
import { Plus } from "lucide-react-native";

import "../../global.css";

type ProfileListItem = { id: string; name: string; icon: string; subtitle: string };

function sortApps(apps: ProfileListItem[], initialSelectedIds: string[]) {
  const initialSelectedSet = new Set(initialSelectedIds);

  return [...apps].sort((left, right) => {
    const leftSelected = initialSelectedSet.has(left.id);
    const rightSelected = initialSelectedSet.has(right.id);

    if (leftSelected !== rightSelected) {
      return leftSelected ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
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
  onEdit,
}: {
  app: ProfileListItem;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { t } = useLingui();
  return (
    <View className="h-auto w-full flex-row items-center justify-between rounded-none border-x border-b border-border">
      <Button
        variant="ghost"
        className="h-auto flex-1 self-stretch justify-start rounded-none px-3 py-3 sm:h-auto"
        accessibilityLabel={t`Edit ${app.name} profile`}
        onPress={onEdit}
      >
        {app.icon ? (
          <Image
            source={{ uri: app.icon }}
            contentFit="contain"
            style={styles.appIcon}
          />
        ) : null}
        <View className="flex-1 gap-0.5">
          <Text className="text-left text-base text-foreground">
            {app.name}
          </Text>
          <Text className="text-left text-xs text-muted-foreground font-sans">
            {app.subtitle}
          </Text>
        </View>
      </Button>
      <View className="px-3 py-3">
        <Switch
          accessibilityLabel={t`Enable ${app.name}`}
          checked={isSelected}
          onCheckedChange={onToggle}
        />
      </View>
    </View>
  );
}

export default function SelectAppsScreen() {
  const { t } = useLingui();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [installedApps, setInstalledApps] = useState<ProfileListItem[]>([]);
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
      let apps: ProfileListItem[];
      if (Platform.OS === "android") {
        const installed = await CoreplyModule.getInstalledAppsAsync();
        await storageManager.prepareAndroidProfiles(installed);
        await syncStoredSettings();
        apps = installed.map((app) => ({ id: app.packageName, name: app.appName, icon: app.iconUri, subtitle: app.packageName }));
      } else {
        apps = (await storageManager.loadProfiles()).map((profile) => ({ id: profile.id, name: profile.displayName ?? profile.matchingRule, icon: "", subtitle: profile.matchingRule }));
      }
      const savedSelectedApps = await storageManager.loadSelectedApps();

      setInstalledApps(apps);
      setSelectedApps(savedSelectedApps);
      setInitialSelectedApps(savedSelectedApps);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : t`Unknown error`;
      setLoadError(t`Failed to load apps: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    void loadApps();
  }, []));

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

  const toggleSelectedApp = async (id: string) => {
    const nextSelectedApps = selectedApps.includes(id)
      ? selectedApps.filter((entry) => entry !== id)
      : [...selectedApps, id].sort();

    setSelectedApps(nextSelectedApps);
    setSaveError(null);

    try {
      await storageManager.saveSelectedApps(nextSelectedApps);
      await triggerSelectedAppsSync(nextSelectedApps);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : t`Unknown error`;
      setSaveError(t`Failed to save selected apps: ${message}`);
    }
  };

  const builtInIds = useMemo(() => new Set(builtInProfiles.filter(
    (profile) => profile.platform === (Platform.OS === "android" ? "android" : "web"),
  ).map((profile) => profile.id)), []);
  const supportedApps = useMemo(
    () =>
      sortApps(
        installedApps.filter((app) => builtInIds.has(app.id)),
        initialSelectedApps,
      ),
    [builtInIds, initialSelectedApps, installedApps],
  );
  const otherApps = useMemo(
    () =>
      sortApps(
        installedApps.filter((app) => !builtInIds.has(app.id)),
        initialSelectedApps,
      ),
    [builtInIds, initialSelectedApps, installedApps],
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: Platform.OS === "web" ? t`Select Websites` : t`Select Apps`,
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
                    <Trans>Loading installed apps...</Trans>
                  </Text>
                </View>
              ) : loadError ? (
                <View style={styles.centeredState}>
                  <Text className="text-lg text-destructive font-semibold">
                    <Trans>Error</Trans>
                  </Text>
                  <Text className="text-center text-sm text-muted-foreground font-sans">
                    {loadError}
                  </Text>
                  <Button onPress={() => void loadApps()}>
                    <Text className="font-sans"><Trans comment="Retries loading the list of apps">Retry</Trans></Text>
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

                  {Platform.OS === "web" || supportedApps.length > 0 ? (
                    <View>
                      <View className="mb-2 flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-lg text-foreground font-semibold">
                          <Trans comment="Section heading for suggestion profiles that ship with Coreply">
                            Coreply built-in profiles
                          </Trans>
                        </Text>
                      </View>
                      <InfoCard text={Platform.OS === "android" ? t`Coreply is not affiliated with or endorsed by the apps listed here. Because third-party apps can change at any time, Coreply may stop working or behave differently even for apps shown as supported.` : t`Coreply is not affiliated with or endorsed by the websites listed here. Because third-party websites can change at any time, Coreply may stop working or behave differently even for websites shown as supported.`} />
                      {supportedApps.map((app) => (
                        <AppSelectionRow
                          key={app.id}
                          app={app}
                          isSelected={selectedApps.includes(app.id)}
                          onEdit={() => router.push({ pathname: "/profile", params: { id: app.id } })}
                          onToggle={() => {
                            void toggleSelectedApp(app.id);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {Platform.OS === "web" || otherApps.length > 0 ? (
                    <View>
                      <View className="mb-2 flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-lg text-foreground font-semibold">
                          {Platform.OS === "web" ? (
                            <Trans comment="Heading for website suggestion settings created by the user">Custom Website Profiles</Trans>
                          ) : (
                            <Trans comment="Heading for Android apps without a built-in Coreply preset">Custom App Profiles</Trans>
                          )}
                        </Text>
                        {Platform.OS === "web" ? <Button variant="outline" size="sm" onPress={async () => {
                          const profile = { id: crypto.randomUUID(), displayName: "New profile", platform: "web" as const, matchingRule: "^https://example\\.com/", dropRule: { differentProfile: 0, sameProfile: 1 }, contextExtractors: [{ extractor: "null" }] };
                          await storageManager.saveProfile(profile);
                          router.push({ pathname: "/profile", params: { id: profile.id } });
                        }}><Icon as={Plus} className="size-4" aria-hidden /><Text><Trans comment="Creates a new profile">New profile</Trans></Text></Button> : null}
                      </View>
                      <InfoCard text={Platform.OS === "android" ? t`Coreply may not work in these apps, or may behave unexpectedly, because every app is different. If enabled, on-screen content from these apps may be sent to the API service you configured to generate suggestions.` : t`Coreply may not work on these websites, or may behave unexpectedly, because every website is different. If enabled, on-screen content from these websites may be sent to the API service you configured to generate suggestions.`} />
                      {otherApps.map((app) => (
                        <AppSelectionRow
                          key={app.id}
                          app={app}
                          isSelected={selectedApps.includes(app.id)}
                          onEdit={() => router.push({ pathname: "/profile", params: { id: app.id } })}
                          onToggle={() => {
                            void toggleSelectedApp(app.id);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {supportedApps.length === 0 && otherApps.length === 0 ? (
                    <View style={styles.centeredEmptyState}>
                      <Text className="text-base text-muted-foreground font-sans">
                        <Trans>No apps found</Trans>
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
