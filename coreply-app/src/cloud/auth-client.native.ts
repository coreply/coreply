import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { GoogleOneTapSignIn } from "react-native-nitro-google-signin";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (webClientId) {
  GoogleOneTapSignIn.configure({
    webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL,
  plugins: [
    emailOTPClient(),
    expoClient({
      scheme: "coreplyapp",
      storagePrefix: "coreply-cloud",
      storage: SecureStore,
    }),
  ],
});

export async function billingHeaders(): Promise<Record<string, string>> {
  return { cookie: await authClient.getCookie() };
}
