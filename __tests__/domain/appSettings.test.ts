import {
  APP_THEME_MODES,
  MIDI_GUIDE_LOOKAHEAD_OPTIONS,
  defaultAppSettings,
  normalizeAppSettings,
  resolveThemeMode,
} from "../../src/domain/appSettings";

describe("appSettings", () => {
  it("provides expected defaults", () => {
    expect(defaultAppSettings.themeMode).toBe("system");
    expect(defaultAppSettings.liquidGlassEnabled).toBe(false);
    expect(defaultAppSettings.filterAutoCollapseEnabled).toBe(true);
    expect(defaultAppSettings.midiGuideLookAheadSec).toBe(5);
  });

  it("normalizes partial valid values", () => {
    const result = normalizeAppSettings({
      themeMode: "dark",
      liquidGlassEnabled: true,
      filterAutoCollapseEnabled: false,
      midiGuideLookAheadSec: 8,
    });

    expect(result.themeMode).toBe("dark");
    expect(result.liquidGlassEnabled).toBe(true);
    expect(result.filterAutoCollapseEnabled).toBe(false);
    expect(result.midiGuideLookAheadSec).toBe(8);
  });

  it("falls back to defaults for invalid values", () => {
    const result = normalizeAppSettings({
      themeMode: "purple",
      liquidGlassEnabled: "yes",
      filterAutoCollapseEnabled: 1,
      midiGuideLookAheadSec: 11,
    });

    expect(result).toEqual(defaultAppSettings);
  });

  it("resolves system theme mode to current device scheme", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("system", "light")).toBe("light");
    expect(resolveThemeMode("system", null)).toBe("light");
    expect(resolveThemeMode("light", "dark")).toBe("light");
  });

  it("exposes fixed selectable options", () => {
    expect(APP_THEME_MODES).toEqual(["system", "light", "dark"]);
    expect(MIDI_GUIDE_LOOKAHEAD_OPTIONS).toEqual([3, 5, 8]);
  });
});
