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
const TRACKED_ONLY_QR_TYPES = new Set(["Rating", "Feedback", "PDF", "Image Gallery"]);
const HYBRID_TRACKING_QR_TYPES = new Set([
  "URL",
  "Text",
  "Email",
  "Phone",
  "SMS",
  "WhatsApp",
  "Youtube",
  "App Store",
  "Location",
]);
const TRACKED_QR_TYPES = new Set([
  ...TRACKED_ONLY_QR_TYPES,
  ...HYBRID_TRACKING_QR_TYPES,
  "vCard",
  "WIFI",
  "Event",
  "Social Media",
]);
const NORMALIZED_URL_MATCH_SQL = "(regexp_replace(lower(split_part(%s, '?exp=', 1)), '^https?://(www\\.)?', '') = regexp_replace(lower(split_part(%s, '?exp=', 1)), '^https?://(www\\.)?', ''))";
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

function parseBooleanFlag(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function toCsvCell(value) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildCsv(columns, rows) {
  const header = columns.map((column) => toCsvCell(column.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((column) => toCsvCell(row[column.key]))
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}

function getQrTypeLabel(row) {
  return row.job_type === "single"
    ? String(row.managed_qr_type || row.bulk_qr_type || "Text")
    : String(row.bulk_qr_type || row.managed_qr_type || "Text");
}

function extractPublicAnalysisTarget(content) {
  const raw = String(content || "").trim();
  if (!/^https?:\/\//i.test(raw)) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname.toLowerCase();

    if (pathname === "/rate") {
      return {
        kind: "rating",
        title: parsed.searchParams.get("title") || "",
      };
    }

    if (pathname === "/feedback") {
      const encoded = parsed.searchParams.get("f") || "";
      if (!encoded) {
        return null;
      }

      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const payload = JSON.parse(decoded);
      return {
        kind: "feedback",
        title: String(payload?.title || "").trim(),
      };
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function normalizeTrackedUrl(url) {
  const raw = String(url || "").trim();
  if (!/^https?:\/\//i.test(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    const expiry = parsed.searchParams.get("exp") || "";
    parsed.searchParams.delete("exp");
    return {
      url: parsed.toString(),
      expiry,
      isExpired: expiry ? new Date(expiry).getTime() < Date.now() : false,
    };
  } catch (_error) {
    return { url: raw, expiry: "", isExpired: false };
  }
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

  const requestedTrackingMode = String(body.trackingMode || "").trim().toLowerCase();
  const trackingMode =
    TRACKED_ONLY_QR_TYPES.has(qrType) || !HYBRID_TRACKING_QR_TYPES.has(qrType)
      ? "tracked"
      : requestedTrackingMode === "tracked"
        ? "tracked"
        : "direct";

  return {
    qrType,
    trackingMode,
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
        error_correction_level, filename_prefix, tracking_mode
      ) VALUES (
        $1, 'bulk', 'queued', $2, $3,
        $4, 0, 0,
        $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13
      )
      RETURNING id, status, total_count, bulk_qr_type, tracking_mode, created_at`,
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
        options.trackingMode,
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
        trackingMode: options.trackingMode,
      },
    });

    res.status(201).json({
      job: {
        id: job.id,
        status: job.status,
        qrType: job.bulk_qr_type,
        trackingMode: job.tracking_mode,
        totalCount: job.total_count,
        createdAt: job.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.put("/jobs/:id/bulk", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const existingResult = await query(
      `SELECT id, source_file_name, source_file_path, bulk_qr_type, tracking_mode
       FROM qr_jobs
       WHERE id = $1
         AND user_id = $2
         AND job_type = 'bulk'
       LIMIT 1`,
      [jobId, req.user.id],
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw createHttpError(404, "NOT_FOUND", "Bulk job not found");
    }

    const options = normalizeBulkOptions({
      ...(req.body || {}),
      qrType: existing.bulk_qr_type,
      trackingMode: req.body?.trackingMode || existing.tracking_mode,
    });
    const file = req.file;
    const csvAbsolutePath = file
      ? file.path
      : path.join(uploadsRoot, String(existing.source_file_path || "").replace(/\//g, path.sep));

    if (!fs.existsSync(csvAbsolutePath)) {
      throw createHttpError(400, "VALIDATION_ERROR", "Bulk source CSV is no longer available for this job");
    }

    const csvInfo = await inspectCsv(csvAbsolutePath);
    let csvRows = await parseCsvRows(csvAbsolutePath);
    const expiryOverride = String(req.body.expiresAt || "").trim();
    if (expiryOverride) {
      csvRows = csvRows.map((row) => ({
        ...row,
        expiresat: expiryOverride,
      }));
    }
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

    await query(`DELETE FROM qr_job_items WHERE job_id = $1`, [jobId]);
    await query(`DELETE FROM job_artifacts WHERE job_id = $1`, [jobId]);

    const updated = await query(
      `UPDATE qr_jobs
       SET status = 'queued',
           source_file_name = $2,
           source_file_path = $3,
           total_count = $4,
           success_count = 0,
           failure_count = 0,
           bulk_qr_type = $5,
           qr_size = $6,
           foreground_color = $7,
           background_color = $8,
           qr_margin = $9,
           output_format = $10,
           error_correction_level = $11,
           filename_prefix = $12,
           tracking_mode = $13,
           error_message = NULL,
           archived_at = NULL,
           started_at = NULL,
           completed_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, total_count, bulk_qr_type, tracking_mode, created_at, updated_at`,
      [
        jobId,
        file ? file.originalname : existing.source_file_name,
        path.relative(uploadsRoot, csvAbsolutePath).replace(/\\/g, "/"),
        csvInfo.rowCount,
        options.qrType,
        options.size,
        options.foregroundColor,
        options.backgroundColor,
        options.margin,
        options.format,
        options.errorCorrectionLevel,
        options.filenamePrefix,
        options.trackingMode,
      ],
    );

    const job = updated.rows[0];

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
      eventType: "qr.bulk.updated",
      eventValue: csvInfo.rowCount,
      metadata: {
        qrType: options.qrType,
        format: options.format,
        trackingMode: options.trackingMode,
      },
    });

    res.json({
      job: {
        id: job.id,
        status: job.status,
        qrType: job.bulk_qr_type,
        trackingMode: job.tracking_mode,
        totalCount: job.total_count,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
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
    const includeArchived = parseBooleanFlag(req.query.includeArchived);
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
         AND ($6 = true OR archived_at IS NULL)
         AND (
           $2 = false OR job_type = 'single'
         )
         AND (
           $3 = false OR job_type = 'bulk'
         )
         AND ($4::timestamptz IS NULL OR qr_jobs.created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR qr_jobs.created_at <= $5::timestamptz)`,
      [req.user.id, filterSingle, filterBulk, startDate, endDate, includeArchived],
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
    const includeArchived = parseBooleanFlag(req.query.includeArchived);

    const result = await query(
      `SELECT
         j.id, j.job_type, j.status, j.bulk_qr_type, j.source_file_name, j.total_count, j.success_count, j.failure_count,
         j.error_message, j.created_at, j.started_at, j.completed_at,
         j.archived_at, j.qr_content, j.managed_link_id, j.qr_size, j.foreground_color, j.background_color, j.qr_margin, j.output_format,
         j.error_correction_level, j.filename_prefix, j.tracking_mode,
         m.qr_type AS managed_qr_type, m.title AS managed_title, m.expires_at AS managed_expires_at,
         a.artifact_type AS artifact_type, a.file_name AS artifact_file_name, a.file_path AS artifact_file_path, a.mime_type AS artifact_mime_type
       FROM qr_jobs j
       LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
       LEFT JOIN LATERAL (
         SELECT artifact_type, file_name, file_path, mime_type
         FROM job_artifacts
         WHERE job_id = j.id
         ORDER BY created_at DESC
         LIMIT 1
       ) a ON true
       WHERE j.user_id = $1
         AND ($7 = true OR j.archived_at IS NULL)
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
      [req.user.id, filterSingle, filterBulk, startDate, endDate, limit, includeArchived],
    );

    res.json({
      jobs: result.rows.map((row) => ({
        id: row.id,
        jobType: row.job_type,
        status: row.status,
        qrType: getQrTypeLabel(row),
        sourceFileName: row.source_file_name,
        totalCount: row.total_count,
        successCount: row.success_count,
        failureCount: row.failure_count,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        archivedAt: row.archived_at,
        trackingMode: row.tracking_mode || "tracked",
        managedLink: row.managed_link_id
          ? {
              id: row.managed_link_id,
              qrType: row.managed_qr_type,
              title: row.managed_title,
              expiresAt: row.managed_expires_at,
            }
          : null,
        editPayload: {
          content: row.qr_content,
          qrType: getQrTypeLabel(row),
          size: row.qr_size,
          foregroundColor: row.foreground_color,
          backgroundColor: row.background_color,
          margin: row.qr_margin,
          format: row.output_format,
          errorCorrectionLevel: row.error_correction_level,
          filenamePrefix: row.filename_prefix,
          trackingMode: row.tracking_mode || "tracked",
          managedTitle: row.managed_title || getQrTypeLabel(row),
          expiresAt: row.managed_expires_at,
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
      `SELECT
         j.id, j.job_type, j.bulk_qr_type, j.qr_content, j.qr_size, j.foreground_color, j.background_color,
         j.qr_margin, j.output_format, j.error_correction_level, j.filename_prefix, j.tracking_mode,
         m.qr_type AS managed_qr_type, m.title AS managed_title, m.expires_at AS managed_expires_at,
         m.target_payload
       FROM qr_jobs j
       LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
       WHERE j.id = $1 AND j.user_id = $2
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
        qrType: getQrTypeLabel(row),
        content: row.qr_content || "",
        size: row.qr_size,
        foregroundColor: row.foreground_color,
        backgroundColor: row.background_color,
        margin: row.qr_margin,
        format: row.output_format,
        errorCorrectionLevel: row.error_correction_level,
        filenamePrefix: row.filename_prefix || "qr",
        trackingMode: row.tracking_mode || "tracked",
        managedTitle: row.managed_title || getQrTypeLabel(row),
        expiresAt: row.managed_expires_at,
        targetPayload: row.target_payload || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.delete("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    const forceDelete = parseBooleanFlag(req.query.force);
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const deleted = forceDelete
      ? await query(
          `DELETE FROM qr_jobs
           WHERE id = $1 AND user_id = $2
           RETURNING id`,
          [jobId, req.user.id],
        )
      : await query(
          `UPDATE qr_jobs
           SET archived_at = NOW(), updated_at = NOW()
           WHERE id = $1
             AND user_id = $2
             AND archived_at IS NULL
           RETURNING id, archived_at`,
          [jobId, req.user.id],
        );

    if (!deleted.rows[0]) {
      throw createHttpError(404, "NOT_FOUND", "Job not found");
    }

    if (forceDelete) {
      res.status(204).send();
      return;
    }

    res.json({
      job: {
        id: deleted.rows[0].id,
        archivedAt: deleted.rows[0].archived_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/reports/overview", requireAuth, async (req, res, next) => {
  try {
    const startDate = parseDateFilter(req.query.startDate);
    const endDate = parseDateFilter(req.query.endDate, true);
    const [qrTypeRows, qrTypePerformanceRows, statusRows, trendRows, scanSummaryRows, scanTrendRows, topLinksRows, expiringRows] = await Promise.all([
      query(
        `SELECT
           CASE
             WHEN j.job_type = 'single' THEN COALESCE(m.qr_type, 'Text')
             ELSE COALESCE(j.bulk_qr_type, 'Text')
           END AS label,
           COUNT(*)::int AS count
         FROM qr_jobs j
         LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
         WHERE j.user_id = $1
           AND j.archived_at IS NULL
           AND ($2::timestamptz IS NULL OR j.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR j.created_at <= $3::timestamptz)
         GROUP BY CASE
           WHEN j.job_type = 'single' THEN COALESCE(m.qr_type, 'Text')
           ELSE COALESCE(j.bulk_qr_type, 'Text')
         END
         ORDER BY count DESC, label ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT
           CASE
             WHEN j.job_type = 'single' THEN COALESCE(m.qr_type, 'Text')
             ELSE COALESCE(j.bulk_qr_type, 'Text')
           END AS label,
           COUNT(*)::int AS jobs_count,
           COALESCE(SUM(j.total_count), 0)::int AS requested_count,
           COALESCE(SUM(j.success_count), 0)::int AS success_count,
           COALESCE(SUM(j.failure_count), 0)::int AS failure_count,
           COUNT(*) FILTER (WHERE j.status = 'completed')::int AS completed_jobs,
           COUNT(*) FILTER (WHERE j.status = 'failed')::int AS failed_jobs
         FROM qr_jobs j
         LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
         WHERE j.user_id = $1
           AND j.archived_at IS NULL
           AND ($2::timestamptz IS NULL OR j.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR j.created_at <= $3::timestamptz)
         GROUP BY CASE
           WHEN j.job_type = 'single' THEN COALESCE(m.qr_type, 'Text')
           ELSE COALESCE(j.bulk_qr_type, 'Text')
         END
         ORDER BY jobs_count DESC, label ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT status AS label, COUNT(*)::int AS count
         FROM qr_jobs
         WHERE user_id = $1
           AND archived_at IS NULL
           AND ($2::timestamptz IS NULL OR qr_jobs.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR qr_jobs.created_at <= $3::timestamptz)
         GROUP BY status
         ORDER BY count DESC, label ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS label, COUNT(*)::int AS count
         FROM qr_jobs
         WHERE user_id = $1
           AND archived_at IS NULL
           AND ($2::timestamptz IS NULL OR qr_jobs.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR qr_jobs.created_at <= $3::timestamptz)
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) DESC
         LIMIT 14`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT
           COUNT(*)::int AS total_scans,
           COUNT(DISTINCT metadata->>'visitorKey')::int AS unique_scans,
           MAX(ae.created_at) AS last_scan_at
         FROM analytics_events ae
         INNER JOIN managed_qr_links m
           ON m.id::text = ae.metadata->>'linkId'
           OR m.content = ae.metadata->>'targetUrl'
         WHERE ae.event_type = 'qr.public.scan'
           AND m.user_id = $1
           AND ($2::timestamptz IS NULL OR ae.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR ae.created_at <= $3::timestamptz)`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT
           TO_CHAR(DATE(ae.created_at), 'YYYY-MM-DD') AS label,
           COUNT(*)::int AS total_scans,
           COUNT(DISTINCT ae.metadata->>'visitorKey')::int AS unique_scans
         FROM analytics_events ae
         INNER JOIN managed_qr_links m
           ON m.id::text = ae.metadata->>'linkId'
           OR m.content = ae.metadata->>'targetUrl'
         WHERE ae.event_type = 'qr.public.scan'
           AND m.user_id = $1
           AND ($2::timestamptz IS NULL OR ae.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR ae.created_at <= $3::timestamptz)
         GROUP BY DATE(ae.created_at)
         ORDER BY DATE(ae.created_at) DESC
         LIMIT 14`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT
           m.id,
           COALESCE(m.title, m.qr_type, 'Managed QR') AS title,
           m.qr_type,
           COUNT(ae.id)::int AS total_scans,
           COUNT(DISTINCT ae.metadata->>'visitorKey')::int AS unique_scans,
           MAX(ae.created_at) AS last_scan_at
         FROM managed_qr_links m
         LEFT JOIN analytics_events ae
           ON ae.event_type = 'qr.public.scan'
          AND (
            ae.metadata->>'linkId' = m.id::text
            OR ae.metadata->>'targetUrl' = m.content
          )
          AND ($2::timestamptz IS NULL OR ae.created_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR ae.created_at <= $3::timestamptz)
         WHERE m.user_id = $1
         GROUP BY m.id, m.title, m.qr_type
         HAVING COUNT(ae.id) > 0
         ORDER BY total_scans DESC, unique_scans DESC, title ASC
         LIMIT 6`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT
           m.id,
           COALESCE(m.title, m.qr_type, 'Managed QR') AS title,
           m.qr_type,
           m.expires_at,
           CASE
             WHEN m.expires_at IS NOT NULL AND m.expires_at < NOW() THEN 'expired'
             WHEN m.expires_at IS NOT NULL AND m.expires_at <= NOW() + INTERVAL '14 days' THEN 'expiring-soon'
             ELSE 'active'
           END AS state
         FROM managed_qr_links m
         WHERE m.user_id = $1
           AND m.expires_at IS NOT NULL
         ORDER BY m.expires_at ASC
         LIMIT 12`,
        [req.user.id],
      ),
    ]);

    const scanSummaryRow = scanSummaryRows.rows[0] || {};
    const totalScans = scanSummaryRow.total_scans || 0;
    const uniqueScans = scanSummaryRow.unique_scans || 0;
    const repeatedScans = Math.max(totalScans - uniqueScans, 0);
    const expiringSoon = expiringRows.rows.filter((row) => row.state === "expiring-soon");
    const expired = expiringRows.rows.filter((row) => row.state === "expired");

    res.json({
      report: {
        jobsByQrType: qrTypeRows.rows,
        qrTypePerformance: qrTypePerformanceRows.rows.map((row) => ({
          label: row.label,
          jobsCount: row.jobs_count,
          requestedCount: row.requested_count,
          successCount: row.success_count,
          failureCount: row.failure_count,
          completedJobs: row.completed_jobs,
          failedJobs: row.failed_jobs,
        })),
        jobsByStatus: statusRows.rows,
        dailyJobs: [...trendRows.rows].reverse(),
        scanSummary: {
          totalScans,
          uniqueScans,
          repeatedScans,
          lastScanAt: scanSummaryRow.last_scan_at || null,
        },
        scanTrend: [...scanTrendRows.rows]
          .reverse()
          .map((row) => ({
            label: row.label,
            totalScans: row.total_scans,
            uniqueScans: row.unique_scans,
          })),
        topPerformingLinks: topLinksRows.rows.map((row) => ({
          id: row.id,
          title: row.title,
          qrType: row.qr_type,
          totalScans: row.total_scans,
          uniqueScans: row.unique_scans,
          repeatedScans: Math.max(row.total_scans - row.unique_scans, 0),
          lastScanAt: row.last_scan_at,
        })),
        expiringSoon: expiringSoon.map((row) => ({
          id: row.id,
          title: row.title,
          qrType: row.qr_type,
          expiresAt: row.expires_at,
        })),
        expired: expired.map((row) => ({
          id: row.id,
          title: row.title,
          qrType: row.qr_type,
          expiresAt: row.expires_at,
        })),
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
           COALESCE(rs.title, m.title, 'Untitled rating form') AS title,
           style,
           scale,
           rating,
           COUNT(*)::int AS count
         FROM rating_submissions rs
         INNER JOIN managed_qr_links m
           ON m.content = rs.source_url
           OR regexp_replace(lower(split_part(m.content, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(rs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         WHERE m.user_id = $1
           AND ($2::timestamptz IS NULL OR rs.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR rs.created_at <= $3::timestamptz)
         GROUP BY COALESCE(rs.title, m.title, 'Untitled rating form'), style, scale, rating
         ORDER BY title ASC, rating ASC`,
        [req.user.id, startDate, endDate],
      ),
      query(
        `SELECT COALESCE(fs.title, m.title) AS title, fs.questions, fs.answers, fs.created_at
         FROM feedback_submissions fs
         INNER JOIN managed_qr_links m
           ON m.content = fs.source_url
           OR regexp_replace(lower(split_part(m.content, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(fs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         WHERE m.user_id = $1
           AND ($2::timestamptz IS NULL OR fs.created_at >= $2::timestamptz)
           AND ($3::timestamptz IS NULL OR fs.created_at <= $3::timestamptz)
         ORDER BY fs.created_at DESC`,
        [req.user.id, startDate, endDate],
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

bulkRouter.get("/jobs/:id/analysis", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const jobResult = await query(
      `SELECT
         j.id,
         j.job_type,
         j.bulk_qr_type,
         j.qr_content,
         j.total_count,
       j.success_count,
       j.failure_count,
       j.status,
       j.tracking_mode,
       j.managed_link_id,
         m.qr_type AS managed_qr_type,
         m.title AS managed_title,
         m.expires_at AS managed_expires_at
       FROM qr_jobs j
       LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
       WHERE j.id = $1 AND j.user_id = $2
       LIMIT 1`,
      [jobId, req.user.id],
    );

    const job = jobResult.rows[0];
    if (!job) {
      throw createHttpError(404, "NOT_FOUND", "Job not found");
    }

    const typeLabel = getQrTypeLabel(job);

    const typePerformanceResult = await query(
      `SELECT
         COUNT(*)::int AS jobs_count,
         COALESCE(SUM(total_count), 0)::int AS requested_count,
         COALESCE(SUM(success_count), 0)::int AS success_count,
         COALESCE(SUM(failure_count), 0)::int AS failure_count,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_jobs,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_jobs
       FROM qr_jobs
       WHERE user_id = $1
         AND archived_at IS NULL
         AND (
           CASE
             WHEN job_type = 'single' THEN COALESCE(
               (SELECT qr_type FROM managed_qr_links WHERE id = managed_link_id),
               'Text'
             )
             ELSE bulk_qr_type
           END
         ) = $2`,
      [req.user.id, typeLabel],
    );

    const typePerformanceRow = typePerformanceResult.rows[0];

    let rating = null;
    let feedback = null;
    const linkStatsResult = await query(
      `WITH links AS (
         SELECT id, content AS url, qr_type, title, expires_at
         FROM managed_qr_links
         WHERE id = $1
         UNION
         SELECT m.id, m.content AS url, m.qr_type, m.title, m.expires_at
         FROM qr_job_items i
         INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
         WHERE i.job_id = $2
       )
       SELECT
         COUNT(ae.id)::int AS total_scans,
         COUNT(DISTINCT ae.metadata->>'visitorKey')::int AS unique_scans,
         MAX(ae.created_at) AS last_scan_at,
         COUNT(DISTINCT links.id)::int AS managed_links,
         COUNT(*) FILTER (WHERE links.expires_at IS NOT NULL AND links.expires_at < NOW())::int AS expired_links,
         COUNT(*) FILTER (
           WHERE links.expires_at IS NOT NULL
             AND links.expires_at >= NOW()
             AND links.expires_at <= NOW() + INTERVAL '14 days'
         )::int AS expiring_soon_links,
         MIN(links.expires_at) FILTER (WHERE links.expires_at >= NOW()) AS next_expiry_at,
         MAX(links.expires_at) AS last_expiry_at,
         MIN(links.url) AS sample_url,
         MIN(links.qr_type) AS target_kind
       FROM links
       LEFT JOIN analytics_events ae
         ON ae.event_type = 'qr.public.scan'
        AND (
          ae.metadata->>'linkId' = links.id::text
          OR ae.metadata->>'targetUrl' = links.url
          OR regexp_replace(lower(split_part(COALESCE(ae.metadata->>'targetUrl', ''), '?exp=', 1)), '^https?://(www\\.)?', '') =
             regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '')
        )`,
      [job.managed_link_id, job.id],
    );

    const scanTrendResult = await query(
      `WITH links AS (
         SELECT id, content AS url
         FROM managed_qr_links
         WHERE id = $1
         UNION
         SELECT m.id, m.content AS url
         FROM qr_job_items i
         INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
         WHERE i.job_id = $2
       )
       SELECT
         TO_CHAR(DATE(ae.created_at), 'YYYY-MM-DD') AS label,
         COUNT(*)::int AS count
       FROM analytics_events ae
       INNER JOIN links
         ON ae.metadata->>'linkId' = links.id::text
         OR ae.metadata->>'targetUrl' = links.url
         OR regexp_replace(lower(split_part(COALESCE(ae.metadata->>'targetUrl', ''), '?exp=', 1)), '^https?://(www\\.)?', '') =
            regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '')
       WHERE ae.event_type = 'qr.public.scan'
       GROUP BY DATE(ae.created_at)
       ORDER BY DATE(ae.created_at) ASC
       LIMIT 10`,
      [job.managed_link_id, job.id],
    );

    const linkStats = linkStatsResult.rows[0] || {};
    const totalScans = linkStats.total_scans || 0;
    const uniqueScans = linkStats.unique_scans || 0;
    const repeatedScans = Math.max(totalScans - uniqueScans, 0);
    const targetKind = String(linkStats.target_kind || job.managed_qr_type || typeLabel || "").trim();

    let totalSubmissions = 0;
    let lastSubmissionAt = null;

    if (targetKind === "Rating") {
      const ratingRows = await query(
        `WITH links AS (
           SELECT content AS url, title
           FROM managed_qr_links
           WHERE id = $1
           UNION
           SELECT m.content AS url, m.title
           FROM qr_job_items i
           INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
           WHERE i.job_id = $2
         )
         SELECT
           COALESCE(MAX(NULLIF(rs.title, '')), MAX(links.title), 'Untitled rating form') AS title,
           MAX(rs.style) AS style,
           MAX(rs.scale)::int AS scale,
           rs.rating,
           COUNT(*)::int AS count,
           MAX(rs.created_at) AS last_submission_at,
           SUM(COUNT(*)) OVER ()::int AS total_submissions
         FROM rating_submissions rs
         INNER JOIN links
           ON links.url = rs.source_url
           OR regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(rs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         GROUP BY rs.rating
         ORDER BY rs.rating ASC`,
        [job.managed_link_id, job.id],
      );

      if (ratingRows.rows.length) {
        totalSubmissions = ratingRows.rows[0].total_submissions || 0;
        lastSubmissionAt = ratingRows.rows.reduce((latest, row) => {
          if (!latest) return row.last_submission_at;
          return new Date(row.last_submission_at) > new Date(latest) ? row.last_submission_at : latest;
        }, null);
        rating = {
          title: ratingRows.rows[0].title,
          style: ratingRows.rows[0].style || "stars",
          scale: ratingRows.rows[0].scale || 5,
          buckets: ratingRows.rows.map((row) => ({
            label: String(row.rating),
            count: row.count,
          })),
        };
      }
    }

    if (targetKind === "Feedback") {
      const feedbackRows = await query(
        `WITH links AS (
           SELECT content AS url, title
           FROM managed_qr_links
           WHERE id = $1
           UNION
           SELECT m.content AS url, m.title
           FROM qr_job_items i
           INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
           WHERE i.job_id = $2
         )
         SELECT fs.title, fs.questions, fs.answers, fs.created_at
         FROM feedback_submissions fs
         INNER JOIN links
           ON links.url = fs.source_url
           OR regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(fs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         ORDER BY fs.created_at DESC`,
        [job.managed_link_id, job.id],
      );

      totalSubmissions = feedbackRows.rows.length;
      lastSubmissionAt = feedbackRows.rows[0]?.created_at || null;

      const groupedQuestions = {};
      feedbackRows.rows.forEach((row) => {
        const questions = Array.isArray(row.questions) ? row.questions : [];
        const answers = Array.isArray(row.answers) ? row.answers : [];
        questions.forEach((question, index) => {
          const label = String(question || "").trim();
          if (!label) return;
          if (!groupedQuestions[label]) {
            groupedQuestions[label] = {
              label,
              responses: 0,
              latestAnswers: [],
            };
          }
          groupedQuestions[label].responses += 1;
          const answer = String(answers[index] || "").trim();
          if (answer && groupedQuestions[label].latestAnswers.length < 5) {
            groupedQuestions[label].latestAnswers.push(answer);
          }
        });
      });

      feedback = {
        title: feedbackRows.rows[0]?.title || job.managed_title || "Untitled feedback form",
        questions: Object.values(groupedQuestions),
      };
    }

    const trackingMode = String(job.tracking_mode || "tracked").toLowerCase() === "tracked" ? "tracked" : "direct";
    const trackingEnabled = trackingMode === "tracked";
    const engagement = {
      targetUrl: linkStats.sample_url || "",
      expiryDate: linkStats.last_expiry_at || job.managed_expires_at || "",
      nextExpiryAt: linkStats.next_expiry_at || null,
      isExpired: (linkStats.expired_links || 0) > 0 && (linkStats.expiring_soon_links || 0) === 0,
      totalScans,
      uniqueScans,
      repeatedScans,
      lastScanAt: linkStats.last_scan_at || null,
      totalSubmissions,
      lastSubmissionAt,
      targetKind: targetKind || null,
      managedLinks: linkStats.managed_links || 0,
      expiredLinks: linkStats.expired_links || 0,
      expiringSoonLinks: linkStats.expiring_soon_links || 0,
      trackingEnabled,
      trackingMode,
    };

    let insight = "This QR job is generating successfully.";
    if (job.failure_count > 0) {
      insight = "This QR job had generation failures. Review the failed rows or settings before reusing it.";
    } else if (engagement.isExpired) {
      insight = "This QR is expired. New scans should now see the expiry warning instead of the original experience.";
    } else if (engagement.totalScans > 0 && engagement.totalSubmissions > 0) {
      insight = `This QR is active and converting: ${engagement.totalSubmissions} submission(s) from ${engagement.totalScans} scan(s).`;
    } else if (engagement.totalScans > 0) {
      insight = `This QR is being scanned (${engagement.totalScans} total scan${engagement.totalScans === 1 ? "" : "s"}), but engagement is still low.`;
    }

    res.json({
      analysis: {
        job: {
          id: job.id,
          jobType: job.job_type,
          qrType: typeLabel,
          status: job.status,
          totalCount: job.total_count,
          successCount: job.success_count,
          failureCount: job.failure_count,
        },
        typePerformance: typePerformanceRow
          ? {
              label: typeLabel,
              jobsCount: typePerformanceRow.jobs_count,
              requestedCount: typePerformanceRow.requested_count,
              successCount: typePerformanceRow.success_count,
              failureCount: typePerformanceRow.failure_count,
              completedJobs: typePerformanceRow.completed_jobs,
              failedJobs: typePerformanceRow.failed_jobs,
            }
          : null,
        engagement,
        scanTrend: scanTrendResult.rows.map((row) => ({
          label: row.label,
          count: row.count,
        })),
        insight,
        rating,
        feedback,
      },
    });
  } catch (error) {
    next(error);
  }
});

bulkRouter.get("/jobs/:id/analysis-report.csv", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      throw createHttpError(400, "VALIDATION_ERROR", "job id is required");
    }

    const jobResult = await query(
      `SELECT
         j.id,
         j.user_id,
         j.job_type,
         j.status,
         j.total_count,
         j.success_count,
         j.failure_count,
         j.source_file_name,
         j.bulk_qr_type,
         j.managed_link_id,
         j.tracking_mode,
         m.qr_type AS managed_qr_type,
         m.title AS managed_title
       FROM qr_jobs j
       LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
       WHERE j.id = $1
         AND j.user_id = $2
       LIMIT 1`,
      [jobId, req.user.id],
    );

    const job = jobResult.rows[0];
    if (!job) {
      throw createHttpError(404, "NOT_FOUND", "QR job not found");
    }

    const typeLabel = getQrTypeLabel(job);
    const trackingMode = String(job.tracking_mode || "tracked").toLowerCase() === "tracked" ? "tracked" : "direct";

    const scanRowsResult = await query(
      `WITH links AS (
         SELECT id, content AS url, qr_type, title
         FROM managed_qr_links
         WHERE id = $1
         UNION
         SELECT m.id, m.content AS url, m.qr_type, m.title
         FROM qr_job_items i
         INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
         WHERE i.job_id = $2
       )
       SELECT
         ae.created_at,
         COALESCE(ae.metadata->>'targetUrl', links.url, '') AS scan_output,
         COALESCE(ae.metadata->>'targetKind', links.qr_type, '') AS target_kind,
         COALESCE(ae.metadata->>'title', links.title, '') AS target_title,
         COALESCE(ae.metadata->>'visitorKey', '') AS visitor_key,
         COALESCE(ae.metadata->>'linkId', links.id::text, '') AS link_id,
         COALESCE(ae.metadata->>'userAgent', '') AS user_agent,
         COALESCE(ae.metadata->>'ipAddress', '') AS ip_address,
         COALESCE(ae.metadata->>'location', '') AS location,
         COALESCE(ae.metadata->>'locationSource', '') AS location_source,
         COALESCE(ae.metadata->>'city', '') AS city,
         COALESCE(ae.metadata->>'region', '') AS region,
         COALESCE(ae.metadata->>'country', '') AS country,
         COALESCE(ae.metadata->>'latitude', '') AS latitude,
         COALESCE(ae.metadata->>'longitude', '') AS longitude
       FROM analytics_events ae
       INNER JOIN links
         ON ae.metadata->>'linkId' = links.id::text
         OR ae.metadata->>'targetUrl' = links.url
         OR regexp_replace(lower(split_part(COALESCE(ae.metadata->>'targetUrl', ''), '?exp=', 1)), '^https?://(www\\.)?', '') =
            regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '')
       WHERE ae.event_type = 'qr.public.scan'
       ORDER BY ae.created_at DESC`,
      [job.managed_link_id, job.id],
    );

    const columns = [
      { key: "qrType", label: "QR Type" },
      { key: "scanDate", label: "Scan Date" },
      { key: "responseData", label: "Response" },
      { key: "targetKind", label: "Scan Output Type" },
      { key: "targetTitle", label: "Title" },
      { key: "location", label: "Location" },
      { key: "locationSource", label: "Location Source" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "country", label: "Country" },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" },
      { key: "ipAddress", label: "IP Address" },
    ];

    let rows = scanRowsResult.rows.map((row) => {
      const scannedAt = row.created_at ? new Date(row.created_at) : null;
      const validDate = scannedAt && !Number.isNaN(scannedAt.getTime()) ? scannedAt : null;
      return {
        qrType: typeLabel,
        scanDate: validDate ? validDate.toISOString().slice(0, 10) : "",
        responseData: row.target_title || "",
        targetKind: row.target_kind || "",
        targetTitle: row.target_title || "",
        location: row.location || "",
        locationSource: row.location_source || "",
        city: row.city || "",
        region: row.region || "",
        country: row.country || "",
        latitude: row.latitude || "",
        longitude: row.longitude || "",
        ipAddress: row.ip_address || "",
      };
    });

    if (typeLabel === "Rating") {
      const ratingExportResult = await query(
        `WITH links AS (
           SELECT id, content AS url
           FROM managed_qr_links
           WHERE id = $1
           UNION
           SELECT m.id, m.content AS url
           FROM qr_job_items i
           INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
           WHERE i.job_id = $2
         )
         SELECT
           rs.created_at,
           rs.rating,
           rs.title,
           rs.ip_address,
           matched.location,
           matched.location_source,
           matched.city,
           matched.region,
           matched.country,
           matched.latitude,
           matched.longitude
         FROM rating_submissions rs
         INNER JOIN links
           ON links.url = rs.source_url
           OR regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(rs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         LEFT JOIN LATERAL (
           SELECT
             COALESCE(ae.metadata->>'location', '') AS location,
             COALESCE(ae.metadata->>'locationSource', '') AS location_source,
             COALESCE(ae.metadata->>'city', '') AS city,
             COALESCE(ae.metadata->>'region', '') AS region,
             COALESCE(ae.metadata->>'country', '') AS country,
             COALESCE(ae.metadata->>'latitude', '') AS latitude,
             COALESCE(ae.metadata->>'longitude', '') AS longitude
           FROM analytics_events ae
           WHERE ae.event_type = 'qr.public.scan'
             AND COALESCE(ae.metadata->>'ipAddress', '') = COALESCE(rs.ip_address, '')
             AND (
               ae.metadata->>'linkId' = links.id::text
               OR ae.metadata->>'targetUrl' = links.url
               OR regexp_replace(lower(split_part(COALESCE(ae.metadata->>'targetUrl', ''), '?exp=', 1)), '^https?://(www\\.)?', '') =
                  regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '')
             )
           ORDER BY ABS(EXTRACT(EPOCH FROM (ae.created_at - rs.created_at))) ASC
           LIMIT 1
         ) matched ON true
         ORDER BY rs.created_at DESC`,
        [job.managed_link_id, job.id],
      );

      rows = ratingExportResult.rows.map((row) => {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        const validDate = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;
        return {
          qrType: typeLabel,
          scanDate: validDate ? validDate.toISOString().slice(0, 10) : "",
          responseData: `Rating ${row.rating || ""}`.trim(),
          targetKind: "rating",
          targetTitle: row.title || job.managed_title || "",
          location: row.location || "",
          locationSource: row.location_source || "",
          city: row.city || "",
          region: row.region || "",
          country: row.country || "",
          latitude: row.latitude || "",
          longitude: row.longitude || "",
          ipAddress: row.ip_address || "",
        };
      });
    } else if (typeLabel === "Feedback") {
      const feedbackExportResult = await query(
        `WITH links AS (
           SELECT id, content AS url
           FROM managed_qr_links
           WHERE id = $1
           UNION
           SELECT m.id, m.content AS url
           FROM qr_job_items i
           INNER JOIN managed_qr_links m ON m.id = i.managed_link_id
           WHERE i.job_id = $2
         )
         SELECT
           fs.created_at,
           fs.title,
           fs.questions,
           fs.answers,
           fs.ip_address,
           matched.location,
           matched.location_source,
           matched.city,
           matched.region,
           matched.country,
           matched.latitude,
           matched.longitude
         FROM feedback_submissions fs
         INNER JOIN links
           ON links.url = fs.source_url
           OR regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '') =
              regexp_replace(lower(split_part(fs.source_url, '?exp=', 1)), '^https?://(www\\.)?', '')
         LEFT JOIN LATERAL (
           SELECT
             COALESCE(ae.metadata->>'location', '') AS location,
             COALESCE(ae.metadata->>'locationSource', '') AS location_source,
             COALESCE(ae.metadata->>'city', '') AS city,
             COALESCE(ae.metadata->>'region', '') AS region,
             COALESCE(ae.metadata->>'country', '') AS country,
             COALESCE(ae.metadata->>'latitude', '') AS latitude,
             COALESCE(ae.metadata->>'longitude', '') AS longitude
           FROM analytics_events ae
           WHERE ae.event_type = 'qr.public.scan'
             AND COALESCE(ae.metadata->>'ipAddress', '') = COALESCE(fs.ip_address, '')
             AND (
               ae.metadata->>'linkId' = links.id::text
               OR ae.metadata->>'targetUrl' = links.url
               OR regexp_replace(lower(split_part(COALESCE(ae.metadata->>'targetUrl', ''), '?exp=', 1)), '^https?://(www\\.)?', '') =
                  regexp_replace(lower(split_part(links.url, '?exp=', 1)), '^https?://(www\\.)?', '')
             )
           ORDER BY ABS(EXTRACT(EPOCH FROM (ae.created_at - fs.created_at))) ASC
           LIMIT 1
         ) matched ON true
         ORDER BY fs.created_at DESC`,
        [job.managed_link_id, job.id],
      );

      rows = feedbackExportResult.rows.map((row) => {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        const validDate = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;
        const questions = Array.isArray(row.questions) ? row.questions : [];
        const answers = Array.isArray(row.answers) ? row.answers : [];
        const responseData = questions
          .map((question, index) => {
            const label = String(question || "").trim();
            const answer = String(answers[index] || "").trim();
            if (!label && !answer) return "";
            return `${label || `Q${index + 1}`}: ${answer || "-"}`;
          })
          .filter(Boolean)
          .join(" | ");

        return {
          qrType: typeLabel,
          scanDate: validDate ? validDate.toISOString().slice(0, 10) : "",
          responseData,
          targetKind: "feedback",
          targetTitle: row.title || job.managed_title || "",
          location: row.location || "",
          locationSource: row.location_source || "",
          city: row.city || "",
          region: row.region || "",
          country: row.country || "",
          latitude: row.latitude || "",
          longitude: row.longitude || "",
          ipAddress: row.ip_address || "",
        };
      });
    }

    const csv = buildCsv(columns, rows);
    const safeType = String(typeLabel || "qr").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const fileName = `${safeType || "qr"}-analysis-report-${job.id}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
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
         j.error_message, j.created_at, j.started_at, j.completed_at, j.archived_at,
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
        archivedAt: row.archived_at,
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
      `SELECT row_index, content, managed_link_id, status, output_file_name, output_path, error_message, created_at, updated_at
       FROM qr_job_items
       WHERE job_id = $1
       ORDER BY row_index ASC`,
      [jobId],
    );

    res.json({
      items: result.rows.map((row) => ({
        rowIndex: row.row_index,
        content: row.content,
        managedLinkId: row.managed_link_id,
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
