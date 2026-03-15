const { query } = require("../db/postgres");
const { loadEnv } = require("../config/env");

function normalizeExpiry(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildManagedQrUrl(id) {
  const frontendUrl = String(loadEnv().frontendUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${frontendUrl}/q/${id}`;
}

async function createManagedQrLink({
  userId,
  jobId = null,
  qrType,
  title = "",
  content,
  targetPayload = null,
  expiresAt = null,
}) {
  const result = await query(
    `INSERT INTO managed_qr_links (user_id, job_id, qr_type, title, content, target_payload, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
     RETURNING id, qr_type, title, content, expires_at, created_at`,
    [
      userId,
      jobId,
      String(qrType || "").trim() || "Text",
      String(title || "").trim().slice(0, 255) || null,
      String(content || "").trim(),
      targetPayload ? JSON.stringify(targetPayload) : null,
      normalizeExpiry(expiresAt),
    ],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    qrType: row.qr_type,
    title: row.title,
    content: row.content,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    url: buildManagedQrUrl(row.id),
  };
}

module.exports = {
  buildManagedQrUrl,
  createManagedQrLink,
};
