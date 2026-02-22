import {
  createEmptyPlaylistCollection,
  normalizePlaylistName,
  parsePlaylist,
  parsePlaylistCollection,
  Playlist,
  PlaylistCollection,
} from "../../domain/playlist";

const PLAYLIST_COLLECTION_KEY = "playlist_collection_v1";

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type CreatePlaylistRepositoryOptions = {
  storage?: StorageLike;
  now?: () => string;
  idFactory?: () => string;
};

function getStorage(): StorageLike {
  return require("@react-native-async-storage/async-storage").default as StorageLike;
}

function createPlaylistId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `pl-${Date.now().toString(36)}-${randomPart}`;
}

function clonePlaylist(playlist: Playlist): Playlist {
  return {
    ...playlist,
    items: playlist.items.map((item) => ({ ...item })),
  };
}

function cloneCollection(collection: PlaylistCollection): PlaylistCollection {
  return {
    version: collection.version,
    playlists: collection.playlists.map((playlist) => clonePlaylist(playlist)),
  };
}

function normalizeSongId(songId: string) {
  const trimmed = songId.trim();
  if (!trimmed) {
    throw new Error("Invalid songId");
  }
  return trimmed;
}

function sortByUpdatedAtDesc(playlists: Playlist[]) {
  return [...playlists].sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export class InMemoryPlaylistStorage implements StorageLike {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? this.map.get(key) ?? null : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }
}

export function createPlaylistRepository(options: CreatePlaylistRepositoryOptions = {}) {
  let storageRef: StorageLike | null = options.storage ?? null;
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? createPlaylistId;
  let loaded = false;
  let collection: PlaylistCollection = createEmptyPlaylistCollection();

  function getStorageRef() {
    if (!storageRef) {
      storageRef = getStorage();
    }
    return storageRef;
  }

  async function ensureLoaded() {
    if (loaded) {
      return;
    }
    loaded = true;
    const raw = await getStorageRef().getItem(PLAYLIST_COLLECTION_KEY);
    if (!raw) {
      collection = createEmptyPlaylistCollection();
      return;
    }
    try {
      collection = parsePlaylistCollection(JSON.parse(raw));
    } catch {
      collection = createEmptyPlaylistCollection();
    }
  }

  async function persist() {
    await getStorageRef().setItem(PLAYLIST_COLLECTION_KEY, JSON.stringify(collection));
  }

  function getPlaylistIndex(id: string) {
    return collection.playlists.findIndex((playlist) => playlist.id === id);
  }

  function assertIndexInRange(index: number, maxExclusive: number) {
    if (!Number.isInteger(index) || index < 0 || index >= maxExclusive) {
      throw new Error("index out of range");
    }
  }

  return {
    listPlaylists: async (): Promise<Playlist[]> => {
      await ensureLoaded();
      return sortByUpdatedAtDesc(collection.playlists).map((playlist) => clonePlaylist(playlist));
    },
    getPlaylist: async (id: string): Promise<Playlist | null> => {
      await ensureLoaded();
      const found = collection.playlists.find((playlist) => playlist.id === id);
      return found ? clonePlaylist(found) : null;
    },
    createPlaylist: async (name: string): Promise<Playlist> => {
      await ensureLoaded();
      const normalizedName = normalizePlaylistName(name);
      const timestamp = now();
      const playlist: Playlist = {
        id: idFactory(),
        name: normalizedName,
        items: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      collection = {
        ...collection,
        playlists: [...collection.playlists, playlist],
      };
      await persist();
      return clonePlaylist(playlist);
    },
    renamePlaylist: async (id: string, name: string): Promise<Playlist> => {
      await ensureLoaded();
      const playlistIndex = getPlaylistIndex(id);
      if (playlistIndex < 0) {
        throw new Error("playlist not found");
      }
      const normalizedName = normalizePlaylistName(name);
      const nextPlaylist: Playlist = {
        ...collection.playlists[playlistIndex],
        name: normalizedName,
        updatedAt: now(),
      };
      collection.playlists[playlistIndex] = nextPlaylist;
      await persist();
      return clonePlaylist(nextPlaylist);
    },
    deletePlaylist: async (id: string): Promise<void> => {
      await ensureLoaded();
      collection = {
        ...collection,
        playlists: collection.playlists.filter((playlist) => playlist.id !== id),
      };
      await persist();
    },
    addSongToPlaylist: async (id: string, songId: string): Promise<Playlist> => {
      await ensureLoaded();
      const playlistIndex = getPlaylistIndex(id);
      if (playlistIndex < 0) {
        throw new Error("playlist not found");
      }
      const normalizedSongId = normalizeSongId(songId);
      const target = collection.playlists[playlistIndex];
      const nextPlaylist: Playlist = {
        ...target,
        items: [
          ...target.items,
          {
            songId: normalizedSongId,
            addedAt: now(),
          },
        ],
        updatedAt: now(),
      };
      collection.playlists[playlistIndex] = nextPlaylist;
      await persist();
      return clonePlaylist(nextPlaylist);
    },
    removeSongAt: async (id: string, index: number): Promise<Playlist> => {
      await ensureLoaded();
      const playlistIndex = getPlaylistIndex(id);
      if (playlistIndex < 0) {
        throw new Error("playlist not found");
      }
      const target = collection.playlists[playlistIndex];
      assertIndexInRange(index, target.items.length);
      const nextItems = target.items.filter((_, itemIndex) => itemIndex !== index);
      const nextPlaylist: Playlist = {
        ...target,
        items: nextItems,
        updatedAt: now(),
      };
      collection.playlists[playlistIndex] = nextPlaylist;
      await persist();
      return clonePlaylist(nextPlaylist);
    },
    moveSong: async (id: string, fromIndex: number, toIndex: number): Promise<Playlist> => {
      await ensureLoaded();
      const playlistIndex = getPlaylistIndex(id);
      if (playlistIndex < 0) {
        throw new Error("playlist not found");
      }
      const target = collection.playlists[playlistIndex];
      assertIndexInRange(fromIndex, target.items.length);
      assertIndexInRange(toIndex, target.items.length);
      const nextItems = [...target.items];
      const [moved] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, moved);
      const nextPlaylist: Playlist = {
        ...target,
        items: nextItems,
        updatedAt: now(),
      };
      collection.playlists[playlistIndex] = nextPlaylist;
      await persist();
      return clonePlaylist(nextPlaylist);
    },
    upsertPlaylist: async (playlist: Playlist): Promise<void> => {
      await ensureLoaded();
      const normalized = parsePlaylist(playlist);
      const index = getPlaylistIndex(normalized.id);
      if (index >= 0) {
        collection.playlists[index] = clonePlaylist(normalized);
      } else {
        collection.playlists.push(clonePlaylist(normalized));
      }
      await persist();
    },
    getCollectionForTest: async (): Promise<PlaylistCollection> => {
      await ensureLoaded();
      return cloneCollection(collection);
    },
  };
}

export const playlistRepository = createPlaylistRepository({});
