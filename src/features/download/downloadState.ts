import { SongManifestItem } from "../../domain/manifest";
import { OfflineEntry } from "../offline/offlineRepo";
import { DownloadJobStatus } from "./DownloadManager";

export type DownloadJobView = {
  jobId: string;
  songId: string;
  status: DownloadJobStatus;
  progress: number;
};

export function getSongDownloadState(
  song: SongManifestItem,
  offlineEntry: OfflineEntry | null,
  activeJob: DownloadJobView | null
) {
  if (activeJob && (activeJob.status === "downloading" || activeJob.status === "retrying" || activeJob.status === "queued")) {
    return {
      badge: `ダウンロード中 ${Math.round(activeJob.progress)}%`,
      canDownload: false,
      canDelete: false,
    };
  }

  if (!offlineEntry) {
    return {
      badge: "未",
      canDownload: true,
      canDelete: false,
    };
  }

  const hasUpdate = new Date(song.updatedAt).getTime() > new Date(offlineEntry.updatedAt).getTime();
  if (hasUpdate) {
    return {
      badge: "更新あり",
      canDownload: true,
      canDelete: true,
    };
  }

  return {
    badge: "済",
    canDownload: false,
    canDelete: true,
  };
}
