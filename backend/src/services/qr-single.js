const QRCode = require("qrcode");

const { createHttpError } = require("../lib/http-error");

const ALLOWED_FORMATS = new Set(["png", "svg"]);
const ALLOWED_EC_LEVELS = new Set(["L", "M", "Q", "H"]);

function normalizeHexColor(value, fieldName) {
  const color = String(value || "").trim();

  if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
    throw createHttpError(400, "VALIDATION_ERROR", `${fieldName} must be a 6-digit hex color`);
  }

  return color;
}

function normalizeSingleQrPayload(body) {
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

async function createSingleQrDataUrl(payload) {
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

module.exports = {
  normalizeSingleQrPayload,
  createSingleQrDataUrl,
};
