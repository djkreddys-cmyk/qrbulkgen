const crypto = require("crypto");
const express = require("express");

const { query } = require("../db/postgres");
const { loadEnv } = require("../config/env");
const { createHttpError } = require("../lib/http-error");
const { requireAuth } = require("../middleware/auth");
const { trackEvent } = require("../services/analytics");

const shortLinksRouter = express.Router();

function buildShortLinkUrl(slug) {
  const frontendUrl = String(loadEnv().frontendUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${frontendUrl}/${slug}`;
}

function parseExpiryDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!dashMatch) return null;
  const day = Number(dashMatch[1]);
  const month = Number(dashMatch[2]);
  const year = Number(dashMatch[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validateSlug(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(raw)) {
    throw createHttpError(400, "VALIDATION_ERROR", "Slug must be 4 to 32 characters and use only letters, numbers, dash, or underscore");
  }
  return raw;
}

function generateShortSlug(length = 6) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i += 1) {
    slug += alphabet[bytes[i] % alphabet.length];
  }
  return slug;
}

async function createUniqueSlug(preferredSlug = "") {
  if (preferredSlug) {
    const existing = await query("SELECT id FROM short_links WHERE slug = $1 LIMIT 1", [preferredSlug]);
    if (existing.rows[0]) {
      throw createHttpError(409, "SHORT_LINK_SLUG_EXISTS", "That short link slug is already taken");
    }
    return preferredSlug;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = generateShortSlug(6);
    const existing = await query("SELECT id FROM short_links WHERE slug = $1 LIMIT 1", [slug]);
    if (!existing.rows[0]) return slug;
  }

  throw createHttpError(500, "SHORT_LINK_SLUG_FAILED", "Unable to generate a unique short link right now");
}

function serializeShortLink(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || "",
    targetUrl: row.target_url,
    clickCount: Number(row.click_count || 0),
    expiresAt: row.expires_at,
    lastVisitedAt: row.last_visited_at,
    archivedAt: row.archived_at,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    url: buildShortLinkUrl(row.slug),
  };
}

shortLinksRouter.post("/short-links", requireAuth, async (req, res, next) => {
  try {
    const targetUrl = String(req.body.targetUrl || "").trim();
    const title = String(req.body.title || "").trim().slice(0, 255);
    const slug = await createUniqueSlug(validateSlug(req.body.slug));
    const expiresAt = parseExpiryDate(req.body.expiresAt);

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      throw createHttpError(400, "VALIDATION_ERROR", "Target URL must be a valid http or https URL");
    }

    const result = await query(
      `INSERT INTO short_links (user_id, slug, title, target_url, expires_at)
       VALUES ($1, $2, $3, $4, $5::timestamptz)
       RETURNING id, slug, title, target_url, click_count, expires_at, last_visited_at, archived_at, is_active, created_at, updated_at`,
      [req.user.id, slug, title || null, targetUrl, expiresAt],
    );

    const link = serializeShortLink(result.rows[0]);
    await trackEvent({
      userId: req.user.id,
      eventType: "short-link.created",
      metadata: { shortLinkId: link.id, slug: link.slug },
    });

    res.status(201).json({ link });
  } catch (error) {
    next(error);
  }
});

shortLinksRouter.get("/short-links", requireAuth, async (req, res, next) => {
  try {
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const result = await query(
      `SELECT id, slug, title, target_url, click_count, expires_at, last_visited_at, archived_at, is_active, created_at, updated_at
       FROM short_links
       WHERE user_id = $1
         AND ($2::boolean = true OR archived_at IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id, includeArchived],
    );

    res.json({ links: result.rows.map(serializeShortLink) });
  } catch (error) {
    next(error);
  }
});

shortLinksRouter.delete("/short-links/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    const force = String(req.query.force || "").toLowerCase() === "true";

    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "Short link id is required");
    }

    const result = await query(
      `SELECT id, archived_at
       FROM short_links
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, req.user.id],
    );
    const link = result.rows[0];
    if (!link) {
      throw createHttpError(404, "NOT_FOUND", "Short link not found");
    }

    if (force || link.archived_at) {
      await query("DELETE FROM short_links WHERE id = $1 AND user_id = $2", [id, req.user.id]);
      res.json({ deleted: true });
      return;
    }

    await query(
      `UPDATE short_links
       SET archived_at = NOW(), is_active = false, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );

    res.json({ archived: true });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  shortLinksRouter,
  buildShortLinkUrl,
};
