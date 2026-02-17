import { SongManifestItem } from "../../domain/manifest";
import { isMidiUrl } from "./audioSource";

export type AudioSource = "vocal" | "piano";

export type OfflineAudioEntry = {
  songId: string;
  vocalPath?: string;
  pianoPath?: string;
};

export type PlayerState = {
  queue: SongManifestItem[];
  currentIndex: number;
  currentSong?: SongManifestItem;
  isPlaying: boolean;
  positionSec: number;
  source: AudioSource;
};

export type PlayableAudioUrlOptions = {
  platformOs?: string;
};

export function getPreferredAudioUrl(
  song: SongManifestItem,
  offline?: OfflineAudioEntry,
  source: AudioSource = song.audio.defaultSource
) {
  if (offline && offline.songId === song.id) {
    if (source === "vocal" && offline.vocalPath) {
      return offline.vocalPath;
    }
    if (source === "piano" && offline.pianoPath) {
      return offline.pianoPath;
    }
  }

  return source === "piano" ? song.audio.pianoMp3Url : song.audio.vocalMp3Url;
}

export function getPlayableAudioUrl(
  song: SongManifestItem,
  offline?: OfflineAudioEntry,
  source: AudioSource = song.audio.defaultSource,
  options?: PlayableAudioUrlOptions
) {
  return getPlayableAudioCandidates(song, offline, source, options)[0];
}

export function getPlayableAudioCandidates(
  song: SongManifestItem,
  offline?: OfflineAudioEntry,
  source: AudioSource = song.audio.defaultSource,
  options?: PlayableAudioUrlOptions
) {
  const preferred = getPreferredAudioUrl(song, offline, source);
  if (source !== "piano" || !isMidiUrl(preferred)) {
    return [preferred];
  }

  const platformOs = options?.platformOs;
  if (!platformOs || platformOs === "web") {
    return [preferred];
  }

  const fallbackVocal = getPreferredAudioUrl(song, offline, "vocal");
  if (fallbackVocal === preferred) {
    return [preferred];
  }

  return [preferred, fallbackVocal];
}

export function createPlayerStore(initialSource: AudioSource = "vocal") {
  let state: PlayerState = {
    queue: [],
    currentIndex: -1,
    currentSong: undefined,
    isPlaying: false,
    positionSec: 0,
    source: initialSource,
  };

  const syncSong = () => {
    state = {
      ...state,
      currentSong: state.currentIndex >= 0 ? state.queue[state.currentIndex] : undefined,
    };
  };

  return {
    getState: () => state,
    setQueue: (songs: SongManifestItem[], startIndex = 0) => {
      const safeIndex = songs.length === 0 ? -1 : Math.min(Math.max(startIndex, 0), songs.length - 1);
      state = {
        ...state,
        queue: songs,
        currentIndex: safeIndex,
        positionSec: 0,
        isPlaying: false,
      };
      syncSong();
    },
    play: () => {
      if (!state.currentSong && state.queue.length > 0) {
        state = { ...state, currentIndex: 0 };
        syncSong();
      }
      state = { ...state, isPlaying: Boolean(state.currentSong) };
    },
    pause: () => {
      state = { ...state, isPlaying: false };
    },
    seek: (positionSec: number) => {
      state = { ...state, positionSec: Math.max(positionSec, 0) };
    },
    next: () => {
      if (state.currentIndex < state.queue.length - 1) {
        state = { ...state, currentIndex: state.currentIndex + 1, positionSec: 0 };
        syncSong();
      }
    },
    prev: () => {
      if (state.currentIndex > 0) {
        state = { ...state, currentIndex: state.currentIndex - 1, positionSec: 0 };
        syncSong();
      }
    },
    setSource: (source: AudioSource) => {
      state = { ...state, source };
    },
  };
}
