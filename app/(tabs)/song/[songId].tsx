import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SongManifestItem } from "../../../src/domain/manifest";
import { downloadService, SongDownloadMeta } from "../../../src/features/download/downloadService";
import { getSongDownloadState } from "../../../src/features/download/downloadState";
import { OfflineEntry } from "../../../src/features/offline/offlineRepo";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { createManifestRepository } from "../../../src/infra/manifestRepository";
import { useAppSettings } from "../../../src/features/settings/SettingsContext";
import { IconifyIcon } from "../../../src/ui/icons/IconifyIcon";
import { useScreenEntranceMotion } from "../../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../../src/ui/navigation/SwipeBackContainer";

const manifestRepository = createManifestRepository({});

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  if (value < 1024) {
    return `${Math.round(value)} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function sumEntrySize(entry: OfflineEntry | null) {
  if (!entry?.sizes) {
    return 0;
  }
  return Object.values(entry.sizes).reduce((total, value) => total + (value ?? 0), 0);
}

export default function SongDetailScreen() {
  const { palette } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();
  const params = useLocalSearchParams<{ songId?: string }>();
  const songId = typeof params.songId === "string" ? params.songId : "";
  const [song, setSong] = useState<SongManifestItem | null>(null);
  const [offlineEntry, setOfflineEntry] = useState<OfflineEntry | null>(null);
  const [meta, setMeta] = useState<SongDownloadMeta | null>(null);
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await loadSongs(manifestRepository);
        const target = result.songs.find((item) => item.id === songId) ?? null;
        const [nextOffline, nextMeta] = await Promise.all([
          downloadService.getOfflineEntry(songId),
          downloadService.getSongDownloadMeta(songId),
        ]);
        if (!mounted) {
          return;
        }
        setSong(target);
        setOfflineEntry(nextOffline);
        setMeta(nextMeta);
        if (!target) {
          setErrorMessage("曲が見つかりません。");
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "曲情報の読み込みに失敗しました。");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, [songId]);

  useEffect(() => {
    return downloadService.subscribe((snapshot) => {
      setDownloadSnapshot(snapshot);
      void (async () => {
        const [nextOffline, nextMeta] = await Promise.all([
          downloadService.getOfflineEntry(songId),
          downloadService.getSongDownloadMeta(songId),
        ]);
        setOfflineEntry(nextOffline);
        setMeta(nextMeta);
      })();
    });
  }, [songId]);

  const activeJob = useMemo(
    () => downloadService.getJobBySongId(downloadSnapshot, songId),
    [downloadSnapshot, songId]
  );
  const downloadState = useMemo(
    () => (song ? getSongDownloadState(song, offlineEntry, activeJob, meta) : null),
    [activeJob, meta, offlineEntry, song]
  );
  const savedSizeText = useMemo(() => formatBytes(sumEntrySize(offlineEntry)), [offlineEntry]);

  if (isLoading) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.center, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <ActivityIndicator size="large" color={palette.accent} />
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  if (errorMessage || !song || !downloadState) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.center, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <Text style={[styles.error, { color: palette.danger }]}>{errorMessage ?? "曲が見つかりません。"}</Text>
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.motionLayer, entranceStyle]}>
        <ScrollView style={{ backgroundColor: palette.screenBackground }} contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{song.title}</Text>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>ID: {song.id}</Text>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>年度: {song.yearLabel ?? "-"}</Text>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>
            作歌・作曲: {song.credits && song.credits.length > 0 ? song.credits.join(" / ") : "-"}
          </Text>
        </View>

      <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>ダウンロード状態</Text>
        <Text style={[styles.meta, { color: palette.textSecondary }]}>状態: {downloadState.badge}</Text>
        <Text style={[styles.meta, { color: palette.textSecondary }]}>保存容量: {savedSizeText}</Text>
        {meta?.error ? <Text style={[styles.meta, { color: palette.danger }]}>エラー: {meta.error}</Text> : null}

        {Platform.OS !== "web" ? (
          <View style={styles.actions}>
            {downloadState.canDownload && (
              <Pressable
                style={styles.downloadButton}
              onPress={() => {
                void downloadService.downloadSong(song);
              }}
            >
              <View style={styles.buttonContent}>
                  <IconifyIcon name="download" size={13} color="#FFFFFF" />
                  <Text style={styles.actionText}>ダウンロード</Text>
                </View>
              </Pressable>
            )}
            {downloadState.canRetry && (
              <Pressable
                style={styles.retryButton}
              onPress={() => {
                void downloadService.retrySongDownload(song);
              }}
            >
              <View style={styles.buttonContent}>
                  <IconifyIcon name="refresh" size={13} color="#FFFFFF" />
                  <Text style={styles.actionText}>再試行</Text>
                </View>
              </Pressable>
            )}
            {downloadState.canCancel && (
              <Pressable
                style={styles.cancelButton}
              onPress={() => {
                downloadService.cancelSongDownload(song.id);
              }}
            >
              <View style={styles.buttonContent}>
                  <IconifyIcon name="cancel" size={13} color="#FFFFFF" />
                  <Text style={styles.actionText}>中止</Text>
                </View>
              </Pressable>
            )}
            {downloadState.canDelete && (
              <Pressable
                style={styles.deleteButton}
              onPress={() => {
                void downloadService.deleteSong(song.id);
              }}
            >
              <View style={styles.buttonContent}>
                  <IconifyIcon name="delete" size={13} color="#FFFFFF" />
                  <Text style={styles.actionText}>削除</Text>
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={[styles.meta, { color: palette.textSecondary }]}>Webではダウンロード操作は表示しません。</Text>
        )}
      </View>

        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>閲覧</Text>
          <View style={styles.links}>
            <Link href={`/lyrics/${song.id}`} style={styles.linkLyrics}>
              歌詞を開く
            </Link>
            <Link href={`/score/${song.id}`} style={styles.linkScore}>
              楽譜を開く
            </Link>
          </View>
        </View>
        </ScrollView>
      </Animated.View>
    </SwipeBackContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  motionLayer: {
    flex: 1,
  },
  container: {
    gap: 12,
    padding: 14,
    paddingBottom: 90,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
  },
  error: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  downloadButton: {
    backgroundColor: "#0369A1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButton: {
    backgroundColor: "#B45309",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButton: {
    backgroundColor: "#B91C1C",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  links: {
    flexDirection: "row",
    gap: 12,
  },
  linkLyrics: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "700",
  },
  linkScore: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
  },
});
