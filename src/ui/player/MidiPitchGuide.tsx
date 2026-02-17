import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ResolvedThemeMode } from "../../domain/appSettings";
import { buildMidiPitchGuideFrame, MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { ThemePalette, getThemePalette } from "../../domain/themePalette";

type Props = {
  notes: MidiPitchGuideNote[];
  positionSec: number;
  durationSec?: number;
  lookAheadSec?: number;
  palette?: ThemePalette;
  resolvedTheme?: ResolvedThemeMode;
};

export function MidiPitchGuide({
  notes,
  positionSec,
  durationSec,
  lookAheadSec,
  palette = getThemePalette("light"),
  resolvedTheme = "light",
}: Props) {
  const frame = useMemo(
    () => buildMidiPitchGuideFrame(notes, positionSec, { durationSec, lookAheadSec }),
    [durationSec, lookAheadSec, notes, positionSec]
  );
  const isDark = resolvedTheme === "dark";
  if (notes.length === 0) {
    return null;
  }

  return (
    <View
      testID="mini-player-midi-pitch-guide"
      style={[
        styles.root,
        { backgroundColor: isDark ? "#0F1A30" : "#E0F2FE", borderColor: isDark ? palette.border : "#BAE6FD" },
      ]}
    >
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
              backgroundColor: bar.isActive ? palette.accent : isDark ? "#0EA5E9" : "#7DD3FC",
            },
          ]}
        />
      ))}
      <View
        testID="mini-player-midi-pitch-playhead"
        style={[styles.playhead, { left: `${frame.playheadRatio * 100}%`, backgroundColor: palette.textPrimary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 5,
    position: "absolute",
  },
  playhead: {
    bottom: 0,
    marginLeft: -1,
    opacity: 0.8,
    position: "absolute",
    top: 0,
    width: 2,
  },
  root: {
    borderRadius: 12,
    borderWidth: 1,
    height: 98,
    marginTop: 12,
    overflow: "hidden",
    position: "relative",
  },
});
