import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildMidiPitchGuideFrame, MidiPitchGuideNote } from "../../domain/midiPitchGuide";

type Props = {
  notes: MidiPitchGuideNote[];
  positionSec: number;
  durationSec?: number;
  lookAheadSec?: number;
};

export function MidiPitchGuide({ notes, positionSec, durationSec, lookAheadSec }: Props) {
  const frame = useMemo(
    () => buildMidiPitchGuideFrame(notes, positionSec, { durationSec, lookAheadSec }),
    [durationSec, lookAheadSec, notes, positionSec]
  );
  if (notes.length === 0) {
    return null;
  }

  return (
    <View testID="mini-player-midi-pitch-guide" style={styles.root}>
      {frame.bars.map((bar, index) => (
        <View
          key={`${bar.noteNumber}:${bar.startSec}:${index}`}
          testID={`mini-player-midi-pitch-bar-${index}`}
          style={[
            styles.bar,
            {
              left: `${bar.leftRatio * 100}%`,
              width: `${bar.widthRatio * 100}%`,
              top: `${bar.topRatio * 100}%`,
              height: `${bar.heightRatio * 100}%`,
            },
            bar.isActive && styles.barActive,
          ]}
        />
      ))}
      <View
        testID="mini-player-midi-pitch-playhead"
        style={[styles.playhead, { left: `${frame.playheadRatio * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#7DD3FC",
    borderRadius: 5,
    position: "absolute",
  },
  barActive: {
    backgroundColor: "#0284C7",
  },
  playhead: {
    backgroundColor: "#0F172A",
    bottom: 0,
    marginLeft: -1,
    opacity: 0.8,
    position: "absolute",
    top: 0,
    width: 2,
  },
  root: {
    backgroundColor: "#E0F2FE",
    borderColor: "#BAE6FD",
    borderRadius: 12,
    borderWidth: 1,
    height: 98,
    marginTop: 12,
    overflow: "hidden",
    position: "relative",
  },
});
