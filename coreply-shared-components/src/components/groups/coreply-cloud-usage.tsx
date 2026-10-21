import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { createBillingClient } from "../../utils/hc";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Text } from "../ui/text";

function UsageMeter({ label, allowance, remaining }: { label: string; allowance: number; remaining: number }) {
  const percentage = Math.max(0, Math.min(100, remaining / allowance * 100));
  const display = percentage > 0 && percentage < 1 ? "<1" : String(Math.floor(percentage));
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="font-sans text-base font-medium">{label}</Text>
        <Text className="font-sans text-sm text-muted-foreground">{display}% remaining</Text>
      </View>
      <Progress value={percentage} accessibilityLabel={`${label}: ${display}% remaining`} />
      {remaining <= 0 && <Text className="font-sans text-sm text-muted-foreground">You've reached your {label === "Daily usage" ? "daily" : "monthly"} limit.</Text>}
    </View>
  );
}

export function CoreplyCloudUsage({ client, userId }: { client: ReturnType<typeof createBillingClient>; userId: string }) {
  const billing = useQuery({
    queryKey: ["billing", userId],
    queryFn: async ({ signal }) => {
      const response = await client.index.$get({}, { init: { signal } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error("error" in data && typeof data.error === "string" ? data.error : "Couldn't load usage. Please try again.");
      }
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  if (billing.isPending) return <Text className="font-sans text-sm text-muted-foreground">Loading your usage...</Text>;
  if (!billing.data) {
    return (
      <View className="gap-4">
        <Text role="alert" className="font-sans text-sm text-destructive">{billing.error?.message}</Text>
        <Button variant="outline" onPress={() => { void billing.refetch(); }} disabled={billing.isFetching}>
          <Text className="font-sans">{billing.isFetching ? "Retrying..." : "Try again"}</Text>
        </Button>
      </View>
    );
  }
  const { plan, daily, monthly } = billing.data;
  return (
    <View className="w-full gap-7 rounded-xl border border-border bg-form p-6">
      <View className="flex-row items-center justify-between gap-4">
        <View className="gap-1">
          <Text className="font-sans text-lg font-semibold">Standard usage</Text>
          <Text className="font-sans text-sm text-muted-foreground">Your Coreply Cloud allowance</Text>
        </View>
        <Text className="font-sans text-sm font-medium text-primary">{plan.name}</Text>
      </View>
      <UsageMeter label="Daily usage" {...daily} />
      <UsageMeter label="Monthly usage" {...monthly} />
      {billing.isError && <Text role="alert" className="font-sans text-sm text-destructive">Couldn't refresh usage. The values above may be out of date.</Text>}
    </View>
  );
}
