import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

import { PortalHost } from "@rn-primitives/portal";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* <AppTabs /> */}

      <Stack>
        <Stack.Header hidden={true}></Stack.Header>
      </Stack>
      <PortalHost />
    </ThemeProvider>
  );
}
