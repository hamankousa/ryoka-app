import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SongManifestItem } from "../../src/domain/manifest";
import { downloadService, SongDownloadMeta } from "../../src/features/download/downloadService";
import { getSongDownloadState } from "../../src/features/download/downloadState";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import { audioEngine, PlaybackSnapshot } from "../../src/features/player/audioEngine";
import { playSongWithQueue } from "../../src/features/player/globalPlayer";
import { AudioSource, getPlayableAudioCandidates } from "../../src/features/player/playerStore";
import { loadSongs } from "../../src/features/songs/loadSongs";
import { ERA_ORDER, getEraKey, getEraLabel } from "../../src/features/songs/yearFilters";
import { createManifestRepository } from "../../src/infra/manifestRepository";
import { useAppSettings } from "../../src/features/settings/SettingsContext";

const manifestRepository = createManifestRepository({});
export default function ListTabScreen() {
  const { palette } = useAppSettings();
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());
  const [offlineEntries, setOfflineEntries] = useState<Record<string, OfflineEntry>>({});
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [downloadMetaBySongId, setDownloadMetaBySongId] = useState<Record<string, SongDownloadMeta>>({});

  useEffect(() => {
    let mounted = true;
    async function refreshDownloadState() {
      const [offline, metas] = await Promise.all([
        downloadService.listOfflineEntries(),
        downloadService.listDownloadMetas(),
      ]);
      if (!mounted) {
        return;
      }
      setOfflineEntries(Object.fromEntries(offline.map((entry) => [entry.songId, entry])));
      setDownloadMetaBySongId(Object.fromEntries(metas.map((meta) => [meta.songId, meta])));
    }

    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await loadSongs(manifestRepository);
        if (mounted) {
          setSongs(result.songs);
        }
        await refreshDownloadState();
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "一覧データの読み込みに失敗しました。");
        }
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
  }, []);

  useEffect(() => {
    return downloadService.subscribe((snapshot) => {
      setDownloadSnapshot(snapshot);
      void (async () => {
        const [offline, metas] = await Promise.all([
          downloadService.listOfflineEntries(),
          downloadService.listDownloadMetas(),
        ]);
        setOfflineEntries(Object.fromEntries(offline.map((entry) => [entry.songId, entry])));
        setDownloadMetaBySongId(Object.fromEntries(metas.map((meta) => [meta.songId, meta])));
      })();
    });
  }, []);

  useEffect(() => {
    return audioEngine.subscribe((snapshot) => {
      setPlaybackSnapshot(snapshot);
    });
  }, []);

  const playSong = async (song: SongManifestItem, source: AudioSource) => {
    try {
      await playSongWithQueue(songs, song, source, true);
      setPlaybackError(null);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "再生に失敗しました。");
    }
  };

  const groupedSongs = useMemo(() => {
    const groups = new Map<(typeof ERA_ORDER)[number], SongManifestItem[]>();
    for (const song of songs) {
      const key = getEraKey(song.id);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(song);
    }
    return ERA_ORDER.map((key) => ({
      key,
      label: getEraLabel(key),
      songs: groups.get(key) ?? [],
    })).filter((section) => section.songs.length > 0);
  }, [songs]);

  return (
    <View style={[styles.container, { backgroundColor: palette.screenBackground }]}>
      <Text style={[styles.heading, { color: palette.textPrimary }]}>全曲一覧</Text>
      <Text style={[styles.meta, { color: palette.textSecondary }]}>{songs.length}曲</Text>

      {isLoading && <ActivityIndicator size="large" color={palette.accent} />}
      {errorMessage && <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>}
      {playbackError && <Text style={[styles.error, { color: palette.danger }]}>再生エラー: {playbackError}</Text>}

      {!isLoading && !errorMessage && (
        <ScrollView contentContainerStyle={styles.list}>
          {groupedSongs.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={[styles.sectionTitle, { backgroundColor: palette.surfaceStrong, color: palette.textPrimary }]}>
                {section.label} ({section.songs.length})
              </Text>

              {section.songs.map((song) => (
                <View
                  key={song.id}
                  style={[styles.row, { backgroundColor: palette.surfaceBackground, borderBottomColor: palette.border }]}
                >
                  {(() => {
                    const activeJob = downloadService.getJobBySongId(downloadSnapshot, song.id);
                    const downloadState = getSongDownloadState(
                      song,
                      offlineEntries[song.id] ?? null,
                      activeJob,
                      downloadMetaBySongId[song.id] ?? null
                    );
                    return (
                      <>
                  <View style={styles.main}>
                    <Text numberOfLines={1} style={[styles.title, { color: palette.textPrimary }]}>
                      {song.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.sub, { color: palette.textSecondary }]}>
                      {song.id.toUpperCase()} / {song.yearLabel ?? "-"}
                    </Text>
                    <Text numberOfLines={1} style={[styles.sub, { color: palette.textSecondary }]}>
                      {song.credits?.join(" / ") || "-"}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <View style={styles.playButtons}>
                      <Pressable
                        style={[
                          styles.playButton,
                          styles.playButtonVocal,
                          playbackSnapshot.isPlaying &&
                            getPlayableAudioCandidates(song, undefined, "vocal", {
                              platformOs: Platform.OS,
                            }).includes(playbackSnapshot.uri ?? "") &&
                            styles.playButtonActive,
                        ]}
                        onPress={() => {
                          void playSong(song, "vocal");
                        }}
                      >
                        <Text style={styles.playButtonText}>Vocal</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.playButton,
                          styles.playButtonPiano,
                          playbackSnapshot.isPlaying &&
                            getPlayableAudioCandidates(song, undefined, "piano", {
                              platformOs: Platform.OS,
                            }).includes(playbackSnapshot.uri ?? "") &&
                            styles.playButtonActive,
                        ]}
                        onPress={() => {
                          void playSong(song, "piano");
                        }}
                      >
                        <Text style={styles.playButtonText}>Piano</Text>
                      </Pressable>
                    </View>
                    <View style={styles.links}>
                      <Link href={`/lyrics/${song.id}`} style={styles.linkLyrics}>
                        歌詞
                      </Link>
                      <Link href={`/score/${song.id}`} style={styles.linkScore}>
                        楽譜
                      </Link>
                      <Link href={`/song/${song.id}`} style={styles.linkDetail}>
                        詳細
                      </Link>
                    </View>
                    {Platform.OS !== "web" && (
                      <View style={styles.downloadArea}>
                        <Text style={[styles.downloadBadge, { color: palette.textSecondary }]}>DL: {downloadState.badge}</Text>
                        {downloadState.canDownload && (
                          <Pressable
                            style={styles.downloadButton}
                            onPress={() => {
                              void downloadService.downloadSong(song);
                            }}
                          >
                            <Text style={styles.downloadButtonText}>DL</Text>
                          </Pressable>
                        )}
                        {downloadState.canRetry && (
                          <Pressable
                            style={styles.retryButton}
                            onPress={() => {
                              void downloadService.retrySongDownload(song);
                            }}
                          >
                            <Text style={styles.retryButtonText}>再試行</Text>
                          </Pressable>
                        )}
                        {downloadState.canCancel && (
                          <Pressable
                            style={styles.cancelButton}
                            onPress={() => {
                              downloadService.cancelSongDownload(song.id);
                            }}
                          >
                            <Text style={styles.cancelButtonText}>中止</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                      </>
                    );
                  })()}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  error: {
    color: "#B91C1C",
    fontSize: 12,
  },
  heading: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
    paddingHorizontal: 2,
  },
  linkLyrics: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "700",
  },
  actions: {
    alignItems: "flex-end",
    gap: 5,
    justifyContent: "center",
    minWidth: 62,
  },
  playButtons: {
    flexDirection: "row",
    gap: 4,
  },
  playButton: {
    alignItems: "center",
    borderRadius: 6,
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  playButtonActive: {
    borderColor: "#0F172A",
    borderWidth: 1,
  },
  playButtonPiano: {
    backgroundColor: "#7C3AED",
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  playButtonVocal: {
    backgroundColor: "#059669",
  },
  links: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  linkScore: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "700",
  },
  linkDetail: {
    color: "#0369A1",
    fontSize: 11,
    fontWeight: "700",
  },
  downloadArea: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  downloadBadge: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  downloadButton: {
    backgroundColor: "#0369A1",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  retryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  cancelButton: {
    backgroundColor: "#B45309",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  list: {
    gap: 8,
    paddingBottom: 84,
  },
  main: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  meta: {
    color: "#64748B",
    fontSize: 12,
    paddingHorizontal: 2,
  },
  row: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sub: {
    color: "#64748B",
    fontSize: 11,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
});
