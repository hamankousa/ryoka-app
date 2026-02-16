import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SongManifestItem } from "../../src/domain/manifest";
import { audioEngine, PlaybackSnapshot } from "../../src/features/player/audioEngine";
import { playSongWithQueue } from "../../src/features/player/globalPlayer";
import { AudioSource, getPreferredAudioUrl } from "../../src/features/player/playerStore";
import { loadSongs } from "../../src/features/songs/loadSongs";
import { ERA_ORDER, getEraKey, getEraLabel } from "../../src/features/songs/yearFilters";
import { createManifestRepository } from "../../src/infra/manifestRepository";

const manifestRepository = createManifestRepository({});
export default function ListTabScreen() {
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());

  useEffect(() => {
    let mounted = true;
    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await loadSongs(manifestRepository);
        if (mounted) {
          setSongs(result.songs);
        }
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
    <View style={styles.container}>
      <Text style={styles.heading}>全曲一覧</Text>
      <Text style={styles.meta}>{songs.length}曲</Text>

      {isLoading && <ActivityIndicator size="large" color="#2563EB" />}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {playbackError && <Text style={styles.error}>再生エラー: {playbackError}</Text>}

      {!isLoading && !errorMessage && (
        <ScrollView contentContainerStyle={styles.list}>
          {groupedSongs.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.label} ({section.songs.length})
              </Text>

              {section.songs.map((song) => (
                <View key={song.id} style={styles.row}>
                  <View style={styles.main}>
                    <Text numberOfLines={1} style={styles.title}>
                      {song.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.sub}>
                      {song.id.toUpperCase()} / {song.yearLabel ?? "-"}
                    </Text>
                    <Text numberOfLines={1} style={styles.sub}>
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
                            playbackSnapshot.uri === getPreferredAudioUrl(song, undefined, "vocal") &&
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
                            playbackSnapshot.uri === getPreferredAudioUrl(song, undefined, "piano") &&
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
                    </View>
                  </View>
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
