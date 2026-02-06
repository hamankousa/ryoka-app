import { fireEvent, render, screen } from "@testing-library/react-native";

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
    loopEnabled: false,
    canSeek: true,
    canLoop: true,
    canControlTempo: true,
    canControlTimbre: true,
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
    onLoopToggle: jest.fn(),
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

    fireEvent.press(screen.getByText("Piano"));
    expect(props.onSelectSource).toHaveBeenCalledWith("piano");
  });
});
