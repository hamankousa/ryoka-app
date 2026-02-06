import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SongManifestItem } from "../src/domain/manifest";
import { downloadService } from "../src/features/download/downloadService";
import { getSongDownloadState } from "../src/features/download/downloadState";
import { OfflineEntry } from "../src/features/offline/offlineRepo";
import { audioEngine, PlaybackSnapshot } from "../src/features/player/audioEngine";
import { AudioSource, createPlayerStore, getPreferredAudioUrl } from "../src/features/player/playerStore";
import { MidiTimbre } from "../src/features/player/webMidiEngine";
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

function toOfflineAudioEntry(songId: string, entry: OfflineEntry | undefined) {
  if (!entry) {
    return undefined;
  }
  return {
    songId,
    vocalPath: entry.files.vocalAudioPath,
    pianoPath: entry.files.pianoAudioPath,
  };
}

export default function SongsScreen() {
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());
  const [currentSongTitle, setCurrentSongTitle] = useState<string | undefined>(undefined);
  const [currentSource, setCurrentSource] = useState<AudioSource>("vocal");
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
        setCurrentSource(playerStore.getState().source);

        const offline = await downloadService.listOfflineEntries();
        if (isMounted) {
          setOfflineEntries(Object.fromEntries(offline.map((entry) => [entry.songId, entry])));
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
        setOfflineEntries(Object.fromEntries(offline.map((entry) => [entry.songId, entry])));
      });
    });
  }, []);

  useEffect(() => {
    return audioEngine.subscribe((snapshot) => {
      setPlaybackSnapshot(snapshot);
      if (snapshot.error) {
        setPlaybackError(snapshot.error);
      }
    });
  }, []);

  const playSongWithSource = async (song: SongManifestItem, source: AudioSource) => {
    const index = songs.findIndex((item) => item.id === song.id);
    if (index < 0) {
      return;
    }
    playerStore.setQueue(songs, index);
    playerStore.setSource(source);
    const uri = getPreferredAudioUrl(song, toOfflineAudioEntry(song.id, offlineEntries[song.id]), source);

    try {
      await audioEngine.play(uri);
      setPlaybackError(null);
      setCurrentSongTitle(song.title);
      setCurrentSource(source);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "再生に失敗しました。");
    }
  };

  const playCurrentSong = async () => {
    const state = playerStore.getState();
    if (!state.currentSong) {
      return;
    }
    await playSongWithSource(state.currentSong, state.source);
  };

  const sourceLabel = currentSource === "piano" ? "Piano" : "Vocal";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>曲一覧</Text>
      <Text style={styles.subtitle}>年度ごとに折り畳みできます</Text>

      {isLoading && <ActivityIndicator size="large" />}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {playbackError && <Text style={styles.error}>再生エラー: {playbackError}</Text>}

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
                  section.songs.map((item) => {
                    const activeJob = downloadService.getJobBySongId(downloadSnapshot, item.id);
                    const state = getSongDownloadState(item, offlineEntries[item.id] ?? null, activeJob);

                    return (
                      <View key={item.id} style={styles.row}>
                        <Text style={styles.songTitle}>{item.title}</Text>
                        <Text style={styles.songMeta}>年度: {item.yearLabel ?? "-"}</Text>
                        <Text style={styles.songMeta}>
                          作歌・作曲: {item.credits && item.credits.length > 0 ? item.credits.join(" / ") : "-"}
                        </Text>

                        <View style={styles.playButtons}>
                          <Pressable
                            style={styles.playButtonVocal}
                            onPress={() => {
                              void playSongWithSource(item, "vocal");
                            }}
                          >
                            <Text style={styles.playButtonText}>Vocal</Text>
                          </Pressable>
                          <Pressable
                            style={styles.playButtonPiano}
                            onPress={() => {
                              void playSongWithSource(item, "piano");
                            }}
                          >
                            <Text style={styles.playButtonText}>Piano</Text>
                          </Pressable>
                        </View>

                        <View style={styles.links}>
                          <Link href={`/lyrics/${item.id}`} style={styles.lyricsLink}>
                            歌詞
                          </Link>
                          <Link href={`/score/${item.id}`} style={styles.scoreLink}>
                            楽譜
                          </Link>
                        </View>

                        {Platform.OS !== "web" && (
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
                        )}
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>
      )}

      <MiniPlayer
        title={currentSongTitle}
        sourceLabel={sourceLabel}
        isPlaying={playbackSnapshot.isPlaying}
        positionSec={playbackSnapshot.positionSec}
        durationSec={playbackSnapshot.durationSec}
        tempoRate={playbackSnapshot.tempoRate}
        timbre={playbackSnapshot.timbre}
        loopEnabled={playbackSnapshot.loopEnabled}
        canSeek={playbackSnapshot.canSeek}
        canLoop={playbackSnapshot.canLoop}
        canControlTempo={playbackSnapshot.canControlTempo}
        canControlTimbre={playbackSnapshot.canControlTimbre}
        onPlayPause={() => {
          void (async () => {
            const snap = audioEngine.getSnapshot();
            if (snap.isPlaying) {
              await audioEngine.pause();
              return;
            }
            if (snap.uri) {
              await audioEngine.resume();
              return;
            }
            await playCurrentSong();
          })();
        }}
        onSeek={(seconds) => {
          void audioEngine.seek(seconds);
        }}
        onTempoChange={(rate) => {
          void audioEngine.setTempo(rate);
        }}
        onTimbreChange={(timbre: MidiTimbre) => {
          void audioEngine.setTimbre(timbre);
        }}
        onLoopToggle={(enabled) => {
          void audioEngine.setLoopEnabled(enabled);
        }}
        onPrev={() => {
          void (async () => {
            playerStore.prev();
            const state = playerStore.getState();
            setCurrentSongTitle(state.currentSong?.title);
            setCurrentSource(state.source);
            await playCurrentSong();
          })();
        }}
        onNext={() => {
          void (async () => {
            playerStore.next();
            const state = playerStore.getState();
            setCurrentSongTitle(state.currentSong?.title);
            setCurrentSource(state.source);
            await playCurrentSong();
          })();
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
    fontSize: 13,
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
  row: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  songTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  songMeta: {
    color: "#64748B",
    fontSize: 12,
  },
  playButtons: {
    flexDirection: "row",
    gap: 8,
  },
  playButtonVocal: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playButtonPiano: {
    backgroundColor: "#7C3AED",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  links: {
    flexDirection: "row",
    gap: 12,
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
  subtitle: {
    color: "#475569",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});
