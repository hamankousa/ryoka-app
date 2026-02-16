import { SongManifestItem } from "../../domain/manifest";
import { audioEngine } from "./audioEngine";
import { AudioSource, createPlayerStore, getPreferredAudioUrl } from "./playerStore";

type GlobalPlayerState = {
  currentSong: SongManifestItem | null;
  source: AudioSource;
  sourceLabel: string;
};

const playerStore = createPlayerStore();
let state: GlobalPlayerState = {
  currentSong: null,
  source: "vocal",
  sourceLabel: "Vocal",
};
const listeners = new Set<(snapshot: GlobalPlayerState) => void>();

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
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

  const uri = getPreferredAudioUrl(store.currentSong, undefined, store.source);
  const snap = audioEngine.getSnapshot();

  if (toggleIfSame && snap.uri === uri) {
    if (snap.isPlaying) {
      await audioEngine.pause();
    } else {
      await audioEngine.resume();
    }
    syncStateFromStore();
    return;
  }

  await audioEngine.play(uri);
  syncStateFromStore();
}

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
  playerStore.prev();
  await playCurrentFromStore(false);
}

export async function nextGlobal() {
  playerStore.next();
  await playCurrentFromStore(false);
}

export async function selectSourceGlobal(source: AudioSource) {
  playerStore.setSource(source);
  await playCurrentFromStore(false);
}
