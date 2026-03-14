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

const repoRoot = path.resolve(__dirname, "..");
const uploadsRoot = process.env.BULK_STORAGE_DIR
  ? path.resolve(process.env.BULK_STORAGE_DIR)
  : path.join(repoRoot, "backend", "uploads");
const frontendBaseUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields.map((v) => v.trim());
}

function getCell(row, name) {
  return String(row?.[String(name).toLowerCase()] || "").trim();
}

function sanitizeFileBaseName(value, fallback) {
  const raw = String(value || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (safe || fallback).slice(0, 120);
}

function resolveSourceCsvPath(storedPath) {
  const raw = String(storedPath || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/\\/g, "/");
  const candidates = [];

  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  }

  candidates.push(path.join(uploadsRoot, normalized.replace(/^\/+/, "")));

  const uploadsMarker = "/uploads/";
  const markerIndex = normalized.toLowerCase().lastIndexOf(uploadsMarker);
  if (markerIndex >= 0) {
    const relativeFromUploads = normalized.slice(markerIndex + uploadsMarker.length);
    candidates.push(path.join(uploadsRoot, relativeFromUploads));
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || "";
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
    case "PDF":
    case "App Store":
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
    case "Bitcoin": {
      const address = getCell(row, "address");
      const amount = getCell(row, "amount");
      const label = getCell(row, "label");
      const message = getCell(row, "message");
      const amountPart = amount ? `?amount=${amount}` : "";
      const labelPart = label ? `${amountPart ? "&" : "?"}label=${encodeURIComponent(label)}` : "";
      const messagePart = message
        ? `${amountPart || labelPart ? "&" : "?"}message=${encodeURIComponent(message)}`
        : "";
      return `bitcoin:${address}${amountPart}${labelPart}${messagePart}`;
    }
    case "Social Media":
      return getCell(row, "content");
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

async function readCsvRows(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], headers: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => String(h || "").toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = String(cols[idx] || "").trim();
    });
    rows.push(row);
  }

  return { rows, headers };
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

async function markFailed(jobId, message) {
  await db.query(
    `UPDATE qr_jobs
     SET status = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId, String(message || "Bulk worker failed").slice(0, 2000)],
  );
}

async function processBulkJob(jobId, queuedRows = null) {
  const result = await db.query(
    `SELECT
       id, user_id, source_file_name, source_file_path, bulk_qr_type,
       qr_size, foreground_color, background_color, qr_margin, output_format,
       error_correction_level, filename_prefix
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

  let rows = Array.isArray(queuedRows) ? queuedRows : null;
  if (!rows || rows.length === 0) {
    const sourceFilePath = resolveSourceCsvPath(job.source_file_path);
    if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
      throw new Error("Source CSV file not found on worker");
    }

    const parsed = await readCsvRows(sourceFilePath);
    rows = parsed.rows;
  }
  const outputDir = path.join(uploadsRoot, "bulk", "jobs", jobId, "files");
  await fsp.mkdir(outputDir, { recursive: true });

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const content = buildBulkContent(job.bulk_qr_type || "URL", rows[i]);
    if (!content) {
      failureCount += 1;
      continue;
    }

    const requestedFileName = getCell(rows[i], "filename") || getCell(rows[i], "file_name");
    if (!requestedFileName) {
      failureCount += 1;
      continue;
    }
    const rowFileBase = sanitizeFileBaseName(requestedFileName, "");
    if (!rowFileBase) {
      failureCount += 1;
      continue;
    }
    const fileName = `${rowFileBase}.${job.output_format || "png"}`;
    const filePath = path.join(outputDir, fileName);

    try {
      if ((job.output_format || "png") === "svg") {
        const svg = await QRCode.toString(content, {
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
        await QRCode.toFile(filePath, content, {
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
    } catch {
      failureCount += 1;
    }
  }

  const zipFileName = `${job.filename_prefix || "qr"}-${jobId}.zip`;
  const zipAbsPath = path.join(uploadsRoot, "bulk", "jobs", jobId, zipFileName);
  await createZipFromDir(outputDir, zipAbsPath);
  const zipStat = await fsp.stat(zipAbsPath);

  const zipWebPath = `/uploads/bulk/jobs/${jobId}/${zipFileName}`;

  await db.query(
    `INSERT INTO job_artifacts (job_id, artifact_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1, 'zip', $2, $3, 'application/zip', $4)`,
    [jobId, zipFileName, zipWebPath, Number(zipStat.size || 0)],
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
