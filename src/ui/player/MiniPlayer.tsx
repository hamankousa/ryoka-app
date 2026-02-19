import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MidiPitchGuideNote } from "../../domain/midiPitchGuide";
import { ResolvedThemeMode } from "../../domain/appSettings";
import { getThemePalette, ThemePalette } from "../../domain/themePalette";
import { buildStyledLyricsHtml } from "../../features/lyrics/sanitizeLyricsInlineHtml";
import { MAX_TEMPO_RATE, MIN_TEMPO_RATE, ratioToTempoRate, tempoRateToRatio } from "../../features/player/midiTransport";
import { MidiTimbre } from "../../features/player/webMidiEngine";
import { IconifyIcon } from "../icons/IconifyIcon";
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
  midiGuideLookAheadSec?: number;
  palette?: ThemePalette;
  resolvedTheme?: ResolvedThemeMode;
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
const DRAG_CLOSE_DISTANCE = 140;
const DRAG_CLOSE_VELOCITY = 1.1;
const SWIPE_CLOSE_DISTANCE = 92;
const SWIPE_CLOSE_VELOCITY = 0.45;
const DRAG_OPEN_OFFSET = 24;
const DRAG_CLOSE_ANIMATION_TO = 420;
const LYRICS_PANEL_MIN_HEIGHT = 220;
const LYRICS_PANEL_MAX_HEIGHT_FALLBACK = 520;
const LYRICS_PANEL_AUTO_RATIO = 0.42;
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
const HORIZONTAL_DRAG_WEIGHT = 0.34;

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

function clampLyricsPanelHeight(height: number, sheetHeight: number) {
  const dynamicMax =
    sheetHeight > 0
      ? Math.max(LYRICS_PANEL_MIN_HEIGHT + 40, sheetHeight - 280)
      : LYRICS_PANEL_MAX_HEIGHT_FALLBACK;
  return Math.min(dynamicMax, Math.max(LYRICS_PANEL_MIN_HEIGHT, Math.round(height)));
}

export function resolveSheetDragOffset(translationY: number, translationX: number) {
  const verticalOffset = translationY > 0 ? translationY : 0;
  const horizontalOffset = translationX > 0 ? translationX * HORIZONTAL_DRAG_WEIGHT : 0;
  return Math.max(0, verticalOffset, horizontalOffset);
}

export function shouldDismissSheetGesture({
  translationY,
  velocityY,
  translationX,
  velocityX,
}: {
  translationY: number;
  velocityY: number;
  translationX: number;
  velocityX: number;
}) {
  const shouldCloseByVertical =
    translationY >= DRAG_CLOSE_DISTANCE || velocityY > DRAG_CLOSE_VELOCITY;
  const shouldCloseByHorizontal =
    translationX >= SWIPE_CLOSE_DISTANCE || velocityX >= SWIPE_CLOSE_VELOCITY;
  return shouldCloseByVertical || shouldCloseByHorizontal;
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
  midiGuideLookAheadSec = 5,
  palette = getThemePalette("light"),
  resolvedTheme = "light",
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
  const insets = useSafeAreaInsets();
  const [seekWidth, setSeekWidth] = useState(0);
  const [collapsedSeekWidth, setCollapsedSeekWidth] = useState(0);
  const [tempoWidth, setTempoWidth] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [lyricsPanelHeight, setLyricsPanelHeight] = useState(280);
  const tempoRatioRef = useRef(0);
  const lyricsPanelHeightRef = useRef(280);
  const resizeStartHeightRef = useRef(280);
  const lyricsPanelAdjustedByUserRef = useRef(false);

  const ratio = useMemo(() => {
    if (!durationSec || durationSec <= 0) {
      return 0;
    }
    return Math.min(Math.max(positionSec / durationSec, 0), 1);
  }, [durationSec, positionSec]);

  const tempoRatio = useMemo(() => tempoRateToRatio(tempoRate), [tempoRate]);
  tempoRatioRef.current = tempoRatio;
  const effectiveLoopMode = loopMode ?? (loopEnabled ? "track" : "off");
  const showTrackLoopBadge = effectiveLoopMode === "track";
  const isDark = resolvedTheme === "dark";
  const backdropColor = isDark ? "rgba(2,6,23,0.72)" : "rgba(15,23,42,0.36)";
  const optionActiveColor = isDark ? "rgba(34,211,238,0.18)" : "#DBEAFE";
  const glassOptionBackground = isDark ? "rgba(15,23,42,0.52)" : "rgba(255,255,255,0.34)";
  const glassOptionBorder = isDark ? "rgba(148,163,184,0.48)" : "rgba(255,255,255,0.62)";
  const glassPanelBackground = isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.46)";
  const glassPanelBorder = isDark ? "rgba(148,163,184,0.52)" : "rgba(255,255,255,0.7)";
  const inlineLyricsHtml = useMemo(() => {
    return buildStyledLyricsHtml(lyricsHtml ?? "<p>歌詞を読み込み中...</p>", {
      textColor: isDark ? "#E2E8F0" : "#1E293B",
      subTextColor: isDark ? "#94A3B8" : "#64748B",
      borderColor: isDark ? "#334155" : "#E2E8F0",
      lineHeight: 1.36,
      fontSizePx: 13,
    });
  }, [isDark, lyricsHtml]);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = sheetTranslateY.interpolate({
    inputRange: [0, DRAG_CLOSE_ANIMATION_TO],
    outputRange: [1, 0.35],
    extrapolate: "clamp",
  });
  const isDragClosingRef = useRef(false);

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

  const restoreSheetPosition = useCallback(() => {
    isDragClosingRef.current = false;
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const finishClose = useCallback(() => {
    isDragClosingRef.current = false;
    sheetTranslateY.setValue(0);
    onCollapse();
  }, [onCollapse, sheetTranslateY]);

  const closeByDrag = useCallback(() => {
    if (isDragClosingRef.current) {
      return;
    }
    isDragClosingRef.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: DRAG_CLOSE_ANIMATION_TO,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishClose();
      }
    });
  }, [finishClose, sheetTranslateY]);

  const dragHandleResponder = useMemo(() => {
    const topGestureHeight = insets.top + 120;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (event, gestureState) => {
        const fromTopEdge = event.nativeEvent.pageY <= topGestureHeight;
        const verticalDistance = Math.abs(gestureState.dy);
        const horizontalDistance = Math.abs(gestureState.dx);
        const verticalDismiss = gestureState.dy > 4 && verticalDistance > horizontalDistance;
        const horizontalDismiss = fromTopEdge && gestureState.dx > 8 && horizontalDistance > verticalDistance;
        return verticalDismiss || horizontalDismiss;
      },
      onPanResponderMove: (_event, gestureState) => {
        const offset = resolveSheetDragOffset(gestureState.dy, gestureState.dx);
        sheetTranslateY.setValue(Math.min(offset, DRAG_CLOSE_ANIMATION_TO));
      },
      onPanResponderRelease: (_event, gestureState) => {
        const shouldDismiss = shouldDismissSheetGesture({
          translationY: gestureState.dy,
          velocityY: gestureState.vy,
          translationX: gestureState.dx,
          velocityX: gestureState.vx,
        });
        if (shouldDismiss) {
          closeByDrag();
          return;
        }
        restoreSheetPosition();
      },
      onPanResponderTerminate: () => {
        restoreSheetPosition();
      },
    });
  }, [closeByDrag, insets.top, restoreSheetPosition, sheetTranslateY]);

  const updateLyricsPanelHeight = useCallback(
    (nextHeight: number, markAsUserAdjusted: boolean) => {
      const clamped = clampLyricsPanelHeight(nextHeight, sheetHeight);
      lyricsPanelHeightRef.current = clamped;
      setLyricsPanelHeight(clamped);
      if (markAsUserAdjusted) {
        lyricsPanelAdjustedByUserRef.current = true;
      }
    },
    [sheetHeight]
  );

  const lyricsResizeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          const verticalDistance = Math.abs(gestureState.dy);
          const horizontalDistance = Math.abs(gestureState.dx);
          return verticalDistance > 4 && verticalDistance > horizontalDistance;
        },
        onPanResponderGrant: () => {
          resizeStartHeightRef.current = lyricsPanelHeightRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          updateLyricsPanelHeight(resizeStartHeightRef.current - gestureState.dy, false);
        },
        onPanResponderRelease: () => {
          lyricsPanelAdjustedByUserRef.current = true;
        },
        onPanResponderTerminate: () => {
          lyricsPanelAdjustedByUserRef.current = true;
        },
      }),
    [updateLyricsPanelHeight]
  );

  const applyAutoLyricsPanelHeight = useCallback(() => {
    if (lyricsPanelAdjustedByUserRef.current) {
      return;
    }
    const base = sheetHeight > 0 ? sheetHeight * LYRICS_PANEL_AUTO_RATIO : 280;
    updateLyricsPanelHeight(base, false);
  }, [sheetHeight, updateLyricsPanelHeight]);

  useEffect(() => {
    if (!isExpanded) {
      isDragClosingRef.current = false;
      sheetTranslateY.stopAnimation();
      sheetTranslateY.setValue(0);
      lyricsPanelAdjustedByUserRef.current = false;
      return;
    }
    sheetTranslateY.setValue(DRAG_OPEN_OFFSET);
    applyAutoLyricsPanelHeight();
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [applyAutoLyricsPanelHeight, isExpanded, sheetTranslateY]);

  useEffect(() => {
    applyAutoLyricsPanelHeight();
  }, [applyAutoLyricsPanelHeight]);

  return (
    <>
      <View
        style={[
          styles.collapsedBar,
          { backgroundColor: palette.tabBackground, borderTopColor: palette.tabBorder },
          liquidGlassEnabled && styles.glassBar,
        ]}
      >
        <View style={styles.collapsedTopRow}>
          <Pressable style={styles.expandTouch} onPress={onExpand} testID="mini-player-expand-touch">
            <View style={[styles.artworkThumb, { backgroundColor: palette.accent }]} />
            <View style={styles.collapsedTextWrap}>
              <Text numberOfLines={1} style={[styles.collapsedTitle, { color: palette.textPrimary }]}>
                {title ?? "未選択"}
              </Text>
              <Text numberOfLines={1} style={[styles.collapsedSource, { color: palette.textSecondary }]}>
                {sourceLabel ?? "-"}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={onPlayPause} style={[styles.collapsedPlayButton, { backgroundColor: palette.accent }]}>
            <IconifyIcon name={isPlaying ? "pause" : "play"} size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        <Pressable
          testID="mini-player-collapsed-seek-track"
          style={[styles.collapsedSeekTrack, { backgroundColor: palette.border }, !canSeek && styles.disabled]}
          onPress={handleCollapsedSeekPress}
          onLayout={(event) => setCollapsedSeekWidth(event.nativeEvent.layout.width)}
        >
          <View style={[styles.collapsedSeekFill, { backgroundColor: palette.accent, width: `${ratio * 100}%` }]} />
        </Pressable>
        <View style={styles.collapsedTimeRow}>
          <Text style={[styles.collapsedTimeLabel, { color: palette.textSecondary }]}>{formatTime(positionSec)}</Text>
          <Text style={[styles.collapsedTimeLabel, { color: palette.textSecondary }]}>{formatTime(durationSec)}</Text>
        </View>
      </View>

      <Modal
        visible={isExpanded}
        animationType="none"
        transparent={false}
        presentationStyle="fullScreen"
        onRequestClose={closeByDrag}
      >
        <View style={[styles.modalRoot, { backgroundColor: backdropColor }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.modalBackdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
          />
          <Animated.View
            testID="mini-player-sheet"
            style={[
              styles.sheet,
              styles.sheetFullscreen,
              { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
              { paddingTop: Math.max(insets.top - 4, 6) },
              { transform: [{ translateY: sheetTranslateY }] },
              liquidGlassEnabled && [
                styles.glassSheet,
                { backgroundColor: glassPanelBackground, borderColor: glassPanelBorder },
              ],
            ]}
            onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.sheetHeader} {...dragHandleResponder.panHandlers}>
              <View
                testID="mini-player-drag-handle-touch"
                style={styles.dragHandleTouch}
              >
                <View style={[styles.handle, { backgroundColor: palette.textSecondary }]} />
              </View>
              <Pressable style={styles.closeButton} onPress={onCollapse} testID="mini-player-collapse-touch">
                <IconifyIcon name="collapse" size={20} color={palette.textPrimary} />
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
                    { height: lyricsPanelHeight },
                    { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                    liquidGlassEnabled && [
                      styles.glassPanel,
                      { backgroundColor: glassPanelBackground, borderColor: glassPanelBorder },
                    ],
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>歌詞</Text>
                  <View style={styles.lyricsBody}>
                    {Platform.OS === "web" ? (
                      <ScrollView style={styles.lyricsScroll} contentContainerStyle={styles.lyricsContent}>
                        {/* eslint-disable-next-line react/no-danger */}
                        <div dangerouslySetInnerHTML={{ __html: inlineLyricsHtml }} />
                      </ScrollView>
                    ) : (
                      <WebView
                        originWhitelist={["*"]}
                        source={{ html: inlineLyricsHtml }}
                        style={[styles.lyricsWebView, { backgroundColor: palette.surfaceBackground }]}
                      />
                    )}
                  </View>
                  <View
                    testID="mini-player-lyrics-resize-handle"
                    style={styles.lyricsResizeHandleTouch}
                    {...lyricsResizeResponder.panHandlers}
                  >
                    <View style={[styles.lyricsResizeHandle, { backgroundColor: palette.textSecondary }]} />
                  </View>
                </View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>{title ?? "未選択"}</Text>
                <Text style={[styles.source, { color: palette.textSecondary }]}>{sourceLabel ?? "-"}</Text>
                <Text style={[styles.metaLine, { color: palette.textSecondary }]}>年度: {yearLabel ?? "-"}</Text>
                <Text style={[styles.metaLine, { color: palette.textSecondary }]}>作歌・作曲: {creditsText ?? "-"}</Text>
              </View>

              <View style={styles.sourceSwitchRow}>
                <Pressable
                  testID="mini-player-source-vocal"
                  style={[
                    styles.sourceSwitchButton,
                    { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                    liquidGlassEnabled && [
                      styles.glassOption,
                      { backgroundColor: glassOptionBackground, borderColor: glassOptionBorder },
                    ],
                    sourceLabel?.startsWith("Vocal") && [
                      styles.sourceSwitchActive,
                      { backgroundColor: optionActiveColor, borderColor: palette.accent },
                    ],
                  ]}
                  onPress={() => onSelectSource("vocal")}
                >
                  <Text style={[styles.sourceSwitchText, { color: palette.textPrimary }]}>Vocal</Text>
                </Pressable>
                <Pressable
                  testID="mini-player-source-piano"
                  style={[
                    styles.sourceSwitchButton,
                    { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                    liquidGlassEnabled && [
                      styles.glassOption,
                      { backgroundColor: glassOptionBackground, borderColor: glassOptionBorder },
                    ],
                    sourceLabel === "Piano" && [
                      styles.sourceSwitchActive,
                      { backgroundColor: optionActiveColor, borderColor: palette.accent },
                    ],
                  ]}
                  onPress={() => onSelectSource("piano")}
                >
                  <Text style={[styles.sourceSwitchText, { color: palette.textPrimary }]}>Piano</Text>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.seekTrack,
                  { backgroundColor: palette.border },
                  liquidGlassEnabled && styles.glassTrack,
                  !canSeek && styles.disabled,
                ]}
                onPress={handleSeekPress}
                onLayout={(event) => setSeekWidth(event.nativeEvent.layout.width)}
              >
                <View style={[styles.seekFill, { backgroundColor: palette.accent, width: `${ratio * 100}%` }]} />
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: palette.textSecondary }]}>{formatTime(positionSec)}</Text>
                <Text style={[styles.timeLabel, { color: palette.textSecondary }]}>{formatTime(durationSec)}</Text>
              </View>
              {midiNotes && midiNotes.length > 0 && (
                <MidiPitchGuide
                  notes={midiNotes}
                  positionSec={positionSec}
                  durationSec={durationSec}
                  lookAheadSec={midiGuideLookAheadSec}
                  palette={palette}
                  resolvedTheme={resolvedTheme}
                />
              )}

              <View style={styles.controls}>
                <Pressable
                  testID="mini-player-shuffle"
                  onPress={onToggleShuffle}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: palette.surfaceBackground },
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.shuffle - CONTROL_WIDTH.secondary / 2 },
                    shuffleEnabled && [styles.shuffleButtonActive, { backgroundColor: optionActiveColor, borderColor: palette.accent }],
                  ]}
                >
                  <IconifyIcon name="shuffle" size={18} color={palette.textPrimary} />
                </Pressable>
                <Pressable
                  testID="mini-player-prev"
                  onPress={onPrev}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: palette.surfaceBackground },
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.prev - CONTROL_WIDTH.secondary / 2 },
                  ]}
                >
                  <IconifyIcon name="skipPrev" size={18} color={palette.textPrimary} />
                </Pressable>
                <Pressable
                  testID="mini-player-play-pause"
                  onPress={onPlayPause}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: palette.accent },
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.play - CONTROL_WIDTH.primary / 2 },
                  ]}
                >
                  <IconifyIcon name={isPlaying ? "pause" : "play"} size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  testID="mini-player-next"
                  onPress={onNext}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: palette.surfaceBackground },
                    styles.controlFromCenter,
                    { marginLeft: CONTROL_CENTER_OFFSETS.next - CONTROL_WIDTH.secondary / 2 },
                  ]}
                >
                  <IconifyIcon name="skipNext" size={18} color={palette.textPrimary} />
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
                      { backgroundColor: palette.surfaceBackground },
                      styles.controlFromCenter,
                      { marginLeft: CONTROL_CENTER_OFFSETS.loop - CONTROL_WIDTH.loop / 2 },
                      effectiveLoopMode !== "off" && [styles.loopButtonActive, { backgroundColor: optionActiveColor, borderColor: palette.accent }],
                    ]}
                  >
                    <View style={styles.loopIconRow}>
                      <IconifyIcon name="loop" size={18} color={palette.textPrimary} />
                      {showTrackLoopBadge ? (
                        <Text style={[styles.loopBadgeText, { color: palette.textPrimary }]}>1</Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              </View>

              {canControlTempo && (
                <View style={styles.tempoSection}>
                  <Text style={[styles.sectionLabel, { color: palette.textPrimary }]}>
                    テンポ: {tempoRate.toFixed(2)}x（{MIN_TEMPO_RATE}x - {MAX_TEMPO_RATE}x）
                  </Text>
                  <View
                    style={[styles.tempoTrack, { backgroundColor: isDark ? "#312E81" : "#D8B4FE" }]}
                    onLayout={(event) => setTempoWidth(event.nativeEvent.layout.width)}
                  >
                    <View style={[styles.tempoFill, { width: `${tempoRatio * 100}%`, backgroundColor: palette.accent }]} />
                    <View
                      style={[styles.tempoThumbWrap, { left: `${tempoRatio * 100}%` }]}
                      pointerEvents={canControlTempo ? "auto" : "none"}
                      {...tempoThumbResponder.panHandlers}
                    >
                      <View style={styles.tempoThumb} />
                    </View>
                  </View>
                  <Text style={[styles.tempoHint, { color: palette.textSecondary }]}>つまみを左右にドラッグして調整</Text>
                  <View style={styles.optionRow}>
                    {TEMPO_OPTIONS.map((tempo) => (
                      <Pressable
                        key={tempo}
                        onPress={() => onTempoChange(tempo)}
                        style={[
                          styles.optionButton,
                          { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                          liquidGlassEnabled && [
                            styles.glassOption,
                            { backgroundColor: glassOptionBackground, borderColor: glassOptionBorder },
                          ],
                          Math.abs(tempoRate - tempo) < 0.001 && [
                            styles.optionActive,
                            { backgroundColor: optionActiveColor, borderColor: palette.accent },
                          ],
                        ]}
                      >
                        <Text style={[styles.optionText, { color: palette.textPrimary }]}>{tempo}x</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {canControlTimbre && (
                <View style={styles.tempoSection}>
                  <Text style={[styles.sectionLabel, { color: palette.textPrimary }]}>音色</Text>
                  <View style={styles.optionRow}>
                    {TIMBRE_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => onTimbreChange(option.value)}
                        style={[
                          styles.optionButton,
                          { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                          liquidGlassEnabled && [
                            styles.glassOption,
                            { backgroundColor: glassOptionBackground, borderColor: glassOptionBorder },
                          ],
                          timbre === option.value && [
                            styles.optionActive,
                            { backgroundColor: optionActiveColor, borderColor: palette.accent },
                          ],
                        ]}
                      >
                        <Text style={[styles.optionText, { color: palette.textPrimary }]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {canControlOctave && (
                <View style={styles.tempoSection}>
                  <Text style={[styles.sectionLabel, { color: palette.textPrimary }]}>
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
                          { backgroundColor: palette.surfaceBackground, borderColor: palette.border },
                          liquidGlassEnabled && [
                            styles.glassOption,
                            { backgroundColor: glassOptionBackground, borderColor: glassOptionBorder },
                          ],
                          octaveShift === value && [
                            styles.optionActive,
                            { backgroundColor: optionActiveColor, borderColor: palette.accent },
                          ],
                        ]}
                      >
                        <Text style={[styles.optionText, { color: palette.textPrimary }]}>
                          {value > 0 ? `+${value}` : value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
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
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    position: "absolute",
    right: 0,
    top: 10,
    zIndex: 2,
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
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  loopIconRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  loopBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 2,
  },
  lyricsHint: {
    color: "#64748B",
    fontSize: 12,
  },
  lyricsBody: {
    flex: 1,
    minHeight: 0,
  },
  lyricsResizeHandle: {
    borderRadius: 99,
    height: 4,
    opacity: 0.85,
    width: 56,
  },
  lyricsResizeHandleTouch: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 18,
    paddingTop: 2,
    width: "100%",
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "70%",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    width: "100%",
  },
  sheetFullscreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: "100%",
    minHeight: "100%",
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 76,
    position: "relative",
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
    marginBottom: 14,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
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
  dragHandleTouch: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 76,
    paddingVertical: 18,
    width: "100%",
  },
});
