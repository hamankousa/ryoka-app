import { AppSettings, defaultAppSettings, normalizeAppSettings } from "../../domain/appSettings";

const APP_SETTINGS_KEY = "app_settings_v1";

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function getStorage(): StorageLike {
  return require("@react-native-async-storage/async-storage").default as StorageLike;
}

export async function loadAppSettings(storage: StorageLike = getStorage()): Promise<AppSettings> {
  const raw = await storage.getItem(APP_SETTINGS_KEY);
  if (!raw) {
    return defaultAppSettings;
  }
  try {
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return defaultAppSettings;
  }
}

export async function saveAppSettings(
  settings: AppSettings,
  storage: StorageLike = getStorage()
): Promise<void> {
  await storage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}
