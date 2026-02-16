import { render, screen } from "@testing-library/react-native";

import HomeTabScreen from "../app/(tabs)/home";

describe("HomeTabScreen", () => {
  it("does not show marketing copy", () => {
    render(<HomeTabScreen />);
    expect(screen.queryByText("寮歌を、すぐ再生。")).toBeNull();
    expect(screen.getByText("検索")).toBeTruthy();
  });
});
