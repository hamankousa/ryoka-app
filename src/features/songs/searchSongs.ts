import { SongManifestItem } from "../../domain/manifest";

function toSearchText(song: SongManifestItem) {
  return [song.id, song.title, song.yearLabel ?? "", ...(song.credits ?? [])].join(" ").toLowerCase();
}

export function filterSongsByQuery(songs: SongManifestItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return songs;
  }
  return songs.filter((song) => toSearchText(song).includes(normalized));
}

