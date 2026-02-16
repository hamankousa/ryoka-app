import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { APP_THEME_MODES, MIDI_GUIDE_LOOKAHEAD_OPTIONS } from "../src/domain/appSettings";
import { useAppSettings } from "../src/features/settings/SettingsContext";

const THEME_MODE_LABEL: Record<(typeof APP_THEME_MODES)[number], string> = {
  system: "端末依存",
  light: "ライト",
  dark: "ダーク",
};

export default function SettingsScreen() {
  const { settings, palette, loaded, setFilterAutoCollapseEnabled, setLiquidGlassEnabled, setMidiGuideLookAheadSec, setThemeMode } =
    useAppSettings();

  const hintColor = palette.textSecondary;
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: palette.screenBackground,
        },
        card: {
          backgroundColor: palette.surfaceBackground,
          borderColor: palette.border,
        },
        rowBorder: {
          borderTopColor: palette.border,
        },
        title: {
          color: palette.textPrimary,
        },
        sectionTitle: {
          color: palette.textPrimary,
        },
        hint: {
          color: palette.textSecondary,
        },
        chip: {
          backgroundColor: palette.surfaceBackground,
          borderColor: palette.border,
        },
        chipActive: {
          backgroundColor: palette.surfaceStrong,
          borderColor: palette.accent,
        },
        chipText: {
          color: palette.textSecondary,
        },
        chipTextActive: {
          color: palette.textPrimary,
        },
      }),
    [palette]
  );

  if (!loaded) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.centered]}>
        <Text style={[styles.loading, dynamicStyles.hint]}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.pageTitle, dynamicStyles.title]}>表示と再生の設定</Text>
      <Text style={[styles.pageDescription, dynamicStyles.hint]}>
        見た目と検索挙動、MIDIガイドの表示レンジを変更できます。
      </Text>

      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>テーマ</Text>
        <Text style={[styles.sectionHint, dynamicStyles.hint]}>アプリ全体のライト/ダーク表示を選びます。</Text>
        <View style={styles.chipRow}>
          {APP_THEME_MODES.map((mode) => (
            <Pressable
              key={mode}
              testID={`settings-theme-${mode}`}
              style={[styles.chip, dynamicStyles.chip, settings.themeMode === mode && dynamicStyles.chipActive]}
              onPress={() => setThemeMode(mode)}
            >
              <Text
                style={[
                  styles.chipText,
                  dynamicStyles.chipText,
                  settings.themeMode === mode && dynamicStyles.chipTextActive,
                ]}
              >
                {THEME_MODE_LABEL[mode]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>プレイヤー表示</Text>
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={[styles.rowTitle, dynamicStyles.title]}>Liquid Glass</Text>
            <Text style={[styles.rowHint, dynamicStyles.hint]}>ミニプレイヤーの半透明表現を有効化</Text>
          </View>
          <Switch
            testID="settings-liquid-glass-switch"
            value={settings.liquidGlassEnabled}
            onValueChange={setLiquidGlassEnabled}
            trackColor={{ false: "#94A3B8", true: palette.accent }}
          />
        </View>

        <View style={[styles.row, styles.topBorder, dynamicStyles.rowBorder]}>
          <View style={styles.rowLabelBlock}>
            <Text style={[styles.rowTitle, dynamicStyles.title]}>MIDIガイド先読み</Text>
            <Text style={[styles.rowHint, dynamicStyles.hint]}>
              音程バーを何秒先まで表示するか（大きいほど広い範囲）
            </Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          {MIDI_GUIDE_LOOKAHEAD_OPTIONS.map((seconds) => (
            <Pressable
              key={seconds}
              testID={`settings-lookahead-${seconds}`}
              style={[
                styles.chip,
                dynamicStyles.chip,
                settings.midiGuideLookAheadSec === seconds && dynamicStyles.chipActive,
              ]}
              onPress={() => setMidiGuideLookAheadSec(seconds)}
            >
              <Text
                style={[
                  styles.chipText,
                  dynamicStyles.chipText,
                  settings.midiGuideLookAheadSec === seconds && dynamicStyles.chipTextActive,
                ]}
              >
                {seconds}秒
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>検索</Text>
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={[styles.rowTitle, dynamicStyles.title]}>フィルタ自動折りたたみ</Text>
            <Text style={[styles.rowHint, dynamicStyles.hint]}>
              検索結果を下にスクロールしたときにフィルタ欄を自動で閉じる
            </Text>
          </View>
          <Switch
            testID="settings-filter-auto-collapse-switch"
            value={settings.filterAutoCollapseEnabled}
            onValueChange={setFilterAutoCollapseEnabled}
            trackColor={{ false: "#94A3B8", true: palette.accent }}
          />
        </View>
      </View>

      <Text style={[styles.footerHint, { color: hintColor }]}>
        変更内容は端末内に保存され、次回起動時も維持されます。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    gap: 12,
    minHeight: "100%",
    paddingBottom: 30,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  footerHint: {
    fontSize: 12,
    paddingHorizontal: 2,
  },
  loading: {
    fontSize: 14,
  },
  pageDescription: {
    fontSize: 13,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: "800",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  rowHint: {
    fontSize: 12,
  },
  rowLabelBlock: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHint: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  topBorder: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
  },
});
