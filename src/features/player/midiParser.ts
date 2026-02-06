import { parseMidi } from "midi-file";

type MidiEventLike = {
  deltaTime?: number;
  type?: string;
  noteNumber?: number;
  velocity?: number;
  channel?: number;
  microsecondsPerBeat?: number;
};

export type MidiNote = {
  channel: number;
  noteNumber: number;
  velocity: number;
  startSec: number;
  endSec: number;
};

export type MidiSchedule = {
  notes: MidiNote[];
  durationSec: number;
};

function readTempoMicrosecondsPerBeat(events: MidiEventLike[]) {
  const tempo = events.find((event) => event.type === "setTempo" && event.microsecondsPerBeat);
  return tempo?.microsecondsPerBeat ?? 500_000;
}

export function buildMidiSchedule(midiBytes: Uint8Array): MidiSchedule {
  const midi = parseMidi(midiBytes);
  const ticksPerBeat = midi.header.ticksPerBeat;
  if (!ticksPerBeat || ticksPerBeat <= 0) {
    throw new Error("Unsupported MIDI timing format");
  }

  const allEvents: MidiEventLike[] = midi.tracks.flat();
  const tempoMicrosecondsPerBeat = readTempoMicrosecondsPerBeat(allEvents);
  const secondsPerTick = tempoMicrosecondsPerBeat / 1_000_000 / ticksPerBeat;

  const notes: MidiNote[] = [];
  const noteOnTicks = new Map<string, { ticks: number; velocity: number }>();
  let maxTick = 0;

  for (const track of midi.tracks) {
    let tick = 0;
    for (const rawEvent of track) {
      const event = rawEvent as MidiEventLike;
      tick += event.deltaTime ?? 0;
      maxTick = Math.max(maxTick, tick);

      if (event.type === "noteOn" && (event.velocity ?? 0) > 0) {
        const channel = event.channel ?? 0;
        const noteNumber = event.noteNumber ?? 60;
        noteOnTicks.set(`${channel}:${noteNumber}`, {
          ticks: tick,
          velocity: event.velocity ?? 64,
        });
        continue;
      }

      const isNoteOff =
        event.type === "noteOff" || (event.type === "noteOn" && (event.velocity ?? 0) === 0);
      if (!isNoteOff) {
        continue;
      }

      const channel = event.channel ?? 0;
      const noteNumber = event.noteNumber ?? 60;
      const key = `${channel}:${noteNumber}`;
      const start = noteOnTicks.get(key);
      if (!start) {
        continue;
      }
      noteOnTicks.delete(key);

      const endTick = Math.max(tick, start.ticks + 1);
      notes.push({
        channel,
        noteNumber,
        velocity: start.velocity,
        startSec: start.ticks * secondsPerTick,
        endSec: endTick * secondsPerTick,
      });
    }
  }

  const durationSec = Math.max(maxTick * secondsPerTick, ...notes.map((note) => note.endSec), 0);
  return { notes, durationSec };
}

