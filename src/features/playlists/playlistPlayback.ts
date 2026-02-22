import { SongManifestItem } from "../../domain/manifest";
import { Playlist } from "../../domain/playlist";
import { playSongWithQueue } from "../player/globalPlayer";

export function resolvePlaylistPlayback(
  playlist: Playlist,
  index: number,
  manifestSongs: SongManifestItem[]
) {
  if (!Number.isInteger(index) || index < 0 || index >= playlist.items.length) {
    throw new Error("playlist index out of range");
  }

  const songsById = new Map(manifestSongs.map((song) => [song.id, song] as const));
  const playableQueue = playlist.items
    .map((item) => songsById.get(item.songId) ?? null)
    .filter((song): song is SongManifestItem => Boolean(song));
  const selectedItem = playlist.items[index];
  const selectedSong = songsById.get(selectedItem.songId) ?? null;

  return {
    playableQueue,
    selectedSong,
  };
}

export async function playPlaylistFromIndex(
  playlist: Playlist,
  index: number,
  manifestSongs: SongManifestItem[]
) {
  const { playableQueue, selectedSong } = resolvePlaylistPlayback(playlist, index, manifestSongs);
  if (playableQueue.length < 1) {
    throw new Error("No playable songs");
  }
  if (!selectedSong) {
    throw new Error("Unknown song");
  }

  await playSongWithQueue(playableQueue, selectedSong, selectedSong.audio.defaultSource, true);
}
