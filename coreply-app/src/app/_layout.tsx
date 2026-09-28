import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme, Appearance, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { PortalHost } from "@rn-primitives/portal";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  if (Platform.OS === "android") {
    Appearance.setColorScheme("unspecified");
  }
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* <AppTabs /> */}

      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost name="coreplyPortal" />
    </ThemeProvider>
  );
}
