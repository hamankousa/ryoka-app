export type MidiPitchGuideNote = {
  noteNumber: number;
  startSec: number;
  endSec: number;
};

export type MidiPitchGuideBar = {
  noteNumber: number;
  startSec: number;
  endSec: number;
  leftRatio: number;
  widthRatio: number;
  topRatio: number;
  heightRatio: number;
  isActive: boolean;
};

export type MidiPitchGuideFrame = {
  bars: MidiPitchGuideBar[];
  windowStartSec: number;
  windowEndSec: number;
  playheadRatio: number;
  minNote: number;
  maxNote: number;
};

export type MidiPitchGuideOptions = {
  lookBehindSec?: number;
  lookAheadSec?: number;
  durationSec?: number;
};

const DEFAULT_LOOK_BEHIND_SEC = 1;
const DEFAULT_LOOK_AHEAD_SEC = 5;
const MIN_NOTE_FALLBACK = 60;
const MIN_VISIBLE_WIDTH_RATIO = 0.006;
const LANE_HEIGHT_FILL_RATIO = 0.84;

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function sanitizeWindow(input: number | undefined, fallback: number) {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0) {
    return fallback;
  }
  return input;
}

function sanitizeDuration(durationSec: number | undefined) {
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }
  return durationSec;
}

function readTrackEndSec(notes: MidiPitchGuideNote[], durationSec: number | undefined) {
  const safeDuration = sanitizeDuration(durationSec);
  if (safeDuration !== null) {
    return safeDuration;
  }
  if (notes.length === 0) {
    return null;
  }
  let maxEndSec = 0;
  for (const note of notes) {
    if (Number.isFinite(note.endSec)) {
      maxEndSec = Math.max(maxEndSec, note.endSec);
    }
  }
  return maxEndSec > 0 ? maxEndSec : null;
}

function readPitchRange(notes: MidiPitchGuideNote[]) {
  if (notes.length === 0) {
    return { minNote: MIN_NOTE_FALLBACK, maxNote: MIN_NOTE_FALLBACK };
  }
  let minNote = Number.POSITIVE_INFINITY;
  let maxNote = Number.NEGATIVE_INFINITY;
  for (const note of notes) {
    const value = Math.round(note.noteNumber);
    minNote = Math.min(minNote, value);
    maxNote = Math.max(maxNote, value);
  }
  return { minNote, maxNote };
}

export function buildMidiPitchGuideFrame(
  notes: MidiPitchGuideNote[],
  positionSec: number,
  options: MidiPitchGuideOptions = {}
): MidiPitchGuideFrame {
  const lookBehindSec = sanitizeWindow(options.lookBehindSec, DEFAULT_LOOK_BEHIND_SEC);
  const lookAheadSec = sanitizeWindow(options.lookAheadSec, DEFAULT_LOOK_AHEAD_SEC);
  const windowDurationSec = lookBehindSec + lookAheadSec;
  const safePositionSec = Number.isFinite(positionSec) ? Math.max(0, positionSec) : 0;
  const trackEndSec = readTrackEndSec(notes, options.durationSec);
  let windowStartSec = Math.max(0, safePositionSec - lookBehindSec);
  let windowEndSec = windowStartSec + windowDurationSec;
  if (trackEndSec !== null && windowEndSec > trackEndSec) {
    windowEndSec = trackEndSec;
    windowStartSec = Math.max(0, windowEndSec - windowDurationSec);
  }
  const visibleWindowDurationSec = Math.max(0.001, windowEndSec - windowStartSec);
  const { minNote, maxNote } = readPitchRange(notes);
  const laneCount = Math.max(1, maxNote - minNote + 1);
  const laneHeightRatio = LANE_HEIGHT_FILL_RATIO / laneCount;
  const lanePaddingRatio = (1 - LANE_HEIGHT_FILL_RATIO) / laneCount / 2;

  const bars: MidiPitchGuideBar[] = [];
  for (const note of notes) {
    if (note.endSec <= windowStartSec || note.startSec >= windowEndSec) {
      continue;
    }
    const clippedStartSec = Math.max(windowStartSec, note.startSec);
    const clippedEndSec = Math.max(clippedStartSec + 0.001, Math.min(windowEndSec, note.endSec));
    const leftRatio = clampRatio((clippedStartSec - windowStartSec) / visibleWindowDurationSec);
    const rawWidthRatio = (clippedEndSec - clippedStartSec) / visibleWindowDurationSec;
    const widthRatio = clampRatio(Math.max(MIN_VISIBLE_WIDTH_RATIO, rawWidthRatio));
    const noteOffset = maxNote - Math.round(note.noteNumber);
    const topRatio = clampRatio(noteOffset / laneCount + lanePaddingRatio);
    const isActive = note.startSec <= safePositionSec && safePositionSec < note.endSec;

    bars.push({
      noteNumber: note.noteNumber,
      startSec: note.startSec,
      endSec: note.endSec,
      leftRatio,
      widthRatio,
      topRatio,
      heightRatio: laneHeightRatio,
      isActive,
    });
  }

  bars.sort((a, b) => {
    if (Math.abs(a.startSec - b.startSec) > 0.0001) {
      return a.startSec - b.startSec;
    }
    return a.noteNumber - b.noteNumber;
  });

  return {
    bars,
    minNote,
    maxNote,
    windowStartSec,
    windowEndSec,
    playheadRatio: clampRatio((safePositionSec - windowStartSec) / visibleWindowDurationSec),
  };
}
