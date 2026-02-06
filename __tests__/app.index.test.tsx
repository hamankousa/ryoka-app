import { render, screen } from "@testing-library/react-native";

import SongsScreen from "../app/index";

describe("SongsScreen", () => {
  it("shows app title", () => {
    render(<SongsScreen />);
    expect(screen.getByText("恵迪寮 寮歌プレイヤー v1")).toBeTruthy();
  });
});
