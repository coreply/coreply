import { View } from "react-native";
import { GoogleSignInButton } from "./google-sign-in-button";
import { GithubSignInButton } from "./github-sign-in-button";
import { Text } from "../ui/text";
import { Button } from "../ui/button";
import { Trans } from "@lingui/react/macro";

export function CoreplyCloudSignIn({ configured, extensionSignInUrl }: { configured: boolean; extensionSignInUrl?: string }) {
  return (
    <View className="w-full gap-5 border border-border bg-form p-5">
      <View className="gap-2">
        <Text className="font-sans text-xl font-semibold"><Trans>Sign in to Coreply Cloud</Trans></Text>
        <Text className="font-sans text-sm text-muted-foreground">
          <Trans>Sign in to get typing suggestions tailored to your conversations.</Trans>
        </Text>
      </View>
      {configured ? (extensionSignInUrl ? (
        <Button
          variant="outline"
          className="h-10 w-full max-w-[400px] self-center rounded-[4px] sm:h-10"
          onPress={() => {
            const url = new URL(extensionSignInUrl);
            url.searchParams.set("close_tab", "true");
            window.open(url.href, "_blank", "noopener,noreferrer");
          }}
        >
          <Text><Trans>Open Coreply Cloud to sign in</Trans></Text>
        </Button>
      ) : (
        <View className="w-full max-w-[400px] self-center gap-2">
          <GoogleSignInButton />
          <GithubSignInButton />
        </View>
      )) : (
        <Text className="text-sm text-muted-foreground"><Trans>Coreply Cloud sign-in isn't configured for this app.</Trans></Text>
      )}
    </View>
  );
}
