import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function SongsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>恵迪寮 寮歌プレイヤー v1</Text>
      <Text style={styles.subtitle}>まずは manifest 取得から実装します</Text>
      <Link href="/songs" style={styles.link}>
        曲一覧（準備中）
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  link: {
    color: "#0F766E",
    fontSize: 16,
    marginTop: 8,
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
});
