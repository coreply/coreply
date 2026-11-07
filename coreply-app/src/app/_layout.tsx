import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme, Appearance, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { CloudAuthProvider } from "coreply-shared-components/src/cloud/auth-context";
import { authClient } from "@/cloud/auth-client";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@/i18n";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function TabLayout() {
  if (Platform.OS === "android") {
    Appearance.setColorScheme("unspecified");
  }
  const colorScheme = useColorScheme();
  return (
    <I18nProvider i18n={i18n}>
      <KeyboardProvider
        preserveEdgeToEdge={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
      >
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <QueryClientProvider client={queryClient}>
            <CloudAuthProvider
              authClient={authClient}
              callbackURL={
                process.env.EXPO_PUBLIC_COREPLY_CLOUD_CALLBACK_URL || "/"
              }
            >
              {/* <AppTabs /> */}

              <Stack screenOptions={{ headerShown: false }} />
              <PortalHost name="coreplyPortal" />
            </CloudAuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </I18nProvider>
  );
}
