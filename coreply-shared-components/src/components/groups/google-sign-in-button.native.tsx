import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { View, useColorScheme } from "react-native";
import {
  GoogleSignInButton as NativeGoogleSignInButton,
  type OneTapSuccessData,
} from "react-native-nitro-google-signin";
import { useCloudAuth } from "../../cloud/auth-context";
import { Text } from "../ui/text";

export function GoogleSignInButton() {
  const { authClient } = useCloudAuth();
  const colorScheme = useColorScheme();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signIn = useMutation({
    mutationFn: async (data: OneTapSuccessData) => {
      const result = await authClient.signIn.social({
        provider: "google",
        idToken: { token: data.idToken },
      });
      if (result.error)
        throw new Error(result.error.message ?? "Google sign-in failed.");
    },
  });
  const error = googleError ?? signIn.error?.message;

  return (
    <View className="gap-2 mx-auto">
      <NativeGoogleSignInButton
        colorScheme={colorScheme === "dark" ? "dark" : "light"}
        size="wide"
        contentAlignment="leading"
        disabled={signIn.isPending}
        onPress={() => {
          setGoogleError(null);
          signIn.reset();
        }}
        onSignInSuccess={(data) => {
          signIn.mutate(data);
        }}
        onSignInError={(cause) =>
          setGoogleError(
            cause instanceof Error ? cause.message : "Google sign-in failed.",
          )
        }
      />
      {signIn.isPending && (
        <Text className="text-sm text-muted-foreground">Signing in...</Text>
      )}
      {error && (
        <Text role="alert" className="text-sm text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
