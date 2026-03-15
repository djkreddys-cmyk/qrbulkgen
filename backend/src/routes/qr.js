const express = require("express");

const { query } = require("../db/postgres");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");
const { createManagedQrLink } = require("../services/managed-links");
const { createSingleQrDataUrl, normalizeSingleQrPayload } = require("../services/qr-single");

const qrRouter = express.Router();

function buildSingleTargetPayload(body, qrType) {
  return {
    qrType,
    fields: body.fields || {},
    socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : [],
    galleryMode: body.galleryMode || "url",
    pdfMode: body.pdfMode || "url",
    uploadIds: {
      galleryLinkId: body.galleryLinkId || "",
      pdfLinkId: body.pdfLinkId || "",
    },
    expiresAt: body.expiresAt || "",
  };
}

async function upsertSingleJob({
  userId,
  jobId = null,
  body,
}) {
  const payload = normalizeSingleQrPayload(body);
  const qrType = String(body.qrType || "Text").trim() || "Text";
  const managedTitle = body.managedTitle || qrType;
  const expiresAt = body.expiresAt || null;
  const targetPayload = buildSingleTargetPayload(body, qrType);

  if (!jobId) {
    const managedLink = await createManagedQrLink({
      userId,
      qrType,
      title: managedTitle,
      content: payload.content,
      targetPayload,
      expiresAt,
    });
    const dataUrl = await createSingleQrDataUrl({
      ...payload,
      content: managedLink.url,
    });
    const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;
    const payloadSizeBytes = Buffer.byteLength(dataUrl, "utf8");

    const jobResult = await query(
      `INSERT INTO qr_jobs (
        user_id, job_type, status, total_count, success_count, failure_count,
        qr_content, managed_link_id, qr_size, foreground_color, background_color, qr_margin, output_format,
        error_correction_level, filename_prefix, started_at, completed_at
      ) VALUES (
        $1, 'single', 'completed', 1, 1, 0,
        $2, $3, $4, $5, $6, $7, $8,
        $9, $10, NOW(), NOW()
      )
      RETURNING id, status, created_at, updated_at`,
      [
        userId,
        payload.content,
        managedLink.id,
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

    await query(`UPDATE managed_qr_links SET job_id = $2, updated_at = NOW() WHERE id = $1`, [
      managedLink.id,
      job.id,
    ]);

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

    return {
      created: true,
      job,
      managedLink,
      artifact: {
        fileName,
        mimeType: payload.format === "png" ? "image/png" : "image/svg+xml",
        dataUrl,
      },
      qrType,
      payload,
    };
  }

  const existingResult = await query(
    `SELECT id, managed_link_id
     FROM qr_jobs
     WHERE id = $1
       AND user_id = $2
       AND job_type = 'single'
     LIMIT 1`,
    [jobId, userId],
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    const error = new Error("Single QR job not found");
    error.status = 404;
    throw error;
  }

  let managedLink;
  if (existing.managed_link_id) {
    await query(
      `UPDATE managed_qr_links
       SET qr_type = $2,
           title = $3,
           content = $4,
           target_payload = $5::jsonb,
           expires_at = $6::timestamptz,
           updated_at = NOW()
       WHERE id = $1`,
      [
        existing.managed_link_id,
        qrType,
        String(managedTitle || "").trim().slice(0, 255) || null,
        payload.content,
        JSON.stringify(targetPayload),
        expiresAt || null,
      ],
    );
    const linkResult = await query(
      `SELECT id, qr_type, title, content, expires_at, created_at
       FROM managed_qr_links
       WHERE id = $1
       LIMIT 1`,
      [existing.managed_link_id],
    );
    const row = linkResult.rows[0];
    managedLink = {
      id: row.id,
      qrType: row.qr_type,
      title: row.title,
      content: row.content,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      url: require("../services/managed-links").buildManagedQrUrl(row.id),
    };
  } else {
    managedLink = await createManagedQrLink({
      userId,
      jobId,
      qrType,
      title: managedTitle,
      content: payload.content,
      targetPayload,
      expiresAt,
    });
  }

  const dataUrl = await createSingleQrDataUrl({
    ...payload,
    content: managedLink.url,
  });
  const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;
  const payloadSizeBytes = Buffer.byteLength(dataUrl, "utf8");

  await query(
    `UPDATE qr_jobs
     SET status = 'completed',
         total_count = 1,
         success_count = 1,
         failure_count = 0,
         error_message = NULL,
         qr_content = $2,
         managed_link_id = $3,
         qr_size = $4,
         foreground_color = $5,
         background_color = $6,
         qr_margin = $7,
         output_format = $8,
         error_correction_level = $9,
         filename_prefix = $10,
         started_at = NOW(),
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [
      jobId,
      payload.content,
      managedLink.id,
      payload.size,
      payload.foregroundColor,
      payload.backgroundColor,
      payload.margin,
      payload.format,
      payload.errorCorrectionLevel,
      payload.filenamePrefix,
    ],
  );

  await query(`DELETE FROM job_artifacts WHERE job_id = $1 AND artifact_type = 'single-image'`, [jobId]);
  await query(
    `INSERT INTO job_artifacts (job_id, artifact_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1, 'single-image', $2, $3, $4, $5)`,
    [
      jobId,
      fileName,
      dataUrl,
      payload.format === "png" ? "image/png" : "image/svg+xml",
      payloadSizeBytes,
    ],
  );

  const updatedJobResult = await query(
    `SELECT id, status, created_at, updated_at
     FROM qr_jobs
     WHERE id = $1
     LIMIT 1`,
    [jobId],
  );

  return {
    created: false,
    job: updatedJobResult.rows[0],
    managedLink,
    artifact: {
      fileName,
      mimeType: payload.format === "png" ? "image/png" : "image/svg+xml",
      dataUrl,
    },
    qrType,
    payload,
  };
}

qrRouter.post("/single", requireAuth, async (req, res, next) => {
  try {
    const result = await upsertSingleJob({
      userId: req.user.id,
      body: req.body,
    });

    await trackEvent({
      userId: req.user.id,
      jobId: result.job.id,
      eventType: "qr.single.generated",
      eventValue: 1,
      metadata: {
        format: result.payload.format,
        qrType: result.qrType,
        managedLinkId: result.managedLink.id,
      },
    });

    res.json({
      job: {
        id: result.job.id,
        type: "single",
        qrType: result.qrType,
        status: result.job.status,
        createdAt: result.job.created_at,
        updatedAt: result.job.updated_at,
      },
      artifact: result.artifact,
      managedLink: {
        id: result.managedLink.id,
        url: result.managedLink.url,
        expiresAt: result.managedLink.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

qrRouter.put("/jobs/:id/single", requireAuth, async (req, res, next) => {
  try {
    const jobId = String(req.params.id || "").trim();
    if (!jobId) {
      const error = new Error("job id is required");
      error.status = 400;
      throw error;
    }

    const result = await upsertSingleJob({
      userId: req.user.id,
      jobId,
      body: req.body,
    });

    await trackEvent({
      userId: req.user.id,
      jobId: result.job.id,
      eventType: "qr.single.updated",
      eventValue: 1,
      metadata: {
        format: result.payload.format,
        qrType: result.qrType,
        managedLinkId: result.managedLink.id,
      },
    });

    res.json({
      job: {
        id: result.job.id,
        type: "single",
        qrType: result.qrType,
        status: result.job.status,
        createdAt: result.job.created_at,
        updatedAt: result.job.updated_at,
      },
      artifact: result.artifact,
      managedLink: {
        id: result.managedLink.id,
        url: result.managedLink.url,
        expiresAt: result.managedLink.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  qrRouter,
};
