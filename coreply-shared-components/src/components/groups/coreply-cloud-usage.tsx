import { View } from "react-native";
import type { ReactNode } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, RefreshCw } from "lucide-react-native";
import type { createBillingClient } from "../../utils/hc";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";
import { Text } from "../ui/text";

function UsageMeter({
  label,
  period,
  allowance,
  remaining,
}: {
  label: string;
  period: "daily" | "monthly";
  allowance: number;
  remaining: number;
}) {
  const { t } = useLingui();
  const percentage = Math.max(0, Math.min(100, (remaining / allowance) * 100));
  const display =
    percentage > 0 && percentage < 1 ? "<1" : String(Math.floor(percentage));
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="font-sans text-base font-medium">{label}</Text>
        <Text className="font-sans text-sm font-medium text-foreground">
          <Trans>{display}% remaining</Trans>
        </Text>
      </View>
      <Progress
        value={percentage}
        accessibilityLabel={t`${label}: ${display}% remaining`}
      />
      {remaining <= 0 && (
        <Text className="font-sans text-sm text-muted-foreground">
          {period === "daily" ? t`You've reached your daily limit.` : t`You've reached your monthly limit.`}
        </Text>
      )}
    </View>
  );
}

export function CoreplyCloudUsage({
  client,
  userId,
  children,
}: {
  client: ReturnType<typeof createBillingClient>;
  userId: string;
  children?: ReactNode;
}) {
  const { t } = useLingui();
  const billing = useQuery({
    queryKey: ["billing", userId],
    queryFn: async ({ signal }) => {
      const response = await client.index.$get({}, { init: { signal } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          "error" in data && typeof data.error === "string"
            ? data.error
            : t`Couldn't load usage. Please try again.`,
        );
      }
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  if (billing.isPending)
    return (
      <View
        className="w-full gap-3 border border-border bg-form p-3 sm:gap-6 sm:px-5 sm:pt-5 sm:pb-6"
        accessible
        accessibilityLabel={t`Loading your usage`}
        accessibilityState={{ busy: true }}
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <View className="h-7 justify-center">
              <Skeleton className="h-5 w-36 max-w-full" />
            </View>
            <View className="h-5 justify-center">
              <Skeleton className="h-3 w-48 max-w-full" />
            </View>
          </View>
          <Skeleton className="h-4 w-12" />
        </View>
        {["daily", "monthly"].map((period) => (
          <View key={period} className="gap-3">
            <View className="h-6 flex-row items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
            </View>
            <Skeleton className="h-2 w-full rounded-full" />
          </View>
        ))}
      </View>
    );
  if (!billing.data) {
    return (
      <View className="min-h-[188px] w-full items-center justify-center gap-4 border border-border bg-form p-3 sm:min-h-[232px] sm:px-5 sm:pt-5 sm:pb-6">
        <Icon as={CircleAlert} className="size-8 text-muted-foreground" aria-hidden />
        <Text role="alert" className="text-center font-sans text-sm text-muted-foreground">
          <Trans>Couldn't load your usage. Please try again.</Trans>
        </Text>
        <Button
          variant="ghost"
          onPress={() => {
            void billing.refetch();
          }}
          disabled={billing.isFetching}
        >
          <Icon as={RefreshCw} className="size-4" aria-hidden />
          <Text className="font-sans">
            {billing.isFetching ? t`Retrying...` : t`Try again`}
          </Text>
        </Button>
      </View>
    );
  }
  const { plan, daily, monthly } = billing.data;
  return (
    <>
    <View className="w-full gap-3 border border-border bg-form p-3 sm:gap-6 sm:px-5 sm:pt-5 sm:pb-6">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans text-lg font-medium">
              <Trans comment="Heading for Coreply Cloud's daily and monthly usage limits">Usage limits</Trans>
            </Text>
            {plan.id === "free" ? (
              <Text className="font-sans text-base font-medium text-muted-foreground">
                <Trans comment="Name of the free Coreply Cloud plan">Free</Trans>
              </Text>
            ) : (
              <Text className="font-sans text-base font-bold text-primary">
                <Trans comment="Name of the paid Coreply Cloud plan">Plus</Trans>
              </Text>
            )}
          </View>
          <Text className="font-sans text-sm text-muted-foreground">
            <Trans>Your Coreply Cloud allowance</Trans>
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          className="h-auto w-auto p-0"
          accessibilityLabel={t({ comment: "Label for the button that reloads Coreply Cloud usage", message: "Refresh usage" })}
          onPress={() => void billing.refetch()}
          disabled={billing.isFetching}
        >
          <Icon as={RefreshCw} className="size-4" aria-hidden />
        </Button>
      </View>
      <UsageMeter label={t`Daily usage`} period="daily" {...daily} />
      <UsageMeter label={t`Monthly usage`} period="monthly" {...monthly} />
    </View>
    {plan.id === "free" && children}
    </>
  );
}
