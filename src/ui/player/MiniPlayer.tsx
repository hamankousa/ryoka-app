import { useMemo, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import {
  MAX_TEMPO_RATE,
  MIN_TEMPO_RATE,
  ratioToTempoRate,
  tempoRateToRatio,
} from "../../features/player/midiTransport";
import { MidiTimbre } from "../../features/player/webMidiEngine";

type Props = {
  title?: string;
  sourceLabel?: string;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  tempoRate: number;
  timbre: MidiTimbre;
  loopEnabled: boolean;
  canSeek: boolean;
  canLoop: boolean;
  canControlTempo: boolean;
  canControlTimbre: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onTempoChange: (rate: number) => void;
  onTimbreChange: (timbre: MidiTimbre) => void;
  onLoopToggle: (enabled: boolean) => void;
};

const TEMPO_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const TIMBRE_OPTIONS: Array<{ value: MidiTimbre; label: string }> = [
  { value: "piano", label: "ピアノ" },
  { value: "triangle", label: "三角波" },
  { value: "sine", label: "正弦波" },
  { value: "square", label: "矩形波" },
  { value: "sawtooth", label: "ノコギリ波" },
];

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function MiniPlayer({
  title,
  sourceLabel,
  isPlaying,
  positionSec,
  durationSec,
  tempoRate,
  timbre,
  loopEnabled,
  canSeek,
  canLoop,
  canControlTempo,
  canControlTimbre,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onTempoChange,
  onTimbreChange,
  onLoopToggle,
}: Props) {
  const [seekWidth, setSeekWidth] = useState(0);
  const [tempoWidth, setTempoWidth] = useState(0);
  const tempoRatioRef = useRef(0);
  const ratio = useMemo(() => {
    if (!durationSec || durationSec <= 0) {
      return 0;
    }
    return Math.min(Math.max(positionSec / durationSec, 0), 1);
  }, [durationSec, positionSec]);
  const tempoRatio = useMemo(() => tempoRateToRatio(tempoRate), [tempoRate]);
  tempoRatioRef.current = tempoRatio;

  const handleSeekPress = (event: GestureResponderEvent) => {
    if (!canSeek || seekWidth <= 0 || durationSec <= 0) {
      return;
    }
    const next = (event.nativeEvent.locationX / seekWidth) * durationSec;
    onSeek(next);
  };

  const tempoThumbResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => canControlTempo && tempoWidth > 0,
        onPanResponderGrant: () => {
          tempoRatioRef.current = tempoRateToRatio(tempoRate);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (!canControlTempo || tempoWidth <= 0) {
            return;
          }
          const nextRatio = Math.min(
            Math.max(tempoRatioRef.current + gestureState.dx / tempoWidth, 0),
            1
          );
          onTempoChange(ratioToTempoRate(nextRatio));
        },
      }),
    [canControlTempo, onTempoChange, tempoRate, tempoWidth]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title ?? "未選択"}</Text>
      <Text style={styles.source}>{sourceLabel ?? "-"}</Text>

      <Pressable
        style={[styles.seekTrack, !canSeek && styles.disabled]}
        onPress={handleSeekPress}
        onLayout={(event) => setSeekWidth(event.nativeEvent.layout.width)}
      >
        <View style={[styles.seekFill, { width: `${ratio * 100}%` }]} />
      </Pressable>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>{formatTime(positionSec)}</Text>
        <Text style={styles.timeLabel}>{formatTime(durationSec)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={onPrev} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Prev</Text>
        </Pressable>
        <Pressable onPress={onPlayPause} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>
        <Pressable onPress={onNext} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Next</Text>
        </Pressable>
        {canLoop && (
          <Pressable
            onPress={() => onLoopToggle(!loopEnabled)}
            style={[styles.loopButton, loopEnabled && styles.loopButtonActive]}
          >
            <Text style={styles.loopText}>{loopEnabled ? "ループ:ON" : "ループ:OFF"}</Text>
          </Pressable>
        )}
      </View>

      {canControlTempo && (
        <View style={styles.tempoSection}>
          <Text style={styles.sectionLabel}>
            テンポ: {tempoRate.toFixed(2)}x（{MIN_TEMPO_RATE}x - {MAX_TEMPO_RATE}x）
          </Text>
          <View style={styles.tempoTrack} onLayout={(event) => setTempoWidth(event.nativeEvent.layout.width)}>
            <View style={[styles.tempoFill, { width: `${tempoRatio * 100}%` }]} />
            <View
              style={[
                styles.tempoThumbWrap,
                { left: `${tempoRatio * 100}%` },
              ]}
              pointerEvents={canControlTempo ? "auto" : "none"}
              {...tempoThumbResponder.panHandlers}
            >
              <View style={styles.tempoThumb} />
            </View>
          </View>
          <Text style={styles.tempoHint}>つまみを左右にドラッグして調整</Text>
          <View style={styles.optionRow}>
            {TEMPO_OPTIONS.map((tempo) => (
              <Pressable
                key={tempo}
                onPress={() => onTempoChange(tempo)}
                style={[
                  styles.optionButton,
                  Math.abs(tempoRate - tempo) < 0.001 && styles.optionActive,
                ]}
              >
                <Text style={styles.optionText}>{tempo}x</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {canControlTimbre && (
        <View style={styles.tempoSection}>
          <Text style={styles.sectionLabel}>音色</Text>
          <View style={styles.optionRow}>
            {TIMBRE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onTimbreChange(option.value)}
                style={[styles.optionButton, timbre === option.value && styles.optionActive]}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EEF2FF",
    borderTopColor: "#CBD5E1",
    borderTopWidth: 1,
    padding: 12,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  loopButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  loopButtonActive: {
    backgroundColor: "#DBEAFE",
  },
  loopText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  optionActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  optionText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryText: {
    color: "#0F172A",
    fontWeight: "600",
    textAlign: "center",
  },
  sectionLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  seekFill: {
    backgroundColor: "#2563EB",
    borderRadius: 5,
    height: 10,
  },
  seekTrack: {
    backgroundColor: "#CBD5E1",
    borderRadius: 5,
    height: 10,
    marginTop: 8,
    overflow: "hidden",
  },
  source: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
  },
  tempoFill: {
    backgroundColor: "#7C3AED",
    borderRadius: 5,
    height: 10,
  },
  tempoHint: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },
  tempoSection: {
    marginTop: 4,
  },
  tempoTrack: {
    backgroundColor: "#D8B4FE",
    borderRadius: 5,
    height: 14,
    marginTop: 6,
    overflow: "hidden",
    position: "relative",
  },
  tempoThumb: {
    backgroundColor: "#FFFFFF",
    borderColor: "#6D28D9",
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  tempoThumbWrap: {
    marginLeft: -9,
    marginTop: -2,
    position: "absolute",
  },
  timeLabel: {
    color: "#334155",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
});
