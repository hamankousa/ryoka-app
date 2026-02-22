import { z } from "zod";

export const PLAYLIST_COLLECTION_VERSION = 1 as const;

const PlaylistItemSchema = z.object({
  songId: z.string().min(1),
  addedAt: z.string().min(1),
});

const PlaylistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  items: z.array(PlaylistItemSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const PlaylistCollectionSchema = z.object({
  version: z.literal(PLAYLIST_COLLECTION_VERSION),
  playlists: z.array(PlaylistSchema),
});

export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistCollection = z.infer<typeof PlaylistCollectionSchema>;

export function createEmptyPlaylistCollection(): PlaylistCollection {
  return {
    version: PLAYLIST_COLLECTION_VERSION,
    playlists: [],
  };
}

export function normalizePlaylistName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error("Invalid playlist name");
  }
  return trimmed;
}

export function parsePlaylistCollection(input: unknown): PlaylistCollection {
  return PlaylistCollectionSchema.parse(input);
}

export function parsePlaylist(input: unknown): Playlist {
  return PlaylistSchema.parse(input);
}
