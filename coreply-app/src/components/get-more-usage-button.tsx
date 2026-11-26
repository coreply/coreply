import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { getMoreUsage, preloadPaywall } from "#manage-subscription";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GetMoreUsageButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [blocked, setBlocked] = useState<"paid" | "unavailable" | null>(null);
  useEffect(() => {
    void preloadPaywall(userId).catch(() => {});
  }, [userId]);
  const upgrade = useMutation({
    mutationFn: () =>
      getMoreUsage(userId, () => {
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ["billing", userId] });
        }, 2_000);
      }),
    onSuccess: (result) => {
      setBlocked(result);
      return queryClient.invalidateQueries({ queryKey: ["billing", userId] });
    },
  });

  return (
    <View className="">
      <Button onPress={() => upgrade.mutate()} disabled={upgrade.isPending}>
        <Text>
          <Trans comment="Button to purchase more Coreply Cloud usage">
            Get more usage
          </Trans>
        </Text>
      </Button>
      {upgrade.error && (
        <Text role="alert" className="text-sm text-destructive">
          <Trans>Couldn't open the upgrade page. Please try again.</Trans>
        </Text>
      )}
      <AlertDialog
        open={blocked !== null}
        onOpenChange={(open) => {
          if (!open) setBlocked(null);
        }}
      >
        <AlertDialogContent portalHost="coreplyPortal">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blocked === "paid" ? (
                <Trans>You already have a subscription</Trans>
              ) : (
                <Trans>Couldn't check your subscription</Trans>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blocked === "paid" ? (
                <Trans>
                  Manage your existing subscription before purchasing another
                  plan.
                </Trans>
              ) : (
                <Trans>
                  Please check your connection and try again before purchasing.
                </Trans>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              <Text>
                <Trans comment="Button to dismiss a subscription notice">
                  OK
                </Trans>
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
