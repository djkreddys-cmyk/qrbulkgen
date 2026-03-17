const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

const { query } = require("../db/postgres");
const { loadEnv } = require("../config/env");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");

const publicRouter = express.Router();

const uploadsRoot = path.join(process.cwd(), "uploads");
const galleryRoot = path.join(uploadsRoot, "gallery");
const pdfRoot = path.join(uploadsRoot, "pdf");

for (const folder of [uploadsRoot, galleryRoot, pdfRoot]) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "images") {
      cb(null, galleryRoot);
      return;
    }

    if (file.fieldname === "pdf") {
      cb(null, pdfRoot);
      return;
    }

    cb(createHttpError(400, "VALIDATION_ERROR", "Unsupported upload field"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeBase = path
      .basename(file.originalname || "file", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 80);
    cb(null, `${Date.now()}-${safeBase || "file"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

function getRequestBaseUrl(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || String(req.headers.host || "").split(",")[0].trim();

  if (host) {
    const protocol = forwardedProto || req.protocol || "https";
    return `${protocol}://${host}`;
  }

  return loadEnv().backendUrl.replace(/\/$/, "");
}

function buildPublicAssetUrl(req, relativePath) {
  const base = getRequestBaseUrl(req);
  return `${base}/uploads/${relativePath.replace(/\\/g, "/")}`;
}

function rewriteLegacyUrl(url, req) {
  const raw = String(url || "").trim();
  if (!raw) return raw;

  try {
    const parsed = new URL(raw);
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      const base = new URL(getRequestBaseUrl(req));
      parsed.protocol = base.protocol;
      parsed.host = base.host;
      return parsed.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

function ensureExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|mailto:|tel:|sms:|smsto:|upi:)/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function extractFirstUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}

function buildSmsHref(value, fields = {}) {
  const raw = String(value || "").trim();
  if (/^sms:/i.test(raw)) return raw;
  if (/^smsto:/i.test(raw)) {
    const payload = raw.replace(/^smsto:/i, "");
    const separatorIndex = payload.indexOf(":");
    const phone = separatorIndex >= 0 ? payload.slice(0, separatorIndex) : payload;
    const body = separatorIndex >= 0 ? payload.slice(separatorIndex + 1) : "";
    return `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ""}`;
  }
  const phone = String(fields.smsPhone || "").trim();
  const body = String(fields.smsMessage || "").trim();
  return phone ? `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ""}` : "";
}

function buildWhatsappHref(value, fields = {}) {
  const raw = String(value || "").trim();
  if (/^whatsapp:\/\/send\?/i.test(raw)) return raw;
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const phone = parsed.hostname.toLowerCase().includes("api.whatsapp.com")
        ? String(parsed.searchParams.get("phone") || "").replace(/[^\d]/g, "")
        : parsed.pathname.replace(/\//g, "").replace(/[^\d]/g, "");
      const message = String(parsed.searchParams.get("text") || "").trim();
      return phone
        ? `whatsapp://send?phone=${phone}${message ? `&text=${encodeURIComponent(message)}` : ""}`
        : raw;
    } catch {
      return raw;
    }
  }
  const phone = String(fields.whatsappPhone || "").replace(/[^\d]/g, "");
  const message = String(fields.whatsappMessage || "").trim();
  return phone
    ? `whatsapp://send?phone=${phone}${message ? `&text=${encodeURIComponent(message)}` : ""}`
    : raw;
}

function buildEventCalendarHref(fields = {}) {
  const title = String(fields.eventTitle || "").trim();
  if (!title) return "";
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title);

  const start = String(fields.eventStart || "").trim();
  const end = String(fields.eventEnd || "").trim();
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      const startUtc = startDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const endUtc = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      params.set("dates", `${startUtc}/${endUtc}`);
    }
  }

  const location = String(fields.eventLocation || "").trim();
  if (location) params.set("location", location);
  const details = String(fields.eventDescription || "").trim();
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildLocationHref(content) {
  const raw = String(content || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^geo:/i, "");
  const [lat, lng] = normalized.split(",");
  if (!lat || !lng) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function resolveManagedLinkDestination(row) {
  const qrType = String(row?.qr_type || "").trim();
  const targetPayload = row?.target_payload || {};
  const fields = targetPayload.fields || {};
  const socialLinks = Array.isArray(targetPayload.socialLinks) ? targetPayload.socialLinks : [];
  const rawContent = String(row?.content || "").trim();

  switch (qrType) {
    case "URL":
      return ensureExternalUrl(fields.url || rawContent);
    case "Youtube":
      return ensureExternalUrl(fields.youtubeUrl || rawContent);
    case "App Store":
      return ensureExternalUrl(fields.appStoreUrl || rawContent);
    case "PDF":
      return ensureExternalUrl(fields.pdfUrl || rawContent);
    case "Image Gallery":
      return ensureExternalUrl(fields.galleryUrl || rawContent);
    case "Email":
      return rawContent || `mailto:${String(fields.email || "").trim()}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.body || "")}`;
    case "Phone":
      return rawContent || `tel:${String(fields.phone || "").trim()}`;
    case "SMS":
      return buildSmsHref(rawContent, fields);
    case "WhatsApp":
      return buildWhatsappHref(rawContent, fields);
    case "Location":
      return buildLocationHref(fields.mapsUrl || rawContent);
    case "Social Media": {
      const firstUrl = socialLinks.find((item) => String(item?.url || "").trim())?.url;
      return ensureExternalUrl(firstUrl || extractFirstUrl(rawContent) || rawContent);
    }
    case "Event":
      return buildEventCalendarHref(fields) || rawContent;
    default:
      return rawContent;
  }
}

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || "";
}

function normalizeTrackingUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("exp");
    return parsed.toString();
  } catch {
    return raw;
  }
}

function buildVisitorKey(req, linkId = "") {
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);
  const ip = getRequestIp(req).slice(0, 255);
  return crypto.createHash("sha256").update(`${linkId}|${ip}|${userAgent}`).digest("hex");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

publicRouter.post(
  "/upload/gallery",
  requireAuth,
  upload.array("images", 10),
  async (req, res, next) => {
    try {
      const files = req.files || [];

      if (!Array.isArray(files) || files.length === 0) {
        throw createHttpError(400, "VALIDATION_ERROR", "At least one image is required");
      }

      if (files.length > 10) {
        throw createHttpError(400, "VALIDATION_ERROR", "Maximum 10 images allowed");
      }

      const invalidFile = files.find((file) => !String(file.mimetype || "").startsWith("image/"));
      if (invalidFile) {
        throw createHttpError(400, "VALIDATION_ERROR", "Only image files are allowed for gallery");
      }

      const title = String(req.body.title || "Image Gallery").trim().slice(0, 255);
      const images = files.map((file) => {
        const relativePath = path.join("gallery", file.filename);
        return {
          url: buildPublicAssetUrl(req, relativePath),
          fileName: file.originalname,
        };
      });

      const result = await query(
        `INSERT INTO public_links (user_id, link_type, title, payload)
         VALUES ($1, 'gallery', $2, $3::jsonb)
         RETURNING id, link_type, title, payload, created_at`,
        [req.user.id, title || "Image Gallery", JSON.stringify({ images })],
      );

      const row = result.rows[0];
      res.status(201).json({
        link: {
          id: row.id,
          type: row.link_type,
          title: row.title,
          payload: row.payload,
          createdAt: row.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

publicRouter.post("/upload/pdf", requireAuth, upload.single("pdf"), async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      throw createHttpError(400, "VALIDATION_ERROR", "PDF file is required");
    }

    const isPdfMime = String(file.mimetype || "").includes("pdf");
    const isPdfExt = path.extname(file.originalname || "").toLowerCase() === ".pdf";
    if (!isPdfMime && !isPdfExt) {
      throw createHttpError(400, "VALIDATION_ERROR", "Only PDF files are allowed");
    }

    const title = String(req.body.title || "PDF Document").trim().slice(0, 255);
    const relativePath = path.join("pdf", file.filename);
    const payload = {
      url: buildPublicAssetUrl(req, relativePath),
      fileName: file.originalname,
    };

    const result = await query(
      `INSERT INTO public_links (user_id, link_type, title, payload)
       VALUES ($1, 'pdf', $2, $3::jsonb)
       RETURNING id, link_type, title, payload, created_at`,
      [req.user.id, title || "PDF Document", JSON.stringify(payload)],
    );

    const row = result.rows[0];
    res.status(201).json({
      link: {
        id: row.id,
        type: row.link_type,
        title: row.title,
        payload: row.payload,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.post("/rate-submit", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim().slice(0, 255);
    const style = String(req.body.style || "stars").trim() === "numbers" ? "numbers" : "stars";
    const scale = Number(req.body.scale === 10 ? 10 : 5);
    const rating = Number(req.body.rating);
    const sourceUrl = String(req.body.sourceUrl || "").trim().slice(0, 2048);

    if (!Number.isInteger(rating) || rating < 1 || rating > scale) {
      throw createHttpError(400, "VALIDATION_ERROR", `rating must be between 1 and ${scale}`);
    }

    const result = await query(
      `INSERT INTO rating_submissions (title, style, scale, rating, source_url, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        title || null,
        style,
        scale,
        rating,
        normalizeTrackingUrl(sourceUrl) || null,
        String(req.headers["user-agent"] || "").slice(0, 1000),
        getRequestIp(req).slice(0, 255),
      ],
    );

    res.status(201).json({
      submission: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.post("/feedback-submit", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim().slice(0, 255);
    const sourceUrl = String(req.body.sourceUrl || "").trim().slice(0, 2048);
    const questions = Array.isArray(req.body.questions)
      ? req.body.questions.map((q) => String(q || "").trim()).filter(Boolean)
      : [];
    const answers = Array.isArray(req.body.answers)
      ? req.body.answers.map((a) => String(a || "").trim())
      : [];

    if (!questions.length) {
      throw createHttpError(400, "VALIDATION_ERROR", "questions are required");
    }

    if (!answers.length || answers.length !== questions.length) {
      throw createHttpError(400, "VALIDATION_ERROR", "answers must match questions length");
    }

    const result = await query(
      `INSERT INTO feedback_submissions (title, questions, answers, source_url, user_agent, ip_address)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6)
       RETURNING id, created_at`,
      [
        title || null,
        JSON.stringify(questions),
        JSON.stringify(answers),
        normalizeTrackingUrl(sourceUrl) || null,
        String(req.headers["user-agent"] || "").slice(0, 1000),
        getRequestIp(req).slice(0, 255),
      ],
    );

    res.status(201).json({
      submission: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.post("/track-view", async (req, res, next) => {
  try {
    const sourceUrl = normalizeTrackingUrl(req.body.sourceUrl);
    const title = String(req.body.title || "").trim().slice(0, 255);
    const targetKind = String(req.body.targetKind || "").trim().slice(0, 64);
    const expired = Boolean(req.body.expired);
    const linkId = String(req.body.linkId || "").trim();

    if (!sourceUrl && !linkId) {
      throw createHttpError(400, "VALIDATION_ERROR", "sourceUrl or linkId is required");
    }

    if (linkId) {
      await query(
        `UPDATE managed_qr_links
         SET last_scanned_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [linkId],
      );
    }

    await trackEvent({
      eventType: "qr.public.scan",
      metadata: {
        targetUrl: sourceUrl || null,
        title: title || null,
        targetKind: targetKind || null,
        expired,
        linkId: linkId || null,
        visitorKey: buildVisitorKey(req, linkId),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 255),
        ipAddress: getRequestIp(req).slice(0, 255),
      },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/qr-links/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "link id is required");
    }
    if (!isUuid(id)) {
      throw createHttpError(400, "VALIDATION_ERROR", "link id must be a valid UUID");
    }

    const result = await query(
      `SELECT id, qr_type, title, content, target_payload, expires_at, last_scanned_at, created_at
       FROM managed_qr_links
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      throw createHttpError(404, "NOT_FOUND", "Managed QR link not found");
    }

    const expiresAt = row.expires_at || null;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

    res.json({
      link: {
        id: row.id,
        qrType: row.qr_type,
        title: row.title,
        content: row.content,
        resolvedTarget: resolveManagedLinkDestination(row),
        targetPayload: row.target_payload || null,
        expiresAt,
        isExpired,
        lastScannedAt: row.last_scanned_at,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/links/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "link id is required");
    }
    if (!isUuid(id)) {
      throw createHttpError(400, "VALIDATION_ERROR", "link id must be a valid UUID");
    }

    const result = await query(
      `SELECT id, link_type, title, payload, created_at
       FROM public_links
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw createHttpError(404, "NOT_FOUND", "Public link not found");
    }

    const row = result.rows[0];
    let payload = row.payload || {};

    if (row.link_type === "gallery" && Array.isArray(payload.images)) {
      payload = {
        ...payload,
        images: payload.images.map((item) => ({
          ...item,
          url: rewriteLegacyUrl(item.url, req),
        })),
      };
    }

    if (row.link_type === "pdf" && payload.url) {
      payload = {
        ...payload,
        url: rewriteLegacyUrl(payload.url, req),
      };
    }

    res.json({
      link: {
        id: row.id,
        type: row.link_type,
        title: row.title,
        payload,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/short-links/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      throw createHttpError(400, "VALIDATION_ERROR", "short link slug is required");
    }

    const result = await query(
      `SELECT id, slug, title, target_url, click_count, expires_at, last_visited_at, archived_at, is_active, created_at, updated_at
       FROM short_links
       WHERE slug = $1
       LIMIT 1`,
      [slug],
    );

    const row = result.rows[0];
    if (!row) {
      throw createHttpError(404, "NOT_FOUND", "Short link not found");
    }

    const isExpired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
    if (!row.is_active || row.archived_at || isExpired) {
      throw createHttpError(410, "SHORT_LINK_INACTIVE", "Short link is inactive or expired");
    }

    await query(
      `UPDATE short_links
       SET click_count = click_count + 1,
           last_visited_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [row.id],
    );

    await trackEvent({
      eventType: "short-link.visit",
      metadata: {
        shortLinkId: row.id,
        slug: row.slug,
        targetUrl: row.target_url,
        visitorKey: buildVisitorKey(req, row.id),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 255),
        ipAddress: getRequestIp(req).slice(0, 255),
      },
    });

    res.json({
      link: {
        id: row.id,
        slug: row.slug,
        title: row.title || "",
        targetUrl: row.target_url,
        clickCount: Number(row.click_count || 0) + 1,
        expiresAt: row.expires_at,
        lastVisitedAt: new Date().toISOString(),
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  publicRouter,
  uploadsRoot,
};
