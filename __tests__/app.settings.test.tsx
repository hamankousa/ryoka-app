import { fireEvent, render, screen } from "@testing-library/react-native";

import SettingsScreen from "../app/(tabs)/settings";

const setThemeMode = jest.fn();
const setLiquidGlassEnabled = jest.fn();
const setFilterAutoCollapseEnabled = jest.fn();
const setMidiGuideLookAheadSec = jest.fn();
const mockUseAppSettings = jest.fn();

jest.mock("../src/features/settings/SettingsContext", () => ({
  useAppSettings: () => mockUseAppSettings(),
}));

function baseContext(loaded = true) {
  return {
    settings: {
      themeMode: "system" as const,
      liquidGlassEnabled: false,
      filterAutoCollapseEnabled: true,
      midiGuideLookAheadSec: 5 as const,
    },
    resolvedTheme: "light" as const,
    palette: {
      screenBackground: "#F8FAFC",
      surfaceBackground: "#FFFFFF",
      surfaceStrong: "#EEF2FF",
      border: "#CBD5E1",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      accent: "#2563EB",
      tabBackground: "#FFFFFF",
      tabBorder: "#CBD5E1",
      tabActive: "#0284C7",
      tabInactive: "#64748B",
      danger: "#B91C1C",
    },
    loaded,
    setThemeMode,
    setLiquidGlassEnabled,
    setFilterAutoCollapseEnabled,
    setMidiGuideLookAheadSec,
  };
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    setThemeMode.mockReset();
    setLiquidGlassEnabled.mockReset();
    setFilterAutoCollapseEnabled.mockReset();
    setMidiGuideLookAheadSec.mockReset();
    mockUseAppSettings.mockReturnValue(baseContext(true));
  });

  it("shows loading state until settings are available", () => {
    mockUseAppSettings.mockReturnValue(baseContext(false));
    render(<SettingsScreen />);
    expect(screen.getByText("設定を読み込み中...")).toBeTruthy();
  });

  it("updates settings via controls", () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("settings-theme-dark"));
    expect(setThemeMode).toHaveBeenCalledWith("dark");

    fireEvent(screen.getByTestId("settings-liquid-glass-switch"), "valueChange", true);
    expect(setLiquidGlassEnabled).toHaveBeenCalledWith(true);

    fireEvent(screen.getByTestId("settings-filter-auto-collapse-switch"), "valueChange", false);
    expect(setFilterAutoCollapseEnabled).toHaveBeenCalledWith(false);

    fireEvent.press(screen.getByTestId("settings-lookahead-8"));
    expect(setMidiGuideLookAheadSec).toHaveBeenCalledWith(8);
  });
});
