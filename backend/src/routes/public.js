const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

const { query } = require("../db/postgres");
const { loadEnv } = require("../config/env");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");

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

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || "";
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
        sourceUrl || null,
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
        sourceUrl || null,
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

publicRouter.get("/links/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "link id is required");
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

module.exports = {
  publicRouter,
  uploadsRoot,
};
