import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";
import {
  GoogleSignInButton as NativeGoogleSignInButton,
  type OneTapSuccessData,
} from "react-native-nitro-google-signin";
import { useCloudAuth } from "../../cloud/auth-context";
import { Text } from "../ui/text";

export function GoogleSignInButton() {
  const { t } = useLingui();
  const { authClient } = useCloudAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signIn = useMutation({
    mutationFn: async (data: OneTapSuccessData) => {
      const result = await authClient.signIn.social({
        provider: "google",
        idToken: { token: data.idToken },
      });
      if (result.error)
        throw new Error(result.error.message ?? t`Google sign-in failed.`);
    },
  });
  const error = googleError ?? signIn.error?.message;

  return (
    <View className="w-full items-center gap-2">
      <NativeGoogleSignInButton
        colorScheme="light"
        size="wide"
        style={{ width: "100%" }}
        contentAlignment="center"
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
            cause instanceof Error ? cause.message : t`Google sign-in failed.`,
          )
        }
      />
      {signIn.isPending && (
        <Text className="text-sm text-muted-foreground"><Trans>Signing in...</Trans></Text>
      )}
      {error && (
        <Text role="alert" className="text-sm text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
