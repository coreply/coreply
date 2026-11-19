import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";
import {
  useGoogleSignInFromButton,
  type OneTapSuccessData,
} from "react-native-nitro-google-signin";
import { useCloudAuth } from "../../cloud/auth-context";
import { Text } from "../ui/text";
import { GoogleSignInButtonAppearance } from "./google-sign-in-button-appearance";

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
  const googleSignIn = useGoogleSignInFromButton({
    behavior: "credentialManager",
    onPress: () => {
      setGoogleError(null);
      signIn.reset();
    },
    onSuccess: (data) => signIn.mutate(data),
    onError: (cause) => setGoogleError(
      cause instanceof Error ? cause.message : t`Google sign-in failed.`,
    ),
  });
  const loading = googleSignIn.loading || signIn.isPending;

  return (
    <View className="w-full items-center gap-2">
      <GoogleSignInButtonAppearance
        disabled={loading}
        loading={loading}
        label={t`Continue with Google`}
        onPress={() => {
          // The hook reports errors through onError and also rejects its promise.
          void googleSignIn.onPress().catch(() => {});
        }}
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
