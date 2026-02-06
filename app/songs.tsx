import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { SongManifestItem } from "../src/domain/manifest";
import { downloadService } from "../src/features/download/downloadService";
import { getSongDownloadState } from "../src/features/download/downloadState";
import { OfflineEntry } from "../src/features/offline/offlineRepo";
import { createPlayerStore } from "../src/features/player/playerStore";
import { loadSongs } from "../src/features/songs/loadSongs";
import { createManifestRepository } from "../src/infra/manifestRepository";
import { MiniPlayer } from "../src/ui/player/MiniPlayer";

const manifestRepository = createManifestRepository({});
const playerStore = createPlayerStore();
const ERA_ORDER = ["m", "t", "s", "h", "r", "a", "other"] as const;

function getEraKey(songId: string): (typeof ERA_ORDER)[number] {
  const prefix = songId.charAt(0).toLowerCase();
  if (prefix === "m" || prefix === "t" || prefix === "s" || prefix === "h" || prefix === "r" || prefix === "a") {
    return prefix;
  }
  return "other";
}

function getEraLabel(key: (typeof ERA_ORDER)[number]) {
  const labels: Record<(typeof ERA_ORDER)[number], string> = {
    m: "明治",
    t: "大正",
    s: "昭和",
    h: "平成",
    r: "令和",
    a: "その他",
    other: "未分類",
  };
  return labels[key];
}

export default function SongsPlaceholderScreen() {
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState<string | undefined>(undefined);
  const [offlineEntries, setOfflineEntries] = useState<Record<string, OfflineEntry>>({});
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const hasSongs = useMemo(() => songs.length > 0, [songs]);
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

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await loadSongs(manifestRepository);
        if (!isMounted) {
          return;
        }
        setSongs(result.songs);
        playerStore.setQueue(result.songs, 0);
        setCurrentSongTitle(playerStore.getState().currentSong?.title);
        const offline = await downloadService.listOfflineEntries();
        if (isMounted) {
          const map = Object.fromEntries(offline.map((entry) => [entry.songId, entry]));
          setOfflineEntries(map);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "manifest load failed");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return downloadService.subscribe((snapshot) => {
      setDownloadSnapshot(snapshot);
      void downloadService.listOfflineEntries().then((offline) => {
        const map = Object.fromEntries(offline.map((entry) => [entry.songId, entry]));
        setOfflineEntries(map);
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>曲一覧</Text>
      <Text style={styles.subtitle}>Step 2: manifest 取得 + キャッシュ</Text>

      {isLoading && <ActivityIndicator size="large" />}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {!isLoading && !hasSongs && !errorMessage && (
        <Text style={styles.empty}>曲がありません。manifest を確認してください。</Text>
      )}

      {hasSongs && (
        <ScrollView contentContainerStyle={styles.list}>
          {groupedSongs.map((section) => {
            const isCollapsed = collapsedSections[section.key] ?? false;
            return (
              <View key={section.key} style={styles.section}>
                <Pressable
                  onPress={() =>
                    setCollapsedSections((current) => ({
                      ...current,
                      [section.key]: !isCollapsed,
                    }))
                  }
                  style={styles.sectionHeader}
                >
                  <Text style={styles.sectionTitle}>
                    {section.label} ({section.songs.length})
                  </Text>
                  <Text style={styles.sectionToggle}>{isCollapsed ? "展開" : "折り畳み"}</Text>
                </Pressable>

                {!isCollapsed &&
                  section.songs.map((item) => (
                    <View key={item.id} style={styles.row}>
              <Pressable
                onPress={() => {
                  const index = songs.findIndex((song) => song.id === item.id);
                  playerStore.setQueue(songs, index);
                  playerStore.play();
                  const state = playerStore.getState();
                  setIsPlaying(state.isPlaying);
                  setCurrentSongTitle(state.currentSong?.title);
                }}
              >
                <Text style={styles.songTitle}>{item.title}</Text>
                <Text style={styles.songMeta}>年度: {item.yearLabel ?? "-"}</Text>
                <Text style={styles.songMeta}>
                  作歌・作曲: {item.credits && item.credits.length > 0 ? item.credits.join(" / ") : "-"}
                </Text>
              </Pressable>
              <Link href={`/lyrics/${item.id}`} style={styles.lyricsLink}>
                歌詞
              </Link>
              <Link href={`/score/${item.id}`} style={styles.scoreLink}>
                楽譜
              </Link>

              {Platform.OS !== "web" &&
                (() => {
                const activeJob = downloadService.getJobBySongId(downloadSnapshot, item.id);
                const state = getSongDownloadState(item, offlineEntries[item.id] ?? null, activeJob);
                return (
                  <View style={styles.downloadArea}>
                    <Text style={styles.downloadBadge}>DL状態: {state.badge}</Text>
                    {state.canDownload && (
                      <Pressable
                        style={styles.downloadButton}
                        onPress={async () => {
                          await downloadService.downloadSong(item);
                        }}
                      >
                        <Text style={styles.downloadButtonText}>
                          {state.badge === "更新あり" ? "再DL" : "DL"}
                        </Text>
                      </Pressable>
                    )}
                    {state.canDelete && (
                      <Pressable
                        style={styles.deleteButton}
                        onPress={async () => {
                          await downloadService.deleteSong(item.id);
                          const offline = await downloadService.listOfflineEntries();
                          setOfflineEntries(
                            Object.fromEntries(offline.map((entry) => [entry.songId, entry]))
                          );
                        }}
                      >
                        <Text style={styles.deleteButtonText}>削除</Text>
                      </Pressable>
                    )}
                  </View>
                );
                })()}
            </View>
                  ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      <MiniPlayer
        title={currentSongTitle}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (playerStore.getState().isPlaying) {
            playerStore.pause();
          } else {
            playerStore.play();
          }
          const state = playerStore.getState();
          setIsPlaying(state.isPlaying);
          setCurrentSongTitle(state.currentSong?.title);
        }}
        onPrev={() => {
          playerStore.prev();
          const state = playerStore.getState();
          setCurrentSongTitle(state.currentSong?.title);
        }}
        onNext={() => {
          playerStore.next();
          const state = playerStore.getState();
          setCurrentSongTitle(state.currentSong?.title);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  empty: {
    color: "#334155",
    fontSize: 14,
  },
  error: {
    color: "#B91C1C",
    fontSize: 14,
  },
  list: {
    gap: 10,
    paddingBottom: 80,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionToggle: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  downloadArea: {
    gap: 6,
  },
  downloadBadge: {
    color: "#334155",
    fontSize: 12,
  },
  downloadButton: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 64,
  },
  downloadButtonText: {
    color: "#166534",
    fontWeight: "600",
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  row: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  lyricsLink: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "600",
  },
  scoreLink: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "600",
  },
  songMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  songTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    color: "#475569",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});
