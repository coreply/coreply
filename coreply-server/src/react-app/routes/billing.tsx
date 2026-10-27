import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";
import { authClient } from "@server/lib/auth-client";
import { CloudLayout } from "@server/components/cloud-layout";
import { Button } from "@server/components/ui/button";

export const Route = createFileRoute("/billing")({ component: Billing });

const client = createBillingClient(window.location.origin, async () => ({}));

function Billing() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const billing = useQuery({
    queryKey: ["billing", session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const response = await client.index.$get({}, { init: { signal } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error("error" in data && typeof data.error === "string" ? data.error : "Couldn't load billing. Please try again.");
      }
      return data;
    },
    staleTime: 30_000,
    retry: false,
  });
  const upgrade = useMutation({
    mutationFn: async () => {
      const response = await client.upgrade.$post();
      const data = await response.json();
      if ("error" in data) throw new Error(data.error);
      if (!response.ok) throw new Error("Couldn't open checkout. Please try again.");
      return data;
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });
  const portal = useMutation({
    mutationFn: async () => {
      const response = await client.portal.$post();
      const data = await response.json();
      if ("error" in data) throw new Error(data.error);
      if (!response.ok) throw new Error("Couldn't open billing settings. Please try again.");
      return data;
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  }, [queryClient]);
  async function openBilling(action: typeof upgrade) {
    const result = await action.mutateAsync();
    window.location.assign(result.url);
  }
  return <CloudLayout title="Billing">
    <p className="text-muted-foreground">Choose your Cloud plan. Your own API keys are separate from Cloud billing.</p>
    {billing.isPending && <p>Loading your plan...</p>}
    {billing.isError && <div role="alert" className="space-y-3"><p>{billing.error.message}</p><Button variant="outline" onClick={() => { void billing.refetch(); }}>Try again</Button></div>}
    {billing.data && <>
      {billing.data.subscription.pastDue && <p role="alert" className="text-destructive">Your payment needs attention. Update it in billing settings.</p>}
      {billing.data.subscription.canceled && <p className="text-muted-foreground">Your subscription is set to cancel. Manage it in billing settings.</p>}
      <div className="grid gap-5 sm:grid-cols-2">{billing.data.plans.map((plan) => <section key={plan.id} className="flex flex-col gap-5 border bg-form p-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{plan.name}</h2>{billing.data.plan.id === plan.id && <span className="text-sm text-primary">Current plan</span>}</div>
        <p className="text-3xl font-semibold">{plan.price ? `$${plan.price.amount}` : "$0"}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
        <p className="text-sm text-muted-foreground">${plan.monthlyAllowance.toFixed(2)} monthly AI credits<br />${plan.dailyCap.toFixed(2)} daily cap</p>
        {plan.id === "plus" && billing.data.plan.id !== "plus" && <Button disabled={upgrade.isPending || portal.isPending} onClick={() => { void openBilling(upgrade).catch(() => {}); }}>{upgrade.isPending ? "Opening checkout..." : "Upgrade to Plus"}</Button>}
      </section>)}</div>
      {billing.data.canManageBilling && <Button variant="outline" disabled={portal.isPending || upgrade.isPending} onClick={() => { void openBilling(portal).catch(() => {}); }}>{portal.isPending ? "Opening billing..." : "Manage subscription and invoices"}</Button>}
    </>}
    {(upgrade.error || portal.error) && <p role="alert" className="text-destructive">{upgrade.error?.message || portal.error?.message}</p>}
  </CloudLayout>;
}
