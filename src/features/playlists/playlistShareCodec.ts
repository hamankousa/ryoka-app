import { dump, load } from "js-yaml";

import { Playlist, normalizePlaylistName } from "../../domain/playlist";
import { parsePlaylistShareV1, PlaylistShareV1, PLAYLIST_SHARE_SCHEMA_V1 } from "../../domain/playlistShare";

export function encodePlaylistToYaml(
  playlist: Playlist,
  exportedAt: string = new Date().toISOString()
) {
  const payload: PlaylistShareV1 = {
    schema: PLAYLIST_SHARE_SCHEMA_V1,
    name: normalizePlaylistName(playlist.name),
    songIds: playlist.items.map((item) => item.songId),
    exportedAt,
  };

  return dump(payload);
}

export function decodePlaylistFromYaml(input: string): PlaylistShareV1 {
  let parsed: unknown;
  try {
    parsed = load(input);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid YAML");
  }
  return parsePlaylistShareV1(parsed);
}

export function resolveImportedPlaylistName(name: string, existingNames: string[]) {
  const normalizedName = normalizePlaylistName(name);
  const occupied = new Set(existingNames.map((item) => item.trim()));
  if (!occupied.has(normalizedName)) {
    return normalizedName;
  }
  let number = 2;
  while (occupied.has(`${normalizedName} (${number})`)) {
    number += 1;
  }
  return `${normalizedName} (${number})`;
}
