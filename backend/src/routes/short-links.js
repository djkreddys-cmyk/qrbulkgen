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

function buildTrendLabel(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(5, 10);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key] ?? "")).join(","),
  );
  return `${[header, ...lines].join("\n")}\n`;
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

shortLinksRouter.get("/short-links/:id/analysis", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "Short link id is required");
    }

    const linkResult = await query(
      `SELECT id, slug, title, target_url, click_count, expires_at, last_visited_at, archived_at, is_active, created_at
       FROM short_links
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, req.user.id],
    );

    const link = linkResult.rows[0];
    if (!link) {
      throw createHttpError(404, "NOT_FOUND", "Short link not found");
    }

    const eventsResult = await query(
      `SELECT
         COUNT(*)::int AS total_visits,
         COUNT(DISTINCT COALESCE(metadata->>'visitorKey', ''))::int AS unique_visits
       FROM analytics_events
       WHERE event_type = 'short-link.visit'
         AND metadata->>'shortLinkId' = $1`,
      [id],
    );

    const trendResult = await query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*)::int AS visit_count
       FROM analytics_events
       WHERE event_type = 'short-link.visit'
         AND metadata->>'shortLinkId' = $1
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [id],
    );

    const latestVisitorsResult = await query(
      `SELECT
         created_at,
         metadata->>'userAgent' AS user_agent,
         metadata->>'ipAddress' AS ip_address
       FROM analytics_events
       WHERE event_type = 'short-link.visit'
         AND metadata->>'shortLinkId' = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [id],
    );

    const totals = eventsResult.rows[0] || { total_visits: 0, unique_visits: 0 };
    const totalVisits = Number(totals.total_visits || 0);
    const uniqueVisits = Number(totals.unique_visits || 0);
    const repeatVisits = Math.max(totalVisits - uniqueVisits, 0);
    const expiresAt = link.expires_at || null;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
    const trend = trendResult.rows.map((row) => ({
      label: buildTrendLabel(row.day),
      count: Number(row.visit_count || 0),
    }));

    let quickInsight = "This short link is ready for sharing."
    if (isExpired) {
      quickInsight = "This short link has expired and is no longer redirecting."
    } else if (link.archived_at || !link.is_active) {
      quickInsight = "This short link is archived, so new visitors should no longer use it."
    } else if (totalVisits === 0) {
      quickInsight = "This short link has not received clicks yet."
    } else if (repeatVisits > uniqueVisits) {
      quickInsight = "This short link is getting repeat traffic from returning visitors."
    } else if (uniqueVisits > 0) {
      quickInsight = "This short link is attracting fresh visitors."
    }

    res.json({
      analysis: {
        id: link.id,
        slug: link.slug,
        title: link.title || "",
        targetUrl: link.target_url,
        totalVisits,
        uniqueVisits,
        repeatVisits,
        clickCount: Number(link.click_count || 0),
        lastVisitedAt: link.last_visited_at,
        createdAt: link.created_at,
        expiresAt,
        isExpired,
        isArchived: Boolean(link.archived_at),
        isActive: Boolean(link.is_active),
        quickInsight,
        trend,
        latestVisitors: latestVisitorsResult.rows.map((row) => ({
          visitedAt: row.created_at,
          userAgent: row.user_agent || "",
          ipAddress: row.ip_address || "",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

shortLinksRouter.get("/short-links/:id/analysis-report.csv", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      throw createHttpError(400, "VALIDATION_ERROR", "Short link id is required");
    }

    const linkResult = await query(
      `SELECT id, slug, title, target_url, expires_at, archived_at, is_active, created_at
       FROM short_links
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, req.user.id],
    );

    const link = linkResult.rows[0];
    if (!link) {
      throw createHttpError(404, "NOT_FOUND", "Short link not found");
    }

    const visitsResult = await query(
      `SELECT
         ae.created_at,
         COALESCE(ae.metadata->>'ipAddress', '') AS ip_address,
         COALESCE(ae.metadata->>'location', '') AS location,
         COALESCE(ae.metadata->>'locationSource', '') AS location_source,
         COALESCE(ae.metadata->>'city', '') AS city,
         COALESCE(ae.metadata->>'region', '') AS region,
         COALESCE(ae.metadata->>'country', '') AS country,
         COALESCE(ae.metadata->>'latitude', '') AS latitude,
         COALESCE(ae.metadata->>'longitude', '') AS longitude
       FROM analytics_events ae
       WHERE ae.event_type = 'short-link.visit'
         AND ae.metadata->>'shortLinkId' = $1
       ORDER BY ae.created_at DESC`,
      [id],
    );

    const columns = [
      { key: "title", label: "Title" },
      { key: "shortUrl", label: "Short URL" },
      { key: "targetUrl", label: "Target URL" },
      { key: "visitDate", label: "Visit Date" },
      { key: "visitTime", label: "Visit Time" },
      { key: "ipAddress", label: "IP Address" },
      { key: "location", label: "Location" },
      { key: "locationSource", label: "Location Source" },
      { key: "city", label: "City" },
      { key: "region", label: "Region" },
      { key: "country", label: "Country" },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" },
    ];

    const rows = visitsResult.rows.map((row) => {
      const visitedAt = row.created_at ? new Date(row.created_at) : null;
      const validDate = visitedAt && !Number.isNaN(visitedAt.getTime()) ? visitedAt : null;
      return {
        title: link.title || link.slug || "",
        shortUrl: buildShortLinkUrl(link.slug),
        targetUrl: link.target_url || "",
        visitDate: validDate ? validDate.toISOString().slice(0, 10) : "",
        visitTime: validDate ? validDate.toISOString().slice(11, 19) : "",
        ipAddress: row.ip_address || "",
        location: row.location || "",
        locationSource: row.location_source || "",
        city: row.city || "",
        region: row.region || "",
        country: row.country || "",
        latitude: row.latitude || "",
        longitude: row.longitude || "",
      };
    });

    const csv = buildCsv(columns, rows);
    const safeBase = String(link.title || link.slug || "short-link").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    const fileName = `${safeBase || "short-link"}-analysis-report-${link.id}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
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
