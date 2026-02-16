import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import {
  AppSettings,
  AppThemeMode,
  defaultAppSettings,
  MidiGuideLookAheadSec,
  resolveThemeMode,
} from "../../domain/appSettings";
import { getThemePalette } from "../../domain/themePalette";
import { loadAppSettings, saveAppSettings } from "./settingsRepository";

type SettingsContextValue = {
  settings: AppSettings;
  resolvedTheme: "light" | "dark";
  palette: ReturnType<typeof getThemePalette>;
  loaded: boolean;
  setThemeMode: (mode: AppThemeMode) => void;
  setLiquidGlassEnabled: (enabled: boolean) => void;
  setFilterAutoCollapseEnabled: (enabled: boolean) => void;
  setMidiGuideLookAheadSec: (seconds: MidiGuideLookAheadSec) => void;
};

const noop = () => {};

const defaultResolvedTheme = resolveThemeMode(defaultAppSettings.themeMode, "light");
const defaultContextValue: SettingsContextValue = {
  settings: defaultAppSettings,
  resolvedTheme: defaultResolvedTheme,
  palette: getThemePalette(defaultResolvedTheme),
  loaded: false,
  setThemeMode: noop,
  setLiquidGlassEnabled: noop,
  setFilterAutoCollapseEnabled: noop,
  setMidiGuideLookAheadSec: noop,
};

const SettingsContext = createContext<SettingsContextValue>(defaultContextValue);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function run() {
      const loadedSettings = await loadAppSettings();
      if (!mounted) {
        return;
      }
      setSettings(loadedSettings);
      setLoaded(true);
    }
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void saveAppSettings(next);
      return next;
    });
  };

  const resolvedTheme = resolveThemeMode(settings.themeMode, systemTheme);
  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedTheme,
      palette: getThemePalette(resolvedTheme),
      loaded,
      setThemeMode: (mode) => updateSettings({ themeMode: mode }),
      setLiquidGlassEnabled: (enabled) => updateSettings({ liquidGlassEnabled: enabled }),
      setFilterAutoCollapseEnabled: (enabled) => updateSettings({ filterAutoCollapseEnabled: enabled }),
      setMidiGuideLookAheadSec: (seconds) => updateSettings({ midiGuideLookAheadSec: seconds }),
    }),
    [loaded, resolvedTheme, settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(SettingsContext);
}
