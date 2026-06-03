import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe.sequential("job repository dedupe", () => {
  let tempDir: string;
  let jobsRepo: typeof import("./jobs");

  beforeEach(async () => {
    vi.resetModules();
    tempDir = await mkdtemp(join(tmpdir(), "job-ops-jobs-dedupe-test-"));
    process.env.DATA_DIR = tempDir;
    process.env.NODE_ENV = "test";

    await import("../db/migrate");
    jobsRepo = await import("./jobs");
  });

  afterEach(async () => {
    const { closeDb } = await import("../db/index");
    closeDb();
    await rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("skips jobs with the same normalized title, employer, and location", async () => {
    const result = await jobsRepo.createJobs([
      {
        source: "manual",
        title: "Software Developer",
        employer: "NRT Technology Corp",
        location: "Las Vegas, NV, US",
        jobUrl: "https://example.com/jobs/nrt-1",
      },
      {
        source: "manual",
        title: "Software Developer",
        employer: "NRT Technology Corp.",
        location: "Las Vegas, NV",
        jobUrl: "https://other-board.example/jobs/nrt-2",
      },
    ]);

    expect(result).toEqual({ created: 1, skipped: 1 });
  });
});
