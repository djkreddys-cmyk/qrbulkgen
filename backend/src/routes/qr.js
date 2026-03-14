const express = require("express");
const QRCode = require("qrcode");

const { query } = require("../db/postgres");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");

const qrRouter = express.Router();

const ALLOWED_FORMATS = new Set(["png", "svg"]);
const ALLOWED_EC_LEVELS = new Set(["L", "M", "Q", "H"]);

function normalizeHexColor(value, fieldName) {
  const color = String(value || "").trim();

  if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
    throw createHttpError(400, "VALIDATION_ERROR", `${fieldName} must be a 6-digit hex color`);
  }

  return color;
}

function normalizePayload(body) {
  const content = String(body.content || "").trim();
  const size = Number(body.size || 512);
  const margin = Number(body.margin || 2);
  const format = String(body.format || "png").toLowerCase();
  const errorCorrectionLevel = String(body.errorCorrectionLevel || "M").toUpperCase();
  const filenamePrefix = String(body.filenamePrefix || "qr")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "");

  if (!content) {
    throw createHttpError(400, "VALIDATION_ERROR", "content is required");
  }

  if (!Number.isInteger(size) || size < 128 || size > 2048) {
    throw createHttpError(400, "VALIDATION_ERROR", "size must be an integer between 128 and 2048");
  }

  if (!Number.isInteger(margin) || margin < 0 || margin > 16) {
    throw createHttpError(400, "VALIDATION_ERROR", "margin must be an integer between 0 and 16");
  }

  if (!ALLOWED_FORMATS.has(format)) {
    throw createHttpError(400, "VALIDATION_ERROR", "format must be either png or svg");
  }

  if (!ALLOWED_EC_LEVELS.has(errorCorrectionLevel)) {
    throw createHttpError(400, "VALIDATION_ERROR", "errorCorrectionLevel must be one of L, M, Q, H");
  }

  if (!filenamePrefix || filenamePrefix.length > 120) {
    throw createHttpError(400, "VALIDATION_ERROR", "filenamePrefix must be between 1 and 120 characters");
  }

  return {
    content,
    size,
    margin,
    format,
    errorCorrectionLevel,
    filenamePrefix,
    foregroundColor: normalizeHexColor(body.foregroundColor || "#000000", "foregroundColor"),
    backgroundColor: normalizeHexColor(body.backgroundColor || "#ffffff", "backgroundColor"),
  };
}

async function createQrDataUrl(payload) {
  const options = {
    errorCorrectionLevel: payload.errorCorrectionLevel,
    margin: payload.margin,
    width: payload.size,
    color: {
      dark: payload.foregroundColor,
      light: payload.backgroundColor,
    },
  };

  if (payload.format === "png") {
    return QRCode.toDataURL(payload.content, options);
  }

  const svg = await QRCode.toString(payload.content, {
    ...options,
    type: "svg",
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

qrRouter.post("/single", requireAuth, async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const dataUrl = await createQrDataUrl(payload);
    const fileName = `${payload.filenamePrefix}-${Date.now()}.${payload.format}`;

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
