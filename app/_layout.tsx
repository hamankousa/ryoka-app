import { Stack, usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { AppSettingsProvider, useAppSettings } from "../src/features/settings/SettingsContext";
import { recordRoutePath } from "../src/ui/navigation/routeHistory";

function RootNavigator() {
  const { palette, resolvedTheme } = useAppSettings();
  const pathname = usePathname();

  useEffect(() => {
    recordRoutePath(pathname);
  }, [pathname]);

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
