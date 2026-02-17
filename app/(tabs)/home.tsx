import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppSettings } from "../../src/features/settings/SettingsContext";

const QUICK_ACTIONS = [
  { href: "/search", title: "検索", subtitle: "曲名・作歌作曲・年度から探す", accent: "#0284C7" },
  { href: "/list", title: "一覧", subtitle: "元号ごとに寮歌をたどる", accent: "#2563EB" },
  { href: "/library", title: "ライブラリ", subtitle: "ダウンロード済みの曲を管理", accent: "#0E7490" },
  { href: "/settings", title: "設定", subtitle: "表示・再生・検索挙動をカスタマイズ", accent: "#0EA5E9" },
  { href: "/legal", title: "法務", subtitle: "プライバシーと著作権の案内", accent: "#0891B2" },
] as const;

const TECH_SPECS = [
  { label: "アーキテクチャ", value: "Expo Router + Domain/Feature/Infra/UI 分割" },
  { label: "対象", value: "iOS / Android / Web" },
  { label: "主要技術", value: "Expo SDK 54, React Native, TypeScript" },
  { label: "音声", value: "expo-av + Web MIDI(ブラウザ音源)" },
  { label: "データ配信", value: "ryoka-content(manifest/audio/lyrics/score)" },
] as const;

const REPOSITORIES = [
  {
    name: "ryoka-app",
    subtitle: "アプリ本体（UI/再生/検索/設定）",
    url: "https://github.com/hamankousa/ryoka-app",
    accent: "#0284C7",
  },
  {
    name: "ryoka-content",
    subtitle: "コンテンツ（音源/歌詞/楽譜/manifest）",
    url: "https://github.com/hamankousa/ryoka-content",
    accent: "#0E7490",
  },
] as const;

export default function HomeTabScreen() {
  const router = useRouter();
  const { palette } = useAppSettings();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const actionAnims = useRef(QUICK_ACTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    heroAnim.setValue(0);
    for (const value of actionAnims) {
      value.setValue(0);
    }
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        70,
        actionAnims.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [actionAnims, heroAnim]);

  const heroAnimatedStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  } as const;

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
        infoCard: {
          backgroundColor: palette.surfaceBackground,
          borderColor: palette.border,
        },
        infoHeading: {
          color: palette.textPrimary,
        },
        infoLabel: {
          color: palette.textSecondary,
        },
        infoValue: {
          color: palette.textPrimary,
        },
        linkSubtitle: {
          color: palette.textSecondary,
        },
        linkTitle: {
          color: palette.textPrimary,
        },
      }),
    [palette]
  );

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.containerContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <Animated.View style={[styles.hero, dynamicStyles.hero, heroAnimatedStyle]}>
          <Text style={[styles.eyebrow, dynamicStyles.eyebrow]}>KEITEKI RYOKA</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
            ホームから各機能へ移動できます。設定画面で表示や再生挙動を切り替え可能です。
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action, index) => {
            const value = actionAnims[index];
            return (
              <Animated.View
                key={action.href}
                style={{
                  opacity: value,
                  transform: [
                    {
                      translateY: value.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  style={[styles.actionCard, dynamicStyles.actionCard, { borderColor: action.accent }]}
                  onPress={() => router.push(action.href)}
                >
                  <Text style={[styles.actionTitle, dynamicStyles.actionTitle]}>{action.title}</Text>
                  <Text style={[styles.actionSubtitle, dynamicStyles.actionSubtitle]}>{action.subtitle}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={[styles.infoCard, dynamicStyles.infoCard]}>
          <Text style={[styles.infoHeading, dynamicStyles.infoHeading]}>技術仕様</Text>
          {TECH_SPECS.map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>{item.label}</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, dynamicStyles.infoCard]}>
          <Text style={[styles.infoHeading, dynamicStyles.infoHeading]}>GitHub</Text>
          {REPOSITORIES.map((repo) => (
            <Pressable
              key={repo.name}
              style={[styles.linkCard, { borderColor: repo.accent }]}
              onPress={() => {
                void Linking.openURL(repo.url);
              }}
            >
              <Text style={[styles.linkTitle, dynamicStyles.linkTitle]}>{repo.name}</Text>
              <Text style={[styles.linkSubtitle, dynamicStyles.linkSubtitle]}>{repo.subtitle}</Text>
              <Text style={[styles.linkUrl, { color: repo.accent }]}>{repo.url}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
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
  },
  containerContent: {
    paddingBottom: 22,
  },
  inner: {
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
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoHeading: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkCard: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  linkSubtitle: {
    fontSize: 12,
  },
  linkUrl: {
    fontSize: 12,
    fontWeight: "700",
  },
});
