import { Manifest, SongManifestItem } from "../../domain/manifest";

export type ManifestRepositoryPort = {
  getManifest: () => Promise<Manifest>;
};

const ERA_ORDER = ["m", "t", "s", "h", "r", "a"] as const;

function getEraRank(id: string) {
  const prefix = id.charAt(0).toLowerCase();
  const index = ERA_ORDER.indexOf(prefix as (typeof ERA_ORDER)[number]);
  return index === -1 ? ERA_ORDER.length : index;
}

function splitId(id: string) {
  const match = id.match(/^([a-zA-Z]+)(\d+)([a-zA-Z]*)$/);
  if (!match) {
    return {
      num: Number.MAX_SAFE_INTEGER,
      suffix: id,
    };
  }
  return {
    num: Number(match[2]),
    suffix: match[3] ?? "",
  };
}

function byCustomIdOrder(left: SongManifestItem, right: SongManifestItem) {
  const eraDiff = getEraRank(left.id) - getEraRank(right.id);
  if (eraDiff !== 0) {
    return eraDiff;
  }

  const leftId = splitId(left.id);
  const rightId = splitId(right.id);

  if (leftId.num !== rightId.num) {
    return leftId.num - rightId.num;
  }

  const suffixDiff = leftId.suffix.localeCompare(rightId.suffix, "ja");
  if (suffixDiff !== 0) {
    return suffixDiff;
  }

  return left.id.localeCompare(right.id, "ja");
}

export async function loadSongs(repo: ManifestRepositoryPort) {
  const manifest = await repo.getManifest();
  return {
    version: manifest.version,
    songs: [...manifest.songs].sort(byCustomIdOrder),
  };
}
