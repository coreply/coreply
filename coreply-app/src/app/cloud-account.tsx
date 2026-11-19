import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient, billingHeaders } from "@/cloud/auth-client";
import { CoreplyCloudDeleteAccount } from "@/components/groups/coreply-cloud-delete-account";
import { CoreplyCloudUsage } from "@/components/groups/coreply-cloud-usage";
import { CloudSessionError } from "@/components/cloud-session-error";
import { GetMoreUsageButton } from "@/components/get-more-usage-button";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Text, TextClassContext } from "@/components/ui/text";
import { MaxContentWidth } from "@/constants/theme";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";
import { manageSubscription } from "#manage-subscription";

const billingClient = createBillingClient(
  process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL!,
  billingHeaders,
);

export default function CloudAccountScreen() {
  const { t } = useLingui();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const manage = useMutation({
    mutationFn: manageSubscription,
  });
  useEffect(() => {
    if (!isPending && !session && (!error || error.status === 401)) {
      router.back();
    }
  }, [isPending, session, error, router]);
  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error)
        throw new Error(result.error.message ?? t`Couldn't sign out. Please try again.`);
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["billing"] });
      queryClient.removeQueries({ queryKey: ["billing"] });
    },
  });

  return (
    <ThemedView style={{ flex: 1, alignItems: "center" }}>
      <Stack.Screen options={{ headerShown: true, title: t`Coreply Cloud account` }} />
      <SafeAreaView style={{ flex: 1, width: "100%", maxWidth: MaxContentWidth }} edges={["bottom"]}>
        <TextClassContext.Provider value="font-display">
          <ScrollView contentContainerClassName="gap-4 p-3">
            {session?.user ? (
              <>
                <View className="gap-2">
                  <Text className="font-sans text-xl font-semibold"><Trans>Account</Trans></Text>
                  <Text className="font-sans text-sm text-muted-foreground">
                    <Trans>Signed in as {session.user.email}</Trans>
                  </Text>
                </View>
                <CoreplyCloudUsage client={billingClient} userId={session.user.id}>
                  <GetMoreUsageButton userId={session.user.id} />
                </CoreplyCloudUsage>
                <Button variant="outline" disabled={manage.isPending} onPress={() => manage.mutate(session.user.id)}>
                  <Text><Trans>Manage subscription</Trans></Text>
                </Button>
                {manage.error && (
                  <Text role="alert" className="text-sm text-destructive"><Trans>Couldn't open subscription management. Please try again.</Trans></Text>
                )}
                <Button variant="outline" onPress={() => signOut.mutate()} disabled={signOut.isPending}>
                  <Text>{signOut.isPending ? t`Signing out...` : t`Sign out`}</Text>
                </Button>
                {signOut.error && (
                  <Text role="alert" className="text-sm text-destructive">{signOut.error.message}</Text>
                )}
                <CoreplyCloudDeleteAccount client={billingClient} />
              </>
            ) : session && !session.user ? (
              <CloudSessionError onRetry={() => void refetch()} />
            ) : isPending ? (
              <Text className="text-sm text-muted-foreground"><Trans>Checking your session...</Trans></Text>
            ) : error && error.status !== 401 ? (
              <CloudSessionError onRetry={() => void refetch()} />
            ) : null}
          </ScrollView>
        </TextClassContext.Provider>
      </SafeAreaView>
    </ThemedView>
  );
}
