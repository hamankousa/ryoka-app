import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MiniPlayer, resolveSheetDragOffset, shouldDismissSheetGesture } from "../../src/ui/player/MiniPlayer";

jest.mock("react-native-webview", () => ({
  WebView: () => null,
}));

function baseProps() {
  return {
    title: "都ぞ弥生",
    sourceLabel: "Vocal",
    isPlaying: false,
    positionSec: 10,
    durationSec: 100,
    tempoRate: 1,
    timbre: "triangle" as const,
    octaveShift: 0,
    loopEnabled: false,
    canSeek: true,
    canLoop: true,
    canControlTempo: true,
    canControlTimbre: true,
    canControlOctave: true,
    midiNotes: undefined as Array<{ noteNumber: number; startSec: number; endSec: number }> | undefined,
    yearLabel: "明治四十五年寮歌",
    creditsText: "横山芳介君 作歌 / 赤木顕次君 作曲",
    lyricsHtml: "<p>都ぞ弥生の雲紫に</p>",
    onSelectSource: jest.fn(),
    onExpand: jest.fn(),
    onCollapse: jest.fn(),
    onPlayPause: jest.fn(),
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onSeek: jest.fn(),
    onTempoChange: jest.fn(),
    onTimbreChange: jest.fn(),
    onOctaveShiftChange: jest.fn(),
    onLoopToggle: jest.fn(),
    onToggleShuffle: jest.fn(),
    shuffleEnabled: false,
  };
}

function renderPlayer(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, right: 0, bottom: 34, left: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>
  );
}

describe("MiniPlayer", () => {
  it("resolves drag offset by vertical first and falls back to weighted horizontal", () => {
    expect(resolveSheetDragOffset(80, 0)).toBe(80);
    expect(resolveSheetDragOffset(-10, 90)).toBeCloseTo(30.6, 1);
    expect(resolveSheetDragOffset(-10, -50)).toBe(0);
  });

  it("dismisses sheet gesture when distance or velocity threshold is exceeded", () => {
    expect(
      shouldDismissSheetGesture({
        translationY: 160,
        velocityY: 0,
        translationX: 0,
        velocityX: 0,
      })
    ).toBe(true);
    expect(
      shouldDismissSheetGesture({
        translationY: 0,
        velocityY: 0,
        translationX: 120,
        velocityX: 0.2,
      })
    ).toBe(true);
    expect(
      shouldDismissSheetGesture({
        translationY: 20,
        velocityY: 0.3,
        translationX: 20,
        velocityX: 0.2,
      })
    ).toBe(false);
  });

  it("calls onExpand when collapsed area is tapped", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded={false} />);

    fireEvent.press(screen.getByTestId("mini-player-expand-touch"));
    expect(props.onExpand).toHaveBeenCalledTimes(1);
  });

  it("calls onCollapse from expanded modal", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-collapse-touch"));
    expect(props.onCollapse).toHaveBeenCalledTimes(1);
  });

  it("renders scroll container in expanded modal", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    expect(screen.getByTestId("mini-player-expanded-scroll")).toBeTruthy();
    expect(screen.getByTestId("mini-player-drag-handle-touch")).toBeTruthy();
    expect(screen.getByTestId("mini-player-lyrics-resize-handle")).toBeTruthy();
  });

  it("keeps top safe-area padding on expanded sheet", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    const style = StyleSheet.flatten(screen.getByTestId("mini-player-sheet").props.style);
    expect(style.paddingTop).toBe(40);
  });

  it("switches source from expanded controls", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-source-piano"));
    expect(props.onSelectSource).toHaveBeenCalledWith("piano");
  });

  it("changes octave from expanded controls", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("octave-option-1"));
    expect(props.onOctaveShiftChange).toHaveBeenCalledWith(1);
  });

  it("seeks from collapsed seek bar", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded={false} />);

    const track = screen.getByTestId("mini-player-collapsed-seek-track");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 200 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 50 } });

    expect(props.onSeek).toHaveBeenCalledWith(25);
  });

  it("does not seek when touch event has no locationX", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded={false} />);

    const track = screen.getByTestId("mini-player-collapsed-seek-track");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 200 } } });
    fireEvent.press(track, { nativeEvent: {} });

    expect(props.onSeek).not.toHaveBeenCalled();
  });

  it("positions transport controls by center-relative anchors", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    const shuffleStyle = StyleSheet.flatten(screen.getByTestId("mini-player-shuffle").props.style);
    const prevStyle = StyleSheet.flatten(screen.getByTestId("mini-player-prev").props.style);
    const playStyle = StyleSheet.flatten(screen.getByTestId("mini-player-play-pause").props.style);
    const nextStyle = StyleSheet.flatten(screen.getByTestId("mini-player-next").props.style);
    const loopStyle = StyleSheet.flatten(screen.getByTestId("mini-player-loop").props.style);

    expect(playStyle.left).toBe("50%");
    expect(playStyle.marginLeft).toBe(-36);

    expect(prevStyle.left).toBe("50%");
    expect(nextStyle.left).toBe("50%");
    const prevCenterOffset = prevStyle.marginLeft + 26;
    const nextCenterOffset = nextStyle.marginLeft + 26;
    expect(prevCenterOffset).toBe(-nextCenterOffset);

    expect(shuffleStyle.left).toBe("50%");
    expect(shuffleStyle.marginLeft).toBeLessThan(prevStyle.marginLeft);

    expect(loopStyle.left).toBe("50%");
    expect(loopStyle.marginLeft).toBeGreaterThan(nextStyle.marginLeft);
  });

  it("toggles shuffle from expanded controls", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-shuffle"));
    expect(props.onToggleShuffle).toHaveBeenCalledTimes(1);
  });

  it("renders midi pitch guide when midi notes are passed", () => {
    const props = baseProps();
    props.midiNotes = [
      { noteNumber: 60, startSec: 9.2, endSec: 10.8 },
      { noteNumber: 64, startSec: 10.1, endSec: 11.4 },
    ];
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    expect(screen.getByTestId("mini-player-midi-pitch-guide")).toBeTruthy();
    expect(screen.getByTestId("mini-player-midi-pitch-bar-0")).toBeTruthy();
  });

  it("does not render midi pitch guide without midi notes", () => {
    const props = baseProps();
    renderPlayer(<MiniPlayer {...props} isExpanded />);

    expect(screen.queryByTestId("mini-player-midi-pitch-guide")).toBeNull();
  });
});
