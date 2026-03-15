const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");

const { query } = require("../db/postgres");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");
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
  URL: ["content", "filename"],
  Text: ["content", "filename"],
  Email: ["email", "filename"],
  Phone: ["phone", "filename"],
  SMS: ["phone", "filename"],
  WhatsApp: ["phone", "filename"],
  vCard: ["firstName", "filename"],
  Location: ["latitude", "longitude", "filename"],
  Youtube: ["url", "filename"],
  WIFI: ["ssid", "filename"],
  Event: ["title", "filename"],
  Bitcoin: ["address", "filename"],
  PDF: ["url", "filename"],
  "Social Media": ["content", "filename"],
  "App Store": ["url", "filename"],
  "Image Gallery": ["url", "filename"],
  Rating: ["title", "filename"],
  Feedback: ["title", "questions", "filename"],
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

function parseDateFilter(value, endOfDay = false) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(raw.includes("T") ? raw : `${raw}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

async function parseCsvRows(csvPath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on("data", (row) => {
        rows.push(
          Object.fromEntries(
            Object.entries(row || {}).map(([key, value]) => [
              String(key || "").trim().toLowerCase(),
              String(value || "").trim(),
            ]),
          ),
        );
      })
      .on("end", () => resolve(rows))
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
    const csvRows = await parseCsvRows(file.path);

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
        path.relative(uploadsRoot, file.path).replace(/\\/g, "/"),
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
      await enqueueBulkQrJob(job.id, { rows: csvRows });
    } catch (enqueueError) {
      await query(
        `UPDATE qr_jobs
         SET status = 'failed', error_message = $2, updated_at = NOW(), completed_at = NOW()
         WHERE id = $1`,
        [job.id, `Failed to enqueue job: ${enqueueError.message}`],
      );
      throw createHttpError(500, "QUEUE_ERROR", "Failed to enqueue bulk generation job");
    }

    await trackEvent({
      userId: req.user.id,
      jobId: job.id,
      eventType: "qr.bulk.queued",
      eventValue: csvInfo.rowCount,
      metadata: {
        qrType: options.qrType,
        format: options.format,
      },
    });

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
    const jobType = String(req.query.jobType || "").trim().toLowerCase();
    const filterSingle = jobType === "single";
    const filterBulk = jobType === "bulk";
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);
    const result = await query(
      `SELECT
         COUNT(*)::int AS total_jobs,
         COUNT(*) FILTER (WHERE job_type = 'single')::int AS single_jobs,
         COUNT(*) FILTER (WHERE job_type = 'bulk')::int AS bulk_jobs,
         COALESCE(SUM(total_count), 0)::int AS total_requested,
         COALESCE(SUM(success_count), 0)::int AS total_success,
         COALESCE(SUM(failure_count), 0)::int AS total_failure
       FROM qr_jobs
       WHERE user_id = $1
         AND (
           $2 = false OR job_type = 'single'
         )
         AND (
           $3 = false OR job_type = 'bulk'
         )
         AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR created_at <= $5::timestamptz)`,
      [req.user.id, filterSingle, filterBulk, startDate, endDate],
    );

    const row = result.rows[0];
    res.json({
      summary: {
        totalJobs: row.total_jobs,
        singleJobs: row.single_jobs,
        bulkJobs: row.bulk_jobs,
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
    const jobType = String(req.query.jobType || "").trim().toLowerCase();
    const filterSingle = jobType === "single";
    const filterBulk = jobType === "bulk";
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);

    const result = await query(
      `SELECT
         j.id, j.job_type, j.status, j.bulk_qr_type, j.source_file_name, j.total_count, j.success_count, j.failure_count,
         j.error_message, j.created_at, j.started_at, j.completed_at,
         j.qr_content, j.qr_size, j.foreground_color, j.background_color, j.qr_margin, j.output_format,
         j.error_correction_level, j.filename_prefix,
         a.artifact_type AS artifact_type, a.file_name AS artifact_file_name, a.file_path AS artifact_file_path, a.mime_type AS artifact_mime_type
       FROM qr_jobs j
       LEFT JOIN LATERAL (
         SELECT artifact_type, file_name, file_path, mime_type
         FROM job_artifacts
         WHERE job_id = j.id
         ORDER BY created_at DESC
         LIMIT 1
       ) a ON true
       WHERE j.user_id = $1
         AND (
           $2 = false OR j.job_type = 'single'
         )
         AND (
           $3 = false OR j.job_type = 'bulk'
         )
         AND ($4::timestamptz IS NULL OR j.created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR j.created_at <= $5::timestamptz)
       ORDER BY j.created_at DESC
       LIMIT $6`,
      [req.user.id, filterSingle, filterBulk, startDate, endDate, limit],
    );

    res.json({
      jobs: result.rows.map((row) => ({
        id: row.id,
        jobType: row.job_type,
        status: row.status,
        qrType: row.job_type === "single" ? "Single" : row.bulk_qr_type,
        sourceFileName: row.source_file_name,
        totalCount: row.total_count,
        successCount: row.success_count,
        failureCount: row.failure_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        editPayload: {
          content: row.qr_content,
          size: row.qr_size,
          foregroundColor: row.foreground_color,
          backgroundColor: row.background_color,
          margin: row.qr_margin,
          format: row.output_format,
          errorCorrectionLevel: row.error_correction_level,
          filenamePrefix: row.filename_prefix,
        },
        artifact: row.artifact_file_path
          ? {
              artifactType: row.artifact_type,
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

bulkRouter.get("/jobs/:id/edit-payload", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const result = await query(
      `SELECT id, job_type, bulk_qr_type, qr_content, qr_size, foreground_color, background_color,
              qr_margin, output_format, error_correction_level, filename_prefix
       FROM qr_jobs
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [jobId, req.user.id],
    );

    const row = result.rows[0];
    if (!row) {
      throw createHttpError(404, "NOT_FOUND", "Job not found");
    }

    res.json({
      job: {
        id: row.id,
        jobType: row.job_type,
        qrType: row.job_type === "single" ? "URL" : row.bulk_qr_type,
        content: row.qr_content || "",
        size: row.qr_size,
        foregroundColor: row.foreground_color,
        backgroundColor: row.background_color,
        margin: row.qr_margin,
        format: row.output_format,
        errorCorrectionLevel: row.error_correction_level,
        filenamePrefix: row.filename_prefix || "qr",
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.delete("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const deleted = await query(
      `DELETE FROM qr_jobs
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [jobId, req.user.id],
    );

    if (!deleted.rows[0]) {
      throw createHttpError(404, "NOT_FOUND", "Job not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/reports/overview", requireAuth, async (req, res, next) => {
  try {
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);

    const [qrTypeRows, statusRows, trendRows] = await Promise.all([
      query(
        `SELECT bulk_qr_type AS label, COUNT(*)::int AS count
         FROM qr_jobs
         WHERE user_id = $1
           AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
         GROUP BY bulk_qr_type
         ORDER BY count DESC, label ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT status AS label, COUNT(*)::int AS count
         FROM qr_jobs
         WHERE user_id = $1
           AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
         GROUP BY status
         ORDER BY count DESC, label ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS label, COUNT(*)::int AS count
         FROM qr_jobs
         WHERE user_id = $1
           AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) DESC
         LIMIT 14`,
        [req.user.id, startDate, endDate],
      ),
    ]);

    res.json({
      report: {
        jobsByQrType: qrTypeRows.rows,
        jobsByStatus: statusRows.rows,
        dailyJobs: [...trendRows.rows].reverse(),
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/reports/public-engagement", requireAuth, async (req, res, next) => {
  try {
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);

    const [ratingRows, feedbackRows] = await Promise.all([
      query(
        `SELECT
           COALESCE(title, 'Untitled rating form') AS title,
           style,
           scale,
           rating,
           COUNT(*)::int AS count
         FROM rating_submissions
         WHERE ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
           AND ($2::timestamptz IS NULL OR created_at <= $2::timestamptz)
         GROUP BY COALESCE(title, 'Untitled rating form'), style, scale, rating
         ORDER BY title ASC, rating ASC`,
        [startDate, endDate],
      ),
      query(
        `SELECT title, questions, answers, created_at
         FROM feedback_submissions
         WHERE ($1::timestamptz IS NULL OR created_at >= $1::timestamptz)
           AND ($2::timestamptz IS NULL OR created_at <= $2::timestamptz)
         ORDER BY created_at DESC`,
        [startDate, endDate],
      ),
    ]);

    const ratingsByTitle = {};
    for (const row of ratingRows.rows) {
      const key = row.title;
      if (!ratingsByTitle[key]) {
        ratingsByTitle[key] = {
          title: key,
          style: row.style,
          scale: row.scale,
          buckets: [],
        };
      }
      ratingsByTitle[key].buckets.push({
        label: String(row.rating),
        count: row.count,
      });
    }

    const feedbackMap = new Map();
    for (const row of feedbackRows.rows) {
      const formTitle = row.title || "Untitled feedback form";
      const key = formTitle;
      if (!feedbackMap.has(key)) {
        feedbackMap.set(key, {
          title: formTitle,
          questions: {},
        });
      }
      const target = feedbackMap.get(key);
      const questions = Array.isArray(row.questions) ? row.questions : [];
      const answers = Array.isArray(row.answers) ? row.answers : [];
      questions.forEach((question, index) => {
        const label = String(question || "").trim();
        if (!label) return;
        if (!target.questions[label]) {
          target.questions[label] = {
            label,
            responses: 0,
            latestAnswers: [],
          };
        }
        const answer = String(answers[index] || "").trim();
        target.questions[label].responses += 1;
        if (answer && target.questions[label].latestAnswers.length < 5) {
          target.questions[label].latestAnswers.push(answer);
        }
      });
    }

    res.json({
      report: {
        ratings: Object.values(ratingsByTitle),
        feedback: Array.from(feedbackMap.values()).map((entry) => ({
          title: entry.title,
          questions: Object.values(entry.questions),
        })),
      },
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

bulkRouter.get("/jobs/:id/items", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const ownerCheck = await query(
      `SELECT id
       FROM qr_jobs
       WHERE id = $1
         AND user_id = $2
         AND job_type = 'bulk'
       LIMIT 1`,
      [jobId, req.user.id],
    );

    if (!ownerCheck.rows[0]) {
      throw createHttpError(404, "NOT_FOUND", "Bulk job not found");
    }

    const result = await query(
      `SELECT row_index, content, status, output_file_name, output_path, error_message, created_at, updated_at
       FROM qr_job_items
       WHERE job_id = $1
       ORDER BY row_index ASC`,
      [jobId],
    );

    res.json({
      items: result.rows.map((row) => ({
        rowIndex: row.row_index,
        content: row.content,
        status: row.status,
        outputFileName: row.output_file_name,
        outputPath: row.output_path,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  bulkRouter,
};
