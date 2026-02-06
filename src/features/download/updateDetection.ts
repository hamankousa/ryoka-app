import { SongManifestItem } from "../../domain/manifest";
import { OfflineEntry } from "../offline/offlineRepo";

function hasNewerTimestamp(song: SongManifestItem, entry: OfflineEntry) {
  const remote = new Date(song.updatedAt).getTime();
  const local = new Date(entry.updatedAt).getTime();
  if (Number.isNaN(remote) || Number.isNaN(local)) {
    return false;
  }
  return remote > local;
}

function differsByHash(song: SongManifestItem, entry: OfflineEntry) {
  const offline = entry.hashes;
  if (!offline) {
    return false;
  }

  const checks: Array<[string | undefined, string | undefined]> = [
    [song.audio.sha256, offline.vocal],
    [song.lyrics.sha256, offline.lyrics],
    [song.score.sha256, offline.score],
  ];

  return checks.some(([remote, local]) => remote !== undefined && local !== undefined && remote !== local);
}

function differsBySize(song: SongManifestItem, entry: OfflineEntry) {
  const offline = entry.sizes;
  if (!offline) {
    return false;
  }

  const checks: Array<[number | undefined, number | undefined]> = [
    [song.audio.sizeBytes, offline.vocal],
    [song.lyrics.sizeBytes, offline.lyrics],
    [song.score.sizeBytes, offline.score],
  ];

  return checks.some(([remote, local]) => remote !== undefined && local !== undefined && remote !== local);
}

export function hasSongUpdate(song: SongManifestItem, entry: OfflineEntry) {
  return hasNewerTimestamp(song, entry) || differsByHash(song, entry) || differsBySize(song, entry);
}
