const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const archiver = require("archiver");
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { Pool } = require("pg");
const QRCode = require("qrcode");

const BULK_QR_QUEUE = "bulk-qr-jobs";

const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const db = new Pool({
  connectionString:
    process.env.POSTGRES_URL || "postgresql://postgres:postgres@localhost:5432/qrbulkgen",
});

const repoRoot = path.resolve(__dirname, "..");
const uploadsRoot = process.env.BULK_STORAGE_DIR
  ? path.resolve(process.env.BULK_STORAGE_DIR)
  : path.join(repoRoot, "backend", "uploads");

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields.map((v) => v.trim());
}

async function readCsvContents(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { values: [], headers: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const contentIdx = headers.indexOf("content");
  if (contentIdx < 0) {
    throw new Error("CSV missing required content column");
  }

  const values = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    values.push(String(cols[contentIdx] || "").trim());
  }

  return { values, headers };
}

async function createZipFromDir(sourceDir, zipPath) {
  await fsp.mkdir(path.dirname(zipPath), { recursive: true });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const zipPromise = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(output);
  archive.directory(sourceDir, false);
  archive.finalize();

  await zipPromise;
}

async function markFailed(jobId, message) {
  await db.query(
    `UPDATE qr_jobs
     SET status = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId, String(message || "Bulk worker failed").slice(0, 2000)],
  );
}

async function processBulkJob(jobId) {
  const result = await db.query(
    `SELECT
       id, user_id, source_file_name, source_file_path,
       qr_size, foreground_color, background_color, qr_margin, output_format,
       error_correction_level, filename_prefix
     FROM qr_jobs
     WHERE id = $1
       AND job_type = 'bulk'
     LIMIT 1`,
    [jobId],
  );

  const job = result.rows[0];
  if (!job) {
    throw new Error("Job not found");
  }

  await db.query(
    `UPDATE qr_jobs
     SET status = 'processing', started_at = NOW(), updated_at = NOW(), error_message = NULL
     WHERE id = $1`,
    [jobId],
  );

  const sourceFilePath = String(job.source_file_path || "").trim();
  if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
    throw new Error("Source CSV file not found on worker");
  }

  const { values } = await readCsvContents(sourceFilePath);
  const outputDir = path.join(uploadsRoot, "bulk", "jobs", jobId, "files");
  await fsp.mkdir(outputDir, { recursive: true });

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < values.length; i += 1) {
    const content = String(values[i] || "").trim();
    if (!content) {
      failureCount += 1;
      continue;
    }

    const fileName = `${job.filename_prefix || "qr"}-${i + 1}.${job.output_format || "png"}`;
    const filePath = path.join(outputDir, fileName);

    try {
      if ((job.output_format || "png") === "svg") {
        const svg = await QRCode.toString(content, {
          type: "svg",
          width: job.qr_size || 512,
          margin: job.qr_margin || 2,
          errorCorrectionLevel: job.error_correction_level || "M",
          color: {
            dark: job.foreground_color || "#000000",
            light: job.background_color || "#ffffff",
          },
        });
        await fsp.writeFile(filePath, svg, "utf8");
      } else {
        await QRCode.toFile(filePath, content, {
          width: job.qr_size || 512,
          margin: job.qr_margin || 2,
          errorCorrectionLevel: job.error_correction_level || "M",
          color: {
            dark: job.foreground_color || "#000000",
            light: job.background_color || "#ffffff",
          },
        });
      }
      successCount += 1;
    } catch {
      failureCount += 1;
    }
  }

  const zipFileName = `${job.filename_prefix || "qr"}-${jobId}.zip`;
  const zipAbsPath = path.join(uploadsRoot, "bulk", "jobs", jobId, zipFileName);
  await createZipFromDir(outputDir, zipAbsPath);
  const zipStat = await fsp.stat(zipAbsPath);

  const zipWebPath = `/uploads/bulk/jobs/${jobId}/${zipFileName}`;

  await db.query(
    `INSERT INTO job_artifacts (job_id, artifact_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1, 'zip', $2, $3, 'application/zip', $4)`,
    [jobId, zipFileName, zipWebPath, Number(zipStat.size || 0)],
  );

  await db.query(
    `UPDATE qr_jobs
     SET status = 'completed',
         success_count = $2,
         failure_count = $3,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, successCount, failureCount],
  );
}

const worker = new Worker(
  BULK_QR_QUEUE,
  async (job) => {
    const jobId = String(job.data?.jobId || "").trim();
    if (!jobId) {
      throw new Error("Missing jobId in queue payload");
    }

    try {
      await processBulkJob(jobId);
    } catch (error) {
      await markFailed(jobId, error.message);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Bulk job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Bulk job failed: ${job?.id}`, err?.message || err);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down worker...`);
  await worker.close();
  await redis.quit();
  await db.end();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log("Bulk QR worker started");
