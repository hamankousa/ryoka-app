import { Platform } from "react-native";

type BrowserAudioSession = {
  type?: string;
};

type BrowserNavigator = {
  audioSession?: BrowserAudioSession;
};

type BrowserGlobal = typeof globalThis & {
  navigator?: BrowserNavigator;
  AudioContext?: new () => AudioContext;
  webkitAudioContext?: new () => AudioContext;
};

let webAudioUnlocked = false;

function getBrowserGlobal(): BrowserGlobal {
  return globalThis as BrowserGlobal;
}

function getAudioContextConstructor() {
  const browserGlobal = getBrowserGlobal();
  return browserGlobal.AudioContext ?? browserGlobal.webkitAudioContext ?? null;
}

export function setPlaybackAudioSessionType(navigatorLike?: BrowserNavigator) {
  if (!navigatorLike?.audioSession) {
    return false;
  }

  try {
    navigatorLike.audioSession.type = "playback";
    return navigatorLike.audioSession.type === "playback";
  } catch {
    return false;
  }
}

export async function unlockWebAudioOnce() {
  if (webAudioUnlocked) {
    return;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return;
  }

  const context = new AudioContextConstructor();
  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    // Keep gain extremely low to avoid audible clicks while still opening the audio path.
    const gain = context.createGain();
    gain.gain.value = 0.00001;
    gain.connect(context.destination);

    const oscillator = context.createOscillator();
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.02);

    webAudioUnlocked = true;
  } catch {
    // Best effort: iOS/Safari policies differ by version/device.
  } finally {
    try {
      await context.close();
    } catch {
      // no-op
    }
  }
}

export async function prepareWebPlaybackSession(
  platformOs: string = Platform.OS,
  navigatorLike?: BrowserNavigator
) {
  if (platformOs !== "web") {
    return;
  }

  setPlaybackAudioSessionType(navigatorLike ?? getBrowserGlobal().navigator);
  await unlockWebAudioOnce();
}

export function resetWebPlaybackSessionForTests() {
  webAudioUnlocked = false;
}

