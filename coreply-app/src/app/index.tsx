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

const storage = createAsyncStorage("coreply.settings");

type SettingsState = {
  providerId: string;
  providerSettings: Record<string, string | number | boolean>;
  generationSettings: Record<string, string | number | boolean>;
};

function usePersistedSettings() {
  const [settings, setSettings] = useState<SettingsState>({
    providerId: "openaiCompatible",
    providerSettings: {},
    generationSettings: {
      showErrors: true,
      suggestionPresentationType: "both",
      typingRegexEnabled: false,
      typingRegexPattern: "^.*[\\s.!?,;:]$",
      debounceMs: 350,
    },
  });

  useEffect(() => {
    Promise.all([
      storage.getItem("providerId"),
      storage.getItem(`${settings.providerId}.providerSettings`),
      storage.getItem(`${settings.providerId}.generationSettings`),
    ]).then(([providerId, providerSettings, generationSettings]) => {
      setSettings({
        providerId: providerId || "openaiCompatible",
        providerSettings: providerSettings ? JSON.parse(providerSettings) : {},
        generationSettings: generationSettings
          ? JSON.parse(generationSettings)
          : {},
      });
    });
  }, []);

  useEffect(() => {
    storage.setItem("providerId", settings.providerId);
    storage.setItem(
      `${settings.providerId}.providerSettings`,
      JSON.stringify(settings.providerSettings),
    );
    storage.setItem(
      `${settings.providerId}.generationSettings`,
      JSON.stringify(settings.generationSettings),
    );
  }, [settings]);

  return { settings, setSettings };
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
  const { settings, setSettings } = usePersistedSettings();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Convert settings to form data structure
  const formData = {
    providerId: settings.providerId,
    providerSettings: settings.providerSettings,
    generationSettings: settings.generationSettings,
  };

  // Handle form changes
  const handleFormChange = (data: {
    providerId: string;
    providerSettings: Record<string, string | number | boolean>;
    generationSettings: Record<string, string | number | boolean>;
  }) => {
    setSettings({
      providerId: data.providerId,
      providerSettings: data.providerSettings,
      generationSettings: data.generationSettings,
    });
  };

  // Handle provider change - load saved settings for the new provider
  const handleProviderChange = async (option: Option) => {
    const newProviderId = option?.value || formData.providerId;
    const [providerSettings, generationSettings] = await Promise.all([
      storage.getItem(`${newProviderId}.providerSettings`),
      storage.getItem(`${newProviderId}.generationSettings`),
    ]);

    handleFormChange({
      providerId: newProviderId,
      providerSettings: providerSettings ? JSON.parse(providerSettings) : {},
      generationSettings: generationSettings
        ? JSON.parse(generationSettings)
        : {},
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextClassContext.Provider value="font-display">
          <ScrollView
            stickyHeaderIndices={[0]}
            stickyHeaderHiddenOnScroll={true}
          >
            <View>
              <View className="bg-background font-display py-3 px-3 border-gray-300 border-b">
                <Text
                  className="text-2xl"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  Coreply
                </Text>
              </View>

              <View className="flex-row justify-between p-3 border-gray-300 border-b bg-background">
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
              className="border-x border-gray-300 mx-2"
            >
              <View>
                <View className="px-3">
                  <ProviderSelector
                    selectedProviderKey={formData.providerId}
                    onProviderChange={handleProviderChange}
                  />
                </View>
                <View className="px-3">
                  <ProviderSettingsForm
                    providerId={formData.providerId}
                    settings={formData.providerSettings}
                    onChange={(providerSettings) =>
                      handleFormChange({
                        ...formData,
                        providerSettings,
                      })
                    }
                  />
                </View>
                <View className="p-3">
                  <GenerationSettingsForm
                    providerId={formData.providerId}
                    settings={formData.generationSettings}
                    onChange={(generationSettings) =>
                      handleFormChange({
                        ...formData,
                        generationSettings,
                      })
                    }
                  />
                </View>
              </View>
              <View className="pt-3 border-t border-gray-300">
                <Text
                  className="mb-2 text-lg px-3"
                  style={{ fontFamily: "Outfit_600SemiBold" }}
                >
                  Coreply Settings
                </Text>
                <View className="p-3">
                  <FetchControlForm
                    settings={formData.generationSettings}
                    onChange={
                      (fetchControlSettings) => {}
                      // handleFormChange({
                      //   ...formData,
                      //   generationSettings: {
                      //     ...formData.generationSettings,
                      //     ...fetchControlSettings,
                      //   },
                      // })
                    }
                  />
                </View>
                <View className="p-3">
                  <PresentationForm
                    settings={formData.generationSettings}
                    onChange={
                      (presentationSettings) => {}
                      // handleFormChange({
                      //   ...formData,
                      //   generationSettings: {
                      //     ...formData.generationSettings,
                      //     ...presentationSettings,
                      //   },
                      // })
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </TextClassContext.Provider>
      </SafeAreaView>
    </ThemedView>
  );
  // return (
  //   <ThemedView style={styles.container}>
  //     <SafeAreaView style={styles.safeArea}>
  //       <ScrollView>
  //         <Text>Coreply Settings</Text>
  //       </ScrollView>
  //     </SafeAreaView>
  //   </ThemedView>
  // );
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
