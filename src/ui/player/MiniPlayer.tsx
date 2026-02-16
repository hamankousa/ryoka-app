import { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { MAX_TEMPO_RATE, MIN_TEMPO_RATE, ratioToTempoRate, tempoRateToRatio } from "../../features/player/midiTransport";
import { MidiTimbre } from "../../features/player/webMidiEngine";
import { MidiPitchGuide } from "./MidiPitchGuide";

type Props = {
  title?: string;
  sourceLabel?: string;
  loopMode?: "off" | "playlist" | "track";
  shuffleEnabled?: boolean;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  tempoRate: number;
  timbre: MidiTimbre;
  octaveShift: number;
  loopEnabled: boolean;
  canSeek: boolean;
  canLoop: boolean;
  canControlTempo: boolean;
  canControlTimbre: boolean;
  canControlOctave: boolean;
  midiNotes?: MidiPitchGuideNote[];
  liquidGlassEnabled?: boolean;
  yearLabel?: string;
  creditsText?: string;
  lyricsHtml?: string;
  onSelectSource: (source: "vocal" | "piano") => void;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onTempoChange: (rate: number) => void;
  onTimbreChange: (timbre: MidiTimbre) => void;
  onOctaveShiftChange: (shift: number) => void;
  onLoopToggle: (enabled: boolean) => void;
  onCycleLoopMode?: () => void;
  onToggleShuffle?: () => void;
};

const TEMPO_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const TIMBRE_OPTIONS: Array<{ value: MidiTimbre; label: string }> = [
  { value: "piano", label: "ピアノ" },
  { value: "triangle", label: "三角波" },
  { value: "sine", label: "正弦波" },
  { value: "square", label: "矩形波" },
  { value: "sawtooth", label: "ノコギリ波" },
];
const ICON_COLLAPSE = "⌄";
const ICON_PREV = "⏮";
const ICON_PLAY = "▶";
const ICON_PAUSE = "⏸";
const ICON_NEXT = "⏭";
const ICON_LOOP = "↻↺";
const ICON_SHUFFLE = "⇄";
const CONTROL_CENTER_OFFSETS = {
  shuffle: -148,
  prev: -84,
  play: 0,
  next: 84,
  loop: 148,
} as const;
const CONTROL_WIDTH = {
  secondary: 52,
  primary: 72,
  loop: 52,
} as const;

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function resolveSeekPosition(locationX: number | undefined, trackWidth: number, durationSec: number) {
  if (
    typeof locationX !== "number" ||
    !Number.isFinite(locationX) ||
    trackWidth <= 0 ||
    durationSec <= 0
  ) {
    return null;
  }
  const ratio = Math.min(Math.max(locationX / trackWidth, 0), 1);
  if (!Number.isFinite(ratio)) {
    return null;
  }
  return ratio * durationSec;
}

export function MiniPlayer({
  title,
  sourceLabel,
  loopMode,
  shuffleEnabled = false,
  isPlaying,
  positionSec,
  durationSec,
  tempoRate,
  timbre,
  octaveShift,
  loopEnabled,
  canSeek,
  canLoop,
  canControlTempo,
  canControlTimbre,
  canControlOctave,
  midiNotes,
  liquidGlassEnabled = false,
  yearLabel,
  creditsText,
  lyricsHtml,
  onSelectSource,
  isExpanded,
  onExpand,
  onCollapse,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onTempoChange,
  onTimbreChange,
  onOctaveShiftChange,
  onLoopToggle,
  onCycleLoopMode,
  onToggleShuffle,
}: Props) {
  const [seekWidth, setSeekWidth] = useState(0);
  const [collapsedSeekWidth, setCollapsedSeekWidth] = useState(0);
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
  const effectiveLoopMode = loopMode ?? (loopEnabled ? "track" : "off");
  const loopLabel = effectiveLoopMode === "track" ? `${ICON_LOOP}1` : ICON_LOOP;

  const handleSeekPress = (event: GestureResponderEvent) => {
    if (!canSeek || seekWidth <= 0 || durationSec <= 0) {
      return;
    }
    const next = resolveSeekPosition(event.nativeEvent.locationX, seekWidth, durationSec);
    if (next === null) {
      return;
    }
    onSeek(next);
  };

  const handleCollapsedSeekPress = (event: GestureResponderEvent) => {
    if (!canSeek || collapsedSeekWidth <= 0 || durationSec <= 0) {
      return;
    }
    const next = resolveSeekPosition(event.nativeEvent.locationX, collapsedSeekWidth, durationSec);
    if (next === null) {
      return;
    }
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
    <>
      <View
        style={[
          styles.collapsedBar,
          liquidGlassEnabled && styles.glassBar,
        ]}
      >
        <View style={styles.collapsedTopRow}>
          <Pressable style={styles.expandTouch} onPress={onExpand} testID="mini-player-expand-touch">
            <View style={styles.artworkThumb} />
            <View style={styles.collapsedTextWrap}>
              <Text numberOfLines={1} style={styles.collapsedTitle}>
                {title ?? "未選択"}
              </Text>
              <Text numberOfLines={1} style={styles.collapsedSource}>
                {sourceLabel ?? "-"}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={onPlayPause} style={styles.collapsedPlayButton}>
            <Text style={styles.collapsedPlayText}>{isPlaying ? ICON_PAUSE : ICON_PLAY}</Text>
          </Pressable>
        </View>
        <Pressable
          testID="mini-player-collapsed-seek-track"
          style={[styles.collapsedSeekTrack, !canSeek && styles.disabled]}
          onPress={handleCollapsedSeekPress}
          onLayout={(event) => setCollapsedSeekWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.collapsedSeekFill, { width: `${ratio * 100}%` }]} />
        </Pressable>
        <View style={styles.collapsedTimeRow}>
          <Text style={styles.collapsedTimeLabel}>{formatTime(positionSec)}</Text>
          <Text style={styles.collapsedTimeLabel}>{formatTime(durationSec)}</Text>
        </View>
      </View>

      <Modal visible={isExpanded} animationType="slide" transparent onRequestClose={onCollapse}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={onCollapse} />
          <View style={[styles.sheet, liquidGlassEnabled && styles.glassSheet]}>
            <View style={styles.sheetHeader}>
              <View style={styles.handle} />
              <Pressable style={styles.closeButton} onPress={onCollapse} testID="mini-player-collapse-touch">
                <Text style={styles.closeText}>{ICON_COLLAPSE}</Text>
              </Pressable>
            </View>
            <ScrollView
              testID="mini-player-expanded-scroll"
              style={styles.expandedScroll}
              contentContainerStyle={styles.expandedScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >

              <View style={styles.hero}>
                <View
                  style={[
                    styles.topLyricsPanel,
                    liquidGlassEnabled && styles.glassPanel,
                  ]}
                >
                  <Text style={styles.sectionTitle}>歌詞</Text>
                  {Platform.OS === "web" ? (
                    <ScrollView style={styles.lyricsScroll} contentContainerStyle={styles.lyricsContent}>
                      {/* eslint-disable-next-line react/no-danger */}
                      <div
                        style={{ fontSize: 13, lineHeight: 1.6, color: "#1E293B" }}
                        dangerouslySetInnerHTML={{ __html: lyricsHtml ?? "<p>歌詞を読み込み中...</p>" }}
                      />
                    </ScrollView>
                  ) : (
                    <WebView
                      originWhitelist={["*"]}
                      source={{ html: lyricsHtml ?? "<p>歌詞を読み込み中...</p>" }}
                      style={styles.lyricsWebView}
                    />
                  )}
                </View>
                <Text style={styles.title}>{title ?? "未選択"}</Text>
                <Text style={styles.source}>{sourceLabel ?? "-"}</Text>
                <Text style={styles.metaLine}>年度: {yearLabel ?? "-"}</Text>
                <Text style={styles.metaLine}>作歌・作曲: {creditsText ?? "-"}</Text>
              </View>

              <View style={styles.sourceSwitchRow}>
                <Pressable
                  testID="mini-player-source-vocal"
                  style={[
                    styles.sourceSwitchButton,
                    liquidGlassEnabled && styles.glassOption,
                    sourceLabel?.startsWith("Vocal") && styles.sourceSwitchActive,
                  ]}
                  onPress={() => onSelectSource("vocal")}
                >
                  <Text style={styles.sourceSwitchText}>Vocal</Text>
                </Pressable>
                <Pressable
                  testID="mini-player-source-piano"
                  style={[
                    styles.sourceSwitchButton,
                    liquidGlassEnabled && styles.glassOption,
                    sourceLabel === "Piano" && styles.sourceSwitchActive,
                  ]}
                  onPress={() => onSelectSource("piano")}
                >
                  <Text style={styles.sourceSwitchText}>Piano</Text>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.seekTrack,
                  liquidGlassEnabled && styles.glassTrack,
                  !canSeek && styles.disabled,
                ]}
                onPress={handleSeekPress}
                onLayout={(event) => setSeekWidth(event.nativeEvent.layout.width)}
              >
                <View style={[styles.seekFill, { width: `${ratio * 100}%` }]} />
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>{formatTime(positionSec)}</Text>
                <Text style={styles.timeLabel}>{formatTime(durationSec)}</Text>
              </View>
              {midiNotes && midiNotes.length > 0 && (
                <MidiPitchGuide notes={midiNotes} positionSec={positionSec} durationSec={durationSec} />
              )}

              <View style={styles.controls}>
                <Pressable
                  testID="mini-player-shuffle"
                  onPress={onToggleShuffle}
                  style={[
                    styles.secondaryButton,
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.shuffle - CONTROL_WIDTH.secondary / 2 },
                    shuffleEnabled && styles.shuffleButtonActive,
                  ]}
                >
                  <Text style={styles.secondaryText}>{ICON_SHUFFLE}</Text>
                </Pressable>
                <Pressable
                  testID="mini-player-prev"
                  onPress={onPrev}
                  style={[
                    styles.secondaryButton,
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.prev - CONTROL_WIDTH.secondary / 2 },
                  ]}
                >
                  <Text style={styles.secondaryText}>{ICON_PREV}</Text>
                </Pressable>
                <Pressable
                  testID="mini-player-play-pause"
                  onPress={onPlayPause}
                  style={[
                    styles.primaryButton,
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.play - CONTROL_WIDTH.primary / 2 },
                  ]}
                >
                  <Text style={styles.primaryText}>{isPlaying ? ICON_PAUSE : ICON_PLAY}</Text>
                </Pressable>
                <Pressable
                  testID="mini-player-next"
                  onPress={onNext}
                  style={[
                    styles.secondaryButton,
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.next - CONTROL_WIDTH.secondary / 2 },
                  ]}
                >
                  <Text style={styles.secondaryText}>{ICON_NEXT}</Text>
                </Pressable>
                {canLoop && (
                  <Pressable
                    testID="mini-player-loop"
                    onPress={() => {
                      if (onCycleLoopMode) {
                        onCycleLoopMode();
                        return;
                      }
                      onLoopToggle(!loopEnabled);
                    }}
                    style={[
                      styles.loopButton,
                      styles.controlFromCenter,
                      { marginLeft: CONTROL_CENTER_OFFSETS.loop - CONTROL_WIDTH.loop / 2 },
                      effectiveLoopMode !== "off" && styles.loopButtonActive,
                    ]}
                  >
                    <Text style={styles.loopText}>{loopLabel}</Text>
                  </Pressable>
                )}
              </View>

              {canControlTempo && (
                <View style={styles.tempoSection}>
                  <Text style={styles.sectionLabel}>
                    テンポ: {tempoRate.toFixed(2)}x（{MIN_TEMPO_RATE}x - {MAX_TEMPO_RATE}x）
                  </Text>
                  <View
                    style={styles.tempoTrack}
                    onLayout={(event) => setTempoWidth(event.nativeEvent.layout.width)}
                  >
                    <View style={[styles.tempoFill, { width: `${tempoRatio * 100}%` }]} />
                    <View
                      style={[styles.tempoThumbWrap, { left: `${tempoRatio * 100}%` }]}
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
                          liquidGlassEnabled && styles.glassOption,
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
                        style={[
                          styles.optionButton,
                          liquidGlassEnabled && styles.glassOption,
                          timbre === option.value && styles.optionActive,
                        ]}
                      >
                        <Text style={styles.optionText}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {canControlOctave && (
                <View style={styles.tempoSection}>
                  <Text style={styles.sectionLabel}>
                    オクターブ: {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                  </Text>
                  <View style={styles.optionRow}>
                    {[-2, -1, 0, 1, 2].map((value) => (
                      <Pressable
                        key={value}
                        testID={`octave-option-${value}`}
                        onPress={() => onOctaveShiftChange(value)}
                        style={[
                          styles.optionButton,
                          liquidGlassEnabled && styles.glassOption,
                          octaveShift === value && styles.optionActive,
                        ]}
                      >
                        <Text style={styles.optionText}>{value > 0 ? `+${value}` : value}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  artworkThumb: {
    backgroundColor: "#93C5FD",
    borderRadius: 7,
    height: 34,
    width: 34,
  },
  backdrop: {
    backgroundColor: "rgba(15,23,42,0.36)",
    flex: 1,
  },
  closeText: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 20,
  },
  closeButton: {
    alignItems: "center",
    minWidth: 28,
  },
  collapsedBar: {
    alignItems: "stretch",
    backgroundColor: "#0F172A",
    borderTopColor: "#1E293B",
    borderTopWidth: 1,
    flexDirection: "column",
    gap: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  collapsedPlayButton: {
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  collapsedPlayText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  collapsedSource: {
    color: "#94A3B8",
    fontSize: 12,
  },
  collapsedSeekFill: {
    backgroundColor: "#22D3EE",
    borderRadius: 4,
    height: 8,
  },
  collapsedSeekTrack: {
    backgroundColor: "#1E293B",
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    overflow: "hidden",
    width: "100%",
  },
  collapsedTimeLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  collapsedTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    width: "100%",
  },
  collapsedTextWrap: {
    flex: 1,
    gap: 2,
  },
  collapsedTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  collapsedTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  controls: {
    height: 52,
    position: "relative",
    marginTop: 8,
  },
  controlFromCenter: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    left: "50%",
    top: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  expandedScroll: {
    flex: 1,
    marginTop: 8,
  },
  expandedScrollContent: {
    paddingBottom: 24,
  },
  expandTouch: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  glassBar: {
    backgroundColor: "rgba(15,23,42,0.72)",
    borderTopColor: "rgba(148,163,184,0.45)",
  },
  glassOption: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(255,255,255,0.62)",
  },
  glassPanel: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderColor: "rgba(255,255,255,0.7)",
  },
  glassSheet: {
    backgroundColor: "rgba(226,232,240,0.82)",
  },
  glassTrack: {
    backgroundColor: "rgba(203,213,225,0.65)",
  },
  handle: {
    backgroundColor: "#94A3B8",
    borderRadius: 99,
    height: 4,
    width: 54,
  },
  hero: {
    alignItems: "center",
    marginTop: 8,
  },
  loopButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  loopButtonActive: {
    backgroundColor: "#DBEAFE",
  },
  loopText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  lyricsHint: {
    color: "#64748B",
    fontSize: 12,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricsContent: {
    paddingBottom: 20,
    paddingRight: 8,
  },
  lyricsWebView: {
    backgroundColor: "transparent",
    flex: 1,
  },
  metaLine: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
  },
  modalRoot: {
    flex: 1,
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
    fontSize: 18,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  shuffleButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
    borderWidth: 1,
  },
  secondaryText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  sectionLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  sectionTitle: {
    color: "#1E293B",
    fontWeight: "700",
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
  sheet: {
    backgroundColor: "#E2E8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "70%",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  source: {
    color: "#475569",
    fontSize: 13,
    marginTop: 2,
  },
  sourceSwitchActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  sourceSwitchButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sourceSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sourceSwitchText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  topLyricsPanel: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    height: 240,
    marginBottom: 14,
    overflow: "hidden",
    padding: 10,
    width: "100%",
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
  tempoTrack: {
    backgroundColor: "#D8B4FE",
    borderRadius: 5,
    height: 14,
    marginTop: 6,
    overflow: "hidden",
    position: "relative",
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
    fontSize: 22,
    fontWeight: "700",
  },
});
