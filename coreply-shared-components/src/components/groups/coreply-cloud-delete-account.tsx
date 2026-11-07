import { useState } from "react";
import { View } from "react-native";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCloudAuth } from "../../cloud/auth-context";
import type { createBillingClient } from "../../utils/hc";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Text } from "../ui/text";

export function CoreplyCloudDeleteAccount({
  client,
}: {
  client: ReturnType<typeof createBillingClient>;
}) {
  const { t } = useLingui();
  const { authClient } = useCloudAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const eligibility = useMutation({
    mutationFn: async () => {
      const response = await client["deletion-eligibility"].$get();
      const data = await response.json();
      if (!data.eligible)
        throw new Error(
          t`Cancel any active paid subscriptions and remove any scheduled paid plans before deleting your account.`,
        );
    },
    onSuccess: () => setConfirming(true),
    onError: () => setConfirming(true),
  });
  const deleteAccount = useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser();
      if (result.error)
        throw new Error(
          result.error.message ??
            t`Couldn't delete your account. Please try again.`,
        );
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["billing"] });
      queryClient.removeQueries({ queryKey: ["billing"] });
    },
  });

  return (
    <View className="w-full gap-4">
      <Text className="font-sans text-xl font-semibold">
        <Trans>Delete account</Trans>
      </Text>
      <Text className="font-sans text-sm text-muted-foreground">
        <Trans>
          Permanently delete your Coreply Cloud account and usage data.
        </Trans>
      </Text>
      <Button
        variant="destructive"
        disabled={eligibility.isPending}
        onPress={() => eligibility.mutate()}
      >
        <Text className="font-sans">
          {eligibility.isPending
            ? t`Checking subscription...`
            : t`Delete account`}
        </Text>
      </Button>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!deleteAccount.isPending) {
            setConfirming(open);
            if (!open) {
              eligibility.reset();
              deleteAccount.reset();
            }
          }
        }}
      >
        <AlertDialogContent portalHost="coreplyPortal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans">
              {eligibility.error || deleteAccount.error
                ? t`Couldn't delete account`
                : t`Delete account?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="max-w-md font-sans">
              {eligibility.error || deleteAccount.error ? (
                (eligibility.error || deleteAccount.error)?.message
              ) : (
                <Trans>
                  Your account and access will{" "}
                  <Text className="font-sans font-bold underline">
                    end immediately
                  </Text>
                  , even if your paid subscription hasn't expired. This{" "}
                  <Text className="font-sans font-bold underline">
                    cannot be undone
                  </Text>
                  .
                </Trans>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deleteAccount.isPending}
              onPress={() => {
                eligibility.reset();
                deleteAccount.reset();
                setConfirming(false);
              }}
            >
              <Text className="font-sans">
                {eligibility.error || deleteAccount.error
                  ? t({
                      message: "Close",
                      comment: "Close account deletion error dialog",
                    })
                  : t({
                      message: "Cancel",
                      comment: "Cancel account deletion",
                    })}
              </Text>
            </Button>
            {!eligibility.error && !deleteAccount.error && (
              <Button
                variant="destructive"
                disabled={deleteAccount.isPending}
                onPress={() => deleteAccount.mutate()}
              >
                <Text className="font-sans">
                  {deleteAccount.isPending
                    ? t`Deleting account...`
                    : t`Permanently delete account`}
                </Text>
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
