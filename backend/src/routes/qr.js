const express = require("express");

const { query } = require("../db/postgres");
const { loadEnv } = require("../config/env");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");
const { createManagedQrLink } = require("../services/managed-links");
const { createSingleQrDataUrl, normalizeSingleQrPayload } = require("../services/qr-single");

const qrRouter = express.Router();
const TRACKED_ONLY_QR_TYPES = new Set(["Rating", "Feedback", "PDF", "Image Gallery"]);
const HYBRID_TRACKING_QR_TYPES = new Set([
  "URL",
  "WhatsApp",
  "Phone",
  "Email",
  "SMS",
  "Youtube",
  "App Store",
  "Location",
  "Text",
]);

function normalizeTrackingMode(qrType, requestedMode) {
  const type = String(qrType || "").trim() || "Text";
  const mode = String(requestedMode || "").trim().toLowerCase();
  if (TRACKED_ONLY_QR_TYPES.has(type)) return "tracked";
  if (!HYBRID_TRACKING_QR_TYPES.has(type)) return "tracked";
  return mode === "tracked" ? "tracked" : "direct";
}

function parseExpiryDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.includes("T")) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    const day = Number(dashMatch[1]);
    const month = Number(dashMatch[2]);
    const year = Number(dashMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const parsed = new Date(`${raw}T23:59:59.999Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function toExpiryIso(value) {
  const parsed = parseExpiryDate(value);
  return parsed ? parsed.toISOString() : "";
}

function normalizeHostedUploadId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") return "";
  return raw;
}

function buildSingleTargetPayload(body, qrType) {
  return {
    qrType,
    trackingMode: normalizeTrackingMode(qrType, body.trackingMode),
    fields: body.fields || {},
    socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : [],
    galleryMode: body.galleryMode || "url",
    pdfMode: body.pdfMode || "url",
    uploadIds: {
      galleryLinkId: normalizeHostedUploadId(body.galleryLinkId),
      pdfLinkId: normalizeHostedUploadId(body.pdfLinkId),
    },
    expiresAt: toExpiryIso(body.expiresAt) || "",
  };
}

function encodeFeedbackPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function appendManagedLinkIdToUrl(value, linkId) {
  const raw = String(value || "").trim();
  const managedId = String(linkId || "").trim();
  if (!raw || !managedId || !/^https?:\/\//i.test(raw)) return raw;

  try {
    const parsed = new URL(raw);
    const isTrackedPath = ["/rate", "/feedback"].includes(parsed.pathname) || /^\/(pdf|gallery)\//.test(parsed.pathname);
    if (!isTrackedPath) return raw;
    if (!parsed.searchParams.get("lid")) {
      parsed.searchParams.set("lid", managedId);
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function getTrackedEncodedContent(qrType, managedLink) {
  if (!managedLink) return "";
  if (TRACKED_ONLY_QR_TYPES.has(String(qrType || "").trim())) {
    return managedLink.content || managedLink.url || "";
  }
  return managedLink.url || managedLink.content || "";
}

async function upsertSingleJob({
  userId,
  jobId = null,
  body,
}) {
  const payload = normalizeSingleQrPayload(body);
  const qrType = String(body.qrType || "Text").trim() || "Text";
  const trackingMode = normalizeTrackingMode(qrType, body.trackingMode);
  const managedTitle = body.managedTitle || qrType;
  const expiresAt = toExpiryIso(body.expiresAt) || null;
  const targetPayload = buildSingleTargetPayload(body, qrType);

  if (!jobId) {
    let managedLink = null;
    let qrEncodedContent = payload.content;
    if (trackingMode === "tracked") {
      managedLink = await createManagedQrLink({
        userId,
        qrType,
        title: managedTitle,
        content: payload.content,
        targetPayload,
        expiresAt,
      });
      const trackedContent = appendManagedLinkIdToUrl(managedLink.content, managedLink.id);
      if (trackedContent !== managedLink.content) {
        await query(`UPDATE managed_qr_links AS m SET content = $2, updated_at = NOW() WHERE m.id = $1`, [
          managedLink.id,
          trackedContent,
        ]);
        managedLink.content = trackedContent;
      }
      qrEncodedContent = getTrackedEncodedContent(qrType, managedLink);
    }
    const dataUrl = await createSingleQrDataUrl({
      ...payload,
      content: qrEncodedContent,
    });
    const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;
    const payloadSizeBytes = Buffer.byteLength(dataUrl, "utf8");

    const jobResult = await query(
      `INSERT INTO qr_jobs (
        user_id, job_type, status, total_count, success_count, failure_count,
        qr_content, managed_link_id, qr_size, foreground_color, background_color, qr_margin, output_format,
        error_correction_level, filename_prefix, tracking_mode, started_at, completed_at
      ) VALUES (
        $1, 'single', 'completed', 1, 1, 0,
        $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, NOW(), NOW()
      )
      RETURNING id, status, created_at, updated_at`,
      [
        userId,
        qrEncodedContent,
        managedLink?.id || null,
        payload.size,
        payload.foregroundColor,
        payload.backgroundColor,
        payload.margin,
        payload.format,
        payload.errorCorrectionLevel,
        payload.filenamePrefix,
        trackingMode,
      ],
    );

    const job = jobResult.rows[0];

    if (managedLink?.id) {
      await query(`UPDATE managed_qr_links AS m SET job_id = $2, updated_at = NOW() WHERE m.id = $1`, [
        managedLink.id,
        job.id,
      ]);
    }

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
    `SELECT j.id, j.managed_link_id, m.qr_type AS managed_qr_type, m.title AS managed_title, m.content AS managed_content, m.target_payload
     FROM qr_jobs j
     LEFT JOIN managed_qr_links m ON m.id = j.managed_link_id
     WHERE j.id = $1
       AND j.user_id = $2
       AND j.job_type = 'single'
     LIMIT 1`,
    [jobId, userId],
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    const error = new Error("Single QR job not found");
    error.status = 404;
    throw error;
  }

  const lockedQrType = String(existing.managed_qr_type || qrType || "Text").trim() || "Text";
  const existingTargetPayload = existing.target_payload || { qrType: lockedQrType, fields: {} };
  let nextTargetPayload = existingTargetPayload;
  let nextContent = String(existing.managed_content || payload.content || "").trim();
  let nextManagedTitle = String(existing.managed_title || managedTitle || lockedQrType).trim() || lockedQrType;

  if (lockedQrType === "Feedback") {
    const existingQuestions = Array.isArray(existingTargetPayload?.fields?.feedbackQuestions)
      ? existingTargetPayload.fields.feedbackQuestions
      : [];
    const requestedQuestions = Array.isArray(body?.fields?.feedbackQuestions)
      ? body.fields.feedbackQuestions.map((question) => String(question || "").trim()).filter(Boolean)
      : [];
    const mergedQuestions = Array.from(new Set([...existingQuestions, ...requestedQuestions])).filter(Boolean);
    const feedbackTitle = String(existingTargetPayload?.fields?.feedbackTitle || existing.managed_title || "Share your feedback").trim() || "Share your feedback";
    nextTargetPayload = {
      ...existingTargetPayload,
      qrType: lockedQrType,
      expiresAt: toExpiryIso(body.expiresAt) || existingTargetPayload.expiresAt || "",
      fields: {
        ...existingTargetPayload.fields,
        feedbackTitle,
        feedbackQuestions: mergedQuestions.length ? mergedQuestions : existingQuestions,
      },
    };
    const frontendUrl = String(loadEnv().frontendUrl || "http://localhost:3000").replace(/\/$/, "");
    nextContent = `${frontendUrl}/feedback?f=${encodeURIComponent(
      encodeFeedbackPayload({
        title: feedbackTitle,
        questions: nextTargetPayload.fields.feedbackQuestions,
      }),
    )}`;
    nextManagedTitle = feedbackTitle;
  }

  if (existing.managed_link_id) {
    nextContent = appendManagedLinkIdToUrl(nextContent, existing.managed_link_id);
  }

  let managedLink = null;
  let qrEncodedContent = payload.content;
  if (trackingMode === "tracked" && existing.managed_link_id) {
    await query(
      `UPDATE managed_qr_links AS m
       SET qr_type = $2,
           title = $3,
           content = $4,
           target_payload = $5::jsonb,
           expires_at = $6::timestamptz,
           updated_at = NOW()
       WHERE m.id = $1`,
      [
        existing.managed_link_id,
        lockedQrType,
        String(nextManagedTitle || "").trim().slice(0, 255) || null,
        nextContent,
        JSON.stringify(nextTargetPayload),
        expiresAt || null,
      ],
    );
    const linkResult = await query(
      `SELECT m.id, m.qr_type, m.title, m.content, m.expires_at, m.created_at
       FROM managed_qr_links AS m
       WHERE m.id = $1
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
  } else if (trackingMode === "tracked") {
    managedLink = await createManagedQrLink({
      userId,
      jobId,
      qrType: lockedQrType,
      title: nextManagedTitle,
      content: nextContent,
      targetPayload: nextTargetPayload,
      expiresAt,
    });
  }
  if (managedLink?.id) {
    qrEncodedContent = getTrackedEncodedContent(lockedQrType, managedLink);
  }

  const dataUrl = await createSingleQrDataUrl({
    ...payload,
    content: qrEncodedContent,
  });
  const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;
  const payloadSizeBytes = Buffer.byteLength(dataUrl, "utf8");

  await query(
    `UPDATE qr_jobs AS j
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
         tracking_mode = $11,
         started_at = NOW(),
         completed_at = NOW(),
         updated_at = NOW()
    WHERE j.id = $1`,
    [
      jobId,
      qrEncodedContent,
      managedLink?.id || null,
      payload.size,
      payload.foregroundColor,
      payload.backgroundColor,
      payload.margin,
      payload.format,
      payload.errorCorrectionLevel,
      payload.filenamePrefix,
      trackingMode,
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
    `SELECT j.id, j.status, j.created_at, j.updated_at
     FROM qr_jobs AS j
     WHERE j.id = $1
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
    const trackingMode = normalizeTrackingMode(result.qrType, req.body?.trackingMode);

    await trackEvent({
      userId: req.user.id,
      jobId: result.job.id,
      eventType: "qr.single.generated",
      eventValue: 1,
      metadata: {
        format: result.payload.format,
        qrType: result.qrType,
        managedLinkId: result.managedLink?.id || null,
        trackingMode,
      },
    });

    res.json({
      job: {
        id: result.job.id,
        type: "single",
        qrType: result.qrType,
        trackingMode,
        status: result.job.status,
        createdAt: result.job.created_at,
        updatedAt: result.job.updated_at,
      },
      artifact: result.artifact,
      managedLink: {
        id: result.managedLink?.id || null,
        url: result.managedLink?.url || null,
        expiresAt: result.managedLink?.expiresAt || null,
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
    const trackingMode = normalizeTrackingMode(result.qrType, req.body?.trackingMode);

    await trackEvent({
      userId: req.user.id,
      jobId: result.job.id,
      eventType: "qr.single.updated",
      eventValue: 1,
      metadata: {
        format: result.payload.format,
        qrType: result.qrType,
        managedLinkId: result.managedLink?.id || null,
        trackingMode,
      },
    });

    res.json({
      job: {
        id: result.job.id,
        type: "single",
        qrType: result.qrType,
        trackingMode,
        status: result.job.status,
        createdAt: result.job.created_at,
        updatedAt: result.job.updated_at,
      },
      artifact: result.artifact,
      managedLink: {
        id: result.managedLink?.id || null,
        url: result.managedLink?.url || null,
        expiresAt: result.managedLink?.expiresAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  qrRouter,
};
