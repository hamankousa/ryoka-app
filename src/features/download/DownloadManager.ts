export type DownloadFileKind = "vocal" | "piano" | "lyrics" | "score";

export type DownloadFile = {
  kind: DownloadFileKind;
  sourceUrl: string;
  destinationPath: string;
  sizeBytes?: number;
  sha256?: string;
};

export type DownloadJob = {
  songId: string;
  files: DownloadFile[];
};

export type DownloadJobStatus =
  | "queued"
  | "downloading"
  | "retrying"
  | "cancelled"
  | "completed"
  | "failed";

export type DownloadResult = {
  sizeBytes?: number;
  sha256?: string;
};

export interface DownloadAdapter {
  download(
    sourceUrl: string,
    destinationPath: string,
    onProgress: (value0to1: number) => void,
    context?: { jobId: string; fileKind: DownloadFileKind }
  ): Promise<DownloadResult>;
  exists(path: string): Promise<boolean>;
  cancel?(jobId: string): void | Promise<void>;
}

type InternalJob = {
  jobId: string;
  job: DownloadJob;
  status: DownloadJobStatus;
  progress: number;
  attempts: number;
  isActive: boolean;
  error?: string;
};

export type DownloadSnapshot = {
  activeCount: number;
  jobs: Array<{
    jobId: string;
    songId: string;
    status: DownloadJobStatus;
    progress: number;
    attempts: number;
    error?: string;
  }>;
};

function normalizeProgress(value: number) {
  const bounded = Math.max(0, Math.min(100, value));
  return Number.isFinite(bounded) ? bounded : 0;
}

export function createDownloadManager({
  adapter,
  concurrency = 2,
  retryLimit = 3,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  retryBaseMs = 300,
}: {
  adapter: DownloadAdapter;
  concurrency?: number;
  retryLimit?: number;
  sleep?: (ms: number) => Promise<void>;
  retryBaseMs?: number;
}) {
  let activeCount = 0;
  let sequence = 0;
  const jobs = new Map<string, InternalJob>();
  const queue: string[] = [];
  const listeners = new Set<(snapshot: DownloadSnapshot) => void>();

  const emit = () => {
    const snapshot: DownloadSnapshot = {
      activeCount,
      jobs: Array.from(jobs.values()).map((item) => ({
        jobId: item.jobId,
        songId: item.job.songId,
        status: item.status,
        progress: item.progress,
        attempts: item.attempts,
        error: item.error,
      })),
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  const updateJob = (jobId: string, patch: Partial<InternalJob>) => {
    const current = jobs.get(jobId);
    if (!current) return;
    jobs.set(jobId, { ...current, ...patch });
    emit();
  };

  const isStoppedStatus = (status: DownloadJobStatus) =>
    status === "completed" || status === "failed" || status === "cancelled";

  const finishActiveJob = (jobId: string) => {
    const target = jobs.get(jobId);
    if (!target || !target.isActive) {
      return;
    }
    const nextActive = Math.max(0, activeCount - 1);
    activeCount = nextActive;
    jobs.set(jobId, {
      ...target,
      isActive: false,
    });
  };

  const validateDownload = async (file: DownloadFile, result: DownloadResult) => {
    if (!(await adapter.exists(file.destinationPath))) {
      throw new Error(`Missing file: ${file.destinationPath}`);
    }
    if (file.sizeBytes !== undefined && result.sizeBytes !== undefined && file.sizeBytes !== result.sizeBytes) {
      throw new Error(`Unexpected file size for ${file.kind}`);
    }
    if (file.sha256 && result.sha256 && file.sha256 !== result.sha256) {
      throw new Error(`Unexpected hash for ${file.kind}`);
    }
  };

  const runJob = async (internal: InternalJob) => {
    const total = internal.job.files.length;
    for (let fileIndex = 0; fileIndex < total; fileIndex += 1) {
      const current = jobs.get(internal.jobId);
      if (!current || current.status === "cancelled") {
        return;
      }
      const file = internal.job.files[fileIndex];
      const result = await adapter.download(
        file.sourceUrl,
        file.destinationPath,
        (value) => {
          const target = jobs.get(internal.jobId);
          if (!target || target.status === "cancelled") {
            return;
          }
          const progress = ((fileIndex + Math.max(0, Math.min(value, 1))) / total) * 100;
          updateJob(internal.jobId, { progress: normalizeProgress(progress) });
        },
        { jobId: internal.jobId, fileKind: file.kind }
      );
      const latest = jobs.get(internal.jobId);
      if (!latest || latest.status === "cancelled") {
        return;
      }
      await validateDownload(file, result);
      const finishedProgress = ((fileIndex + 1) / total) * 100;
      updateJob(internal.jobId, { progress: normalizeProgress(finishedProgress) });
    }
  };

  const scheduleRetry = async (jobId: string, attempts: number) => {
    const waitMs = retryBaseMs * 2 ** Math.max(0, attempts - 1);
    updateJob(jobId, { status: "retrying", attempts });
    await sleep(waitMs);
    const current = jobs.get(jobId);
    if (!current || current.status === "cancelled") {
      return;
    }
    queue.push(jobId);
    pump();
  };

  const complete = (jobId: string) => {
    const target = jobs.get(jobId);
    if (!target || target.status === "cancelled") {
      finishActiveJob(jobId);
      emit();
      pump();
      return;
    }
    updateJob(jobId, { status: "completed", progress: 100 });
    finishActiveJob(jobId);
    emit();
    pump();
  };

  const fail = async (jobId: string, error: unknown) => {
    const target = jobs.get(jobId);
    if (!target) {
      activeCount = Math.max(0, activeCount - 1);
      emit();
      pump();
      return;
    }
    if (target.status === "cancelled") {
      finishActiveJob(jobId);
      emit();
      pump();
      return;
    }

    const nextAttempt = target.attempts + 1;
    if (nextAttempt <= retryLimit) {
      finishActiveJob(jobId);
      emit();
      await scheduleRetry(jobId, nextAttempt);
      return;
    }

    updateJob(jobId, {
      status: "failed",
      attempts: nextAttempt,
      error: error instanceof Error ? error.message : "download failed",
    });
    finishActiveJob(jobId);
    emit();
    pump();
  };

  const startJob = async (jobId: string) => {
    const target = jobs.get(jobId);
    if (!target) {
      return;
    }
    activeCount += 1;
    updateJob(jobId, {
      status: "downloading",
      isActive: true,
      error: undefined,
    });

    try {
      await runJob(target);
      complete(jobId);
    } catch (error) {
      await fail(jobId, error);
    }
  };

  const pump = () => {
    while (activeCount < concurrency && queue.length > 0) {
      const nextId = queue.shift();
      if (!nextId) {
        break;
      }
      const target = jobs.get(nextId);
      if (!target || isStoppedStatus(target.status)) {
        continue;
      }
      void startJob(nextId);
    }
  };

  return {
    enqueue: (job: DownloadJob) => {
      if (job.files.length === 0) {
        throw new Error("download job requires at least one file");
      }
      sequence += 1;
      const jobId = `${job.songId}-${sequence}`;
      jobs.set(jobId, {
        jobId,
        job,
        status: "queued",
        progress: 0,
        attempts: 0,
        isActive: false,
      });
      queue.push(jobId);
      emit();
      pump();
      return jobId;
    },
    cancel: (jobId: string) => {
      const target = jobs.get(jobId);
      if (!target || isStoppedStatus(target.status)) {
        return;
      }

      const wasQueued = target.status === "queued" || target.status === "retrying";
      if (wasQueued) {
        const nextQueue = queue.filter((id) => id !== jobId);
        queue.splice(0, queue.length, ...nextQueue);
      }

      if (target.isActive) {
        finishActiveJob(jobId);
      }

      updateJob(jobId, {
        status: "cancelled",
        error: "cancelled",
      });

      if (target.isActive && adapter.cancel) {
        void adapter.cancel(jobId);
      }

      emit();
      pump();
    },
    subscribe: (listener: (snapshot: DownloadSnapshot) => void) => {
      listeners.add(listener);
      listener({
        activeCount,
        jobs: Array.from(jobs.values()).map((item) => ({
          jobId: item.jobId,
          songId: item.job.songId,
          status: item.status,
          progress: item.progress,
          attempts: item.attempts,
          error: item.error,
        })),
      });
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (): DownloadSnapshot => ({
      activeCount,
      jobs: Array.from(jobs.values()).map((item) => ({
        jobId: item.jobId,
        songId: item.job.songId,
        status: item.status,
        progress: item.progress,
        attempts: item.attempts,
        error: item.error,
      })),
    }),
  };
}
