import { ResolvedThemeMode } from "./appSettings";

export type ThemePalette = {
  screenBackground: string;
  surfaceBackground: string;
  surfaceStrong: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  tabBackground: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  danger: string;
};

const lightPalette: ThemePalette = {
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
};

const darkPalette: ThemePalette = {
  screenBackground: "#020617",
  surfaceBackground: "#0B1220",
  surfaceStrong: "#111B31",
  border: "#1E293B",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  accent: "#22D3EE",
  tabBackground: "#0B1220",
  tabBorder: "#1E293B",
  tabActive: "#22D3EE",
  tabInactive: "#94A3B8",
  danger: "#F87171",
};

export function getThemePalette(mode: ResolvedThemeMode): ThemePalette {
  return mode === "dark" ? darkPalette : lightPalette;
}
