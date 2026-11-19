import * as Linking from "expo-linking";
import { isBrowserExtension } from "@/utils/extension";

export async function manageSubscription(_userId: string): Promise<void> {
  const url = process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL;
  if (!url) throw new Error("Missing EXPO_PUBLIC_COREPLY_CLOUD_URL");
  const billingUrl = new URL("/billing", url).toString();
  if (isBrowserExtension()) {
    window.open(billingUrl, "_blank");
  } else {
    await Linking.openURL(billingUrl);
  }
}

export async function preloadPaywall(_userId: string): Promise<void> {}

export async function getMoreUsage(userId: string, _onPurchaseOrRestore: () => void): Promise<"paid" | "unavailable" | null> {
  await manageSubscription(userId);
  return null;
}
