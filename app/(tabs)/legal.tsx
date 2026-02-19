import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppSettings } from "../../src/features/settings/SettingsContext";
import { useScreenEntranceMotion } from "../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../src/ui/navigation/SwipeBackContainer";

export default function LegalScreen() {
  const { palette } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.motionLayer, entranceStyle]}>
        <ScrollView style={[styles.screen, { backgroundColor: palette.screenBackground }]} contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>法務情報（暫定）</Text>
          <Text style={[styles.description, { color: palette.textSecondary }]}>
            ここに表示している内容はドラフト版です。後で正式版に差し替えます。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>プライバシーポリシー（要約）</Text>
          <Text style={[styles.body, { color: palette.textSecondary }]}>
            - 現時点で個人情報をアプリ内で直接収集しません。
            {"\n"}- 設定値やダウンロードデータは端末内に保存されます。
            {"\n"}- 詳細は後日追記します。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>著作権・利用上の注意（要約）</Text>
          <Text style={[styles.body, { color: palette.textSecondary }]}>
            - 歌詞・楽譜・音源などの権利は各権利者に帰属します。
            {"\n"}- 個人利用を想定し、無断転載・再配布は行わないでください。
            {"\n"}- 詳細な条件は後日追記します。
          </Text>
        </View>
        </ScrollView>
      </Animated.View>
    </SwipeBackContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  motionLayer: {
    flex: 1,
  },
  container: {
    gap: 12,
    padding: 14,
    paddingBottom: 88,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
});
