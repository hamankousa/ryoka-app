import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Playlist } from "../../../src/domain/playlist";
import { SongManifestItem } from "../../../src/domain/manifest";
import { playPlaylistFromIndex } from "../../../src/features/playlists/playlistPlayback";
import { playlistRepository } from "../../../src/features/playlists/playlistRepository";
import { encodePlaylistToYaml } from "../../../src/features/playlists/playlistShareCodec";
import { loadSongs } from "../../../src/features/songs/loadSongs";
import { createManifestRepository } from "../../../src/infra/manifestRepository";
import { useAppSettings } from "../../../src/features/settings/SettingsContext";
import { LoadingPulse } from "../../../src/ui/loading/LoadingPulse";
import { useScreenEntranceMotion } from "../../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../../src/ui/navigation/SwipeBackContainer";

const manifestRepository = createManifestRepository({});

export default function PlaylistDetailScreen() {
  const { palette } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();
  const params = useLocalSearchParams<{ playlistId?: string }>();
  const playlistId = typeof params.playlistId === "string" ? params.playlistId : "";
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);

  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song] as const)), [songs]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [nextPlaylist, manifest] = await Promise.all([
          playlistRepository.getPlaylist(playlistId),
          loadSongs(manifestRepository),
        ]);
        if (!mounted) {
          return;
        }
        if (!nextPlaylist) {
          setErrorMessage("プレイリストが見つかりません。");
          setPlaylist(null);
          return;
        }
        setPlaylist(nextPlaylist);
        setNameInput(nextPlaylist.name);
        setSongs(manifest.songs);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "プレイリストの読み込みに失敗しました。");
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
  }, [playlistId]);

  const refreshPlaylist = async () => {
    const next = await playlistRepository.getPlaylist(playlistId);
    setPlaylist(next);
    if (next) {
      setNameInput(next.name);
    }
  };

  const rename = async () => {
    if (!playlist) {
      return;
    }
    try {
      const renamed = await playlistRepository.renamePlaylist(playlist.id, nameInput);
      setPlaylist(renamed);
      setMessage("プレイリスト名を変更しました。");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "名前変更に失敗しました。");
    }
  };

  const removeAt = async (index: number) => {
    if (!playlist) {
      return;
    }
    try {
      const next = await playlistRepository.removeSongAt(playlist.id, index);
      setPlaylist(next);
      setMessage("曲を削除しました。");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "削除に失敗しました。");
    }
  };

  const move = async (fromIndex: number, toIndex: number) => {
    if (!playlist) {
      return;
    }
    try {
      const next = await playlistRepository.moveSong(playlist.id, fromIndex, toIndex);
      setPlaylist(next);
      setMessage("曲順を変更しました。");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "並び替えに失敗しました。");
    }
  };

  const playAt = async (index: number) => {
    if (!playlist) {
      return;
    }
    try {
      await playPlaylistFromIndex(playlist, index, songs);
      setErrorMessage(null);
      setMessage("再生を開始しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "再生に失敗しました。");
    }
  };

  const sharePlaylist = async () => {
    if (!playlist) {
      return;
    }
    const yamlText = encodePlaylistToYaml(playlist);
    if (Platform.OS === "web") {
      const navigatorWithShare = globalThis.navigator as Navigator & {
        share?: (data: { text?: string; title?: string }) => Promise<void>;
      };
      if (typeof navigatorWithShare?.share === "function") {
        await navigatorWithShare.share({ title: playlist.name, text: yamlText });
        return;
      }
      setShareText(yamlText);
      return;
    }
    await Share.share({
      title: playlist.name,
      message: yamlText,
    });
  };

  if (isLoading) {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <LoadingPulse
            label="プレイリストを読み込み中..."
            accentColor={palette.accent}
            textColor={palette.textPrimary}
            hintColor={palette.textSecondary}
          />
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  if (!playlist || errorMessage === "プレイリストが見つかりません。") {
    return (
      <SwipeBackContainer backgroundColor={palette.screenBackground}>
        <Animated.View style={[styles.centered, { backgroundColor: palette.screenBackground }, entranceStyle]}>
          <Text style={[styles.error, { color: palette.danger }]}>{errorMessage ?? "プレイリストが見つかりません。"}</Text>
        </Animated.View>
      </SwipeBackContainer>
    );
  }

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.container, { backgroundColor: palette.screenBackground }, entranceStyle]}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>プレイリスト詳細</Text>
        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <TextInput
            testID="playlist-rename-input"
            value={nameInput}
            onChangeText={setNameInput}
            style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
          />
          <View style={styles.buttonRow}>
            <Pressable testID="playlist-rename-submit" style={styles.secondaryButton} onPress={() => void rename()}>
              <Text style={styles.secondaryButtonText}>改名</Text>
            </Pressable>
            <Pressable testID="playlist-play-start" style={styles.primaryButton} onPress={() => void playAt(0)}>
              <Text style={styles.primaryButtonText}>先頭から再生</Text>
            </Pressable>
            <Pressable testID="playlist-share-submit" style={styles.secondaryButton} onPress={() => void sharePlaylist()}>
              <Text style={styles.secondaryButtonText}>共有</Text>
            </Pressable>
          </View>
        </View>

        {message ? <Text style={[styles.message, { color: "#0F766E" }]}>{message}</Text> : null}
        {errorMessage && errorMessage !== "プレイリストが見つかりません。" ? (
          <Text style={[styles.message, { color: palette.danger }]}>{errorMessage}</Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.list}>
          {playlist.items.map((item, index) => {
            const song = songsById.get(item.songId) ?? null;
            const isUnknown = !song;
            return (
              <View
                key={`${item.songId}:${index}`}
                style={[styles.row, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
              >
                <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                  {song ? song.title : `不明曲: ${item.songId}`}
                </Text>
                <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>ID: {item.songId}</Text>
                <View style={styles.rowButtons}>
                  {!isUnknown && (
                    <Pressable
                      testID={`playlist-play-row-${index}`}
                      style={styles.playButton}
                      onPress={() => {
                        void playAt(index);
                      }}
                    >
                      <Text style={styles.playButtonText}>再生</Text>
                    </Pressable>
                  )}
                  <Pressable
                    testID={`playlist-move-up-${index}`}
                    style={styles.smallButton}
                    disabled={index === 0}
                    onPress={() => {
                      void move(index, index - 1);
                    }}
                  >
                    <Text style={styles.smallButtonText}>↑</Text>
                  </Pressable>
                  <Pressable
                    testID={`playlist-move-down-${index}`}
                    style={styles.smallButton}
                    disabled={index >= playlist.items.length - 1}
                    onPress={() => {
                      void move(index, index + 1);
                    }}
                  >
                    <Text style={styles.smallButtonText}>↓</Text>
                  </Pressable>
                  <Pressable
                    testID={`playlist-remove-row-${index}`}
                    style={styles.removeButton}
                    onPress={() => {
                      void removeAt(index);
                    }}
                  >
                    <Text style={styles.removeButtonText}>削除</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {playlist.items.length < 1 && (
            <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>このプレイリストは空です。</Text>
          )}
        </ScrollView>

        <Modal visible={shareText !== null} transparent animationType="fade" onRequestClose={() => setShareText(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>共有テキスト</Text>
              <Text selectable style={[styles.shareText, { color: palette.textPrimary }]}>
                {shareText ?? ""}
              </Text>
              <Pressable style={styles.secondaryButton} onPress={() => setShareText(null)}>
                <Text style={styles.secondaryButtonText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SwipeBackContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  message: {
    fontSize: 12,
  },
  list: {
    gap: 8,
    paddingBottom: 86,
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  rowMeta: {
    fontSize: 12,
  },
  rowButtons: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  playButton: {
    backgroundColor: "#0F766E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  smallButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallButtonText: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  removeButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeButtonText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  error: {
    fontSize: 13,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.54)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 12,
    width: "100%",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  shareText: {
    fontSize: 11,
  },
});
