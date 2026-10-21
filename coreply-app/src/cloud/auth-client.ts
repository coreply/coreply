import { createAuthClient } from "better-auth/react";

// Expo web uses browser cookies and Google redirects; native uses SecureStore.
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL,
});

export async function billingHeaders(): Promise<Record<string, string>> {
  return {};
}
