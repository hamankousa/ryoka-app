import { SongManifestItem } from "../../domain/manifest";

export type OfflineScoreEntry = {
  songId: string;
  scorePath?: string;
};

export function resolveScoreSource(song: SongManifestItem, offline?: OfflineScoreEntry) {
  if (offline && offline.songId === song.id && offline.scorePath) {
    return offline.scorePath;
  }
  return song.score.pdfUrl;
}
