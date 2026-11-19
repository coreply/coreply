import { useMutation } from "@tanstack/react-query";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { View } from "react-native";
import { useUniwind } from "uniwind";
import { useCloudAuth } from "../../cloud/auth-context";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { GithubLogo } from "./github-logo";

export function GithubSignInButton() {
  const { t } = useLingui();
  const { theme } = useUniwind();
  const foreground = theme === "dark" ? "#ffffff" : "#000000";
  const background = theme === "dark" ? "#000000" : "#ffffff";
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { authClient, callbackURL } = useCloudAuth();
  const signIn = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({ provider: "github", callbackURL });
      if (result.error) throw new Error(result.error.message ?? t`GitHub sign-in failed.`);
    },
  });

  return (
    <View className="w-full gap-2">
      <Button
        variant="outline"
        className="h-10 w-full gap-[10px] overflow-hidden rounded-[4px] sm:h-10"
        style={{ backgroundColor: background, borderColor: foreground }}
        disabled={signIn.isPending}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={() => signIn.mutate()}
      >
        {({ pressed }) => (
          <>
            <View
              pointerEvents="none"
              className="absolute inset-0"
              style={{
                backgroundColor: foreground,
                opacity: signIn.isPending ? 0 : pressed || focused ? 0.08 : hovered ? 0.05 : 0,
              }}
            />
            <GithubLogo color={foreground} />
            <Text style={{ color: foreground }}>{signIn.isPending ? t`Connecting...` : t`Continue with GitHub`}</Text>
          </>
        )}
      </Button>
      {signIn.error && <Text role="alert" className="text-sm text-destructive">{signIn.error.message}</Text>}
    </View>
  );
}
