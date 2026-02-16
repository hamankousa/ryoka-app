import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const QUICK_ACTIONS = [
  { href: "/search", title: "検索", subtitle: "曲名・作歌作曲・年度から探す", accent: "#0284C7" },
  { href: "/list", title: "一覧", subtitle: "元号ごとに寮歌をたどる", accent: "#2563EB" },
  { href: "/library", title: "ライブラリ", subtitle: "ダウンロード済みの曲を管理", accent: "#0E7490" },
] as const;

export default function HomeTabScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>KEITEKI RYOKA</Text>
        <Text style={styles.title}>寮歌を、すぐ再生。</Text>
        <Text style={styles.subtitle}>ホーム・検索・一覧・ライブラリをタブで切り替えできます。</Text>
      </View>

      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.href}
            style={[styles.actionCard, { borderColor: action.accent }]}
            onPress={() => router.push(action.href)}
          >
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actions: {
    gap: 10,
  },
  actionSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
  },
  actionTitle: {
    color: "#E2E8F0",
    fontSize: 17,
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#020617",
    flex: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  eyebrow: {
    color: "#22D3EE",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  hero: {
    backgroundColor: "#0B1220",
    borderColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "800",
  },
});
