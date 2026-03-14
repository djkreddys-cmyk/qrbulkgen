const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");

const { query } = require("../db/postgres");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");
const { enqueueBulkQrJob } = require("../services/queue");
const { normalizeSingleQrPayload } = require("../services/qr-single");

const bulkRouter = express.Router();
const BULK_QR_TYPES = new Set([
  "URL",
  "Text",
  "Email",
  "Phone",
  "SMS",
  "WhatsApp",
  "vCard",
  "Location",
  "Youtube",
  "WIFI",
  "Event",
  "Bitcoin",
  "PDF",
  "Social Media",
  "App Store",
  "Image Gallery",
  "Rating",
  "Feedback",
]);

const REQUIRED_HEADERS_BY_TYPE = {
  URL: ["content"],
  Text: ["content"],
  Email: ["email"],
  Phone: ["phone"],
  SMS: ["phone"],
  WhatsApp: ["phone"],
  vCard: ["firstName"],
  Location: ["latitude", "longitude"],
  Youtube: ["url"],
  WIFI: ["ssid"],
  Event: ["title"],
  Bitcoin: ["address"],
  PDF: ["url"],
  "Social Media": ["content"],
  "App Store": ["url"],
  "Image Gallery": ["url"],
  Rating: ["title"],
  Feedback: ["title", "questions"],
};

const uploadsRoot = path.join(process.cwd(), "uploads");
const bulkSourceRoot = path.join(uploadsRoot, "bulk", "source");

for (const dir of [uploadsRoot, bulkSourceRoot]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, bulkSourceRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safe = path
        .basename(file.originalname || "bulk", ext)
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .slice(0, 80);
      cb(null, `${Date.now()}-${safe || "bulk"}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBulkOptions(body) {
  const fakePayload = {
    content: "csv-placeholder",
    size: parseNumber(body.size, 512),
    margin: parseNumber(body.margin, 2),
    format: body.format || "png",
    errorCorrectionLevel: body.errorCorrectionLevel || "M",
    filenamePrefix: body.filenamePrefix || "qr",
    foregroundColor: body.foregroundColor || "#000000",
    backgroundColor: body.backgroundColor || "#ffffff",
  };

  const normalized = normalizeSingleQrPayload(fakePayload);
  const qrType = String(body.qrType || "URL").trim();

  if (!BULK_QR_TYPES.has(qrType)) {
    throw createHttpError(400, "VALIDATION_ERROR", "Unsupported qrType for bulk job");
  }

  return {
    qrType,
    size: normalized.size,
    margin: normalized.margin,
    format: normalized.format,
    errorCorrectionLevel: normalized.errorCorrectionLevel,
    filenamePrefix: normalized.filenamePrefix,
    foregroundColor: normalized.foregroundColor,
    backgroundColor: normalized.backgroundColor,
  };
}

async function inspectCsv(csvPath) {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let seenHeaders = [];

    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on("headers", (headers) => {
        seenHeaders = (headers || []).map((header) => String(header || "").trim());
      })
      .on("data", () => {
        rowCount += 1;
      })
      .on("end", () => {
        resolve({
          rowCount,
          headers: seenHeaders,
        });
      })
      .on("error", reject);
  });
}

bulkRouter.post("/bulk/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      throw createHttpError(400, "VALIDATION_ERROR", "CSV file is required");
    }

    if (path.extname(file.originalname || "").toLowerCase() !== ".csv") {
      throw createHttpError(400, "VALIDATION_ERROR", "Only .csv files are allowed");
    }

    const options = normalizeBulkOptions(req.body || {});
    const csvInfo = await inspectCsv(file.path);

    const actualHeaders = new Set((csvInfo.headers || []).map((h) => h.toLowerCase()));
    const required = REQUIRED_HEADERS_BY_TYPE[options.qrType] || ["content"];
    const missing = required.filter((header) => !actualHeaders.has(header.toLowerCase()));
    if (missing.length) {
      throw createHttpError(
        400,
        "VALIDATION_ERROR",
        `CSV missing required column(s) for ${options.qrType}: ${missing.join(", ")}`,
      );
    }

    if (csvInfo.rowCount <= 0) {
      throw createHttpError(400, "VALIDATION_ERROR", "CSV must include at least one data row");
    }

    const created = await query(
      `INSERT INTO qr_jobs (
        user_id, job_type, status, source_file_name, source_file_path,
        total_count, success_count, failure_count,
        bulk_qr_type,
        qr_size, foreground_color, background_color, qr_margin, output_format,
        error_correction_level, filename_prefix
      ) VALUES (
        $1, 'bulk', 'queued', $2, $3,
        $4, 0, 0,
        $5,
        $6, $7, $8, $9, $10,
        $11, $12
      )
      RETURNING id, status, total_count, bulk_qr_type, created_at`,
      [
        req.user.id,
        file.originalname,
        file.path,
        csvInfo.rowCount,
        options.qrType,
        options.size,
        options.foregroundColor,
        options.backgroundColor,
        options.margin,
        options.format,
        options.errorCorrectionLevel,
        options.filenamePrefix,
      ],
    );

    const job = created.rows[0];

    try {
      await enqueueBulkQrJob(job.id);
    } catch (enqueueError) {
      await query(
        `UPDATE qr_jobs
         SET status = 'failed', error_message = $2, updated_at = NOW(), completed_at = NOW()
         WHERE id = $1`,
        [job.id, `Failed to enqueue job: ${enqueueError.message}`],
      );
      throw createHttpError(500, "QUEUE_ERROR", "Failed to enqueue bulk generation job");
    }

    res.status(201).json({
      job: {
        id: job.id,
        status: job.status,
        qrType: job.bulk_qr_type,
        totalCount: job.total_count,
        createdAt: job.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/jobs/summary", requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         COUNT(*)::int AS total_jobs,
         COALESCE(SUM(total_count), 0)::int AS total_requested,
         COALESCE(SUM(success_count), 0)::int AS total_success,
         COALESCE(SUM(failure_count), 0)::int AS total_failure
       FROM qr_jobs
       WHERE user_id = $1
         AND job_type = 'bulk'`,
      [req.user.id],
    );

    const row = result.rows[0];
    res.json({
      summary: {
        totalJobs: row.total_jobs,
        totalRequested: row.total_requested,
        totalSuccess: row.total_success,
        totalFailure: row.total_failure,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/jobs", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || "10", 10)));

    const result = await query(
      `SELECT
         j.id, j.status, j.bulk_qr_type, j.source_file_name, j.total_count, j.success_count, j.failure_count,
         j.error_message, j.created_at, j.started_at, j.completed_at,
         a.file_name AS artifact_file_name, a.file_path AS artifact_file_path, a.mime_type AS artifact_mime_type
       FROM qr_jobs j
       LEFT JOIN LATERAL (
         SELECT file_name, file_path, mime_type
         FROM job_artifacts
         WHERE job_id = j.id
         ORDER BY created_at DESC
         LIMIT 1
       ) a ON true
       WHERE j.user_id = $1
         AND j.job_type = 'bulk'
       ORDER BY j.created_at DESC
       LIMIT $2`,
      [req.user.id, limit],
    );

    res.json({
      jobs: result.rows.map((row) => ({
        id: row.id,
        status: row.status,
        qrType: row.bulk_qr_type,
        sourceFileName: row.source_file_name,
        totalCount: row.total_count,
        successCount: row.success_count,
        failureCount: row.failure_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        artifact: row.artifact_file_path
          ? {
              fileName: row.artifact_file_name,
              filePath: row.artifact_file_path,
              mimeType: row.artifact_mime_type,
            }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const result = await query(
      `SELECT
         j.id, j.status, j.bulk_qr_type, j.source_file_name, j.total_count, j.success_count, j.failure_count,
         j.error_message, j.created_at, j.started_at, j.completed_at,
         a.file_name AS artifact_file_name, a.file_path AS artifact_file_path, a.mime_type AS artifact_mime_type
       FROM qr_jobs j
       LEFT JOIN LATERAL (
         SELECT file_name, file_path, mime_type
         FROM job_artifacts
         WHERE job_id = j.id
         ORDER BY created_at DESC
         LIMIT 1
       ) a ON true
       WHERE j.id = $1
         AND j.user_id = $2
         AND j.job_type = 'bulk'
       LIMIT 1`,
      [jobId, req.user.id],
    );

    const row = result.rows[0];
    if (!row) {
      throw createHttpError(404, "NOT_FOUND", "Bulk job not found");
    }

    res.json({
      job: {
        id: row.id,
        status: row.status,
        qrType: row.bulk_qr_type,
        sourceFileName: row.source_file_name,
        totalCount: row.total_count,
        successCount: row.success_count,
        failureCount: row.failure_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        artifact: row.artifact_file_path
          ? {
              fileName: row.artifact_file_name,
              filePath: row.artifact_file_path,
              mimeType: row.artifact_mime_type,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  bulkRouter,
};
