import {
  createDownloadManager,
  DownloadAdapter,
  DownloadJobStatus,
} from "../../src/features/download/DownloadManager";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function waitForFinal(
  manager: ReturnType<typeof createDownloadManager>,
  jobId: string
): Promise<DownloadJobStatus> {
  return new Promise((resolve) => {
    const stop = manager.subscribe((snapshot) => {
      const target = snapshot.jobs.find((job) => job.jobId === jobId);
      if (!target) return;
      if (target.status === "completed" || target.status === "failed") {
        stop();
        resolve(target.status);
      }
    });
  });
}

describe("DownloadManager", () => {
  it("limits concurrent jobs", async () => {
    const slots = [deferred<void>(), deferred<void>(), deferred<void>()];
    let index = 0;
    let active = 0;
    let maxActive = 0;

    const adapter: DownloadAdapter = {
      download: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        const local = slots[index++];
        await local.promise;
        active -= 1;
        return {};
      },
      exists: async () => true,
    };

    const manager = createDownloadManager({
      adapter,
      concurrency: 2,
      retryLimit: 3,
      sleep: async () => {},
    });

    const j1 = manager.enqueue({
      songId: "m45",
      files: [{ kind: "lyrics", sourceUrl: "a", destinationPath: "1" }],
    });
    const j2 = manager.enqueue({
      songId: "m46",
      files: [{ kind: "lyrics", sourceUrl: "b", destinationPath: "2" }],
    });
    const j3 = manager.enqueue({
      songId: "m47",
      files: [{ kind: "lyrics", sourceUrl: "c", destinationPath: "3" }],
    });

    await Promise.resolve();
    expect(maxActive).toBe(2);

    slots[0].resolve();
    slots[1].resolve();
    slots[2].resolve();

    await Promise.all([
      waitForFinal(manager, j1),
      waitForFinal(manager, j2),
      waitForFinal(manager, j3),
    ]);

    expect(maxActive).toBe(2);
  });

  it("retries failed downloads and eventually completes", async () => {
    let attempts = 0;

    const adapter: DownloadAdapter = {
      download: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("temporary");
        }
        return {};
      },
      exists: async () => true,
    };

    const manager = createDownloadManager({
      adapter,
      concurrency: 2,
      retryLimit: 3,
      sleep: async () => {},
    });

    const jobId = manager.enqueue({
      songId: "m45",
      files: [{ kind: "lyrics", sourceUrl: "a", destinationPath: "1" }],
    });

    const status = await waitForFinal(manager, jobId);
    expect(status).toBe("completed");
    expect(attempts).toBe(3);
  });

  it("tracks progress and validates metadata", async () => {
    const progresses: number[] = [];

    const adapter: DownloadAdapter = {
      download: async (_src, _dest, onProgress) => {
        onProgress(0.4);
        onProgress(1);
        return { sha256: "ok", sizeBytes: 10 };
      },
      exists: async () => true,
    };

    const manager = createDownloadManager({
      adapter,
      concurrency: 2,
      retryLimit: 3,
      sleep: async () => {},
    });

    const stop = manager.subscribe((snapshot) => {
      const item = snapshot.jobs[0];
      if (item) {
        progresses.push(item.progress);
      }
    });

    const jobId = manager.enqueue({
      songId: "m45",
      files: [
        {
          kind: "vocal",
          sourceUrl: "a",
          destinationPath: "1",
          sha256: "ok",
          sizeBytes: 10,
        },
        {
          kind: "lyrics",
          sourceUrl: "b",
          destinationPath: "2",
        },
      ],
    });

    const status = await waitForFinal(manager, jobId);
    stop();

    expect(status).toBe("completed");
    expect(progresses.some((value) => value > 0)).toBe(true);
    expect(progresses[progresses.length - 1]).toBe(100);
  });

  it("cancels queued jobs before start", async () => {
    const adapter: DownloadAdapter = {
      download: async () => {
        throw new Error("should not run");
      },
      exists: async () => true,
    };

    const manager = createDownloadManager({
      adapter,
      concurrency: 1,
      retryLimit: 1,
      sleep: async () => {},
    });

    const jobId = manager.enqueue({
      songId: "m90",
      files: [{ kind: "lyrics", sourceUrl: "a", destinationPath: "1" }],
    });
    manager.cancel(jobId);

    const snapshot = manager.getSnapshot();
    const job = snapshot.jobs.find((item) => item.jobId === jobId);
    expect(job?.status).toBe("cancelled");
  });

  it("keeps cancelled downloading jobs from becoming completed", async () => {
    const slot = deferred<void>();
    let cancelled = false;
    const adapter: DownloadAdapter = {
      download: async () => {
        await slot.promise;
        return {};
      },
      exists: async () => true,
      cancel: () => {
        cancelled = true;
      },
    };

    const manager = createDownloadManager({
      adapter,
      concurrency: 1,
      retryLimit: 1,
      sleep: async () => {},
    });

    const jobId = manager.enqueue({
      songId: "m91",
      files: [{ kind: "lyrics", sourceUrl: "a", destinationPath: "1" }],
    });

    await Promise.resolve();
    manager.cancel(jobId);
    slot.resolve();
    await Promise.resolve();

    const job = manager.getSnapshot().jobs.find((item) => item.jobId === jobId);
    expect(cancelled).toBe(true);
    expect(job?.status).toBe("cancelled");
  });
});
