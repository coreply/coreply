import { createFileRoute } from "@tanstack/react-router";
import { useLingui } from "@lingui/react/macro";
import { CoreplyCloudDeleteAccount } from "coreply-shared-components/src/components/groups/coreply-cloud-delete-account";
import { CloudLayout } from "@server/components/cloud-layout";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";

export const Route = createFileRoute("/account")({ component: Account });

const client = createBillingClient(window.location.origin, async () => ({}));

function Account() {
  const { t } = useLingui();
  return <CloudLayout title={t({ message: "Account", comment: "Cloud account settings page and sidebar link" })}>
    <CoreplyCloudDeleteAccount client={client} />
  </CloudLayout>;
}
