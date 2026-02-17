import { SongManifestItem } from "../../domain/manifest";
import { Platform } from "react-native";
import { downloadService } from "../download/downloadService";
import { audioEngine } from "./audioEngine";
import { AudioSource, createPlayerStore, getPlayableAudioCandidates } from "./playerStore";

export type LoopMode = "off" | "playlist" | "track";

type GlobalPlayerState = {
  currentSong: SongManifestItem | null;
  source: AudioSource;
  sourceLabel: string;
  loopMode: LoopMode;
  shuffleEnabled: boolean;
};

const playerStore = createPlayerStore();
const PREV_RESTART_THRESHOLD_SEC = 5;
let state: GlobalPlayerState = {
  currentSong: null,
  source: "vocal",
  sourceLabel: "Vocal",
  loopMode: "off",
  shuffleEnabled: false,
};
const listeners = new Set<(snapshot: GlobalPlayerState) => void>();
let lastAudioSnapshot = audioEngine.getSnapshot();

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

function syncAudioLoopFlag() {
  void audioEngine.setLoopEnabled(state.loopMode === "track");
}

function syncStateFromStore() {
  const store = playerStore.getState();
  state = {
    ...state,
    currentSong: store.currentSong ?? null,
    source: store.source,
    sourceLabel: store.source === "piano" ? "Piano" : "Vocal",
  };
  emit();
}

async function playCurrentFromStore(toggleIfSame: boolean) {
  const store = playerStore.getState();
  if (!store.currentSong) {
    return;
  }

  const offlineEntry = await downloadService.getOfflineEntry(store.currentSong.id);
  const candidates = getPlayableAudioCandidates(
    store.currentSong,
    offlineEntry
      ? {
          songId: store.currentSong.id,
          vocalPath: offlineEntry.files.vocalAudioPath,
          pianoPath: offlineEntry.files.pianoAudioPath,
        }
      : undefined,
    store.source,
    {
      platformOs: Platform.OS,
    }
  );
  const primaryUri = candidates[0];
  const snap = audioEngine.getSnapshot();

  if (toggleIfSame && snap.uri === primaryUri) {
    if (snap.isPlaying) {
      await audioEngine.pause();
    } else {
      await audioEngine.resume();
    }
    syncStateFromStore();
    return;
  }

  let lastError: unknown;
  for (const uri of candidates) {
    try {
      await audioEngine.play(uri);
      syncStateFromStore();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("playback failed");
}

async function handleTrackFinished() {
  if (state.loopMode !== "playlist") {
    return;
  }
  const store = playerStore.getState();
  if (!store.currentSong || store.queue.length === 0) {
    return;
  }
  if (state.shuffleEnabled && store.queue.length > 1) {
    const currentIndex = store.currentIndex;
    let randomIndex = currentIndex;
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * store.queue.length);
    }
    playerStore.setQueue(store.queue, randomIndex);
    playerStore.setSource(store.source);
  } else if (store.currentIndex < store.queue.length - 1) {
    playerStore.next();
  } else {
    playerStore.setQueue(store.queue, 0);
    playerStore.setSource(store.source);
  }
  await playCurrentFromStore(false);
}

audioEngine.subscribe((snapshot) => {
  const didFinishCurrentTrack =
    lastAudioSnapshot.isPlaying &&
    !snapshot.isPlaying &&
    snapshot.durationSec > 0 &&
    snapshot.positionSec >= snapshot.durationSec - 0.05 &&
    snapshot.uri &&
    snapshot.uri === lastAudioSnapshot.uri;

  lastAudioSnapshot = snapshot;

  if (didFinishCurrentTrack) {
    void handleTrackFinished();
  }
});

export function getGlobalPlayerState() {
  return state;
}

export function subscribeGlobalPlayer(listener: (snapshot: GlobalPlayerState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function cycleLoopModeGlobal() {
  state = {
    ...state,
    loopMode:
      state.loopMode === "off" ? "playlist" : state.loopMode === "playlist" ? "track" : "off",
  };
  syncAudioLoopFlag();
  emit();
}

export async function playSongWithQueue(
  songs: SongManifestItem[],
  song: SongManifestItem,
  source: AudioSource,
  toggleIfSame = true
) {
  const index = songs.findIndex((item) => item.id === song.id);
  if (index < 0) {
    return;
  }
  playerStore.setQueue(songs, index);
  playerStore.setSource(source);
  await playCurrentFromStore(toggleIfSame);
}

export async function playPauseGlobal() {
  const snap = audioEngine.getSnapshot();
  if (snap.isPlaying) {
    await audioEngine.pause();
    return;
  }
  if (snap.uri) {
    await audioEngine.resume();
    return;
  }
  await playCurrentFromStore(false);
}

export async function prevGlobal() {
  const snapshot = audioEngine.getSnapshot();
  if (snapshot.positionSec >= PREV_RESTART_THRESHOLD_SEC) {
    await audioEngine.seek(0);
    return;
  }
  playerStore.prev();
  await playCurrentFromStore(false);
}

export async function nextGlobal() {
  const store = playerStore.getState();
  if (state.shuffleEnabled && store.queue.length > 1) {
    const currentIndex = store.currentIndex;
    let randomIndex = currentIndex;
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * store.queue.length);
    }
    playerStore.setQueue(store.queue, randomIndex);
    playerStore.setSource(store.source);
    await playCurrentFromStore(false);
    return;
  }
  playerStore.next();
  await playCurrentFromStore(false);
}

export async function selectSourceGlobal(source: AudioSource) {
  playerStore.setSource(source);
  await playCurrentFromStore(false);
}

export function toggleShuffleGlobal() {
  state = {
    ...state,
    shuffleEnabled: !state.shuffleEnabled,
  };
  emit();
}
