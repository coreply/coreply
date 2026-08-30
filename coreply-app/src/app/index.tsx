import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
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

import { createAsyncStorage } from "@/constants/storage";

import * as Brownfield from "@/utils/brownfield-wrapper";

import { Stack } from "expo-router";

import { ZodType } from "zod";

const storage = createAsyncStorage("coreply.settings");
const MASTER_SWITCH_KEY = "masterSwitch";

const parseJsonStringWithFallback = (
  jsonString: string | null,
  schema: ZodType,
  fallback: any,
) => {
  if (!jsonString) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(jsonString);
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch (error) {
    return fallback;
  }
  return fallback;
};

const parseJsonObjectWithFallback = (
  jsonString: string | null,
  fallback: Record<string, any>,
) => {
  if (!jsonString) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return fallback;
  }
  return fallback;
};

function usePersistedSettings() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [providerId, setProviderId] = useState<string>("coreplyCloud");
  const [initialProviderConfig, setInitialProviderConfig] = useState<
    Record<string, any>
  >({});
  const [initialGlobalSettings, setInitialGlobalSettings] =
    useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

  useEffect(() => {
    storage.getItem("providerId").then((storedProviderId) => {
      const actualProviderId = storedProviderId ?? "coreplyCloud";
      Promise.all([
        storage.getItem(`${actualProviderId}.providerConfig`),
        storage.getItem("globalSettings"),
      ]).then(([storedProviderConfig, storedGlobalSettings]) => {
        const provider =
          providerDefinitions[
            actualProviderId as keyof typeof providerDefinitions
          ];
        const parsedProviderConfig = parseJsonObjectWithFallback(
          storedProviderConfig,
          provider.settingsDefaults,
        );
        const parsedGlobalSettings = parseJsonStringWithFallback(
          storedGlobalSettings,
          globalSettingsSchema,
          DEFAULT_GLOBAL_SETTINGS,
        );

        setProviderId(actualProviderId);
        setInitialProviderConfig(parsedProviderConfig);
        setInitialGlobalSettings(parsedGlobalSettings);

        setIsLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    storage.setItem("providerId", providerId);
  }, [isLoaded, providerId]);

  const saveProviderConfig = (newSettings: Record<string, any>) => {
    const provider =
      providerDefinitions[providerId as keyof typeof providerDefinitions];

    const parsed = provider?.settingsSchema.safeParse(newSettings);
    if (!parsed?.success) {
      return;
    }

    storage.setItem(
      `${providerId}.providerConfig`,
      JSON.stringify(newSettings),
    );

    if (isLoaded && Platform.OS === "android") {
      Brownfield.sendMessage({
        type: "settingsUpdated",
        data: {
          providerId,
          providerConfig: parsed.data,
        },
      });
    }
  };

  const saveGlobalSettings = (newSettings: GlobalSettings) => {
    const parsed = globalSettingsSchema.safeParse(newSettings);
    if (!parsed.success) {
      return;
    }

    void storage.setItem("globalSettings", JSON.stringify(parsed.data));
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

    storage.getItem(MASTER_SWITCH_KEY).then((storedValue) => {
      setExtensionEnabled(storedValue !== "false");
    });
  }, []);

  const accessibilityEnabled =
    Platform.OS === "web" ? extensionEnabled : androidAccessibilityEnabled;

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || providerId;
    const storedProviderConfig = await storage.getItem(
      `${newProviderId}.providerConfig`,
    );
    const provider =
      providerDefinitions[newProviderId as keyof typeof providerDefinitions];
    const nextProviderConfig = parseJsonObjectWithFallback(
      storedProviderConfig,
      provider.settingsDefaults,
    );

    setProviderId(newProviderId);
    setInitialProviderConfig(nextProviderConfig);

    if (isLoaded && Platform.OS === "android") {
      Brownfield.sendMessage({
        type: "settingsUpdated",
        data: {
          providerId: newProviderId,
          providerConfig: nextProviderConfig,
        },
      });
    }
  };

  const handleTogglePress = () => {
    if (Platform.OS === "web") {
      const nextEnabled = !extensionEnabled;
      setExtensionEnabled(nextEnabled);
      void storage.setItem(MASTER_SWITCH_KEY, JSON.stringify(nextEnabled));
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Stack.Header hidden />
          <TextClassContext.Provider value="font-display">
            {fontsLoaded && (
              <ScrollView
                stickyHeaderIndices={[0]}
                stickyHeaderHiddenOnScroll={true}
                className="bg-background"
              >
                <View>
                  <View className="bg-background font-display py-3 px-3 border-border border-b flex-row items-center">
                    <Image
                      source={require("@/assets/images/icon-foreground.png")}
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
                        Coreply is {accessibilityEnabled ? "on" : "off"}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans">
                        {Platform.OS === "web"
                          ? accessibilityEnabled
                            ? "Coreply suggestions are enabled in this extension"
                            : "Tap the toggle to start Coreply in this extension"
                          : accessibilityEnabled
                            ? "Accessibility access is enabled"
                            : "Tap the toggle to start Coreply"}
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
                      Select Apps
                    </Text>
                    <View className="px-3 pb-3">
                      <Button
                        variant="ghost"
                        className="h-auto min-h-16 w-full flex-row items-center justify-between rounded-none border border-border bg-form px-3 py-3 shadow-none"
                        onPress={() => router.push("/select-apps")}
                      >
                        <View className="h-auto flex-1 gap-1">
                          <Text className="text-left text-base text-foreground font-medium">
                            Select Apps
                          </Text>
                          <Text className="text-left text-sm text-muted-foreground font-sans">
                            Choose apps enabling Coreply.
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
                    <Text className="mb-2 text-lg px-3 font-semibold">
                      API Provider
                    </Text>
                    <View className="px-3">
                      <ProviderSelector
                        selectedProviderKey={providerId}
                        onProviderChange={handleProviderChange}
                      />
                    </View>
                    {isLoaded ? (
                      <View className="px-3">
                        <ProviderSettingsForm
                          providerId={providerId}
                          settings={initialProviderConfig}
                          onChange={saveProviderConfig}
                        />
                      </View>
                    ) : null}
                  </View>
                  <View className="border-t border-border">
                    <View className="pt-3 px-3">
                      <Text
                        className="mb-2 text-lg"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Coreply Settings
                      </Text>
                      {isLoaded ? (
                        <GlobalSettingsForm
                          settings={initialGlobalSettings}
                          onChange={saveGlobalSettings}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </TextClassContext.Provider>
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
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
