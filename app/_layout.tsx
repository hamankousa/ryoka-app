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
      <Stack.Screen name="settings" options={{ title: "設定" }} />
      <Stack.Screen name="lyrics/[songId]" options={{ title: "歌詞" }} />
      <Stack.Screen name="score/[songId]" options={{ title: "楽譜" }} />
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
