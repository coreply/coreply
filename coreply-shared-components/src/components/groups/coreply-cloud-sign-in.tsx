import { View } from "react-native";
import { GoogleSignInButton } from "./google-sign-in-button";
import { Text } from "../ui/text";

export function CoreplyCloudSignIn({ configured }: { configured: boolean }) {
  return (
    <View className="w-full gap-5 border border-border bg-form p-5">
      <View className="gap-2">
        <Text className="font-sans text-xl font-semibold">Sign in to Coreply Cloud</Text>
        <Text className="font-sans text-sm text-muted-foreground">
          Use your account to get context-aware typing suggestions without setting up an API key.
        </Text>
      </View>
      {configured ? <GoogleSignInButton /> : (
        <Text className="text-sm text-muted-foreground">Coreply Cloud sign-in isn't configured for this app.</Text>
      )}
    </View>
  );
}
