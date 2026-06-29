import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Text, TextClassContext } from "@/components/ui/text";
import { MaxContentWidth, Spacing } from "@/constants/theme";

import "../../global.css";

export default function AccessibilityDisclosureScreen() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const router = useRouter();
  const [isLaunchingSettings, setIsLaunchingSettings] = useState(false);

  const handleAccept = async () => {
    if (isLaunchingSettings) {
      return;
    }

    setIsLaunchingSettings(true);

    try {
      if (Platform.OS === "android") {
        await startActivityAsync(ActivityAction.ACCESSIBILITY_SETTINGS);
      }

      router.back();
    } finally {
      setIsLaunchingSettings(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextClassContext.Provider value="font-sans">
          {fontsLoaded && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View
                className="flex-1 items-center px-4 py-4"
                style={styles.content}
              >
                <Image
                  source={require("@/assets/images/android-icon-foreground.png")}
                  contentFit="contain"
                  style={styles.icon}
                />

                <Text
                  className="text-center text-2xl"
                  style={{ fontFamily: "Outfit_700Bold" }}
                >
                  Accessibility Service Disclosure
                </Text>

                <Text className="text-center text-muted-foreground">
                  Please read the following disclosure carefully.
                </Text>

                <View
                  className="w-full border border-border bg-white px-4 py-4"
                  style={styles.card}
                >
                  <View style={styles.section}>
                    <Text
                      className="text-lg text-foreground"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      What data is collected
                    </Text>
                    <Text className="font-sans text-sm text-foreground ">
                      Coreply&apos;s accessibility service reads on-screen text
                      content, detects active text input fields and reads the
                      text being typed. This app may collect emails, SMS or MMS
                      messages, other in-app messages (e.g. your chat history in
                      messaging apps), and/or other user-generated content (e.g.
                      things your wrote or stored in different apps).
                    </Text>
                  </View>

                  <View style={styles.section}>
                    <Text
                      className="text-lg text-foreground"
                      style={{ fontFamily: "Outfit_600SemiBold" }}
                    >
                      How your data is shared
                    </Text>
                    <Text className="font-sans text-sm text-foreground">
                      The data described above will be sent to the API or
                      service according to your setup. The purpose of the data
                      collection/sharing described above is to generate
                      context-aware typing suggestions, which is this app&apos;s
                      core feature.
                    </Text>
                  </View>
                </View>

                <View
                  className="w-full flex-1 justify-end"
                  style={styles.buttonGroup}
                >
                  <Button
                    className="w-full"
                    onPress={handleAccept}
                    disabled={isLaunchingSettings}
                  >
                    <Text className="font-sans">
                      {isLaunchingSettings && Platform.OS === "android"
                        ? "Opening Accessibility Settings..."
                        : "I Agree & Enable"}
                    </Text>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onPress={() => router.back()}
                  >
                    <Text className="font-sans">Not now</Text>
                  </Button>
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
  },
  icon: {
    width: 60,
    height: 60,
  },
  card: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  buttonGroup: {
    gap: Spacing.two,
  },
});
