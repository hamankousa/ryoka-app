import { useLocalSearchParams } from "expo-router";
import { createElement, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { SongManifestItem } from "../../../src/domain/manifest";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { resolveScoreSource } from "../../../src/features/score/resolveScoreSource";
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

  if (errorMessage) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screenBackground }]}>
        <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>
      </View>
    );
  }

  if (!sourceUri) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.screenBackground }]}>
        <Text style={[styles.loading, { color: palette.textSecondary }]}>楽譜を読み込み中...</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return <ScoreFrameOnWeb uri={sourceUri} />;
  }

  return <WebView source={{ uri: sourceUri }} style={styles.webview} />;
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
  loading: {
    color: "#475569",
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
});
