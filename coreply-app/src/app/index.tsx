import { useEffect, useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import {
  ProviderSelector,
  ProviderSettingsForm,
  GlobalSettingsForm,
} from "@/components/groups";
import {
  DEFAULT_GLOBAL_SETTINGS,
  globalSettingsSchema,
  providerDefinitions,
} from "libcoreply";
import { ToggleButton } from "@/components/groups/toggle-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Option } from "@/components/ui/select";
import { View } from "react-native";
import { Text, TextClassContext } from "@/components/ui/text";
import { ChevronRight } from "lucide-react-native";

import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";

import { Image } from "expo-image";

import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";

import "../../global.css";

import type { GlobalSettings } from "libcoreply";

import { storageManager } from "@/constants/storage-manager";
import { clearSuggestionFetchLogs } from "@/constants/troubleshooting-logs";

import * as Brownfield from "@/utils/brownfield-wrapper";

import { Stack } from "expo-router";
import { authClient, billingHeaders } from "@/cloud/auth-client";
import { cloudConfigured } from "@/cloud/config";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";
import { CoreplyCloudSignIn } from "@/components/groups/coreply-cloud-sign-in";
import { CoreplyCloudUsage } from "@/components/groups/coreply-cloud-usage";
import { CloudSessionError } from "@/components/cloud-session-error";
import { GetMoreUsageButton } from "@/components/get-more-usage-button";
import { isBrowserExtension, openOnboardingTab } from "@/utils/extension";
import { createAsyncStorage } from "@/constants/storage";
import { syncStoredSettings } from "@/utils/sync-stored-settings";

const onboardingStorage = createAsyncStorage("coreply.onboarding");

const billingClient = createBillingClient(
  process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL!,
  billingHeaders,
);

function usePersistedSettings() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [providerId, setProviderId] = useState<string>("coreplyCloudStateful");
  const [initialProviderConfig, setInitialProviderConfig] = useState<
    Record<string, any>
  >({});
  const [initialGlobalSettings, setInitialGlobalSettings] =
    useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

  useEffect(() => {
    storageManager.loadSettings().then((settings) => {
      setProviderId(settings.providerId);
      setInitialProviderConfig(settings.providerConfigs[settings.providerId]);
      setInitialGlobalSettings(settings.globalSettings);
      setIsLoaded(true);
    });
  }, []);

  const saveProviderConfig = (newSettings: Record<string, any>) => {
    const provider =
      providerDefinitions[providerId as keyof typeof providerDefinitions];

    const parsed = provider?.settingsSchema.safeParse(newSettings);
    if (!parsed?.success) {
      return;
    }

    void storageManager
      .saveProviderConfig(providerId, parsed.data)
      .then(syncStoredSettings);
  };

  const saveGlobalSettings = (newSettings: GlobalSettings) => {
    const parsed = globalSettingsSchema.safeParse(newSettings);
    if (!parsed.success) {
      return;
    }

    if (
      initialGlobalSettings.troubleshooting.saveLogs &&
      !parsed.data.troubleshooting.saveLogs
    ) {
      void clearSuggestionFetchLogs();
    }
    setInitialGlobalSettings(parsed.data);
    void storageManager.saveGlobalSettings(parsed.data);
    if (isLoaded && Platform.OS === "android") {
      Brownfield.sendMessage({
        type: "settingsUpdated",
        data: {
          providerId,
          globalSettings: parsed.data,
        },
      });
    }
  };

  return {
    isLoaded,
    providerId,
    setProviderId,
    initialProviderConfig,
    initialGlobalSettings,
    setInitialProviderConfig,
    saveProviderConfig,
    saveGlobalSettings,
  };
}

export default function SettingsScreen() {
  const { t } = useLingui();
  const {
    data: session,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchSession,
  } = authClient.useSession();
  const colorScheme = useColorScheme();
  const [androidAccessibilityEnabled] =
    Platform.OS === "android"
      ? Brownfield.useSharedState("accessibilityEnabled", false)
      : [false];
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const router = useRouter();
  const { onboarding, select } = useLocalSearchParams<{
    onboarding?: string;
    select?: string;
  }>();
  useEffect(() => {
    if (Platform.OS === "web" && select === "select-apps") {
      router.push("/select-apps");
      return;
    }
    if (Platform.OS === "web" && onboarding === "true") {
      router.replace("/onboarding");
      return;
    }
    void onboardingStorage
      .getItem("complete")
      .then((complete) => {
        if (complete === "true") return;
        if (Platform.OS !== "web") {
          router.replace("/onboarding");
        } else if (isBrowserExtension()) {
          openOnboardingTab();
        }
      });
  }, [router, onboarding, select]);
  const {
    isLoaded,
    providerId,
    setProviderId,
    initialProviderConfig,
    initialGlobalSettings,
    setInitialProviderConfig,
    saveProviderConfig,
    saveGlobalSettings,
  } = usePersistedSettings();

  useEffect(() => {
    if (isLoaded && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded, fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    void storageManager.loadMasterSwitch().then(setExtensionEnabled);
  }, []);

  const accessibilityEnabled =
    Platform.OS === "web" ? extensionEnabled : androidAccessibilityEnabled;

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || providerId;
    const nextProviderConfig =
      await storageManager.loadProviderConfig(newProviderId);

    setProviderId(newProviderId);
    setInitialProviderConfig(nextProviderConfig);

    await storageManager.ensureProviderConfig(newProviderId);
    await storageManager.saveProviderId(newProviderId);
    await syncStoredSettings();
  };

  const handleUseApiKey = () => {
    const provider = Object.entries(providerDefinitions).find(
      ([key, definition]) =>
        key !== "coreplyCloudStateful" &&
        "stateful" in definition &&
        definition.stateful,
    );
    if (provider) {
      const [value, definition] = provider;
      void handleProviderChange({ value, label: definition.name });
    }
  };

  const handleTogglePress = () => {
    if (Platform.OS === "web") {
      const nextEnabled = !extensionEnabled;
      setExtensionEnabled(nextEnabled);
      void storageManager.saveMasterSwitch(nextEnabled);
      return;
    }

    if (accessibilityEnabled) {
      Brownfield.sendMessage({
        type: "disableService",
      });
      return;
    }

    router.push("/accessibility-disclosure");
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Stack.Header hidden />
        <TextClassContext.Provider value="font-display">
          {fontsLoaded && (
            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
              <ScrollView
                stickyHeaderIndices={[0]}
                stickyHeaderHiddenOnScroll={true}
                className="bg-background"
              >
                <View>
                  <View className="bg-background font-display py-3 px-3 border-border border-b flex-row items-center">
                    <Image
                      source={require("@/assets/images/icon-foreground.png")}
                      tintColor={colorScheme === "dark" ? "#f8f7f7" : null}
                      contentFit="contain"
                      style={{
                        width: 36,
                        height: 36,
                        transform: [{ scale: 1.5 }],
                      }}
                    ></Image>
                    <Text className="text-2xl font-bold">Coreply</Text>
                  </View>

                  <View className="flex-row justify-between p-3 border-border border-b bg-background">
                    <View className="">
                      <Text className="text-lg font-semibold">
                        {accessibilityEnabled
                          ? t`Coreply is on`
                          : t`Coreply is off`}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans">
                        {Platform.OS === "web"
                          ? accessibilityEnabled
                            ? t`Coreply suggestions are enabled in this extension`
                            : t`Tap the toggle to start Coreply in this extension`
                          : accessibilityEnabled
                            ? t`Accessibility service is enabled`
                            : t`Tap the toggle to start Coreply`}
                      </Text>
                    </View>
                    <ToggleButton
                      isOn={accessibilityEnabled}
                      onPress={handleTogglePress}
                    />
                  </View>
                </View>

                <View
                  style={styles.scrollContent}
                  className="border-x border-border mx-2 bg-background"
                >
                  <View>
                    <Text className="mb-2 text-lg px-3 font-semibold">
                      {Platform.OS === "web"
                        ? t`Select Websites`
                        : t`Select Apps`}
                    </Text>
                    <View className="px-3 pb-3">
                      <Button
                        variant="ghost"
                        className="h-auto min-h-16 w-full flex-row items-center justify-between rounded-none border border-border bg-form px-3 py-3 shadow-none"
                        onPress={() => router.push("/select-apps")}
                      >
                        <View className="h-auto flex-1 gap-1">
                          <Text className="text-left text-base text-foreground font-medium">
                            {Platform.OS === "web"
                              ? t`Select Websites`
                              : t`Select Apps`}
                          </Text>
                          <Text className="text-left text-sm text-muted-foreground font-sans">
                            {Platform.OS === "web"
                              ? t`Choose websites and customize their profiles.`
                              : t`Choose apps and customize their profiles.`}
                          </Text>
                        </View>
                        <Icon
                          as={ChevronRight}
                          className="ml-3 size-5 text-muted-foreground"
                        />
                      </Button>
                    </View>
                  </View>
                  <View className="border-t border-border pt-3">
                    <View className="mb-2 flex-row items-center justify-between gap-2 px-3">
                      <Text className="text-lg font-semibold">
                        {providerId === "coreplyCloudStateful"
                          ? t`Coreply Cloud`
                          : t`API Provider`}
                      </Text>
                      {isLoaded && providerId !== "coreplyCloudStateful" && (
                        <Button
                          variant="ghost"
                          className="px-0"
                          onPress={() =>
                            void handleProviderChange({
                              value: "coreplyCloudStateful",
                              label: "Coreply Cloud",
                            })
                          }
                        >
                          <Text>
                            <Trans>Use Coreply Cloud</Trans>
                          </Text>
                        </Button>
                      )}
                    </View>
                    {providerId !== "coreplyCloudStateful" && (
                      <View className="mb-4 px-3">
                        <ProviderSelector
                          selectedProviderKey={providerId}
                          onProviderChange={handleProviderChange}
                        />
                      </View>
                    )}
                    {isLoaded ? (
                      <View className="px-3">
                        {providerId === "coreplyCloudStateful" ? (
                          session?.user ? (
                            <View className="gap-4">
                              <CoreplyCloudUsage
                                client={billingClient}
                                userId={session.user.id}
                              >
                                <GetMoreUsageButton userId={session.user.id} />
                              </CoreplyCloudUsage>
                              <Button
                                variant="outline"
                                onPress={() => router.push("/cloud-account")}
                              >
                                <Text>
                                  <Trans>Manage account</Trans>
                                </Text>
                              </Button>
                            </View>
                          ) : session && !session.user ? (
                            <CloudSessionError
                              onRetry={() => void refetchSession()}
                            />
                          ) : sessionPending ? (
                            <Text className="text-sm text-muted-foreground">
                              <Trans>Checking your session...</Trans>
                            </Text>
                          ) : sessionError && sessionError.status !== 401 ? (
                            <CloudSessionError
                              onRetry={() => void refetchSession()}
                            />
                          ) : (
                            <CoreplyCloudSignIn
                              configured={cloudConfigured}
                              extensionSignInUrl={
                                isBrowserExtension()
                                  ? process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL
                                  : undefined
                              }
                            />
                          )
                        ) : (
                          <ProviderSettingsForm
                            providerId={providerId}
                            settings={initialProviderConfig}
                            onChange={saveProviderConfig}
                          />
                        )}
                      </View>
                    ) : null}
                    {isLoaded && providerId === "coreplyCloudStateful" && (
                      <View className="px-3">
                        <Button variant="ghost" onPress={handleUseApiKey}>
                          <Text>
                            <Trans>
                              Use an API key or third-party provider
                            </Trans>
                          </Text>
                        </Button>
                      </View>
                    )}
                  </View>
                  <View className="border-t border-border">
                    <View className="pt-3 px-3">
                      <Text
                        className="mb-2 text-lg"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        <Trans>Coreply Settings</Trans>
                      </Text>
                      {isLoaded ? (
                        <GlobalSettingsForm
                          settings={initialGlobalSettings}
                          onChange={saveGlobalSettings}
                        />
                      ) : null}
                    </View>
                  </View>
                  {initialGlobalSettings.troubleshooting.saveLogs && (
                    <View className="border-t border-border pt-3">
                      <Text className="mb-2 text-lg px-3 font-semibold">
                        <Trans>Troubleshooting</Trans>
                      </Text>
                      <View className="px-3 pb-3">
                        <Button
                          variant="ghost"
                          className="h-auto min-h-16 w-full flex-row items-center justify-between rounded-none border border-border bg-form px-3 py-3 shadow-none"
                          onPress={() => router.push("/troubleshooting-logs")}
                        >
                          <View className="h-auto flex-1 gap-1">
                            <Text className="text-left text-base text-foreground font-medium">
                              <Trans>View Logs</Trans>
                            </Text>
                            <Text className="text-left text-sm text-muted-foreground font-sans">
                              <Trans>
                                Review recent suggestion fetch details.
                              </Trans>
                            </Text>
                          </View>
                          <Icon
                            as={ChevronRight}
                            className="ml-3 size-5 text-muted-foreground"
                          />
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
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
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
