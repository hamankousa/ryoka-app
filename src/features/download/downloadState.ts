import { SongManifestItem } from "../../domain/manifest";
import { OfflineEntry } from "../offline/offlineRepo";
import { DownloadJobStatus } from "./DownloadManager";
import { hasSongUpdate } from "./updateDetection";

export type DownloadJobView = {
  jobId: string;
  songId: string;
  status: DownloadJobStatus;
  progress: number;
};

export type SongDownloadMetaView = {
  songId: string;
  status: DownloadJobStatus;
  progress: number;
  error?: string;
  interrupted?: boolean;
};

export function getSongDownloadState(
  song: SongManifestItem,
  offlineEntry: OfflineEntry | null,
  activeJob: DownloadJobView | null,
  meta?: SongDownloadMetaView | null
) {
  if (activeJob && (activeJob.status === "downloading" || activeJob.status === "retrying" || activeJob.status === "queued")) {
    return {
      badge: `ダウンロード中 ${Math.round(activeJob.progress)}%`,
      canDownload: false,
      canRetry: false,
      canCancel: true,
      canDelete: false,
    };
  }

  if (meta?.status === "failed") {
    return {
      badge: meta.interrupted ? "中断" : "失敗",
      canDownload: false,
      canRetry: true,
      canCancel: false,
      canDelete: Boolean(offlineEntry),
    };
  }

  if (meta?.status === "cancelled") {
    return {
      badge: "キャンセル",
      canDownload: false,
      canRetry: true,
      canCancel: false,
      canDelete: Boolean(offlineEntry),
    };
  }

  if (!offlineEntry) {
    return {
      badge: "未",
      canDownload: true,
      canRetry: false,
      canCancel: false,
      canDelete: false,
    };
  }

  const hasUpdate = hasSongUpdate(song, offlineEntry);
  if (hasUpdate) {
    return {
      badge: "更新あり",
      canDownload: true,
      canRetry: false,
      canCancel: false,
      canDelete: true,
    };
  }

  return {
    badge: "済",
    canDownload: false,
    canRetry: false,
    canCancel: false,
    canDelete: true,
  };
}
