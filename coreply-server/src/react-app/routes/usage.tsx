import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { CoreplyCloudUsage } from "coreply-shared-components/src/components/groups/coreply-cloud-usage";
import { CloudLayout } from "@server/components/cloud-layout";
import { authClient } from "@server/lib/auth-client";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";

const client = createBillingClient(window.location.origin, async () => ({}));

export const Route = createFileRoute("/usage")({ component: Usage });

function Usage() {
  const { t } = useLingui();
  const { data: session } = authClient.useSession();
  return (
    <CloudLayout title={t({ message: "Usage", comment: "Cloud usage page title and sidebar link" })}>
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold"><Trans>Your usage</Trans></h2>
          <p className="text-muted-foreground"><Trans>Keep track of your Coreply Cloud allowance.</Trans></p>
        </div>
        {session && <CoreplyCloudUsage client={client} userId={session.user.id} />}
      </section>
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold"><Trans>Where to use Coreply</Trans></h2>
          <p className="text-muted-foreground"><Trans>Use Coreply Cloud for suggestions in the Coreply Android app and browser extension. Sign in with the same account on each device.</Trans></p>
        </div>
        <a className="text-primary underline" href="https://play.google.com/store/apps/details?id=app.coreply.coreplyapp"><Trans>Get the Android app on Google Play</Trans></a>
      </section>
    </CloudLayout>
  );
}
