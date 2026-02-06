import { writeMidi } from "midi-file";

import { buildMidiSchedule } from "../../src/features/player/midiParser";

describe("buildMidiSchedule", () => {
  it("parses noteOn/noteOff events and duration", () => {
    const bytes = writeMidi({
      header: { format: 1, numTracks: 1, ticksPerBeat: 480 },
      tracks: [
        [
          { deltaTime: 0, meta: true, type: "setTempo", microsecondsPerBeat: 500_000 },
          { deltaTime: 0, channel: 0, type: "noteOn", noteNumber: 60, velocity: 96 },
          { deltaTime: 480, channel: 0, type: "noteOff", noteNumber: 60, velocity: 0 },
          { deltaTime: 0, meta: true, type: "endOfTrack" },
        ],
      ],
    });

    const schedule = buildMidiSchedule(new Uint8Array(bytes));

    expect(schedule.notes).toHaveLength(1);
    expect(schedule.notes[0].noteNumber).toBe(60);
    expect(schedule.notes[0].startSec).toBeCloseTo(0, 5);
    expect(schedule.notes[0].endSec).toBeCloseTo(0.5, 5);
    expect(schedule.durationSec).toBeCloseTo(0.5, 5);
  });

  it("treats noteOn velocity 0 as noteOff", () => {
    const bytes = writeMidi({
      header: { format: 1, numTracks: 1, ticksPerBeat: 240 },
      tracks: [
        [
          { deltaTime: 0, meta: true, type: "setTempo", microsecondsPerBeat: 500_000 },
          { deltaTime: 0, channel: 0, type: "noteOn", noteNumber: 67, velocity: 80 },
          { deltaTime: 240, channel: 0, type: "noteOn", noteNumber: 67, velocity: 0 },
          { deltaTime: 0, meta: true, type: "endOfTrack" },
        ],
      ],
    });

    const schedule = buildMidiSchedule(new Uint8Array(bytes));

    expect(schedule.notes).toHaveLength(1);
    expect(schedule.notes[0].endSec).toBeCloseTo(0.5, 5);
  });
});
