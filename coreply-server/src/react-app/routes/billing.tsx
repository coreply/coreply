import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";
import { authClient } from "@server/lib/auth-client";
import { CloudLayout } from "@server/components/cloud-layout";
import { Button } from "@server/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@server/components/ui/select";
import { Skeleton } from "@server/components/ui/skeleton";

export const Route = createFileRoute("/billing")({ component: Billing });

const client = createBillingClient(window.location.origin, async () => ({}));

function Billing() {
  const { t, i18n } = useLingui();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<"plus" | "plus_quarterly" | null>(null);
  const billing = useQuery({
    queryKey: ["billing", session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const response = await client.index.$get({}, { init: { signal } });
      const data = await response.json();
      if (!response.ok) {
        throw new Error("error" in data && typeof data.error === "string" ? data.error : t`Couldn't load billing. Please try again.`);
      }
      return data;
    },
    staleTime: 30_000,
    retry: false,
  });
  const upgrade = useMutation({
    mutationFn: async (planId: "plus" | "plus_quarterly") => {
      const response = await client.upgrade.$post({ json: { planId } });
      const data = await response.json();
      if ("error" in data) throw new Error(data.error);
      if (!response.ok) throw new Error(t`Couldn't open checkout. Please try again.`);
      return data;
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });
  const portal = useMutation({
    mutationFn: async () => {
      const response = await client.portal.$post();
      const data = await response.json();
      if ("error" in data) throw new Error(data.error);
      if (!response.ok) throw new Error(t`Couldn't open billing settings. Please try again.`);
      return data;
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  }, [queryClient]);
  async function openPortal() {
    const result = await portal.mutateAsync();
    window.location.assign(result.url);
  }
  async function openCheckout(planId: "plus" | "plus_quarterly") {
    const result = await upgrade.mutateAsync(planId);
    window.location.assign(result.url);
  }
  const plusPlanId = selectedPlan ?? (billing.data?.plan.id === "plus_quarterly" ? "plus_quarterly" : "plus");
  const billingIntervals = [
    { value: "plus", label: t({ message: "Billed monthly", comment: "Monthly billing interval for the Plus subscription" }) },
    { value: "plus_quarterly", label: t({ message: "Billed quarterly", comment: "Quarterly billing interval for the Plus subscription" }) },
  ];
  return <CloudLayout title={t({ message: "Billing", comment: "Cloud subscription and payments page title and sidebar link" })}>
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold"><Trans comment="Heading above available Cloud subscription plans">Plans</Trans></h2>
          <p className="text-muted-foreground"><Trans>Choose your Cloud plan. All prices are in <strong>USD</strong>.</Trans></p>
        </div>
        {billing.data && <div className="flex flex-col gap-2">
          <Select value={plusPlanId} items={billingIntervals} onValueChange={(value) => { if (value === "plus" || value === "plus_quarterly") setSelectedPlan(value); }}>
            <SelectTrigger aria-label={t({ message: "Billing frequency", comment: "Select monthly or quarterly billing for Plus" })}><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{billingIntervals.map((interval) => <SelectItem key={interval.value} value={interval.value}>{interval.label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>}
        {billing.isPending && <Skeleton aria-hidden="true" className="h-8 w-36" />}
      </div>
    {billing.isPending && <div role="status" aria-busy="true">
      <span className="sr-only"><Trans>Loading your plan...</Trans></span>
      <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2">
        {["free", "plus"].map((plan) => <div key={plan} className="flex flex-col gap-5 border bg-form p-6">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-full" />
          {plan === "plus" && <Skeleton className="h-8 w-36" />}
        </div>)}
      </div>
    </div>}
    {billing.isError && <div role="alert" className="space-y-3"><p>{billing.error.message}</p><Button variant="outline" onClick={() => { void billing.refetch(); }}><Trans comment="Button to retry loading billing details">Try again</Trans></Button></div>}
    {billing.data && <>
      {billing.data.subscription.pastDue && <p role="alert" className="text-destructive"><Trans>Your payment needs attention. Update it in billing settings.</Trans></p>}
      {billing.data.subscription.canceled && <p className="text-muted-foreground"><Trans>Your subscription is set to cancel. Manage it in billing settings.</Trans></p>}
      <div className="grid gap-5 sm:grid-cols-2">{billing.data.plans.filter((plan) => plan.id === "free" || plan.id === plusPlanId).map((plan) => <section key={plan.id === "free" ? "free" : "plus"} className="flex flex-col gap-5 border bg-form p-6">
        <div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{plan.id === "free" ? t({ message: "Free", comment: "Name of the free Coreply Cloud plan" }) : t({ message: "Plus", comment: "Name of the paid Coreply Cloud plan" })}</h3>{billing.data.plan.id === plan.id && <span className="text-sm text-primary"><Trans comment="Badge identifying the user's subscribed Cloud plan">Current plan</Trans></span>}</div>
        <p className="text-3xl font-semibold">{plan.price ? `US$${new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(plan.price.interval === "quarter" ? plan.price.amount / 3 : plan.price.amount)}` : "US$0"}<span className="text-sm font-normal text-muted-foreground"> <Trans comment="Suffix after a Cloud plan's monthly equivalent price">/ month</Trans></span></p>
        {plan.id === "free" && <p className="text-sm text-muted-foreground"><Trans>A limited monthly allowance to try Coreply Cloud.</Trans></p>}
        {(plan.id === "plus" || plan.id === "plus_quarterly") && <p className="text-sm text-muted-foreground"><Trans>A higher monthly allowance for everyday use.</Trans></p>}
        {(plan.id === "plus" || plan.id === "plus_quarterly") && billing.data.plan.id === "free" && <Button disabled={upgrade.isPending || portal.isPending} onClick={() => { void openCheckout(plan.id === "plus" ? "plus" : "plus_quarterly").catch(() => {}); }}>{upgrade.isPending && upgrade.variables === plan.id ? t`Opening checkout...` : t`Upgrade to Plus`}</Button>}
      </section>)}</div>
    </>}
    </section>
    {billing.data && <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold"><Trans>Manage subscription</Trans></h2>
        <p className="text-muted-foreground">{billing.data.canManageBilling ? <Trans>Manage subscriptions purchased on this website and view your invoices.</Trans> : <Trans>After subscribing on this website, you can manage your subscription and invoices here.</Trans>}</p>
        <p className="text-muted-foreground"><Trans>Only subscriptions purchased on this website appear in these billing settings. If you subscribed elsewhere, manage your subscription where you purchased it.</Trans></p>
      </div>
      {billing.data.canManageBilling && <Button variant="outline" disabled={portal.isPending || upgrade.isPending} onClick={() => { void openPortal().catch(() => {}); }}>{portal.isPending ? t`Opening billing...` : t`Manage subscription and invoices`}</Button>}
    </section>}
    {(upgrade.error || portal.error) && <p role="alert" className="text-destructive">{upgrade.error?.message || portal.error?.message}</p>}
  </CloudLayout>;
}
