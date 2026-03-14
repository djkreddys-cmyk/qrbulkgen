const express = require("express");

const { query } = require("../db/postgres");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");
const { createSingleQrDataUrl, normalizeSingleQrPayload } = require("../services/qr-single");

const qrRouter = express.Router();

qrRouter.post("/single", requireAuth, async (req, res, next) => {
  try {
    const payload = normalizeSingleQrPayload(req.body);
    const dataUrl = await createSingleQrDataUrl(payload);
    const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;
    const payloadSizeBytes = Buffer.byteLength(dataUrl, "utf8");

    const jobResult = await query(
      `INSERT INTO qr_jobs (
        user_id, job_type, status, total_count, success_count, failure_count,
        qr_content, qr_size, foreground_color, background_color, qr_margin, output_format,
        error_correction_level, filename_prefix, started_at, completed_at
      ) VALUES (
        $1, 'single', 'completed', 1, 1, 0,
        $2, $3, $4, $5, $6, $7,
        $8, $9, NOW(), NOW()
      )
      RETURNING id, status, created_at`,
      [
        req.user.id,
        payload.content,
        payload.size,
        payload.foregroundColor,
        payload.backgroundColor,
        payload.margin,
        payload.format,
        payload.errorCorrectionLevel,
        payload.filenamePrefix,
      ],
    );

    const job = jobResult.rows[0];

    await query(
      `INSERT INTO job_artifacts (job_id, artifact_type, file_name, file_path, mime_type, file_size_bytes)
       VALUES ($1, 'single-image', $2, $3, $4, $5)`,
      [
        job.id,
        fileName,
        dataUrl,
        payload.format === "png" ? "image/png" : "image/svg+xml",
        payloadSizeBytes,
      ],
    );

    await trackEvent({
      userId: req.user.id,
      jobId: job.id,
      eventType: "qr.single.generated",
      eventValue: 1,
      metadata: {
        format: payload.format,
      },
    });

    res.json({
      job: {
        id: job.id,
        type: "single",
        status: job.status,
        createdAt: job.created_at,
      },
      artifact: {
        fileName,
        mimeType: payload.format === "png" ? "image/png" : "image/svg+xml",
        dataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  qrRouter,
};
