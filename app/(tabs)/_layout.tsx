import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveFloatingTabBarLayout } from "../../src/domain/tabBarLayout";
import { useAppSettings } from "../../src/features/settings/SettingsContext";
import { GlobalMiniPlayer } from "../../src/ui/player/GlobalMiniPlayer";

const TAB_ICON: Record<string, string> = {
  home: "⌂",
  search: "⌕",
  list: "☰",
  library: "▥",
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const floatingLayout = resolveFloatingTabBarLayout(insets.bottom);
  const { palette, settings } = useAppSettings();

  return (
    <Tabs
      tabBar={(props) => (
        <View style={[styles.bottomArea, { backgroundColor: palette.screenBackground }]}>
          <GlobalMiniPlayer
            liquidGlassEnabled={settings.liquidGlassEnabled}
            midiGuideLookAheadSec={settings.midiGuideLookAheadSec}
          />
          <View style={[styles.floatingBlock, { paddingBottom: floatingLayout.blockPaddingBottom }]}>
            <View
              style={[
                styles.floatingShell,
                {
                  backgroundColor: palette.tabBackground,
                  borderColor: palette.tabBorder,
                },
              ]}
            >
              <BottomTabBar {...props} />
            </View>
          </View>
        </View>
      )}
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: palette.surfaceBackground,
        },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: {
          fontWeight: "700",
        },
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: floatingLayout.tabHeight,
          shadowOpacity: 0,
        },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: {
          paddingBottom: floatingLayout.itemPaddingBottom,
          paddingTop: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          lineHeight: floatingLayout.labelLineHeight,
          marginBottom: 1,
        },
        tabBarIcon: ({ color }) => (
          <Text allowFontScaling={false} style={{ color, fontSize: 15, fontWeight: "900" }}>
            {TAB_ICON[route.name] ?? "•"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: "ホーム", headerTitle: "恵迪寮 寮歌プレイヤー" }} />
      <Tabs.Screen name="search" options={{ title: "検索", headerTitle: "曲を検索" }} />
      <Tabs.Screen name="list" options={{ title: "一覧", headerTitle: "曲一覧" }} />
      <Tabs.Screen name="library" options={{ title: "ライブラリ", headerTitle: "マイライブラリ" }} />
      <Tabs.Screen name="settings" options={{ href: null, title: "設定", headerTitle: "設定" }} />
      <Tabs.Screen name="legal" options={{ href: null, title: "法務", headerTitle: "法務情報" }} />
      <Tabs.Screen name="song/[songId]" options={{ href: null, title: "曲詳細", headerTitle: "曲詳細" }} />
      <Tabs.Screen name="lyrics/[songId]" options={{ href: null, title: "歌詞", headerTitle: "歌詞" }} />
      <Tabs.Screen name="score/[songId]" options={{ href: null, title: "楽譜", headerTitle: "楽譜" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomArea: {
    backgroundColor: "#0B1220",
  },
  floatingBlock: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  floatingShell: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 8,
  },
});
