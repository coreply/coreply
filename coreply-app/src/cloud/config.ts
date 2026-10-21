import { Platform } from "react-native";

export const cloudConfigured = !!process.env.EXPO_PUBLIC_COREPLY_CLOUD_URL &&
  (Platform.OS === "web" || !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) &&
  (Platform.OS !== "ios" || !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
