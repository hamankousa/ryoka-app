import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SongManifestItem } from "../src/domain/manifest";
import { downloadService } from "../src/features/download/downloadService";
import { getSongDownloadState } from "../src/features/download/downloadState";
import { OfflineEntry } from "../src/features/offline/offlineRepo";
import { audioEngine, PlaybackSnapshot } from "../src/features/player/audioEngine";
import { AudioSource, createPlayerStore, getPreferredAudioUrl } from "../src/features/player/playerStore";
import { MidiTimbre } from "../src/features/player/webMidiEngine";
import { loadSongs } from "../src/features/songs/loadSongs";
import { filterSongsByQuery } from "../src/features/songs/searchSongs";
import {
  buildYearKeyOptions,
  ERA_FILTERS,
  EraFilter,
  ERA_ORDER,
  formatYearChipLabel,
  getEraKey,
  getEraLabel,
  getSongYearKey,
} from "../src/features/songs/yearFilters";
import { createManifestRepository } from "../src/infra/manifestRepository";
import { MiniPlayer } from "../src/ui/player/MiniPlayer";

const manifestRepository = createManifestRepository({});
const playerStore = createPlayerStore();

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
  const [currentSourceLabel, setCurrentSourceLabel] = useState<string>("Vocal");
  const [offlineEntries, setOfflineEntries] = useState<Record<string, OfflineEntry>>({});
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [lyricsHtml, setLyricsHtml] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(false);
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");
  const [yearKeyFilter, setYearKeyFilter] = useState<string | null>(null);
  const [yearDecadeFilter, setYearDecadeFilter] = useState<number | null>(null);

  const eraFilteredSongs = useMemo(() => {
    if (eraFilter === "all") {
      return songs;
    }
    return songs.filter((song) => getEraKey(song.id) === eraFilter);
  }, [songs, eraFilter]);

  const yearKeyOptions = useMemo(() => {
    return buildYearKeyOptions(eraFilteredSongs, eraFilter);
  }, [eraFilter, eraFilteredSongs]);
  const requiresDecadeStep = yearKeyOptions.length > 12;
  const decadeOptions = useMemo(() => {
    const starts = new Set<number>();
    for (const yearKey of yearKeyOptions) {
      const yearNumber = Number(yearKey.slice(1));
      if (Number.isNaN(yearNumber)) {
        continue;
      }
      const start = Math.floor((yearNumber - 1) / 10) * 10 + 1;
      starts.add(start);
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
      const yearNumber = Number(yearKey.slice(1));
      const start = Math.floor((yearNumber - 1) / 10) * 10 + 1;
      return start === yearDecadeFilter;
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

  const textFilteredSongs = useMemo(
    () => filterSongsByQuery(eraFilteredSongs, searchQuery),
    [eraFilteredSongs, searchQuery]
  );
  const filteredSongs = useMemo(() => {
    if (!yearKeyFilter) {
      return textFilteredSongs;
    }
    return textFilteredSongs.filter((song) => getSongYearKey(song.id) === yearKeyFilter);
  }, [textFilteredSongs, yearKeyFilter]);
  const hasSongs = useMemo(() => filteredSongs.length > 0, [filteredSongs]);
  const currentSong = useMemo(
    () => songs.find((song) => song.id === currentSongId) ?? null,
    [songs, currentSongId]
  );
  const currentCreditsText = useMemo(
    () => (currentSong?.credits && currentSong.credits.length > 0 ? currentSong.credits.join(" / ") : "-"),
    [currentSong]
  );
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
        setCurrentSourceLabel(playerStore.getState().source === "piano" ? "Piano" : "Vocal");
        setCurrentSongId(playerStore.getState().currentSong?.id ?? null);

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

  useEffect(() => {
    let mounted = true;
    async function loadLyricsText() {
      if (!currentSong) {
        setLyricsHtml("");
        return;
      }
      try {
        const response = await fetch(currentSong.lyrics.htmlUrl);
        const html = await response.text();
        if (mounted) {
          setLyricsHtml(html);
        }
      } catch {
        if (mounted) {
          setLyricsHtml("<p>歌詞の読み込みに失敗しました。</p>");
        }
      }
    }
    void loadLyricsText();
    return () => {
      mounted = false;
    };
  }, [currentSong]);

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
      setCurrentSourceLabel(source === "piano" ? "Piano" : "Vocal");
      setCurrentSongId(song.id);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "再生に失敗しました。");
    }
  };

  const playSongWithCustomVocal = async (
    song: SongManifestItem,
    alternate: { id: string; label: string; mp3Url: string }
  ) => {
    const index = songs.findIndex((item) => item.id === song.id);
    if (index < 0) {
      return;
    }
    playerStore.setQueue(songs, index);
    playerStore.setSource("vocal");
    try {
      await audioEngine.play(alternate.mp3Url);
      setPlaybackError(null);
      setCurrentSongTitle(song.title);
      setCurrentSource("vocal");
      setCurrentSourceLabel(`Vocal(${alternate.label})`);
      setCurrentSongId(song.id);
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

  const sourceLabel = currentSourceLabel || (currentSource === "piano" ? "Piano" : "Vocal");

  return (
    <View style={[styles.container, liquidGlassEnabled && styles.containerGlass]}>
      <Text style={styles.title}>曲一覧</Text>
      <Text style={styles.subtitle}>年度ごとに折り畳みできます</Text>
      <View style={styles.visualToggleRow}>
        <Text style={styles.visualToggleLabel}>表示モード</Text>
        <Pressable
          style={[styles.visualToggleButton, liquidGlassEnabled && styles.visualToggleButtonActive]}
          onPress={() => setLiquidGlassEnabled((current) => !current)}
        >
          <Text style={[styles.visualToggleButtonText, liquidGlassEnabled && styles.visualToggleButtonTextActive]}>
            {liquidGlassEnabled ? "Liquid Glass: ON" : "Liquid Glass: OFF"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.quickFilterLabel}>年度クイック検索</Text>
      <View style={styles.chipRow}>
        {ERA_FILTERS.map((filterKey) => (
          <Pressable
            key={filterKey}
            style={[
              styles.chip,
              liquidGlassEnabled && styles.glassSurface,
              eraFilter === filterKey && styles.chipActive,
            ]}
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
      {eraFilter === "all" ? (
        <Text style={styles.quickFilterHint}>まず元号を選ぶと年度チップが表示されます</Text>
      ) : yearKeyOptions.length > 0 ? (
        <>
          {requiresDecadeStep && (
            <>
              <Text style={styles.quickFilterHint}>年代を先に選ぶと年次が絞り込まれます</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[
                    styles.chip,
                    liquidGlassEnabled && styles.glassSurface,
                    yearDecadeFilter === null && styles.chipActive,
                  ]}
                  onPress={() => {
                    setYearDecadeFilter(null);
                    setYearKeyFilter(null);
                  }}
                >
                  <Text style={[styles.chipText, yearDecadeFilter === null && styles.chipTextActive]}>
                    年代解除
                  </Text>
                </Pressable>
                {decadeOptions.map((start) => {
                  const end = start + 9;
                  return (
                    <Pressable
                      key={start}
                      style={[
                        styles.chip,
                        liquidGlassEnabled && styles.glassSurface,
                        yearDecadeFilter === start && styles.chipActive,
                      ]}
                      onPress={() => {
                        setYearDecadeFilter(start);
                        setYearKeyFilter(null);
                      }}
                    >
                      <Text style={[styles.chipText, yearDecadeFilter === start && styles.chipTextActive]}>
                        {start}-{end}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {requiresDecadeStep && yearDecadeFilter === null ? (
            <Text style={styles.quickFilterHint}>年代を選ぶと年次チップが表示されます</Text>
          ) : (
            <View style={styles.chipRow}>
              <Pressable
                style={[
                  styles.chip,
                  liquidGlassEnabled && styles.glassSurface,
                  !yearKeyFilter && styles.chipActive,
                ]}
                onPress={() => setYearKeyFilter(null)}
              >
                <Text style={[styles.chipText, !yearKeyFilter && styles.chipTextActive]}>年次解除</Text>
              </Pressable>
              {visibleYearKeyOptions.map((key) => (
                <Pressable
                  key={key}
                  style={[
                    styles.chip,
                    liquidGlassEnabled && styles.glassSurface,
                    yearKeyFilter === key && styles.chipActive,
                  ]}
                  onPress={() => setYearKeyFilter(key)}
                >
                  <Text style={[styles.chipText, yearKeyFilter === key && styles.chipTextActive]}>
                    {formatYearChipLabel(key)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="曲名・年度・作歌作曲者・IDで検索"
        placeholderTextColor="#94A3B8"
        style={[styles.searchInput, liquidGlassEnabled && styles.glassSurface]}
      />
      <Text style={styles.searchMeta}>検索結果: {filteredSongs.length}曲</Text>

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
                      <View
                        key={item.id}
                        style={[
                          styles.row,
                          liquidGlassEnabled && styles.glassSurfaceStrong,
                        ]}
                      >
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
                          {item.audio.vocalAlternates?.map((alternate) => (
                            <Pressable
                              key={`${item.id}:${alternate.id}`}
                              style={styles.playButtonAltVocal}
                              onPress={() => {
                                void playSongWithCustomVocal(item, alternate);
                              }}
                            >
                              <Text style={styles.playButtonText}>{`Vocal-${alternate.label}`}</Text>
                            </Pressable>
                          ))}
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
        octaveShift={playbackSnapshot.octaveShift}
        loopEnabled={playbackSnapshot.loopEnabled}
        canSeek={playbackSnapshot.canSeek}
        canLoop={playbackSnapshot.canLoop}
        canControlTempo={playbackSnapshot.canControlTempo}
        canControlTimbre={playbackSnapshot.canControlTimbre}
        canControlOctave={playbackSnapshot.canControlOctave}
        liquidGlassEnabled={liquidGlassEnabled}
        isExpanded={isPlayerExpanded}
        onExpand={() => setIsPlayerExpanded(true)}
        onCollapse={() => setIsPlayerExpanded(false)}
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
        onOctaveShiftChange={(shift) => {
          void audioEngine.setOctaveShift(shift);
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
            setCurrentSongId(state.currentSong?.id ?? null);
            await playCurrentSong();
          })();
        }}
        onNext={() => {
          void (async () => {
            playerStore.next();
            const state = playerStore.getState();
            setCurrentSongTitle(state.currentSong?.title);
            setCurrentSource(state.source);
            setCurrentSongId(state.currentSong?.id ?? null);
            await playCurrentSong();
          })();
        }}
        yearLabel={currentSong?.yearLabel}
        creditsText={currentCreditsText}
        lyricsHtml={lyricsHtml}
        onSelectSource={(source) => {
          if (!currentSong) {
            return;
          }
          void playSongWithSource(currentSong, source);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 2,
    paddingRight: 8,
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
    backgroundColor: "#F1F5F9",
    flex: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  containerGlass: {
    backgroundColor: "#DDE8F5",
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
  playButtonAltVocal: {
    backgroundColor: "#0EA5E9",
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
  quickFilterLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  quickFilterHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: -2,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: -2,
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
  visualToggleButton: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  visualToggleButtonActive: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderColor: "rgba(255,255,255,0.75)",
  },
  visualToggleButtonText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  visualToggleButtonTextActive: {
    color: "#0B3A67",
  },
  visualToggleLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  visualToggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  glassSurface: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.68)",
  },
  glassSurfaceStrong: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(255,255,255,0.68)",
  },
});
