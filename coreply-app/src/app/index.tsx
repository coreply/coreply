import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ProviderSelector,
  ProviderSettingsForm,
  GenerationSettingsForm,
  FetchControlForm,
  PresentationForm,
} from "@/components/groups";
import {
  DEFAULT_FETCH_CONTROL_SETTINGS,
  DEFAULT_PRESENTATION_SETTINGS,
  globalSettingsSchema,
  fetchControlSettingsSchema,
  presentationSettingsSchema,
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

import type { FetchControlSettings, PresentationSettings } from "libcoreply";

import { createAsyncStorage } from "@/constants/storage";

import * as Brownfield from "@/utils/brownfield-wrapper";

import { Stack } from "expo-router";

import { ZodType } from "zod";

const storage = createAsyncStorage("coreply.settings");

const parseJsonStringWithFallback = (
  jsonString: string | null,
  schema: ZodType,
  fallback: any,
) => {
  try {
    const parsed = JSON.parse(jsonString ?? "{}");
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch (error) {
    return fallback;
  }
  return fallback;
};

function usePersistedSettings() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [providerId, setProviderId] = useState<string>("openaiCompatible");
  const [initialProviderSettings, setInitialProviderSettings] = useState<
    Record<string, any>
  >({});
  const [initialGenerationSettings, setInitialGenerationSettings] = useState<
    Record<string, any>
  >({});
  const [initialFetchControlSettings, setInitialFetchControlSettings] =
    useState<FetchControlSettings>(DEFAULT_FETCH_CONTROL_SETTINGS);
  const [initialPresentationSettings, setInitialPresentationSettings] =
    useState<PresentationSettings>(DEFAULT_PRESENTATION_SETTINGS);

  useEffect(() => {
    storage.getItem("providerId").then((storedProviderId) => {
      const actualProviderId = storedProviderId ?? "openaiCompatible";
      Promise.all([
        storage.getItem(`${actualProviderId}.providerSettings`),
        storage.getItem(`${actualProviderId}.generationSettings`),
        storage.getItem("globalSettings"),
      ]).then(
        ([
          storedProviderSettings,
          storedGenerationSettings,
          storedGlobalSettings,
        ]) => {
          const provider =
            providerDefinitions[
              actualProviderId as keyof typeof providerDefinitions
            ];
          const parsedProviderSettings = parseJsonStringWithFallback(
            storedProviderSettings,
            provider.providerSettingsSchema,
            {},
          );
          const parsedGenerationSettings = parseJsonStringWithFallback(
            storedGenerationSettings,
            provider.generationSettingsSchema,
            {},
          );
          const parsedGlobalSettings = parseJsonStringWithFallback(
            storedGlobalSettings,
            globalSettingsSchema,
            {},
          );

          setProviderId(actualProviderId);
          setInitialProviderSettings(parsedProviderSettings);
          setInitialGenerationSettings(parsedGenerationSettings);

          if (parsedGlobalSettings) {
            const validatedGlobalResult =
              globalSettingsSchema.safeParse(parsedGlobalSettings);
            if (!validatedGlobalResult.success) {
              return;
            }

            const validatedGlobal = validatedGlobalResult.data;
            setInitialFetchControlSettings(
              fetchControlSettingsSchema.parse(validatedGlobal),
            );
            setInitialPresentationSettings(
              presentationSettingsSchema.parse(validatedGlobal),
            );
          }

          setIsLoaded(true);
        },
      );
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    storage.setItem("providerId", providerId);
  }, [isLoaded, providerId]);

  const saveProviderSettings = (newSettings: Record<string, any>) => {
    const provider =
      providerDefinitions[providerId as keyof typeof providerDefinitions];
    const parsed = provider?.providerSettingsSchema.safeParse(newSettings);
    if (!parsed?.success) {
      return;
    }

    storage.setItem(
      `${providerId}.providerSettings`,
      JSON.stringify(parsed.data),
    );
    if (isLoaded && Platform.OS === "android") {
      Brownfield.sendMessage({
        type: "settingsUpdated",
        data: {
          providerId,
          providerSettings: parsed.data,
        },
      });
    }
  };

  const saveGenerationSettings = (newSettings: Record<string, any>) => {
    const parsed =
      providerDefinitions[
        providerId as keyof typeof providerDefinitions
      ]?.generationSettingsSchema.safeParse(newSettings);
    if (!parsed?.success) {
      return;
    }

    storage.setItem(
      `${providerId}.generationSettings`,
      JSON.stringify(parsed.data),
    );
    if (isLoaded && Platform.OS === "android") {
      Brownfield.sendMessage({
        type: "settingsUpdated",
        data: {
          providerId,
          generationSettings: parsed.data,
        },
      });
    }
  };

  const saveFetchControlSettings = (newSettings: FetchControlSettings) => {
    const parsed = fetchControlSettingsSchema.safeParse(newSettings);
    if (!parsed.success) {
      return;
    }

    void storage.getItem("globalSettings").then((storedGlobalSettings) => {
      const currentGlobalSettings = parseJsonStringWithFallback(
        storedGlobalSettings,
        globalSettingsSchema,
        {},
      );
      const mergedGlobalSettings = globalSettingsSchema.parse({
        ...currentGlobalSettings,
        ...parsed.data,
      });
      void storage.setItem(
        "globalSettings",
        JSON.stringify(mergedGlobalSettings),
      );
      if (isLoaded && Platform.OS === "android") {
        Brownfield.sendMessage({
          type: "settingsUpdated",
          data: {
            providerId,
            globalSettings: mergedGlobalSettings,
          },
        });
      }
    });
  };

  const savePresentationSettings = (newSettings: PresentationSettings) => {
    const parsed = presentationSettingsSchema.safeParse(newSettings);
    if (!parsed.success) {
      return;
    }

    void storage.getItem("globalSettings").then((storedGlobalSettings) => {
      const currentGlobalSettings = parseJsonStringWithFallback(
        storedGlobalSettings,
        globalSettingsSchema,
        {},
      );
      const mergedGlobalSettings = globalSettingsSchema.parse({
        ...currentGlobalSettings,
        ...parsed.data,
      });
      void storage.setItem(
        "globalSettings",
        JSON.stringify(mergedGlobalSettings),
      );
      if (isLoaded && Platform.OS === "android") {
        Brownfield.sendMessage({
          type: "settingsUpdated",
          data: {
            providerId,
            globalSettings: mergedGlobalSettings,
          },
        });
      }
    });
  };

  return {
    providerId,
    setProviderId,
    initialProviderSettings,
    initialGenerationSettings,
    initialFetchControlSettings,
    initialPresentationSettings,
    setInitialProviderSettings,
    setInitialGenerationSettings,
    setInitialFetchControlSettings,
    setInitialPresentationSettings,
    saveProviderSettings,
    saveGenerationSettings,
    saveFetchControlSettings,
    savePresentationSettings,
  };
}

export default function SettingsScreen() {
  const [accessibilityEnabled] =
    Platform.OS === "android"
      ? Brownfield.useSharedState("accessibilityEnabled", false)
      : [false];
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const router = useRouter();
  const {
    providerId,
    setProviderId,
    initialProviderSettings,
    initialGenerationSettings,
    initialFetchControlSettings,
    initialPresentationSettings,
    setInitialProviderSettings,
    setInitialGenerationSettings,
    saveProviderSettings,
    saveGenerationSettings,
    saveFetchControlSettings,
    savePresentationSettings,
  } = usePersistedSettings();

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || providerId;
    const [storedProviderSettings, storedGenerationSettings] =
      await Promise.all([
        storage.getItem(`${newProviderId}.providerSettings`),
        storage.getItem(`${newProviderId}.generationSettings`),
      ]);
    const provider =
      providerDefinitions[newProviderId as keyof typeof providerDefinitions];

    setProviderId(newProviderId);
    setInitialProviderSettings(
      parseJsonStringWithFallback(
        storedProviderSettings,
        provider.providerSettingsSchema,
        {},
      ),
    );
    setInitialGenerationSettings(
      parseJsonStringWithFallback(
        storedGenerationSettings,
        provider.generationSettingsSchema,
        {},
      ),
    );
  };

  const handleTogglePress = () => {
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
                      source={require("@/assets/images/android-icon-foreground.png")}
                      contentFit="contain"
                      style={{
                        width: 36,
                        height: 36,
                        transform: [{ scale: 1.5 }],
                      }}
                    ></Image>
                    <Text
                      className="text-2xl"
                      style={{ fontFamily: "Outfit_700Bold" }}
                    >
                      Coreply
                    </Text>
                  </View>

                  <View className="flex-row justify-between p-3 border-border border-b bg-background">
                    <View className="">
                      <Text
                        className="text-lg"
                        style={{ fontFamily: "Outfit_600SemiBold" }}
                      >
                        Coreply is {accessibilityEnabled ? "on" : "off"}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans">
                        {accessibilityEnabled
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
                    <Text
                      className="mb-2 text-lg px-3"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      Select Apps
                    </Text>
                    <View className="px-3">
                      <Button
                        variant="ghost"
                        className="h-auto min-h-16 w-full flex-row items-center justify-between rounded-none border border-border bg-form px-4 py-4 shadow-none"
                        onPress={() => router.push("/select-apps")}
                      >
                        <View className="h-auto flex-1 gap-1">
                          <Text className="text-left text-base text-foreground">
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
                  <View>
                    <View className="px-3">
                      <ProviderSelector
                        selectedProviderKey={providerId}
                        onProviderChange={handleProviderChange}
                      />
                    </View>
                    <View className="px-3">
                      <ProviderSettingsForm
                        providerId={providerId}
                        settings={initialProviderSettings}
                        onChange={saveProviderSettings}
                      />
                    </View>
                    <View className="p-3">
                      <GenerationSettingsForm
                        providerId={providerId}
                        settings={initialGenerationSettings}
                        onChange={saveGenerationSettings}
                      />
                    </View>
                  </View>
                  <View className="pt-3 border-t border-border">
                    <Text
                      className="mb-2 text-lg px-3"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      Coreply Settings
                    </Text>
                    <View className="p-3">
                      <FetchControlForm
                        settings={initialFetchControlSettings}
                        onChange={saveFetchControlSettings}
                      />
                    </View>
                    <View className="p-3">
                      <PresentationForm
                        settings={initialPresentationSettings}
                        onChange={savePresentationSettings}
                      />
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
    fontFamily: "Outfit_400Regular",
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
