import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ProviderSelector,
  ProviderSettingsForm,
  GenerationSettingsForm,
  FetchControlForm,
  PresentationForm,
} from "@/components/groups";
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_FETCH_CONTROL_SETTINGS,
  DEFAULT_PRESENTATION_SETTINGS,
  globalSettingsSchema,
  fetchControlSettingsSchema,
  presentationSettingsSchema,
} from "libcoreply";
import { ToggleButton } from "@/components/groups/toggle-button";
import type { Option } from "@/components/ui/select";
import { View } from "react-native";
import { Text, TextClassContext } from "@/components/ui/text";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";

import "../../global.css";
import { Icon } from "@/components/ui/icon";
import { Portal } from "@rn-primitives/portal";

const storage = createAsyncStorage("coreply.settings");

import type { FetchControlSettings, PresentationSettings } from "libcoreply";

function usePersistedSettings() {
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
      const actualProviderId = storedProviderId || "openaiCompatible";
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
          console.log("Loaded settings from storage:", {
            providerId: actualProviderId,
            providerSettings: storedProviderSettings,
            generationSettings: storedGenerationSettings,
            globalSettings: storedGlobalSettings,
          });

          setProviderId(actualProviderId);
          setProviderSettings(
            storedProviderSettings ? JSON.parse(storedProviderSettings) : {},
          );
          setGenerationSettings(
            storedGenerationSettings
              ? JSON.parse(storedGenerationSettings)
              : {},
          );

          if (storedGlobalSettings) {
            const parsedGlobal = JSON.parse(storedGlobalSettings);
            const validatedGlobal = globalSettingsSchema.parse(parsedGlobal);
            setFetchControlSettings(
              fetchControlSettingsSchema.parse(validatedGlobal),
            );
            setPresentationSettings(
              presentationSettingsSchema.parse(validatedGlobal),
            );
          }
        },
      );
    });
  }, []);

  useEffect(() => {
    storage.setItem("providerId", providerId);
  }, [providerId]);

  useEffect(() => {
    storage.setItem(
      `${providerId}.providerSettings`,
      JSON.stringify(providerSettings),
    );
  }, [providerId, providerSettings]);

  useEffect(() => {
    storage.setItem(
      `${providerId}.generationSettings`,
      JSON.stringify(generationSettings),
    );
  }, [providerId, generationSettings]);

  useEffect(() => {
    const merged = { ...fetchControlSettings, ...presentationSettings };
    storage.setItem(
      "globalSettings",
      JSON.stringify(globalSettingsSchema.parse(merged)),
    );
  }, [fetchControlSettings, presentationSettings]);

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
  console.log("# SettingsScreen rendered"); // Debug log to check when the component renders
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || providerId;
    const [storedProviderSettings, storedGenerationSettings] =
      await Promise.all([
        storage.getItem(`${newProviderId}.providerSettings`),
        storage.getItem(`${newProviderId}.generationSettings`),
      ]);
    setProviderId(newProviderId);
    setProviderSettings(
      storedProviderSettings ? JSON.parse(storedProviderSettings) : {},
    );
    setGenerationSettings(
      storedGenerationSettings ? JSON.parse(storedGenerationSettings) : {},
    );
  };

  return (
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
                      Coreply is not running
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Tap the toggle to start Coreply
                    </Text>
                  </View>
                  <ToggleButton />
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
