import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { SongManifestItem } from "../../../src/domain/manifest";
import { downloadService } from "../../../src/features/download/downloadService";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { resolveScoreSource } from "../../../src/features/score/resolveScoreSource";
import {
  buildNativeScoreViewerUrl,
  buildScoreViewerHtml,
  buildScoreZoomUrl,
  clampScoreZoom,
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
  SCORE_ZOOM_STEP,
} from "../../../src/features/score/scoreZoom";
import { createManifestRepository } from "../../../src/infra/manifestRepository";
import { useAppSettings } from "../../../src/features/settings/SettingsContext";
import { LoadingPulse } from "../../../src/ui/loading/LoadingPulse";
import { useScreenEntranceMotion } from "../../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../../src/ui/navigation/SwipeBackContainer";

const manifestRepository = createManifestRepository({});

function ScoreFrameOnWeb({ html }: { html: string }) {
  return <div style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ScoreScreen() {
  const { palette } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();
  const params = useLocalSearchParams<{ songId?: string }>();
  const [song, setSong] = useState<SongManifestItem | null>(null);
  const [offlineScorePath, setOfflineScorePath] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState<number>(SCORE_ZOOM_DEFAULT);
  const songId = typeof params.songId === "string" ? params.songId : "";

  useEffect(() => {
    let mounted = true;
    async function run() {
      setErrorMessage(null);
      try {
        const result = await loadSongs(manifestRepository);
        if (!mounted) return;
        const found = result.songs.find((item) => item.id === songId) ?? null;
        if (!found) {
          setErrorMessage("曲が見つかりません。");
          return;
        }
        setSong(found);
        const offlineEntry = await downloadService.getOfflineEntry(found.id);
        if (mounted) {
          setOfflineScorePath(offlineEntry?.files.scorePath);
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error instanceof Error ? error.message : "楽譜の読み込みに失敗しました。");
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [songId]);

  const sourceUri = useMemo(() => {
    if (!song) return null;
    return resolveScoreSource(
      song,
      offlineScorePath ? { songId: song.id, scorePath: offlineScorePath } : undefined
    );
  }, [song, offlineScorePath]);

  const zoomedUri = useMemo(() => {
    if (!sourceUri) {
      return null;
    }
    return buildScoreZoomUrl(sourceUri, zoomPercent);
  }, [sourceUri, zoomPercent]);

  const webViewerHtml = useMemo(() => {
    if (!sourceUri) {
      return null;
    }
    return buildScoreViewerHtml(sourceUri, zoomPercent);
  }, [sourceUri, zoomPercent]);

  const nativeViewerUri = useMemo(() => {
    if (!sourceUri) {
      return null;
    }
    if (/^https?:\/\//i.test(sourceUri)) {
      return buildNativeScoreViewerUrl(sourceUri);
    }
    return zoomedUri;
  }, [sourceUri, zoomedUri]);

  const zoomOut = () => setZoomPercent((prev) => clampScoreZoom(prev - SCORE_ZOOM_STEP));
  const zoomIn = () => setZoomPercent((prev) => clampScoreZoom(prev + SCORE_ZOOM_STEP));
  const resetZoom = () => setZoomPercent(SCORE_ZOOM_DEFAULT);

  if (errorMessage) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  if (!zoomedUri) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <LoadingPulse
            label="楽譜を読み込み中..."
            accentColor={palette.accent}
            textColor={palette.textPrimary}
            hintColor={palette.textSecondary}
          />
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.screen, { backgroundColor: palette.screenBackground }, entranceStyle]}>
        <View style={[styles.zoomBar, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Pressable
            testID="score-zoom-out"
            style={[styles.zoomButton, { borderColor: palette.border }]}
            onPress={zoomOut}
            disabled={zoomPercent <= SCORE_ZOOM_MIN}
          >
            <Text style={[styles.zoomButtonText, { color: palette.textPrimary }]}>−</Text>
          </Pressable>
          <Pressable
            testID="score-zoom-reset"
            style={[styles.zoomButton, { borderColor: palette.border }]}
            onPress={resetZoom}
          >
            <Text style={[styles.zoomButtonText, { color: palette.textPrimary }]}>{zoomPercent}%</Text>
          </Pressable>
          <Pressable
            testID="score-zoom-in"
            style={[styles.zoomButton, { borderColor: palette.border }]}
            onPress={zoomIn}
            disabled={zoomPercent >= SCORE_ZOOM_MAX}
          >
            <Text style={[styles.zoomButtonText, { color: palette.textPrimary }]}>＋</Text>
          </Pressable>
        </View>
        {Platform.OS === "web" ? (
          <ScoreFrameOnWeb html={webViewerHtml ?? ""} />
        ) : (
          <WebView
            source={{ uri: nativeViewerUri ?? zoomedUri }}
            style={styles.webview}
            scalesPageToFit
            setBuiltInZoomControls
            setDisplayZoomControls
          />
        )}
      </Animated.View>
    </SwipeBackContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  zoomBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  webview: {
    flex: 1,
  },
});
