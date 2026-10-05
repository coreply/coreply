import { useState } from "react";
import { Image, View, useColorScheme } from "react-native";
import { Button } from "../ui/button";
import { Text } from "../ui/text";

const socialProviders = [
  { name: "Google", logo: "google", tint: false },
  { name: "GitHub", logo: "github", tint: true },
] as const;

export function CoreplyCloudSignIn() {
  const colorScheme = useColorScheme();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <View className="w-full gap-5 border border-border bg-form p-5">
      <View className="gap-2">
        <Text className="font-sans text-xl font-semibold">Sign in to Coreply Cloud</Text>
        <Text className="font-sans text-sm text-muted-foreground">
          Use your account to get context-aware typing suggestions without setting up an API key.
        </Text>
      </View>
      <View className="gap-3">
        {socialProviders.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            className="w-full gap-3"
            onPress={() => setSelectedProvider(provider.name)}
          >
            <Image
              source={{ uri: `https://img.clerk.com/static/${provider.logo}.png?width=160` }}
              style={{
                width: 20,
                height: 20,
                ...(provider.tint ? { tintColor: colorScheme === "dark" ? "white" : "black" } : {}),
              }}
              accessibilityIgnoresInvertColors
              accessible={false}
            />
            <Text className="font-sans text-sm font-medium">Continue with {provider.name}</Text>
          </Button>
        ))}
      </View>
      <Text className="font-sans text-xs text-muted-foreground" accessibilityLiveRegion="polite">
        {selectedProvider
          ? `${selectedProvider} sign-in is not connected yet. This is a UI preview.`
          : "Preview only. Sign-in and Cloud suggestions are not connected yet."}
      </Text>
    </View>
  );
}
