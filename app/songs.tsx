import { StyleSheet, Text, View } from "react-native";

export default function SongsPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>曲一覧（実装予定）</Text>
      <Text style={styles.subtitle}>Step 2: manifest 取得 + キャッシュ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  subtitle: {
    color: "#475569",
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});
