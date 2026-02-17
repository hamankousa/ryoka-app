import { Stack } from "expo-router";

import { AppSettingsProvider, useAppSettings } from "../src/features/settings/SettingsContext";

function RootNavigator() {
  const { palette, resolvedTheme } = useAppSettings();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.screenBackground },
        headerStyle: { backgroundColor: palette.surfaceBackground },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        statusBarStyle: resolvedTheme === "dark" ? "light" : "dark",
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
