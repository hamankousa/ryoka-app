import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppSettings } from "../../features/settings/SettingsContext";
import { playlistRepository } from "../../features/playlists/playlistRepository";

type Props = {
  songId: string;
  compact?: boolean;
};

export function AddSongToPlaylistButton({ songId, compact = false }: Props) {
  const { palette } = useAppSettings();
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshPlaylists = useCallback(async () => {
    const list = await playlistRepository.listPlaylists();
    setPlaylists(list.map((item) => ({ id: item.id, name: item.name })));
  }, []);

  const open = async () => {
    setVisible(true);
    setErrorMessage(null);
    setMessage(null);
    await refreshPlaylists();
  };

  const addToPlaylist = async (playlistId: string) => {
    try {
      await playlistRepository.addSongToPlaylist(playlistId, songId);
      setMessage("プレイリストに追加しました。");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "追加に失敗しました。");
    }
  };

  const createAndAdd = async () => {
    try {
      const targetName = newName.trim().length > 0 ? newName.trim() : "新しいプレイリスト";
      const playlist = await playlistRepository.createPlaylist(targetName);
      await playlistRepository.addSongToPlaylist(playlist.id, songId);
      setNewName("");
      setMessage("新規プレイリストに追加しました。");
      setErrorMessage(null);
      await refreshPlaylists();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "作成に失敗しました。");
    }
  };

  return (
    <>
      <Pressable
        testID={`playlist-add-open-${songId}`}
        style={[
          compact ? styles.openButtonCompact : styles.openButton,
          { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
        ]}
        onPress={() => {
          void open();
        }}
      >
        <Text style={[compact ? styles.openButtonCompactText : styles.openButtonText, { color: palette.textPrimary }]}>
          プレイリストに追加
        </Text>
      </Pressable>
      <Modal animationType="fade" visible={visible} transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.surfaceBackground, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>追加先を選択</Text>
            <ScrollView style={styles.listArea} contentContainerStyle={styles.listContent}>
              {playlists.map((playlist) => (
                <Pressable
                  key={playlist.id}
                  testID={`playlist-add-target-${playlist.id}`}
                  style={[styles.playlistButton, { borderColor: palette.border, backgroundColor: palette.surfaceStrong }]}
                  onPress={() => {
                    void addToPlaylist(playlist.id);
                  }}
                >
                  <Text style={[styles.playlistButtonText, { color: palette.textPrimary }]}>{playlist.name}</Text>
                </Pressable>
              ))}
              {playlists.length < 1 && (
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                  まだプレイリストがありません。下で新規作成できます。
                </Text>
              )}
            </ScrollView>
            <TextInput
              testID="playlist-add-new-name-input"
              value={newName}
              onChangeText={setNewName}
              placeholder="新規プレイリスト名"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { borderColor: palette.border, color: palette.textPrimary }]}
            />
            <Pressable
              testID="playlist-add-create"
              style={[styles.primaryButton, { backgroundColor: palette.accent }]}
              onPress={() => {
                void createAndAdd();
              }}
            >
              <Text style={styles.primaryButtonText}>新規作成して追加</Text>
            </Pressable>
            {message ? <Text style={[styles.message, { color: "#0F766E" }]}>{message}</Text> : null}
            {errorMessage ? <Text style={[styles.message, { color: palette.danger }]}>{errorMessage}</Text> : null}
            <Pressable
              testID="playlist-add-close"
              style={[styles.closeButton, { borderColor: palette.border }]}
              onPress={() => setVisible(false)}
            >
              <Text style={[styles.closeButtonText, { color: palette.textPrimary }]}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  sheet: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: "80%",
    padding: 12,
    width: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  listArea: {
    maxHeight: 220,
  },
  listContent: {
    gap: 6,
    paddingBottom: 6,
  },
  playlistButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  playlistButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryButton: {
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 12,
    marginTop: 8,
  },
  closeButton: {
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  openButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openButtonCompact: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  openButtonCompactText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
