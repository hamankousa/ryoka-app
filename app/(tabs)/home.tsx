import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSettings } from "../../src/features/settings/SettingsContext";

const QUICK_ACTIONS = [
  { href: "/search", title: "検索", subtitle: "曲名・作歌作曲・年度から探す", accent: "#0284C7" },
  { href: "/list", title: "一覧", subtitle: "元号ごとに寮歌をたどる", accent: "#2563EB" },
  { href: "/library", title: "ライブラリ", subtitle: "ダウンロード済みの曲を管理", accent: "#0E7490" },
  { href: "/settings", title: "設定", subtitle: "表示・再生・検索挙動をカスタマイズ", accent: "#0EA5E9" },
] as const;

export default function HomeTabScreen() {
  const router = useRouter();
  const { palette } = useAppSettings();
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        actionCard: {
          backgroundColor: palette.surfaceBackground,
          borderColor: palette.border,
        },
        actionSubtitle: {
          color: palette.textSecondary,
        },
        actionTitle: {
          color: palette.textPrimary,
        },
        container: {
          backgroundColor: palette.screenBackground,
        },
        eyebrow: {
          color: palette.accent,
        },
        hero: {
          backgroundColor: palette.surfaceBackground,
          borderColor: palette.border,
        },
        subtitle: {
          color: palette.textSecondary,
        },
      }),
    [palette]
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.hero, dynamicStyles.hero]}>
        <Text style={[styles.eyebrow, dynamicStyles.eyebrow]}>KEITEKI RYOKA</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          ホームから各機能へ移動できます。設定画面で表示や再生挙動を切り替え可能です。
        </Text>
      </View>

      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.href}
            style={[styles.actionCard, dynamicStyles.actionCard, { borderColor: action.accent }]}
            onPress={() => router.push(action.href)}
          >
            <Text style={[styles.actionTitle, dynamicStyles.actionTitle]}>{action.title}</Text>
            <Text style={[styles.actionSubtitle, dynamicStyles.actionSubtitle]}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
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
    fontSize: 13,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
});
