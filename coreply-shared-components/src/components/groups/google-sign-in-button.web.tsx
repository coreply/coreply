import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";
import { useCloudAuth } from "../../cloud/auth-context";
import { Button } from "../ui/button";
import { Text } from "../ui/text";

export function GoogleSignInButton() {
  const { authClient, callbackURL } = useCloudAuth();
  const signIn = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed.");
    },
  });

  return (
    <View className="gap-2">
      <Button variant="outline" className="w-full" disabled={signIn.isPending} onPress={() => signIn.mutate()}>
        <Text>{signIn.isPending ? "Connecting..." : "Continue with Google"}</Text>
      </Button>
      {signIn.error && <Text role="alert" className="text-sm text-destructive">{signIn.error.message}</Text>}
    </View>
  );
}
