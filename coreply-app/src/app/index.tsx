import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AppState,
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
import type { Option } from "@/components/ui/select";
import { View } from "react-native";
import { Text, TextClassContext } from "@/components/ui/text";

import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";

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
import type { ZodSchema } from "zod";

import CoreplyModule from "@/modules/coreply-module/src/CoreplyModule";

const storage = createAsyncStorage("coreply.settings");

function parseStoredJson(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function parseStoredObject<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  value: unknown,
  fallback: T,
) {
  const candidate = value && typeof value === "object" ? value : {};
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

type ProviderDefinition =
  (typeof providerDefinitions)[keyof typeof providerDefinitions];

function getValidProviderId(providerId: string | null | undefined) {
  if (providerId && providerId in providerDefinitions) {
    return providerId as keyof typeof providerDefinitions;
  }

  return "openaiCompatible" as const;
}

function usePersistedSettings() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [providerId, setProviderId] = useState<string>("openaiCompatible");
  const [providerSettings, setProviderSettings] = useState<Record<string, any>>(
    {},
  );
  const [generationSettings, setGenerationSettings] = useState<
    Record<string, any>
  >({});
  const [fetchControlSettings, setFetchControlSettings] =
    useState<FetchControlSettings>(DEFAULT_FETCH_CONTROL_SETTINGS);
  const [presentationSettings, setPresentationSettings] =
    useState<PresentationSettings>(DEFAULT_PRESENTATION_SETTINGS);

  useEffect(() => {
    storage.getItem("providerId").then((storedProviderId) => {
      const actualProviderId = getValidProviderId(storedProviderId);
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
          const parsedProviderSettings = parseStoredJson(
            storedProviderSettings,
          );
          const parsedGenerationSettings = parseStoredJson(
            storedGenerationSettings,
          );
          const parsedGlobalSettings = parseStoredJson(storedGlobalSettings);

          const providerDefinition = providerDefinitions[
            actualProviderId as keyof typeof providerDefinitions
          ] as ProviderDefinition | undefined;

          setProviderId(actualProviderId);
          setProviderSettings(
            providerDefinition
              ? parseStoredObject(
                  providerDefinition.providerSettingsSchema,
                  parsedProviderSettings,
                  {},
                )
              : {},
          );
          setGenerationSettings(
            providerDefinition
              ? parseStoredObject(
                  providerDefinition.generationSettingsSchema,
                  parsedGenerationSettings,
                  {},
                )
              : {},
          );

          if (parsedGlobalSettings) {
            const validatedGlobalResult =
              globalSettingsSchema.safeParse(parsedGlobalSettings);
            if (!validatedGlobalResult.success) {
              return;
            }

            const validatedGlobal = validatedGlobalResult.data;
            setFetchControlSettings(
              fetchControlSettingsSchema.parse(validatedGlobal),
            );
            setPresentationSettings(
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

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const parsed =
      providerDefinitions[
        providerId as keyof typeof providerDefinitions
      ]?.providerSettingsSchema.safeParse(providerSettings);

    if (!parsed?.success) {
      return;
    }

    storage.setItem(
      `${providerId}.providerSettings`,
      JSON.stringify(parsed.data),
    );
  }, [isLoaded, providerId, providerSettings]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const parsed =
      providerDefinitions[
        providerId as keyof typeof providerDefinitions
      ]?.generationSettingsSchema.safeParse(generationSettings);

    if (!parsed?.success) {
      return;
    }

    storage.setItem(
      `${providerId}.generationSettings`,
      JSON.stringify(parsed.data),
    );
  }, [isLoaded, providerId, generationSettings]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const merged = { ...fetchControlSettings, ...presentationSettings };
    storage.setItem(
      "globalSettings",
      JSON.stringify(globalSettingsSchema.parse(merged)),
    );
  }, [fetchControlSettings, isLoaded, presentationSettings]);

  return {
    providerId,
    setProviderId,
    providerSettings,
    setProviderSettings,
    generationSettings,
    setGenerationSettings,
    fetchControlSettings,
    setFetchControlSettings,
    presentationSettings,
    setPresentationSettings,
  };
}

export default function SettingsScreen() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const router = useRouter();
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(() =>
    CoreplyModule.isAccessibilityEnabled(),
  );
  const {
    providerId,
    setProviderId,
    providerSettings,
    setProviderSettings,
    generationSettings,
    setGenerationSettings,
    fetchControlSettings,
    setFetchControlSettings,
    presentationSettings,
    setPresentationSettings,
  } = usePersistedSettings();

  const refreshAccessibilityState = useCallback(() => {
    setIsAccessibilityEnabled(CoreplyModule.isAccessibilityEnabled());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAccessibilityState();
    }, [refreshAccessibilityState]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshAccessibilityState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshAccessibilityState]);

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || providerId;
    const [storedProviderSettings, storedGenerationSettings] =
      await Promise.all([
        storage.getItem(`${newProviderId}.providerSettings`),
        storage.getItem(`${newProviderId}.generationSettings`),
      ]);
    const providerDefinition = providerDefinitions[
      newProviderId as keyof typeof providerDefinitions
    ] as ProviderDefinition | undefined;

    setProviderId(newProviderId);
    setProviderSettings(
      providerDefinition
        ? parseStoredObject(
            providerDefinition.providerSettingsSchema,
            parseStoredJson(storedProviderSettings),
            {},
          )
        : {},
    );
    setGenerationSettings(
      providerDefinition
        ? parseStoredObject(
            providerDefinition.generationSettingsSchema,
            parseStoredJson(storedGenerationSettings),
            {},
          )
        : {},
    );
  };

  const handleTogglePress = useCallback(() => {
    if (isAccessibilityEnabled) {
      CoreplyModule.requestDisableAccessibility();
      setIsAccessibilityEnabled(false);
      return;
    }

    router.push("/accessibility-disclosure");
  }, [isAccessibilityEnabled, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TextClassContext.Provider value="font-display">
            {fontsLoaded && (
              <ScrollView
                stickyHeaderIndices={[0]}
                stickyHeaderHiddenOnScroll={true}
              >
                <View>
                  <View className="bg-background font-display py-3 px-3 border-border border-b">
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
                        Coreply is {isAccessibilityEnabled ? "on" : "off"}
                      </Text>
                      <Text className="text-xs text-muted-foreground font-sans">
                        {isAccessibilityEnabled
                          ? "Accessibility access is enabled"
                          : "Tap the toggle to start Coreply"}
                      </Text>
                    </View>
                    <ToggleButton
                      isOn={isAccessibilityEnabled}
                      onPress={handleTogglePress}
                    />
                  </View>
                </View>

                <View
                  style={styles.scrollContent}
                  className="border-x border-border mx-2"
                >
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
                        settings={providerSettings}
                        onChange={setProviderSettings}
                      />
                    </View>
                    <View className="p-3">
                      <GenerationSettingsForm
                        providerId={providerId}
                        settings={generationSettings}
                        onChange={setGenerationSettings}
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
                        settings={fetchControlSettings}
                        onChange={setFetchControlSettings}
                      />
                    </View>
                    <View className="p-3">
                      <PresentationForm
                        settings={presentationSettings}
                        onChange={setPresentationSettings}
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
