const DEFAULT_FPS = 60;
const MIN_FPS = 1;

export const MIDI_GUIDE_MAX_FPS = 100;

function normalizeFps(fps: number) {
  if (!Number.isFinite(fps) || fps < MIN_FPS) {
    return DEFAULT_FPS;
  }
  return fps;
}

export function shouldAdvanceFrame(previousTimestampMs: number | null, nextTimestampMs: number, maxFps: number) {
  if (previousTimestampMs === null) {
    return true;
  }
  const next = Number.isFinite(nextTimestampMs) ? nextTimestampMs : previousTimestampMs;
  const elapsedMs = Math.max(0, next - previousTimestampMs);
  const minFrameIntervalMs = 1000 / normalizeFps(maxFps);
  return elapsedMs >= minFrameIntervalMs;
}
