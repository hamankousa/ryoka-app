import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { SongManifestItem } from "../../../src/domain/manifest";
import { downloadService } from "../../../src/features/download/downloadService";
import { resolveLyricsSource } from "../../../src/features/lyrics/resolveLyricsSource";
import { buildStyledLyricsHtml } from "../../../src/features/lyrics/sanitizeLyricsInlineHtml";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { createManifestRepository } from "../../../src/infra/manifestRepository";
import { useAppSettings } from "../../../src/features/settings/SettingsContext";
import { LoadingPulse } from "../../../src/ui/loading/LoadingPulse";
import { useScreenEntranceMotion } from "../../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../../src/ui/navigation/SwipeBackContainer";

const manifestRepository = createManifestRepository({});

function LyricsHtmlOnWeb({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function LyricsScreen() {
  const { palette, resolvedTheme } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();
  const params = useLocalSearchParams<{ songId?: string }>();
  const [song, setSong] = useState<SongManifestItem | null>(null);
  const [offlineLyricsPath, setOfflineLyricsPath] = useState<string | undefined>(undefined);
  const [inlineHtml, setInlineHtml] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const songId = typeof params.songId === "string" ? params.songId : "";

  useEffect(() => {
    let mounted = true;

    async function run() {
      setErrorMessage(null);
      setInlineHtml(null);

      try {
        const result = await loadSongs(manifestRepository);
        const found = result.songs.find((item) => item.id === songId) ?? null;
        if (!mounted) return;

        if (!found) {
          setErrorMessage("曲が見つかりません。");
          setSong(null);
          return;
        }

        setSong(found);
        const offlineEntry = await downloadService.getOfflineEntry(found.id);
        if (mounted) {
          setOfflineLyricsPath(offlineEntry?.files.lyricsPath);
        }

        if (Platform.OS === "web") {
          const response = await fetch(found.lyrics.htmlUrl);
          const html = await response.text();
          if (mounted) {
            setInlineHtml(html);
          }
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error instanceof Error ? error.message : "歌詞の読み込みに失敗しました。");
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [songId]);

  const source = useMemo(() => {
    if (!song) {
      return null;
    }
    return resolveLyricsSource(
      song,
      offlineLyricsPath ? { songId: song.id, lyricsPath: offlineLyricsPath } : undefined,
      inlineHtml ?? undefined
    );
  }, [song, inlineHtml, offlineLyricsPath]);

  const styledInlineHtml = useMemo(() => {
    if (source?.type !== "html") {
      return "";
    }
    const isDark = resolvedTheme === "dark";
    return buildStyledLyricsHtml(source.html, {
      textColor: isDark ? "#E2E8F0" : "#1E293B",
      subTextColor: isDark ? "#94A3B8" : "#64748B",
      borderColor: isDark ? "#334155" : "#E2E8F0",
      lineHeight: 1.38,
      fontSizePx: 14,
    });
  }, [resolvedTheme, source]);

  if (errorMessage) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  if (!song || !source) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <LoadingPulse
            label="歌詞を読み込み中..."
            accentColor={palette.accent}
            textColor={palette.textPrimary}
            hintColor={palette.textSecondary}
          />
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  if (source.type === "html") {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.motionLayer, entranceStyle]}>
          <ScrollView
            contentContainerStyle={[styles.webContainer, { backgroundColor: palette.screenBackground }]}
          >
            <LyricsHtmlOnWeb html={styledInlineHtml} />
          </ScrollView>
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.motionLayer, entranceStyle]}>
        <WebView source={{ uri: source.uri }} style={styles.webview} />
      </Animated.View>
    </SwipeBackContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  error: {
    color: "#B91C1C",
    fontSize: 14,
  },
  motionLayer: {
    flex: 1,
  },
  webContainer: {
    padding: 16,
  },
  webview: {
    flex: 1,
  },
});
