import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { MiniPlayer } from "../../src/ui/player/MiniPlayer";

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

describe("MiniPlayer", () => {
  it("calls onExpand when collapsed area is tapped", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded={false} />);

    fireEvent.press(screen.getByTestId("mini-player-expand-touch"));
    expect(props.onExpand).toHaveBeenCalledTimes(1);
  });

  it("calls onCollapse from expanded modal", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-collapse-touch"));
    expect(props.onCollapse).toHaveBeenCalledTimes(1);
  });

  it("switches source from expanded controls", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-source-piano"));
    expect(props.onSelectSource).toHaveBeenCalledWith("piano");
  });

  it("changes octave from expanded controls", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("octave-option-1"));
    expect(props.onOctaveShiftChange).toHaveBeenCalledWith(1);
  });

  it("seeks from collapsed seek bar", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded={false} />);

    const track = screen.getByTestId("mini-player-collapsed-seek-track");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 200 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 50 } });

    expect(props.onSeek).toHaveBeenCalledWith(25);
  });

  it("positions transport controls by center-relative anchors", () => {
    const props = baseProps();
    render(<MiniPlayer {...props} isExpanded />);

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
    render(<MiniPlayer {...props} isExpanded />);

    fireEvent.press(screen.getByTestId("mini-player-shuffle"));
    expect(props.onToggleShuffle).toHaveBeenCalledTimes(1);
  });
});
