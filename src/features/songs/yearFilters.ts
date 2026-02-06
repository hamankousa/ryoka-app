import { SongManifestItem } from "../../domain/manifest";

export const ERA_ORDER = ["m", "t", "s", "h", "r", "a", "other"] as const;
export const ERA_FILTERS = ["all", ...ERA_ORDER] as const;
export type EraKey = (typeof ERA_ORDER)[number];
export type EraFilter = (typeof ERA_FILTERS)[number];

const ERA_LABELS: Record<EraKey, string> = {
  m: "明治",
  t: "大正",
  s: "昭和",
  h: "平成",
  r: "令和",
  a: "その他",
  other: "未分類",
};

const ERA_SHORT_LABELS: Record<Exclude<EraKey, "a" | "other">, string> = {
  m: "明",
  t: "大",
  s: "昭",
  h: "平",
  r: "令",
};

export function getEraKey(songId: string): EraKey {
  const prefix = songId.charAt(0).toLowerCase();
  if (prefix === "m" || prefix === "t" || prefix === "s" || prefix === "h" || prefix === "r" || prefix === "a") {
    return prefix;
  }
  return "other";
}

export function getEraLabel(key: EraKey): string {
  return ERA_LABELS[key];
}

export function getSongYearKey(songId: string): string | null {
  const match = songId.match(/^([mtshr])(\d{1,3})$/i);
  if (!match) {
    return null;
  }
  return `${match[1].toLowerCase()}${match[2]}`;
}

export function buildYearKeyOptions(songs: SongManifestItem[], eraFilter: EraFilter): string[] {
  if (eraFilter === "all" || eraFilter === "a" || eraFilter === "other") {
    return [];
  }

  const unique = new Set<string>();
  for (const song of songs) {
    const key = getSongYearKey(song.id);
    if (key) {
      unique.add(key);
    }
  }

  return [...unique].sort((left, right) => {
    const leftNum = Number(left.slice(1));
    const rightNum = Number(right.slice(1));
    return leftNum - rightNum;
  });
}

export function formatYearChipLabel(yearKey: string): string {
  const era = yearKey.charAt(0).toLowerCase() as keyof typeof ERA_SHORT_LABELS;
  const value = Number(yearKey.slice(1));
  const eraLabel = ERA_SHORT_LABELS[era] ?? "";
  if (!eraLabel || Number.isNaN(value)) {
    return yearKey;
  }
  return `${eraLabel}${value}`;
}
