import { useMutation } from "@tanstack/react-query";
import { useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { useCloudAuth } from "../../cloud/auth-context";
import { GoogleSignInButtonAppearance } from "./google-sign-in-button-appearance";
import { Text } from "../ui/text";

export function GoogleSignInButton() {
  const { t } = useLingui();
  const { authClient, callbackURL } = useCloudAuth();
  const signIn = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result.error) throw new Error(result.error.message ?? t`Google sign-in failed.`);
    },
  });

  return (
    <View className="w-full gap-2">
      <GoogleSignInButtonAppearance
        disabled={signIn.isPending}
        loading={signIn.isPending}
        label={t`Continue with Google`}
        onPress={() => signIn.mutate()}
      />
      {signIn.error && <Text role="alert" className="text-sm text-destructive">{signIn.error.message}</Text>}
    </View>
  );
}
