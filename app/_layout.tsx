import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lyrics/[songId]" options={{ title: "歌詞" }} />
      <Stack.Screen name="score/[songId]" options={{ title: "楽譜" }} />
    </Stack>
  );
}
