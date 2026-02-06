import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { SongManifestItem } from "../src/domain/manifest";
import { createPlayerStore } from "../src/features/player/playerStore";
import { loadSongs } from "../src/features/songs/loadSongs";
import { createManifestRepository } from "../src/infra/manifestRepository";
import { MiniPlayer } from "../src/ui/player/MiniPlayer";

const manifestRepository = createManifestRepository({});
const playerStore = createPlayerStore();

export default function SongsPlaceholderScreen() {
  const [songs, setSongs] = useState<SongManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState<string | undefined>(undefined);

  const hasSongs = useMemo(() => songs.length > 0, [songs]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>曲一覧</Text>
      <Text style={styles.subtitle}>Step 2: manifest 取得 + キャッシュ</Text>

      {isLoading && <ActivityIndicator size="large" />}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {!isLoading && !hasSongs && !errorMessage && (
        <Text style={styles.empty}>曲がありません。manifest を確認してください。</Text>
      )}

      {hasSongs && (
        <FlatList
          contentContainerStyle={styles.list}
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                const index = songs.findIndex((song) => song.id === item.id);
                playerStore.setQueue(songs, index);
                playerStore.play();
                const state = playerStore.getState();
                setIsPlaying(state.isPlaying);
                setCurrentSongTitle(state.currentSong?.title);
              }}
            >
              <Text style={styles.songTitle}>{item.title}</Text>
              <Text style={styles.songMeta}>更新日: {item.updatedAt}</Text>
            </Pressable>
          )}
        />
      )}

      <MiniPlayer
        title={currentSongTitle}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (playerStore.getState().isPlaying) {
            playerStore.pause();
          } else {
            playerStore.play();
          }
          const state = playerStore.getState();
          setIsPlaying(state.isPlaying);
          setCurrentSongTitle(state.currentSong?.title);
        }}
        onPrev={() => {
          playerStore.prev();
          const state = playerStore.getState();
          setCurrentSongTitle(state.currentSong?.title);
        }}
        onNext={() => {
          playerStore.next();
          const state = playerStore.getState();
          setCurrentSongTitle(state.currentSong?.title);
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
    fontSize: 14,
  },
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  songMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  songTitle: {
    color: "#0F172A",
    fontSize: 16,
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
