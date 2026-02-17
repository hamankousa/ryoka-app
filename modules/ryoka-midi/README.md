# ryoka-midi (Dev Client Native Module)

This folder defines the expected native bridge contract for MIDI playback on iOS/Android Dev Client.

Expected native module name: `RyokaMidi`

Required async methods:
- `play({ midiUri, soundfontPath, tempoRate, loopEnabled, program, octaveShift })`
- `pause()`
- `resume()`
- `stop()`
- `seek(positionSec)`
- `setTempo(tempoRate)`
- `setLoopEnabled(enabled)`
- `setProgram(program)`
- `setOctaveShift(octaveShift)`
- Optional: `getStatus()`

JS integration point:
- `src/features/player/nativeMidiEngine.ts`

Expo Go does not load this module. The app falls back to Vocal playback for MIDI source in that case.
