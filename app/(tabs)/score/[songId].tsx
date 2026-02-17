import { useLocalSearchParams } from "expo-router";
import { createElement, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { SongManifestItem } from "../../../src/domain/manifest";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { resolveScoreSource } from "../../../src/features/score/resolveScoreSource";
import {
  buildScoreZoomUrl,
  clampScoreZoom,
  SCORE_ZOOM_DEFAULT,
  SCORE_ZOOM_MAX,
  SCORE_ZOOM_MIN,
  SCORE_ZOOM_STEP,
} from "../../../src/features/score/scoreZoom";
import { createManifestRepository } from "../../../src/infra/manifestRepository";
import { useAppSettings } from "../../../src/features/settings/SettingsContext";

const manifestRepository = createManifestRepository({});

function ScoreFrameOnWeb({ uri }: { uri: string }) {
  return createElement("iframe", {
    src: uri,
    style: { border: "none", height: "100vh", width: "100%" },
    title: "score-pdf",
  });
}

export default function ScoreScreen() {
  const { palette } = useAppSettings();
  const params = useLocalSearchParams<{ songId?: string }>();
  const [song, setSong] = useState<SongManifestItem | null>(null);
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
    return resolveScoreSource(song);
  }, [song]);

  const zoomedUri = useMemo(() => {
    if (!sourceUri) {
      return null;
    }
    return buildScoreZoomUrl(sourceUri, zoomPercent);
  }, [sourceUri, zoomPercent]);

  const zoomOut = () => setZoomPercent((prev) => clampScoreZoom(prev - SCORE_ZOOM_STEP));
  const zoomIn = () => setZoomPercent((prev) => clampScoreZoom(prev + SCORE_ZOOM_STEP));
  const resetZoom = () => setZoomPercent(SCORE_ZOOM_DEFAULT);

  if (errorMessage) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screenBackground }]}>
        <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>
      </View>
    );
  }

  if (!zoomedUri) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screenBackground }]}>
        <Text style={[styles.loading, { color: palette.textSecondary }]}>楽譜を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.screenBackground }]}>
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
        <ScoreFrameOnWeb uri={zoomedUri} />
      ) : (
        <WebView
          source={{ uri: zoomedUri }}
          style={styles.webview}
          scalesPageToFit
          setBuiltInZoomControls
          setDisplayZoomControls
        />
      )}
    </View>
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
  loading: {
    color: "#475569",
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
