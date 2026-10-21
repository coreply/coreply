import { createFileRoute } from "@tanstack/react-router";
import { CoreplyCloudUsage } from "coreply-shared-components/src/components/groups/coreply-cloud-usage";
import { CloudLayout } from "@server/components/cloud-layout";
import { authClient } from "@server/lib/auth-client";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";

const client = createBillingClient(window.location.origin, async () => ({}));

export const Route = createFileRoute("/usage")({ component: Usage });

function Usage() {
  const { data: session } = authClient.useSession();
  return <CloudLayout title="Usage"><p className="text-muted-foreground">Keep track of your Coreply Cloud allowance.</p>{session && <CoreplyCloudUsage client={client} userId={session.user.id} />}</CloudLayout>;
}
