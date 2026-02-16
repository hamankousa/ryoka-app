export function clamp(value: number, min: number, max: number) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  const safeValue = Number.isFinite(value) ? value : lower;
  return Math.min(Math.max(safeValue, lower), upper);
}

export const MIN_TEMPO_RATE = 0.5;
export const MAX_TEMPO_RATE = 3;

export function clampPosition(positionSec: number, durationSec: number) {
  return clamp(positionSec, 0, Math.max(durationSec, 0));
}

export function clampTempoRate(rate: number) {
  return clamp(rate, MIN_TEMPO_RATE, MAX_TEMPO_RATE);
}

export function tempoRateToRatio(rate: number) {
  return (clampTempoRate(rate) - MIN_TEMPO_RATE) / (MAX_TEMPO_RATE - MIN_TEMPO_RATE);
}

export function ratioToTempoRate(ratio: number) {
  return MIN_TEMPO_RATE + clamp(ratio, 0, 1) * (MAX_TEMPO_RATE - MIN_TEMPO_RATE);
}

export function toContextTime(
  scoreSec: number,
  startScoreSec: number,
  startContextSec: number,
  tempoRate: number
) {
  const safeRate = tempoRate > 0 ? tempoRate : 1;
  return startContextSec + (scoreSec - startScoreSec) / safeRate;
}

export function computePositionFromContext(
  startScoreSec: number,
  startContextSec: number,
  currentContextSec: number,
  tempoRate: number,
  durationSec: number
) {
  const safeRate = tempoRate > 0 ? tempoRate : 1;
  const elapsed = Math.max(0, currentContextSec - startContextSec);
  return clampPosition(startScoreSec + elapsed * safeRate, durationSec);
}
