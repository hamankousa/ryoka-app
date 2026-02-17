export type RyokaMidiPlayOptions = {
  midiUri: string;
  soundfontPath: string;
  tempoRate: number;
  loopEnabled: boolean;
  program: number;
  octaveShift: number;
};

export type RyokaMidiStatus = {
  isPlaying?: boolean;
  positionSec?: number;
  durationSec?: number;
  error?: string;
};

export type RyokaMidiModule = {
  play(options: RyokaMidiPlayOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionSec: number): Promise<void>;
  setTempo(tempoRate: number): Promise<void>;
  setLoopEnabled(enabled: boolean): Promise<void>;
  setProgram(program: number): Promise<void>;
  setOctaveShift(octaveShift: number): Promise<void>;
  getStatus?(): Promise<RyokaMidiStatus>;
};
