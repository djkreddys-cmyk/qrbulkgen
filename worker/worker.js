const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const archiver = require("archiver");
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { Pool } = require("pg");
const QRCode = require("qrcode");

const BULK_QR_QUEUE = "bulk-qr-jobs";

const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const db = new Pool({
  connectionString:
    process.env.POSTGRES_URL || "postgresql://postgres:postgres@localhost:5432/qrbulkgen",
});

const uploadsRoot = process.env.BULK_STORAGE_DIR
  ? path.resolve(process.env.BULK_STORAGE_DIR)
  : path.join(path.resolve(__dirname, ".."), "backend", "uploads");
const frontendBaseUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

function getCell(row, name) {
  return String(row?.[String(name).toLowerCase()] || "").trim();
}

function sanitizeFileBaseName(value, fallback) {
  const raw = String(value || "").trim();
  const safe = raw
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return (safe || fallback).slice(0, 120);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function toUtcDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function encodeFeedbackPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function encodePayload(payload) {
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

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
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

function getExpiryForRow(row) {
  return (
    toExpiryIso(getCell(row, "expiresAt") || getCell(row, "expiry") || getCell(row, "expiryDate")) ||
    addMonths(new Date(), 6).toISOString()
  );
}

function getNormalizedBulkSocialLinks(row) {
  const platformColumns = [
    ["Facebook", "facebook"],
    ["Instagram", "instagram"],
    ["LinkedIn", "linkedin"],
    ["Pinterest", "pinterest"],
    ["Snapchat", "snapchat"],
    ["Telegram", "telegram"],
    ["Twitter", "twitter"],
    ["WhatsApp", "whatsapp"],
    ["YouTube", "youtube"],
  ];

  const links = [];

  for (const [label, column] of platformColumns) {
    const rawValue = getCell(row, column);
    if (!rawValue) continue;
    const selectedPlatform = label;
    const normalizedLabel = selectedPlatform === "Twitter" ? "X" : label;
    let webUrl = rawValue;

    if (selectedPlatform === "WhatsApp") {
      const digits = rawValue.replace(/[^\d]/g, "");
      if (/^(https?:\/\/|whatsapp:\/\/)/i.test(rawValue)) {
        webUrl = rawValue;
      } else if (digits) {
        webUrl = `https://wa.me/${digits}`;
      }
    } else if (selectedPlatform === "Instagram" && /^@?[a-z0-9._]+$/i.test(rawValue)) {
      webUrl = `https://instagram.com/${rawValue.replace(/^@/, "")}`;
    } else if (selectedPlatform === "Facebook" && /^@?[a-z0-9.]+$/i.test(rawValue)) {
      webUrl = `https://facebook.com/${rawValue.replace(/^@/, "")}`;
    } else if (selectedPlatform === "Twitter" && /^@?[a-z0-9_]+$/i.test(rawValue)) {
      webUrl = `https://x.com/${rawValue.replace(/^@/, "")}`;
    } else if (selectedPlatform === "LinkedIn" && !/^https?:\/\//i.test(rawValue) && !/^linkedin\.com\//i.test(rawValue)) {
      webUrl = `https://linkedin.com/in/${rawValue.replace(/^@/, "")}`;
    } else if (selectedPlatform === "Telegram" && /^@?[a-z0-9_]+$/i.test(rawValue)) {
      webUrl = `https://t.me/${rawValue.replace(/^@/, "")}`;
    } else if (selectedPlatform === "YouTube" && /^@?[a-z0-9._-]+$/i.test(rawValue)) {
      webUrl = `https://youtube.com/${rawValue.startsWith("@") ? rawValue : `@${rawValue}`}`;
    }

    const withProtocol = /^(https?:\/\/|whatsapp:\/\/)/i.test(webUrl) ? webUrl : `https://${webUrl}`;
    try {
      const normalizedUrl = new URL(withProtocol).toString();
      const digits = rawValue.replace(/[^\d]/g, "");
      links.push({
        label: normalizedLabel,
        platform: selectedPlatform,
        url: normalizedUrl,
        appUrl: selectedPlatform === "WhatsApp" && digits ? `whatsapp://send?phone=${digits}` : normalizedUrl,
      });
    } catch {
      // Ignore invalid values so the row can still use other valid columns.
    }
  }

  for (let index = 1; index <= 3; index += 1) {
    const label = getCell(row, `customplatform${index}`) || getCell(row, `customlabel${index}`);
    const rawUrl = getCell(row, `customurl${index}`);
    if (!label || !rawUrl) continue;
    const withProtocol = /^(https?:\/\/|whatsapp:\/\/)/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      const normalizedUrl = new URL(withProtocol).toString();
      links.push({
        label,
        platform: "Custom",
        url: normalizedUrl,
        appUrl: normalizedUrl,
      });
    } catch {
      // Ignore invalid custom URLs.
    }
  }

  return links;
}

function getLegacyBulkSocialLinks(content) {
  return String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\s*([^:]+):\s*(.+)\s*$/);
      if (!match) return null;
      const label = String(match[1] || "").trim();
      const rawUrl = String(match[2] || "").trim();
      if (!label || !rawUrl) return null;
      const withProtocol = /^(https?:\/\/|whatsapp:\/\/)/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      try {
        const normalizedUrl = new URL(withProtocol).toString();
        return {
          label,
          platform: label,
          url: normalizedUrl,
          appUrl: normalizedUrl,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function buildBulkTargetPayload(qrType, row, content) {
  const trackingMode = "tracked";
  switch (qrType) {
    case "URL":
      return { qrType, trackingMode, fields: { url: content } };
    case "Youtube":
      return { qrType, trackingMode, fields: { youtubeUrl: content } };
    case "App Store":
      return { qrType, trackingMode, fields: { appStoreUrl: content } };
    case "PDF":
      return { qrType, trackingMode, fields: { pdfUrl: content } };
    case "Image Gallery":
      return { qrType, trackingMode, fields: { galleryUrl: content } };
    case "Email":
      return {
        qrType,
        trackingMode,
        fields: {
          email: getCell(row, "email"),
          subject: getCell(row, "subject"),
          body: getCell(row, "body"),
        },
      };
    case "Phone":
      return { qrType, trackingMode, fields: { phone: getCell(row, "phone") } };
    case "SMS":
      return {
        qrType,
        trackingMode,
        fields: {
          phone: getCell(row, "phone"),
          message: getCell(row, "message"),
        },
      };
    case "WhatsApp":
      return {
        qrType,
        trackingMode,
        fields: {
          phone: getCell(row, "phone"),
          message: getCell(row, "message"),
        },
      };
    case "Location":
      return {
        qrType,
        trackingMode,
        fields: {
          latitude: getCell(row, "latitude"),
          longitude: getCell(row, "longitude"),
          mapsUrl: getCell(row, "mapsurl") || content,
        },
      };
    case "Event":
      return {
        qrType,
        trackingMode,
        fields: {
          eventTitle: getCell(row, "title"),
          eventStart: getCell(row, "start"),
          eventEnd: getCell(row, "end"),
          eventLocation: getCell(row, "location"),
          eventDescription: getCell(row, "description"),
        },
      };
    case "Social Media": {
      const socialLinks = getNormalizedBulkSocialLinks(row);
      if (socialLinks.length) {
        return {
          qrType,
          trackingMode,
          fields: {},
          socialLinks,
          expiresAt: getExpiryForRow(row),
        };
      }
      return { qrType, trackingMode, fields: {}, socialLinks: getLegacyBulkSocialLinks(content), expiresAt: getExpiryForRow(row) };
    }
    default:
      return { qrType, trackingMode, fields: {} };
  }
}

function buildBulkContent(qrType, row) {
  switch (qrType) {
    case "URL":
    case "Text":
      return getCell(row, "content");
    case "Email": {
      const email = getCell(row, "email");
      const subject = encodeURIComponent(getCell(row, "subject"));
      const body = encodeURIComponent(getCell(row, "body"));
      return `mailto:${email}?subject=${subject}&body=${body}`;
    }
    case "Phone":
      return `tel:${getCell(row, "phone")}`;
    case "SMS":
      return `SMSTO:${getCell(row, "phone")}:${getCell(row, "message")}`;
    case "WhatsApp": {
      const phone = getCell(row, "phone").replace(/[^\d]/g, "");
      const text = getCell(row, "message");
      return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    }
    case "vCard":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${getCell(row, "lastName")};${getCell(row, "firstName")}`,
        `FN:${getCell(row, "firstName")} ${getCell(row, "lastName")}`.trim(),
        `ORG:${getCell(row, "organization")}`,
        `TITLE:${getCell(row, "jobTitle")}`,
        `TEL:${getCell(row, "phone")}`,
        `EMAIL:${getCell(row, "email")}`,
        `URL:${getCell(row, "url")}`,
        `ADR:;;${getCell(row, "address")}`,
        "END:VCARD",
      ].join("\n");
    case "Location":
      return `geo:${getCell(row, "latitude")},${getCell(row, "longitude")}`;
    case "Youtube":
    case "App Store":
      return getCell(row, "url");
    case "PDF":
    case "Image Gallery":
      return getCell(row, "url");
    case "WIFI": {
      const wifiType = getCell(row, "wifiType") || "WPA";
      const ssid = getCell(row, "ssid");
      const password = getCell(row, "password");
      const hidden = String(getCell(row, "hidden")).toLowerCase() === "true";
      return `WIFI:T:${wifiType};S:${ssid};P:${password};H:${hidden ? "true" : "false"};;`;
    }
    case "Event": {
      const start = toUtcDateTime(getCell(row, "start")) || toUtcDateTime(new Date().toISOString());
      const end =
        toUtcDateTime(getCell(row, "end")) ||
        toUtcDateTime(new Date(Date.now() + 60 * 60 * 1000).toISOString());
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${getCell(row, "title")}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `LOCATION:${getCell(row, "location")}`,
        `DESCRIPTION:${getCell(row, "description")}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n");
    }
    case "Social Media": {
      const title = getCell(row, "title") || "Follow us";
      const socialLinks = getNormalizedBulkSocialLinks(row);
      if (socialLinks.length) {
        const encoded = encodeURIComponent(encodePayload({ title, links: socialLinks }));
        return `${frontendBaseUrl}/social?s=${encoded}`;
      }
      return getCell(row, "content");
    }
    case "Rating": {
      const title = encodeURIComponent(getCell(row, "title") || "Rate your experience");
      const style = getCell(row, "style") === "numbers" ? "numbers" : "stars";
      const scale = style === "numbers" ? (getCell(row, "scale") === "10" ? "10" : "5") : "5";
      return `${frontendBaseUrl}/rate?title=${title}&style=${style}&scale=${scale}`;
    }
    case "Feedback": {
      const title = getCell(row, "title") || "Share your feedback";
      const questions = getCell(row, "questions")
        .split("|")
        .map((q) => q.trim())
        .filter(Boolean);
      const encoded = encodeURIComponent(
        encodeFeedbackPayload({
          title,
          questions: questions.length ? questions : ["How was your experience?"],
        }),
      );
      return `${frontendBaseUrl}/feedback?f=${encoded}`;
    }
    default:
      return getCell(row, "content");
  }
}

async function buildBulkRow(job, row) {
  const qrType = String(job.bulk_qr_type || "URL").trim();

  if (qrType !== "PDF" && qrType !== "Image Gallery") {
    const content = buildBulkContent(qrType, row);
    return {
      content,
      targetPayload: buildBulkTargetPayload(qrType, row, content),
    };
  }

  const source = getCell(row, "url");
  if (!source) {
    throw new Error(`${qrType} bulk rows require a url value`);
  }

  if (isHttpUrl(source)) {
    return {
      content: source,
      targetPayload: buildBulkTargetPayload(qrType, row, source),
    };
  }

  throw new Error(`${qrType} source must be a public URL starting with http:// or https://`);
}

async function createManagedBulkLink(job, content, row, targetPayload) {
  const title =
    getCell(row, "title") ||
    getCell(row, "filename") ||
    `${job.bulk_qr_type || "QR"} QR`;
  const expiresAt = getExpiryForRow(row);
  const result = await db.query(
    `INSERT INTO managed_qr_links (user_id, job_id, qr_type, title, content, target_payload, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
     RETURNING id`,
    [
      job.user_id,
      job.id,
      job.bulk_qr_type || "URL",
      String(title || "").trim().slice(0, 255) || null,
      content,
      JSON.stringify(
        targetPayload || {
          qrType: job.bulk_qr_type || "URL",
          trackingMode: String(job.tracking_mode || "tracked").toLowerCase(),
        },
      ),
      expiresAt,
    ],
  );
  return {
    id: result.rows[0].id,
    content,
    url: `${frontendBaseUrl}/q/${result.rows[0].id}`,
  };
}

async function createZipFromDir(sourceDir, zipPath) {
  await fsp.mkdir(path.dirname(zipPath), { recursive: true });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const zipPromise = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(output);
  archive.directory(sourceDir, false);
  archive.finalize();

  await zipPromise;
}

function toSafeFilePart(value, fallback) {
  const safe = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || fallback;
}

function toQrTypeFilePart(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Qr-QR";
  const compact = raw.replace(/[^a-zA-Z0-9]+/g, "");
  return `Qr-${compact || "QR"}`;
}

async function markFailed(jobId, message) {
  await db.query(
    `UPDATE qr_jobs
     SET status = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId, String(message || "Bulk worker failed").slice(0, 2000)],
  );

  await db.query(
    `INSERT INTO analytics_events (user_id, job_id, event_type, metadata)
     SELECT user_id, id, 'qr.bulk.failed', jsonb_build_object('message', $2)
     FROM qr_jobs
     WHERE id = $1`,
    [jobId, String(message || "Bulk worker failed").slice(0, 2000)],
  );
}

async function updateJobProgress(jobId, successCount, failureCount) {
  await db.query(
    `UPDATE qr_jobs
     SET success_count = $2,
         failure_count = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, successCount, failureCount],
  );
}

async function processBulkJob(jobId, queuedRows = null) {
  const result = await db.query(
    `SELECT
       id, user_id, source_file_name, source_file_path, bulk_qr_type,
       qr_size, foreground_color, background_color, qr_margin, output_format,
       error_correction_level, filename_prefix, tracking_mode
     FROM qr_jobs
     WHERE id = $1
       AND job_type = 'bulk'
     LIMIT 1`,
    [jobId],
  );

  const job = result.rows[0];
  if (!job) {
    throw new Error("Job not found");
  }

  await db.query(
    `UPDATE qr_jobs
     SET status = 'processing', started_at = NOW(), updated_at = NOW(), error_message = NULL
     WHERE id = $1`,
    [jobId],
  );

  await db.query("DELETE FROM qr_job_items WHERE job_id = $1", [jobId]);

  const rows = Array.isArray(queuedRows) ? queuedRows : null;
  if (!rows || rows.length === 0) {
    throw new Error("Queued bulk rows missing from worker payload");
  }
  const outputDir = path.join(uploadsRoot, "bulk", "jobs", jobId, "files");
  await fsp.mkdir(outputDir, { recursive: true });

  let successCount = 0;
  let failureCount = 0;
  let firstRowError = "";

  for (let i = 0; i < rows.length; i += 1) {
    let content = "";
    let targetPayload = null;
    try {
      const builtRow = await buildBulkRow(job, rows[i]);
      content = builtRow.content;
      targetPayload = builtRow.targetPayload;
    } catch (error) {
      if (!firstRowError) {
        firstRowError = String(error?.message || "Unable to build QR content from CSV row").slice(0, 2000);
      }
      failureCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, tracking_mode, status, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5)`,
        [jobId, i, "", String(job.tracking_mode || "tracked").toLowerCase(), String(error?.message || "Unable to build QR content from CSV row").slice(0, 2000)],
      );
      await updateJobProgress(jobId, successCount, failureCount);
      continue;
    }
    if (!content) {
      failureCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, tracking_mode, status, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5)`,
        [jobId, i, "", String(job.tracking_mode || "tracked").toLowerCase(), "Unable to build QR content from CSV row"],
      );
      await updateJobProgress(jobId, successCount, failureCount);
      continue;
    }

    const requestedFileName = getCell(rows[i], "filename") || getCell(rows[i], "file_name");
    if (!requestedFileName) {
      failureCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, tracking_mode, status, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5)`,
        [jobId, i, content, String(job.tracking_mode || "tracked").toLowerCase(), "Missing filename column value"],
      );
      await updateJobProgress(jobId, successCount, failureCount);
      continue;
    }
    const rowFileBase = sanitizeFileBaseName(requestedFileName, "");
    if (!rowFileBase) {
      failureCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, tracking_mode, status, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5)`,
        [jobId, i, content, String(job.tracking_mode || "tracked").toLowerCase(), "Filename could not be sanitized"],
      );
      await updateJobProgress(jobId, successCount, failureCount);
      continue;
    }
    const fileName = `${rowFileBase}.${job.output_format || "png"}`;
    const filePath = path.join(outputDir, fileName);

    try {
      let managedLink = null;
      let qrEncodedContent = content;
      const trackingMode = String(job.tracking_mode || "tracked").toLowerCase() === "tracked" ? "tracked" : "direct";
      if (trackingMode === "tracked") {
        managedLink = await createManagedBulkLink(job, content, rows[i], targetPayload);
        const trackedContent = appendManagedLinkIdToUrl(content, managedLink.id);
        if (trackedContent !== content) {
          const nextPayload = buildBulkTargetPayload(String(job.bulk_qr_type || "").trim(), rows[i], trackedContent);
          await db.query(`UPDATE managed_qr_links SET content = $2, target_payload = $3::jsonb, updated_at = NOW() WHERE id = $1`, [
            managedLink.id,
            trackedContent,
            JSON.stringify(nextPayload),
          ]);
          managedLink.content = trackedContent;
        }
        qrEncodedContent = managedLink.url;
      }
      if ((job.output_format || "png") === "svg") {
        const svg = await QRCode.toString(qrEncodedContent, {
          type: "svg",
          width: job.qr_size || 512,
          margin: job.qr_margin || 2,
          errorCorrectionLevel: job.error_correction_level || "M",
          color: {
            dark: job.foreground_color || "#000000",
            light: job.background_color || "#ffffff",
          },
        });
        await fsp.writeFile(filePath, svg, "utf8");
      } else {
        await QRCode.toFile(filePath, qrEncodedContent, {
          width: job.qr_size || 512,
          margin: job.qr_margin || 2,
          errorCorrectionLevel: job.error_correction_level || "M",
          color: {
            dark: job.foreground_color || "#000000",
            light: job.background_color || "#ffffff",
          },
        });
      }
      successCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, managed_link_id, tracking_mode, status, output_file_name, output_path)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7)`,
        [
          jobId,
          i,
          qrEncodedContent,
          managedLink?.id || null,
          trackingMode,
          fileName,
          path.relative(uploadsRoot, filePath).replace(/\\/g, "/"),
        ],
      );
      await updateJobProgress(jobId, successCount, failureCount);
    } catch (error) {
      if (!firstRowError) {
        firstRowError = String(error?.message || "QR generation failed for row").slice(0, 2000);
      }
      failureCount += 1;
      await db.query(
        `INSERT INTO qr_job_items (job_id, row_index, content, tracking_mode, status, output_file_name, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5, $6)`,
        [
          jobId,
          i,
          content,
          String(job.tracking_mode || "tracked").toLowerCase(),
          fileName,
          String(error?.message || "QR generation failed for row").slice(0, 2000),
        ],
      );
      await updateJobProgress(jobId, successCount, failureCount);
    }
  }

  if (successCount === 0) {
    throw new Error(firstRowError || "All bulk rows failed. No QR files were generated.");
  }

  const zipFileName = `${toQrTypeFilePart(job.bulk_qr_type)}.zip`;
  const zipAbsPath = path.join(uploadsRoot, "bulk", "jobs", jobId, zipFileName);
  await createZipFromDir(outputDir, zipAbsPath);
  const zipStat = await fsp.stat(zipAbsPath);
  const zipBuffer = await fsp.readFile(zipAbsPath);
  const zipDataUrl = `data:application/zip;base64,${zipBuffer.toString("base64")}`;

  await db.query(
    `INSERT INTO job_artifacts (job_id, artifact_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1, 'zip', $2, $3, 'application/zip', $4)`,
    [jobId, zipFileName, zipDataUrl, Number(zipStat.size || 0)],
  );

  await db.query(
    `UPDATE qr_jobs
     SET status = 'completed',
         success_count = $2,
         failure_count = $3,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, successCount, failureCount],
  );

    await db.query(
      `INSERT INTO analytics_events (user_id, job_id, event_type, event_value, metadata)
       SELECT user_id, id, 'qr.bulk.completed', $2::int, jsonb_build_object('failureCount', $3::int)
       FROM qr_jobs
       WHERE id = $1`,
      [jobId, successCount, failureCount],
    );
}

const worker = new Worker(
  BULK_QR_QUEUE,
  async (job) => {
    const jobId = String(job.data?.jobId || "").trim();
    if (!jobId) {
      throw new Error("Missing jobId in queue payload");
    }

    try {
      await processBulkJob(jobId, job.data?.rows);
    } catch (error) {
      await markFailed(jobId, error.message);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Bulk job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Bulk job failed: ${job?.id}`, err?.message || err);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down worker...`);
  await worker.close();
  await redis.quit();
  await db.end();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log("Bulk QR worker started");
