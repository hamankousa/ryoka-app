import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { GlobalMiniPlayer } from "../../src/ui/player/GlobalMiniPlayer";

const TAB_ICON: Record<string, string> = {
  home: "●",
  search: "●",
  list: "●",
  library: "●",
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View style={styles.bottomArea}>
          <GlobalMiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: "#0B1220",
        },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: {
          fontWeight: "700",
        },
        tabBarActiveTintColor: "#22D3EE",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#0B1220",
          borderTopColor: "#1E293B",
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 10, fontWeight: "900" }}>{TAB_ICON[route.name] ?? "●"}</Text>
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: "ホーム", headerTitle: "恵迪寮 寮歌プレイヤー" }} />
      <Tabs.Screen name="search" options={{ title: "検索", headerTitle: "曲を検索" }} />
      <Tabs.Screen name="list" options={{ title: "一覧", headerTitle: "曲一覧" }} />
      <Tabs.Screen name="library" options={{ title: "ライブラリ", headerTitle: "マイライブラリ" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomArea: {
    backgroundColor: "#0B1220",
  },
});
