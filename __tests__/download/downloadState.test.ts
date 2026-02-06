import { SongManifestItem } from "../../src/domain/manifest";
import { OfflineEntry } from "../../src/features/offline/offlineRepo";
import {
  DownloadJobView,
  getSongDownloadState,
} from "../../src/features/download/downloadState";

function song(updatedAt: string): SongManifestItem {
  return {
    id: "m45",
    title: "都ぞ弥生",
    updatedAt,
    audio: {
      vocalMp3Url: "v",
      pianoMp3Url: "p",
      defaultSource: "vocal",
    },
    lyrics: { htmlUrl: "l" },
    score: { pdfUrl: "s" },
  };
}

function offline(updatedAt: string): OfflineEntry {
  return {
    songId: "m45",
    updatedAt,
    downloadedAt: "2026-02-06T01:00:00Z",
    files: {
      vocalAudioPath: "v",
      pianoAudioPath: "p",
      lyricsPath: "l",
      scorePath: "s",
    },
  };
}

describe("getSongDownloadState", () => {
  it("shows downloading with progress when job exists", () => {
    const job: DownloadJobView = {
      songId: "m45",
      status: "downloading",
      progress: 55,
      jobId: "m45-1",
    };

    expect(getSongDownloadState(song("2026-02-06T00:00:00Z"), null, job)).toEqual({
      badge: "ダウンロード中 55%",
      canDelete: false,
      canDownload: false,
    });
  });

  it("shows update available when remote is newer", () => {
    expect(
      getSongDownloadState(song("2026-02-07T00:00:00Z"), offline("2026-02-06T00:00:00Z"), null)
    ).toEqual({
      badge: "更新あり",
      canDelete: true,
      canDownload: true,
    });
  });

  it("shows downloaded when versions match", () => {
    expect(
      getSongDownloadState(song("2026-02-06T00:00:00Z"), offline("2026-02-06T00:00:00Z"), null)
    ).toEqual({
      badge: "済",
      canDelete: true,
      canDownload: false,
    });
  });

  it("shows not downloaded when no offline entry", () => {
    expect(getSongDownloadState(song("2026-02-06T00:00:00Z"), null, null)).toEqual({
      badge: "未",
      canDelete: false,
      canDownload: true,
    });
  });
});
