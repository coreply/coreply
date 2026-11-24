import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Expo web uses browser cookies and Google redirects; native uses SecureStore.
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL,
  plugins: [emailOTPClient()],
});

export async function billingHeaders(): Promise<Record<string, string>> {
  return {};
}
