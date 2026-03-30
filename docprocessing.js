/**
 * Document processing: in-memory job store + FIFO queue + concurrent worker loops.
 * This simulates async processing with a 10–20s delay and mock results.
 */
const crypto = require("crypto");
const axios = require("axios");
const express = require("express");
const multer = require("multer");

// --- in-memory job store ---
const jobs = new Map(); // jobId -> job
const queue = []; // FIFO of jobIds (best-effort)

function createJob({ sourceType, fileName, fileUrl, callbackUrl, maxAttempts }) {
  const now = new Date().toISOString();
  const job = {
    id: crypto.randomUUID(),
    status: "queued",
    sourceType,
    fileName: fileName || null,
    fileUrl: fileUrl || null,
    callbackUrl: callbackUrl || null,
    attempts: 0,
    maxAttempts: maxAttempts ?? 3,
    result: null,
    error: null,
    timestamps: {
      createdAt: now,
      queuedAt: now,
      processingStartedAt: null,
      processingEndedAt: null,
      completedAt: null,
      failedAt: null,
      nextRetryAt: null,
    },
  };

  jobs.set(job.id, job);
  queue.push(job.id);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function listJobs() {
  return Array.from(jobs.values()).sort((a, b) =>
    b.timestamps.createdAt.localeCompare(a.timestamps.createdAt),
  );
}

function takeNextQueuedJob() {
  while (queue.length > 0) {
    const nextId = queue.shift();
    const job = getJob(nextId);
    if (job && job.status === "queued") return job;
  }
  return null;
}

function requeueJob(jobId) {
  queue.push(jobId);
}

// --- worker configuration ---
const DEFAULT_CONCURRENCY = Number(process.env.DOC_WORKER_CONCURRENCY || 3);
const POLL_INTERVAL_MS = Number(process.env.DOC_WORKER_POLL_MS || 400);

function randomDelayMs() {
  return 10_000 + Math.floor(Math.random() * 10_000); // 10–20s
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMockResult(job) {
  return {
    summary: "Document processed successfully",
    extractedMetadata: {
      sourceType: job.sourceType,
      fileName: job.fileName,
      fileUrl: job.fileUrl,
      wordsDetected: 450 + Math.floor(Math.random() * 350),
      confidence: Number((0.8 + Math.random() * 0.18).toFixed(2)),
    },
    entities: [
      { type: "PERSON", value: "John Doe", confidence: 0.91 },
      { type: "DATE", value: "2026-03-10", confidence: 0.88 },
      { type: "ORG", value: "General Hospital", confidence: 0.9 },
    ],
  };
}

async function postWebhook(job) {
  if (!job.callbackUrl) return;
  try {
    await axios.post(job.callbackUrl, {
      jobId: job.id,
      status: job.status,
      timestamps: job.timestamps,
      result: job.result,
      error: job.error,
    });
  } catch (err) {
    // Webhook failures should not affect job state.
    console.error(`[doc-worker] Webhook failed for job ${job.id}:`, err?.message || err);
  }
}

async function processJob(job) {
  job.status = "processing";
  job.attempts += 1;
  job.error = null;
  job.timestamps.processingStartedAt = new Date().toISOString();
  job.timestamps.nextRetryAt = null;

  console.log(`[doc-worker] Processing job ${job.id} attempt ${job.attempts}`);
  await sleep(randomDelayMs());

  // Simulated failure (so retry/failed states can be observed).
  const simulatedFailure = Math.random() < 0.25;
  if (simulatedFailure) {
    throw new Error("Simulated processing failure");
  }

  job.result = buildMockResult(job);
  job.status = "completed";
  job.timestamps.processingEndedAt = new Date().toISOString();
  job.timestamps.completedAt = job.timestamps.processingEndedAt;
  console.log(`[doc-worker] Completed job ${job.id}`);

  await postWebhook(job);
}

async function handleJobFailure(job, error) {
  job.error = error?.message || "Unknown processing error";
  job.timestamps.processingEndedAt = new Date().toISOString();

  if (job.attempts < job.maxAttempts) {
    job.status = "queued";
    job.timestamps.nextRetryAt = new Date(Date.now() + 2000).toISOString();
    console.warn(
      `[doc-worker] Retry scheduled for job ${job.id} after failure: ${job.error}`,
    );

    setTimeout(() => {
      const latest = getJob(job.id);
      if (latest && latest.status === "queued") requeueJob(latest.id);
    }, 2000);
    return;
  }

  job.status = "failed";
  job.timestamps.failedAt = new Date().toISOString();
  console.error(`[doc-worker] Job ${job.id} failed: ${job.error}`);
  await postWebhook(job);
}

async function runWorker(workerId) {
  console.log(`[doc-worker-${workerId}] started`);
  while (true) {
    const job = takeNextQueuedJob();
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    try {
      await processJob(job);
    } catch (err) {
      await handleJobFailure(job, err);
    }
  }
}

let workerStarted = false;
function startDocumentWorkers() {
  if (workerStarted) return;
  workerStarted = true;

  for (let i = 1; i <= DEFAULT_CONCURRENCY; i += 1) {
    runWorker(i).catch((err) => {
      console.error(`[doc-worker-${i}] crashed:`, err);
    });
  }
}

// --- routes ---
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function toResponse(job) {
  return {
    jobId: job.id,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    sourceType: job.sourceType,
    fileName: job.fileName,
    fileUrl: job.fileUrl,
    callbackUrl: job.callbackUrl,
    timestamps: job.timestamps,
    result: job.result,
    error: job.error,
  };
}

/**
 * Create a job
 * - JSON: { "fileUrl": "...", "callbackUrl": "..." }
 * - multipart/form-data: field "file" and/or field "fileUrl"
 */
router.post("/", upload.single("file"), (req, res) => {
  const fileUrl = req.body?.fileUrl;
  const callbackUrl = req.body?.callbackUrl || null;

  const hasUpload = !!req.file; // we don't persist file bytes; this is a simulation
  const hasFileUrl = typeof fileUrl === "string" && fileUrl.trim().length > 0;

  if (!hasUpload && !hasFileUrl) {
    return res.status(400).json({
      error: "Provide either multipart file field 'file' or JSON/multipart 'fileUrl'.",
    });
  }

  const job = createJob({
    sourceType: hasUpload ? "file" : "url",
    fileName: hasUpload ? req.file.originalname : null,
    fileUrl: hasFileUrl ? fileUrl.trim() : null,
    callbackUrl,
    maxAttempts: 3,
  });

  return res.status(202).json({
    message: "Document accepted for asynchronous processing.",
    ...toResponse(job),
  });
});

// List all jobs (bonus)
router.get("/", (req, res) => {
  const jobList = listJobs().map(toResponse);
  return res.json({ count: jobList.length, jobs: jobList });
});

// Get job status by id
router.get("/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  return res.json(toResponse(job));
});

module.exports = {
  documentJobRoutes: router,
  startDocumentWorkers,
};

