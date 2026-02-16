import { render, screen } from "@testing-library/react-native";

import HomeTabScreen from "../app/(tabs)/home";

describe("HomeTabScreen", () => {
  it("shows home heading", () => {
    render(<HomeTabScreen />);
    expect(screen.getByText("寮歌を、すぐ再生。")).toBeTruthy();
  });
});
