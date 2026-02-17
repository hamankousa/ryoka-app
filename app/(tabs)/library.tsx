import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SongManifestItem } from "../../src/domain/manifest";
import { downloadService, SongDownloadMeta } from "../../src/features/download/downloadService";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import { loadSongs } from "../../src/features/songs/loadSongs";
import { createManifestRepository } from "../../src/infra/manifestRepository";
import { useAppSettings } from "../../src/features/settings/SettingsContext";

const manifestRepository = createManifestRepository({});

type OfflineSong = {
  entry: OfflineEntry;
  song: SongManifestItem | null;
};

type LibraryItem = {
  songId: string;
  song: SongManifestItem | null;
  entry: OfflineEntry | null;
  meta: SongDownloadMeta | null;
};

function sumEntrySize(entry: OfflineEntry | null) {
  if (!entry?.sizes) {
    return 0;
  }
  return Object.values(entry.sizes).reduce((total, value) => total + (value ?? 0), 0);
}

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

export default function LibraryTabScreen() {
  const { palette } = useAppSettings();
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [offlineEntries, setOfflineEntries] = useState<OfflineEntry[]>([]);
  const [downloadMetas, setDownloadMetas] = useState<SongDownloadMeta[]>([]);
  const [downloadSnapshot, setDownloadSnapshot] = useState(downloadService.getSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      const [offline, metas] = await Promise.all([
        downloadService.listOfflineEntries(),
        downloadService.listDownloadMetas(),
      ]);
      if (!mounted) {
        return;
      }
      setOfflineEntries(offline);
      setDownloadMetas(metas);
    }

    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const manifest = await loadSongs(manifestRepository);
        if (!mounted) {
          return;
        }
        setSongs(manifest.songs);
        await refresh();
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "ライブラリの読み込みに失敗しました。");
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
        const [entries, metas] = await Promise.all([
          downloadService.listOfflineEntries(),
          downloadService.listDownloadMetas(),
        ]);
        setOfflineEntries(entries);
        setDownloadMetas(metas);
      })();
    });
  }, []);

  const offlineSongs = useMemo<OfflineSong[]>(() => {
    const songsById = new Map(songs.map((song) => [song.id, song] as const));
    return offlineEntries.map((entry) => ({
      entry,
      song: songsById.get(entry.songId) ?? null,
    }));
  }, [offlineEntries, songs]);

  const libraryItems = useMemo<LibraryItem[]>(() => {
    const songsById = new Map(songs.map((song) => [song.id, song] as const));
    const entryBySongId = new Map(offlineEntries.map((entry) => [entry.songId, entry] as const));
    const metaBySongId = new Map(downloadMetas.map((meta) => [meta.songId, meta] as const));
    const songIds = new Set<string>([
      ...entryBySongId.keys(),
      ...metaBySongId.keys(),
    ]);

    return [...songIds]
      .sort((left, right) => left.localeCompare(right, "ja"))
      .map((songId) => ({
        songId,
        song: songsById.get(songId) ?? null,
        entry: entryBySongId.get(songId) ?? null,
        meta: metaBySongId.get(songId) ?? null,
      }));
  }, [downloadMetas, offlineEntries, songs]);

  const deleteOfflineSong = async (songId: string) => {
    await downloadService.deleteSong(songId);
    const [entries, metas] = await Promise.all([
      downloadService.listOfflineEntries(),
      downloadService.listDownloadMetas(),
    ]);
    setOfflineEntries(entries);
    setDownloadMetas(metas);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.screenBackground }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>オフラインライブラリ</Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>端末に保存した曲をここで管理できます。</Text>

      {Platform.OS === "web" && (
        <View style={[styles.notice, { backgroundColor: palette.surfaceStrong, borderColor: palette.border }]}>
          <Text style={styles.noticeText}>Webではダウンロード操作は無効です。モバイル端末で利用してください。</Text>
        </View>
      )}

      {isLoading && <ActivityIndicator size="large" color={palette.accent} />}
      {errorMessage && <Text style={[styles.error, { color: palette.danger }]}>{errorMessage}</Text>}
      {!isLoading && !errorMessage && (
        <Text style={[styles.meta, { color: palette.textSecondary }]}>
          保存曲: {offlineSongs.length}曲 / 管理対象: {libraryItems.length}件
        </Text>
      )}

      {!isLoading && !errorMessage && libraryItems.length === 0 && (
        <View style={[styles.emptyBox, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>まだ保存曲がありません</Text>
          <Text style={[styles.emptyDescription, { color: palette.textSecondary }]}>
            一覧/検索タブで曲を選んでダウンロードしてください。
          </Text>
        </View>
      )}

      {!isLoading && !errorMessage && libraryItems.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {libraryItems.map(({ songId, entry, song, meta }) => {
            const activeJob = downloadService.getJobBySongId(downloadSnapshot, songId);
            const statusLabel =
              activeJob?.status === "queued" || activeJob?.status === "downloading" || activeJob?.status === "retrying"
                ? `ダウンロード中 ${Math.round(activeJob.progress)}%`
                : meta?.status === "failed"
                  ? meta.interrupted
                    ? "中断"
                    : "失敗"
                  : meta?.status === "cancelled"
                    ? "キャンセル"
                    : entry
                      ? "済"
                      : "未";
            const canRetry = Boolean(meta && (meta.status === "failed" || meta.status === "cancelled") && song);
            const canCancel = Boolean(activeJob && (activeJob.status === "queued" || activeJob.status === "downloading" || activeJob.status === "retrying"));
            const canDelete = Boolean(entry || meta);
            const totalSize = formatBytes(sumEntrySize(entry));

            return (
            <View
              key={songId}
              style={[styles.row, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
            >
              <Text style={[styles.songTitle, { color: palette.textPrimary }]}>{song?.title ?? songId}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>ID: {songId}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>年度: {song?.yearLabel ?? "-"}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>状態: {statusLabel}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>容量: {totalSize}</Text>
              <View style={styles.links}>
                <Link href={`/lyrics/${songId}`} style={styles.lyricsLink}>
                  歌詞
                </Link>
                <Link href={`/score/${songId}`} style={styles.scoreLink}>
                  楽譜
                </Link>
                <Link href={`/song/${songId}`} style={styles.detailLink}>
                  詳細
                </Link>
              </View>
              {Platform.OS !== "web" && (
                <View style={styles.buttonRow}>
                  {canRetry && (
                    <Pressable
                      style={styles.retryButton}
                      onPress={() => {
                        if (!song) {
                          return;
                        }
                        void downloadService.retrySongDownload(song);
                      }}
                    >
                      <Text style={styles.retryButtonText}>再試行</Text>
                    </Pressable>
                  )}
                  {canCancel && (
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        downloadService.cancelSongDownload(songId);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>中止</Text>
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => {
                        void deleteOfflineSong(songId);
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  emptyDescription: {
    color: "#64748B",
    fontSize: 13,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
  },
  links: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  detailLink: {
    color: "#0369A1",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#CCFBF1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  cancelButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cancelButtonText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 8,
    paddingBottom: 80,
  },
  lyricsLink: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: "#64748B",
    fontSize: 12,
  },
  notice: {
    backgroundColor: "#ECFEFF",
    borderColor: "#A5F3FC",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: "#155E75",
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  scoreLink: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
  },
  songMeta: {
    color: "#64748B",
    fontSize: 12,
  },
  songTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    fontSize: 13,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
  },
});
