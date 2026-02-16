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
import { downloadService } from "../../src/features/download/downloadService";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import { loadSongs } from "../../src/features/songs/loadSongs";
import { createManifestRepository } from "../../src/infra/manifestRepository";
import { useAppSettings } from "../../src/features/settings/SettingsContext";

const manifestRepository = createManifestRepository({});

type OfflineSong = {
  entry: OfflineEntry;
  song: SongManifestItem | null;
};

export default function LibraryTabScreen() {
  const { palette } = useAppSettings();
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [offlineEntries, setOfflineEntries] = useState<OfflineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [manifest, offline] = await Promise.all([
          loadSongs(manifestRepository),
          downloadService.listOfflineEntries(),
        ]);
        if (!mounted) {
          return;
        }
        setSongs(manifest.songs);
        setOfflineEntries(offline);
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
    return downloadService.subscribe(() => {
      void downloadService.listOfflineEntries().then((entries) => {
        setOfflineEntries(entries);
      });
    });
  }, []);

  const offlineSongs = useMemo<OfflineSong[]>(() => {
    const songsById = new Map(songs.map((song) => [song.id, song] as const));
    return offlineEntries.map((entry) => ({
      entry,
      song: songsById.get(entry.songId) ?? null,
    }));
  }, [offlineEntries, songs]);

  const deleteOfflineSong = async (songId: string) => {
    await downloadService.deleteSong(songId);
    const entries = await downloadService.listOfflineEntries();
    setOfflineEntries(entries);
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
        <Text style={[styles.meta, { color: palette.textSecondary }]}>保存曲: {offlineSongs.length}曲</Text>
      )}

      {!isLoading && !errorMessage && offlineSongs.length === 0 && (
        <View style={[styles.emptyBox, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>まだ保存曲がありません</Text>
          <Text style={[styles.emptyDescription, { color: palette.textSecondary }]}>
            一覧タブで曲を選んでダウンロードしてください。
          </Text>
        </View>
      )}

      {!isLoading && !errorMessage && offlineSongs.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {offlineSongs.map(({ entry, song }) => (
            <View
              key={entry.songId}
              style={[styles.row, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
            >
              <Text style={[styles.songTitle, { color: palette.textPrimary }]}>{song?.title ?? entry.songId}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>ID: {entry.songId}</Text>
              <Text style={[styles.songMeta, { color: palette.textSecondary }]}>年度: {song?.yearLabel ?? "-"}</Text>
              <View style={styles.links}>
                <Link href={`/lyrics/${entry.songId}`} style={styles.lyricsLink}>
                  歌詞
                </Link>
                <Link href={`/score/${entry.songId}`} style={styles.scoreLink}>
                  楽譜
                </Link>
              </View>
              {Platform.OS !== "web" && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => {
                    void deleteOfflineSong(entry.songId);
                  }}
                >
                  <Text style={styles.deleteButtonText}>ライブラリから削除</Text>
                </Pressable>
              )}
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
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    marginTop: 8,
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
