import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { AppSettingsProvider, useAppSettings } from "../src/features/settings/SettingsContext";
import { buildRoutePath, recordRoutePath } from "../src/ui/navigation/routeHistory";

function RootNavigator() {
  const { palette, resolvedTheme } = useAppSettings();
  const pathname = usePathname();
  const globalSearchParams = useGlobalSearchParams();

  useEffect(() => {
    recordRoutePath(
      buildRoutePath(
        pathname,
        globalSearchParams as Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>
      )
    );
  }, [globalSearchParams, pathname]);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.screenBackground },
        headerStyle: { backgroundColor: palette.surfaceBackground },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        statusBarStyle: resolvedTheme === "dark" ? "light" : "dark",
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        animationDuration: 230,
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === "ios",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppSettingsProvider>
      <RootNavigator />
    </AppSettingsProvider>
  );
}
