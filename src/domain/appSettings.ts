export const APP_THEME_MODES = ["system", "light", "dark"] as const;
export type AppThemeMode = (typeof APP_THEME_MODES)[number];
export type ResolvedThemeMode = "light" | "dark";

export const MIDI_GUIDE_LOOKAHEAD_OPTIONS = [3, 5, 8] as const;
export type MidiGuideLookAheadSec = (typeof MIDI_GUIDE_LOOKAHEAD_OPTIONS)[number];

export type AppSettings = {
  themeMode: AppThemeMode;
  liquidGlassEnabled: boolean;
  filterAutoCollapseEnabled: boolean;
  midiGuideLookAheadSec: MidiGuideLookAheadSec;
};

export const defaultAppSettings: AppSettings = {
  themeMode: "system",
  liquidGlassEnabled: false,
  filterAutoCollapseEnabled: false,
  midiGuideLookAheadSec: 5,
};

function isThemeMode(value: unknown): value is AppThemeMode {
  return typeof value === "string" && (APP_THEME_MODES as readonly string[]).includes(value);
}

function isLookAheadSec(value: unknown): value is MidiGuideLookAheadSec {
  return typeof value === "number" && (MIDI_GUIDE_LOOKAHEAD_OPTIONS as readonly number[]).includes(value);
}

export function normalizeAppSettings(input: unknown): AppSettings {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    themeMode: isThemeMode(record.themeMode) ? record.themeMode : defaultAppSettings.themeMode,
    liquidGlassEnabled:
      typeof record.liquidGlassEnabled === "boolean"
        ? record.liquidGlassEnabled
        : defaultAppSettings.liquidGlassEnabled,
    filterAutoCollapseEnabled:
      typeof record.filterAutoCollapseEnabled === "boolean"
        ? record.filterAutoCollapseEnabled
        : defaultAppSettings.filterAutoCollapseEnabled,
    midiGuideLookAheadSec: isLookAheadSec(record.midiGuideLookAheadSec)
      ? record.midiGuideLookAheadSec
      : defaultAppSettings.midiGuideLookAheadSec,
  };
}

export function resolveThemeMode(
  themeMode: AppThemeMode,
  systemTheme: "light" | "dark" | null | undefined
): ResolvedThemeMode {
  if (themeMode === "dark") {
    return "dark";
  }
  if (themeMode === "light") {
    return "light";
  }
  return systemTheme === "dark" ? "dark" : "light";
}
