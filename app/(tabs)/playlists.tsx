import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Playlist } from "../../src/domain/playlist";
import { playlistRepository } from "../../src/features/playlists/playlistRepository";
import { decodePlaylistFromYaml, resolveImportedPlaylistName } from "../../src/features/playlists/playlistShareCodec";
import { useAppSettings } from "../../src/features/settings/SettingsContext";
import { LoadingPulse } from "../../src/ui/loading/LoadingPulse";
import { useScreenEntranceMotion } from "../../src/ui/motion/useScreenEntranceMotion";
import { SwipeBackContainer } from "../../src/ui/navigation/SwipeBackContainer";

export default function PlaylistsScreen() {
  const router = useRouter();
  const { palette } = useAppSettings();
  const entranceStyle = useScreenEntranceMotion();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState("");

  const refresh = async () => {
    const next = await playlistRepository.listPlaylists();
    setPlaylists(next);
  };

  useEffect(() => {
    let mounted = true;
    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const next = await playlistRepository.listPlaylists();
        if (!mounted) {
          return;
        }
        setPlaylists(next);
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
  }, []);

  const createPlaylist = async () => {
    try {
      const name = newName.trim().length > 0 ? newName : "新しいプレイリスト";
      await playlistRepository.createPlaylist(name);
      setNewName("");
      setMessage("プレイリストを作成しました。");
      setErrorMessage(null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "作成に失敗しました。");
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      await playlistRepository.deletePlaylist(playlistId);
      setMessage("プレイリストを削除しました。");
      setErrorMessage(null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "削除に失敗しました。");
    }
  };

  const importYaml = async () => {
    try {
      const decoded = decodePlaylistFromYaml(importText);
      const existing = await playlistRepository.listPlaylists();
      const uniqueName = resolveImportedPlaylistName(
        decoded.name,
        existing.map((playlist) => playlist.name)
      );
      const created = await playlistRepository.createPlaylist(uniqueName);
      for (const songId of decoded.songIds) {
        await playlistRepository.addSongToPlaylist(created.id, songId);
      }
      setImportText("");
      setImportModalVisible(false);
      setMessage(`プレイリスト「${uniqueName}」を取り込みました。`);
      setErrorMessage(null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "YAML取り込みに失敗しました。");
    }
  };

  return (
    <SwipeBackContainer backgroundColor={palette.screenBackground}>
      <Animated.View style={[styles.container, { backgroundColor: palette.screenBackground }, entranceStyle]}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>プレイリスト</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          複数の再生キューを作成して共有できます。
        </Text>

        <View style={[styles.card, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
          <TextInput
            testID="playlist-create-name-input"
            value={newName}
            onChangeText={setNewName}
            placeholder="新規プレイリスト名"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
          />
          <View style={styles.rowButtons}>
            <Pressable
              testID="playlist-create-submit"
              style={[styles.primaryButton, { backgroundColor: palette.accent }]}
              onPress={() => {
                void createPlaylist();
              }}
            >
              <Text style={styles.primaryButtonText}>作成</Text>
            </Pressable>
            <Pressable
              testID="playlist-import-open"
              style={[styles.secondaryButton, { borderColor: palette.border }]}
              onPress={() => setImportModalVisible(true)}
            >
              <Text style={[styles.secondaryButtonText, { color: palette.textPrimary }]}>YAML取込</Text>
            </Pressable>
          </View>
        </View>

        {isLoading && (
          <LoadingPulse
            label="プレイリストを読み込み中..."
            accentColor={palette.accent}
            textColor={palette.textPrimary}
            hintColor={palette.textSecondary}
          />
        )}
        {message ? <Text style={[styles.message, { color: "#0F766E" }]}>{message}</Text> : null}
        {errorMessage ? <Text style={[styles.message, { color: palette.danger }]}>{errorMessage}</Text> : null}

        {!isLoading && (
          <ScrollView contentContainerStyle={styles.list}>
            {playlists.map((playlist) => (
              <View
                key={playlist.id}
                style={[styles.listCard, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}
              >
                <Pressable
                  testID={`playlist-open-${playlist.id}`}
                  onPress={() => {
                    router.push(`/playlist/${playlist.id}`);
                  }}
                >
                  <Text style={[styles.listTitle, { color: palette.textPrimary }]}>{playlist.name}</Text>
                  <Text style={[styles.listMeta, { color: palette.textSecondary }]}>
                    {playlist.items.length}曲 / 更新 {playlist.updatedAt}
                  </Text>
                </Pressable>
                <Pressable
                  testID={`playlist-delete-${playlist.id}`}
                  style={styles.deleteButton}
                  onPress={() => {
                    void deletePlaylist(playlist.id);
                  }}
                >
                  <Text style={styles.deleteButtonText}>削除</Text>
                </Pressable>
              </View>
            ))}
            {playlists.length < 1 && (
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                まだプレイリストがありません。
              </Text>
            )}
          </ScrollView>
        )}

        <Modal
          transparent
          animationType="fade"
          visible={importModalVisible}
          onRequestClose={() => setImportModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>YAMLを貼り付け</Text>
              <TextInput
                testID="playlist-import-input"
                value={importText}
                onChangeText={setImportText}
                multiline
                textAlignVertical="top"
                placeholder="schema: ryoka-playlist/v1 ..."
                placeholderTextColor={palette.textSecondary}
                style={[styles.modalInput, { borderColor: palette.border, color: palette.textPrimary }]}
              />
              <View style={styles.rowButtons}>
                <Pressable
                  testID="playlist-import-submit"
                  style={[styles.primaryButton, { backgroundColor: palette.accent }]}
                  onPress={() => {
                    void importYaml();
                  }}
                >
                  <Text style={styles.primaryButtonText}>取り込み</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: palette.border }]}
                  onPress={() => setImportModalVisible(false)}
                >
                  <Text style={[styles.secondaryButtonText, { color: palette.textPrimary }]}>閉じる</Text>
                </Pressable>
              </View>
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
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
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
  rowButtons: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
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
  listCard: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  listMeta: {
    fontSize: 12,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 6,
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
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    height: 180,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
