import { hc } from "hono/client";
import type { BillingApi } from "../../../coreply-server/src/worker/billing";

export function createBillingClient(baseURL: string, headers: () => Promise<Record<string, string>>) {
  return hc<BillingApi>(`${baseURL}/api/billing`, {
    headers,
    init: { credentials: "include" },
  });
}
