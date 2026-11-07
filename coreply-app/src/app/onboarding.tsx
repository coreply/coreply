import { useEffect, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Trans, useLingui } from "@lingui/react/macro";
import { Conversation, type ConversationMessage } from "coreply-shared-components/src/components/groups/demo-conversation";
import { createDemoConversation } from "coreply-shared-components/src/demo-conversations/localized";
import { CoreplyCloudSignIn } from "@/components/groups/coreply-cloud-sign-in";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Lightbulb } from "lucide-react-native";
import { authClient } from "@/cloud/auth-client";
import { cloudConfigured } from "@/cloud/config";
import { createAsyncStorage } from "@/constants/storage";
import * as Brownfield from "@/utils/brownfield-wrapper";
import * as SplashScreen from "expo-splash-screen";
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from "@expo-google-fonts/outfit";

const onboardingStorage = createAsyncStorage("coreply.onboarding");

export default function OnboardingScreen() {
  const { i18n } = useLingui();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);
  const { data: session } = authClient.useSession();
  const [accessibilityEnabled] = Platform.OS === "android"
    ? Brownfield.useSharedState("accessibilityEnabled", false)
    : [false];
  const [reply, setReply] = useState<string>();
  const [visibleMessageIds, setVisibleMessageIds] = useState<string[]>([]);
  const finishOnboarding = () => {
    void onboardingStorage.setItem("complete", "true").then(() => router.replace("/"));
  };
  const conversationId = Platform.OS === "web" ? "onboarding-browser" : "onboarding";
  const finishAction = <Button onPress={finishOnboarding}><Text><Trans comment="Finishes the onboarding process">Finish setup</Trans></Text></Button>;
  const conversation = createDemoConversation(conversationId, i18n, {
    signin: <CoreplyCloudSignIn configured={cloudConfigured} />,
    "finish-action": finishAction,
    "accessibility-action": accessibilityEnabled ? finishAction : (
      <Button onPress={() => router.push("/accessibility-disclosure")}>
        <Text><Trans>Review and enable accessibility</Trans></Text>
      </Button>
    ),
  });
  const messages: ConversationMessage[] = conversation.messages.filter((message) =>
    ["welcome", "intro", "welcome-tip"].includes(message.id),
  );

  if (reply !== undefined) {
    messages.push({ id: "reply", outgoing: true, text: reply });
    if (!session?.user) {
      messages.push(...conversation.messages.filter((message) =>
        ["signin-intro", "signin"].includes(message.id),
      ));
    } else {
      const setupMessageIds = conversationId === "onboarding-browser"
        ? ["complete", "finish-action"]
        : accessibilityEnabled
          ? ["complete", "accessibility-action"]
          : ["accessibility", "accessibility-intro", "accessibility-action"];
      messages.push(...conversation.messages.filter((message) => setupMessageIds.includes(message.id)));
    }
  }

  const nextMessage = messages.find((message) => !visibleMessageIds.includes(message.id));
  const nextMessageId = nextMessage?.id;
  const nextMessageOutgoing = nextMessage?.outgoing;
  useEffect(() => {
    if (!nextMessageId) return;
    const timer = setTimeout(() => {
      setVisibleMessageIds((current) => [...current, nextMessageId]);
    }, nextMessageOutgoing ? 0 : 700);
    return () => clearTimeout(timer);
  }, [nextMessageId, nextMessageOutgoing]);

  return (
    <View className="flex-1 bg-form">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <View className="flex-row items-center justify-between border-b border-border bg-form px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Image
                source={require("@/assets/images/icon-foreground.png")}
                tintColor={colorScheme === "dark" ? "#f8f7f7" : null}
                contentFit="contain"
                style={{ width: 36, height: 36, transform: [{ scale: 1.5 }] }}
              />
              <Text className="font-sans text-xl font-bold"><Trans comment="Title of the conversation that introduces Coreply">Onboarding chat</Trans></Text>
            </View>
            <Button variant="ghost" onPress={finishOnboarding}>
              <Text><Trans comment="Button that skips onboarding and opens the app">Skip</Trans></Text>
            </Button>
          </View>
          <View className="w-full flex-1">
            <Conversation
              title={conversation.title}
              fullScreen
              receiveColor={colorScheme === "dark" ? "#42615d" : "#d4e0dd"}
              receiveTextColor={colorScheme === "dark" ? "#d4e0dd" : "#172d2b"}
              composerTip={
                <View className="flex-row items-center gap-2 border border-border bg-card p-3">
                  <Icon as={Lightbulb} className="size-4 text-card-foreground" />
                  <Text className="flex-1 font-sans text-sm text-card-foreground"><Trans>Tap a suggestion to insert the next word, or hold it to insert the whole suggestion.</Trans></Text>
                </View>
              }
              messages={messages.filter((message) => visibleMessageIds.includes(message.id))}
              composerEnabled={reply === undefined && visibleMessageIds.includes("welcome-tip")}
              suggestion={{ url: process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL!, conversationId: "onboarding" }}
              onSend={setReply}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
