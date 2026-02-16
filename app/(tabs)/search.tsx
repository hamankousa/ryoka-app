import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SongManifestItem } from "../../src/domain/manifest";
import { audioEngine, PlaybackSnapshot } from "../../src/features/player/audioEngine";
import { playSongWithQueue } from "../../src/features/player/globalPlayer";
import { AudioSource, getPreferredAudioUrl } from "../../src/features/player/playerStore";
import { loadSongs } from "../../src/features/songs/loadSongs";
import { filterSongsByQuery } from "../../src/features/songs/searchSongs";
import {
  buildYearKeyOptions,
  ERA_FILTERS,
  ERA_ORDER,
  EraFilter,
  filterSongsByYearDecade,
  formatYearChipLabel,
  getEraKey,
  getEraLabel,
  getYearDecadeStartFromYearKey,
  getSongYearKey,
} from "../../src/features/songs/yearFilters";
import { createManifestRepository } from "../../src/infra/manifestRepository";

const manifestRepository = createManifestRepository({});
export default function SearchTabScreen() {
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");
  const [yearKeyFilter, setYearKeyFilter] = useState<string | null>(null);
  const [yearDecadeFilter, setYearDecadeFilter] = useState<number | null>(null);

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
          setErrorMessage(error instanceof Error ? error.message : "検索データの読み込みに失敗しました。");
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
      await playSongWithQueue(filteredSongs, song, source, true);
      setPlaybackError(null);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "再生に失敗しました。");
    }
  };

  const eraFilteredSongs = useMemo(() => {
    if (eraFilter === "all") {
      return songs;
    }
    return songs.filter((song) => getEraKey(song.id) === eraFilter);
  }, [eraFilter, songs]);

  const yearKeyOptions = useMemo(() => {
    return buildYearKeyOptions(eraFilteredSongs, eraFilter);
  }, [eraFilter, eraFilteredSongs]);

  const requiresDecadeStep = yearKeyOptions.length > 12;
  const decadeOptions = useMemo(() => {
    const starts = new Set<number>();
    for (const yearKey of yearKeyOptions) {
      const start = getYearDecadeStartFromYearKey(yearKey);
      if (start !== null) {
        starts.add(start);
      }
    }
    return [...starts].sort((left, right) => left - right);
  }, [yearKeyOptions]);
  const visibleYearKeyOptions = useMemo(() => {
    if (!requiresDecadeStep) {
      return yearKeyOptions;
    }
    if (yearDecadeFilter === null) {
      return [];
    }
    return yearKeyOptions.filter((yearKey) => {
      return getYearDecadeStartFromYearKey(yearKey) === yearDecadeFilter;
    });
  }, [requiresDecadeStep, yearDecadeFilter, yearKeyOptions]);

  useEffect(() => {
    if (!yearKeyFilter) {
      return;
    }
    if (!yearKeyOptions.includes(yearKeyFilter)) {
      setYearKeyFilter(null);
    }
  }, [yearKeyFilter, yearKeyOptions]);

  useEffect(() => {
    if (!requiresDecadeStep) {
      if (yearDecadeFilter !== null) {
        setYearDecadeFilter(null);
      }
      return;
    }
    if (yearDecadeFilter !== null && !decadeOptions.includes(yearDecadeFilter)) {
      setYearDecadeFilter(null);
    }
  }, [decadeOptions, requiresDecadeStep, yearDecadeFilter]);

  const queryFilteredSongs = useMemo(() => filterSongsByQuery(eraFilteredSongs, searchQuery), [eraFilteredSongs, searchQuery]);
  const decadeFilteredSongs = useMemo(() => {
    if (!requiresDecadeStep || yearDecadeFilter === null) {
      return queryFilteredSongs;
    }
    return filterSongsByYearDecade(queryFilteredSongs, yearDecadeFilter);
  }, [queryFilteredSongs, requiresDecadeStep, yearDecadeFilter]);
  const filteredSongs = useMemo(() => {
    if (!yearKeyFilter) {
      return decadeFilteredSongs;
    }
    return decadeFilteredSongs.filter((song) => getSongYearKey(song.id) === yearKeyFilter);
  }, [decadeFilteredSongs, yearKeyFilter]);

  const groupedSongs = useMemo(() => {
    const groups = new Map<(typeof ERA_ORDER)[number], SongManifestItem[]>();
    for (const song of filteredSongs) {
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
  }, [filteredSongs]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>曲を検索</Text>
      <Text style={styles.description}>キーワード + 年度クイック検索で絞り込みできます。</Text>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="例: H23 / 北嵐 / 吉野萌"
        placeholderTextColor="#64748B"
        style={styles.input}
      />

      <Text style={styles.filterLabel}>元号</Text>
      <View style={styles.chipRow}>
        {ERA_FILTERS.map((filterKey) => (
          <Pressable
            key={filterKey}
            style={[styles.chip, eraFilter === filterKey && styles.chipActive]}
            onPress={() => {
              setEraFilter(filterKey);
              setYearKeyFilter(null);
              setYearDecadeFilter(null);
            }}
          >
            <Text style={[styles.chipText, eraFilter === filterKey && styles.chipTextActive]}>
              {filterKey === "all" ? "すべて" : getEraLabel(filterKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {eraFilter !== "all" && yearKeyOptions.length > 0 && (
        <>
          {requiresDecadeStep && (
            <>
              <Text style={styles.filterHint}>年代を選択</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, yearDecadeFilter === null && styles.chipActive]}
                  onPress={() => {
                    setYearDecadeFilter(null);
                    setYearKeyFilter(null);
                  }}
                >
                  <Text style={[styles.chipText, yearDecadeFilter === null && styles.chipTextActive]}>年代解除</Text>
                </Pressable>
                {decadeOptions.map((start) => (
                  <Pressable
                    key={start}
                    style={[styles.chip, yearDecadeFilter === start && styles.chipActive]}
                    onPress={() => {
                      setYearDecadeFilter(start);
                      setYearKeyFilter(null);
                    }}
                  >
                    <Text style={[styles.chipText, yearDecadeFilter === start && styles.chipTextActive]}>
                      {start}-{start + 9}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {(!requiresDecadeStep || yearDecadeFilter !== null) && (
            <>
              <Text style={styles.filterHint}>年次を選択</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !yearKeyFilter && styles.chipActive]}
                  onPress={() => setYearKeyFilter(null)}
                >
                  <Text style={[styles.chipText, !yearKeyFilter && styles.chipTextActive]}>年次解除</Text>
                </Pressable>
                {visibleYearKeyOptions.map((key) => (
                  <Pressable
                    key={key}
                    style={[styles.chip, yearKeyFilter === key && styles.chipActive]}
                    onPress={() => setYearKeyFilter(key)}
                  >
                    <Text style={[styles.chipText, yearKeyFilter === key && styles.chipTextActive]}>
                      {formatYearChipLabel(key)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {isLoading && <ActivityIndicator size="large" color="#0F766E" />}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {playbackError && <Text style={styles.error}>再生エラー: {playbackError}</Text>}
      {!isLoading && !errorMessage && <Text style={styles.meta}>表示中: {filteredSongs.length}曲</Text>}

      {!isLoading && !errorMessage && filteredSongs.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {groupedSongs.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.label} ({section.songs.length})
              </Text>
              {section.songs.map((song) => (
                <View key={song.id} style={styles.row}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  <Text style={styles.songMeta}>
                    {song.id.toUpperCase()} / {song.yearLabel ?? "-"}
                  </Text>
                  <Text style={styles.songMeta}>{song.credits?.join(" / ") || "-"}</Text>
                  <View style={styles.actionRow}>
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

      {!isLoading && !errorMessage && filteredSongs.length === 0 && (
        <Text style={styles.empty}>条件に一致する曲がありません。</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  chip: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  description: {
    color: "#475569",
    fontSize: 12,
  },
  empty: {
    color: "#64748B",
    fontSize: 13,
    paddingVertical: 8,
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
  },
  filterHint: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  filterLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  heading: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  linkLyrics: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  playButton: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  playButtonActive: {
    borderColor: "#0F172A",
    borderWidth: 1,
  },
  playButtonPiano: {
    backgroundColor: "#7C3AED",
  },
  playButtons: {
    flexDirection: "row",
    gap: 6,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  playButtonVocal: {
    backgroundColor: "#059669",
  },
  links: {
    flexDirection: "row",
    gap: 10,
  },
  linkScore: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 10,
    paddingBottom: 84,
  },
  meta: {
    color: "#64748B",
    fontSize: 12,
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 2,
  },
  songMeta: {
    color: "#64748B",
    fontSize: 11,
  },
  songTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
});
