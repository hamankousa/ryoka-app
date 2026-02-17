import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

import {
  FILTER_PANEL_ANIMATION_DURATION_MS,
  resolveFilterPanelCollapsedOnScroll,
} from "../../src/domain/filterPanelBehavior";
import { SongManifestItem } from "../../src/domain/manifest";
import { downloadService, SongDownloadMeta } from "../../src/features/download/downloadService";
import { getSongDownloadState } from "../../src/features/download/downloadState";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import { audioEngine, PlaybackSnapshot } from "../../src/features/player/audioEngine";
import { playSongWithQueue } from "../../src/features/player/globalPlayer";
import { AudioSource, getPlayableAudioCandidates } from "../../src/features/player/playerStore";
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
import { useAppSettings } from "../../src/features/settings/SettingsContext";

const manifestRepository = createManifestRepository({});
export default function SearchTabScreen() {
  const { settings, palette } = useAppSettings();
  const introAnim = useRef(new Animated.Value(0)).current;
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>(audioEngine.getSnapshot());
  const [offlineEntries, setOfflineEntries] = useState<Record<string, OfflineEntry>>({});
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [downloadMetaBySongId, setDownloadMetaBySongId] = useState<Record<string, SongDownloadMeta>>({});
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");
  const [yearKeyFilter, setYearKeyFilter] = useState<string | null>(null);
  const [yearDecadeFilter, setYearDecadeFilter] = useState<number | null>(null);
  const lastResultScrollYRef = useRef(0);
  const isFilterCollapsedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    introAnim.setValue(0);
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const animateFilterPanelTransition = () => {
    LayoutAnimation.configureNext({
      duration: FILTER_PANEL_ANIMATION_DURATION_MS,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  const applyFilterCollapsedState = (next: boolean) => {
    if (next === isFilterCollapsedRef.current) {
      return;
    }
    animateFilterPanelTransition();
    isFilterCollapsedRef.current = next;
    setIsFilterCollapsed(next);
  };

  useEffect(() => {
    if (!settings.filterAutoCollapseEnabled) {
      applyFilterCollapsedState(false);
    }
  }, [settings.filterAutoCollapseEnabled]);

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
  const filteredSongIds = useMemo(() => filteredSongs.map((song) => song.id), [filteredSongs]);
  const bulkProgress = useMemo(
    () => downloadService.getBulkDownloadProgress(filteredSongIds),
    [downloadSnapshot, filteredSongIds]
  );

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    const query = searchQuery.trim();
    if (query) {
      parts.push(`キーワード: ${query}`);
    }
    if (eraFilter !== "all") {
      parts.push(`元号: ${getEraLabel(eraFilter)}`);
    }
    if (yearDecadeFilter !== null) {
      parts.push(`年代: ${yearDecadeFilter}-${yearDecadeFilter + 9}`);
    }
    if (yearKeyFilter) {
      parts.push(`年次: ${formatYearChipLabel(yearKeyFilter)}`);
    }
    return parts.length > 0 ? parts.join(" / ") : "絞り込み条件なし";
  }, [eraFilter, searchQuery, yearDecadeFilter, yearKeyFilter]);

  const handleResultScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextOffsetY = event.nativeEvent.contentOffset.y;
    if (!settings.filterAutoCollapseEnabled) {
      lastResultScrollYRef.current = Number.isFinite(nextOffsetY) ? Math.max(0, nextOffsetY) : 0;
      return;
    }
    const next = resolveFilterPanelCollapsedOnScroll({
      isCollapsed: isFilterCollapsedRef.current,
      previousOffsetY: lastResultScrollYRef.current,
      nextOffsetY,
    });
    applyFilterCollapsedState(next);
    lastResultScrollYRef.current = Number.isFinite(nextOffsetY) ? Math.max(0, nextOffsetY) : 0;
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.screenBackground }]}>
      <Animated.View
        style={{
          opacity: introAnim,
          transform: [
            {
              translateY: introAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
        <Text style={[styles.heading, { color: palette.textPrimary }]}>曲を検索</Text>
        <Text style={[styles.description, { color: palette.textSecondary }]}>
          キーワード + 年度クイック検索で絞り込みできます。
        </Text>
      </Animated.View>
      <Animated.View
        style={{
          opacity: introAnim,
          transform: [
            {
              translateY: introAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        }}
      >
      <View style={[styles.filterPanel, { backgroundColor: palette.surfaceStrong, borderColor: palette.border }]}>
        <View style={styles.filterPanelHeader}>
          <Text style={[styles.filterPanelTitle, { color: palette.textPrimary }]}>絞り込み</Text>
          <Pressable
            testID="search-filter-toggle"
            style={[styles.filterToggleButton, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
            onPress={() => applyFilterCollapsedState(!isFilterCollapsedRef.current)}
          >
            <Text style={[styles.filterToggleText, { color: palette.textPrimary }]}>
              {isFilterCollapsed ? "表示" : "折りたたむ"}
            </Text>
          </Pressable>
        </View>

        {isFilterCollapsed ? (
          <Text style={[styles.filterSummary, { color: palette.textSecondary }]}>{filterSummary}</Text>
        ) : (
          <>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="例: H23 / 北嵐 / 吉野萌"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { backgroundColor: palette.surfaceBackground, borderColor: palette.border, color: palette.textPrimary }]}
            />

            <Text style={[styles.filterLabel, { color: palette.textPrimary }]}>元号</Text>
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
                        <Text style={[styles.chipText, yearDecadeFilter === null && styles.chipTextActive]}>
                          年代解除
                        </Text>
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
          </>
        )}
      </View>
      </Animated.View>

      {isLoading && <ActivityIndicator size="large" color={palette.accent} />}
      {errorMessage && <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>}
      {playbackError && <Text style={[styles.error, { color: palette.danger }]}>再生エラー: {playbackError}</Text>}
      {!isLoading && !errorMessage && (
        <Text style={[styles.meta, { color: palette.textSecondary }]}>表示中: {filteredSongs.length}曲</Text>
      )}
      {!isLoading && !errorMessage && Platform.OS !== "web" && filteredSongs.length > 0 && (
        <View style={styles.bulkArea}>
          <View style={styles.bulkButtons}>
            <Pressable
              testID="search-bulk-download"
              style={styles.bulkPrimaryButton}
              onPress={() => {
                void downloadService.downloadSongsBulk(filteredSongs);
              }}
            >
              <Text style={styles.bulkPrimaryButtonText}>表示中を一括DL</Text>
            </Pressable>
            <Pressable
              testID="search-bulk-cancel"
              style={styles.bulkSecondaryButton}
              onPress={() => {
                downloadService.cancelBulkDownloads(filteredSongIds);
              }}
            >
              <Text style={styles.bulkSecondaryButtonText}>全中止</Text>
            </Pressable>
            <Pressable
              testID="search-bulk-retry"
              style={styles.bulkSecondaryButton}
              onPress={() => {
                void downloadService.retryFailedBulkDownloads(filteredSongs);
              }}
            >
              <Text style={styles.bulkSecondaryButtonText}>失敗再試行</Text>
            </Pressable>
          </View>
          <Text style={[styles.bulkMeta, { color: palette.textSecondary }]}>
            進行: {bulkProgress.downloading + bulkProgress.queued}/{bulkProgress.total}件, 完了:{" "}
            {bulkProgress.completed}, 失敗: {bulkProgress.failed}, {bulkProgress.progress}%
          </Text>
        </View>
      )}

      {!isLoading && !errorMessage && filteredSongs.length > 0 && (
        <ScrollView contentContainerStyle={styles.list} onScroll={handleResultScroll} scrollEventThrottle={16}>
          {groupedSongs.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                {section.label} ({section.songs.length})
              </Text>
              {section.songs.map((song) => (
                <View
                  key={song.id}
                  style={[styles.row, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
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
                  <Text style={[styles.songTitle, { color: palette.textPrimary }]}>{song.title}</Text>
                  <Text style={[styles.songMeta, { color: palette.textSecondary }]}>
                    {song.id.toUpperCase()} / {song.yearLabel ?? "-"}
                  </Text>
                  <Text style={[styles.songMeta, { color: palette.textSecondary }]}>
                    {song.credits?.join(" / ") || "-"}
                  </Text>
                  <View style={styles.actionRow}>
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
                  </View>
                  {Platform.OS !== "web" && (
                    <View style={styles.downloadRow}>
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
                      </>
                    );
                  })()}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {!isLoading && !errorMessage && filteredSongs.length === 0 && (
        <Text style={[styles.empty, { color: palette.textSecondary }]}>条件に一致する曲がありません。</Text>
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
  filterPanel: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  filterPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterPanelTitle: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "800",
  },
  filterSummary: {
    color: "#475569",
    fontSize: 12,
  },
  filterToggleButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterToggleText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  heading: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
  },
  bulkArea: {
    gap: 4,
  },
  bulkButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bulkPrimaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bulkPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  bulkSecondaryButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bulkSecondaryButtonText: {
    color: "#1E293B",
    fontSize: 11,
    fontWeight: "700",
  },
  bulkMeta: {
    color: "#64748B",
    fontSize: 11,
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
  linkDetail: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "700",
  },
  downloadRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  downloadBadge: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  downloadButton: {
    backgroundColor: "#0369A1",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  retryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  cancelButton: {
    backgroundColor: "#B45309",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
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
