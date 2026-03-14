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

function buildPublicAssetUrl(relativePath) {
  const env = loadEnv();
  const base = env.backendUrl.replace(/\/$/, "");
  return `${base}/uploads/${relativePath.replace(/\\/g, "/")}`;
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
          url: buildPublicAssetUrl(relativePath),
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
      url: buildPublicAssetUrl(relativePath),
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
    res.json({
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

module.exports = {
  publicRouter,
  uploadsRoot,
};
