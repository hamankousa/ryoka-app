import { SongManifestItem } from "../../domain/manifest";

export type OfflineLyricsEntry = {
  songId: string;
  lyricsPath?: string;
};

export type LyricsSource =
  | { type: "uri"; uri: string }
  | { type: "html"; html: string };

export function resolveLyricsSource(
  song: SongManifestItem,
  offline?: OfflineLyricsEntry,
  inlineHtml?: string
): LyricsSource {
  if (inlineHtml) {
    return { type: "html", html: inlineHtml };
  }

  if (offline && offline.songId === song.id && offline.lyricsPath) {
    return { type: "uri", uri: offline.lyricsPath };
  }

  return { type: "uri", uri: song.lyrics.htmlUrl };
}
