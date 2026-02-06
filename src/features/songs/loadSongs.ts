import { Manifest, SongManifestItem } from "../../domain/manifest";

export type ManifestRepositoryPort = {
  getManifest: () => Promise<Manifest>;
};

function byOrderThenTitle(left: SongManifestItem, right: SongManifestItem) {
  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title, "ja");
}

export async function loadSongs(repo: ManifestRepositoryPort) {
  const manifest = await repo.getManifest();
  return {
    version: manifest.version,
    songs: [...manifest.songs].sort(byOrderThenTitle),
  };
}
