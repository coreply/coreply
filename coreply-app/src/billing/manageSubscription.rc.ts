import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { createBillingClient } from "coreply-shared-components/src/utils/hc";

import { billingHeaders } from "@/cloud/auth-client";

const billingClient = createBillingClient(
  process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL!,
  billingHeaders,
);

async function configurePurchases(userId: string): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_REVENUECAT_API_KEY");

  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey, appUserID: userId });
  } else if ((await Purchases.getAppUserID()) !== userId) {
    await Purchases.logIn(userId);
  }

}

export async function manageSubscription(userId: string): Promise<void> {
  await configurePurchases(userId);
  await RevenueCatUI.presentCustomerCenter();
}

export async function preloadPaywall(userId: string): Promise<void> {
  await configurePurchases(userId);
  await Purchases.getOfferings();
}

export async function getMoreUsage(userId: string, onPurchaseOrRestore: () => void): Promise<"paid" | "unavailable" | null> {
  await configurePurchases(userId);
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all.default;
  if (!offering) throw new Error("Missing RevenueCat default offering");
  let blocked: "paid" | "unavailable" | null = null;
  const result = await RevenueCatUI.presentPaywall({
    offering,
    displayCloseButton: true,
    callbacks: {
      onPurchaseCompleted: onPurchaseOrRestore,
      onRestoreCompleted: onPurchaseOrRestore,
      onPurchasePackageInitiated: ({ resume }) => {
        void (async () => {
          let paid: boolean;
          try {
            const response = await billingClient.index.$get();
            if (!response.ok) throw new Error("Failed to check billing");
            const data = await response.json();
            if (!("plan" in data)) throw new Error("Missing billing plan");
            paid = data.plan.id !== "free";
          } catch {
            blocked = "unavailable";
            resume(false);
            return;
          }
          blocked = paid ? "paid" : null;
          resume(!paid);
        })();
      },
    },
  });
  if (result === PAYWALL_RESULT.ERROR || result === PAYWALL_RESULT.NOT_PRESENTED) {
    throw new Error("Failed to present RevenueCat paywall");
  }
  return blocked;
}
