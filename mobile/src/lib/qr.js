import {
  INITIAL_QR_FIELDS,
  parseScannedQrDraft,
  QR_FIELD_DEFINITIONS,
  QR_PLACEHOLDERS,
  QR_TYPES,
  SOCIAL_PLATFORM_OPTIONS,
  validateQrFields,
} from "../../../shared/qr-config";

export { INITIAL_QR_FIELDS, parseScannedQrDraft, QR_FIELD_DEFINITIONS, QR_TYPES, SOCIAL_PLATFORM_OPTIONS };

export function getQrPlaceholder(qrType) {
  return QR_PLACEHOLDERS[qrType] || "Enter QR content";
}

export function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

export function addMonths(date, months) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function parseExpiryDate(value) {
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

export function formatExpiryDateForInput(value) {
  const parsed = parseExpiryDate(value);
  if (!parsed) return "";
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const year = parsed.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function parseLocationCoordinates(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const directMatch = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (directMatch) {
    return { latitude: directMatch[1], longitude: directMatch[2] };
  }

  try {
    const parsed = new URL(raw);
    const query = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    const queryMatch = query && query.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (queryMatch) {
      return { latitude: queryMatch[1], longitude: queryMatch[2] };
    }

    const atMatch = parsed.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      return { latitude: atMatch[1], longitude: atMatch[2] };
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function buildLocationUrl(fields) {
  const mapsUrl = String(fields.mapsUrl || "").trim();
  if (mapsUrl) {
    if (/google\.[^/]+\/maps|maps\.app\.goo\.gl/i.test(mapsUrl)) return mapsUrl;
    const parsed = parseLocationCoordinates(mapsUrl);
    if (parsed?.latitude && parsed?.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${parsed.latitude},${parsed.longitude}`)}`;
    }
  }

  const latitude = String(fields.latitude || "").trim();
  const longitude = String(fields.longitude || "").trim();
  if (latitude && longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }

  const query = String(fields.locationAddress || fields.locationName || "").trim();
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return "";
}

function toUtcDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const hh = String(parsed.getUTCHours()).padStart(2, "0");
  const mi = String(parsed.getUTCMinutes()).padStart(2, "0");
  const ss = String(parsed.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function fallbackEventStartUtc() {
  return toUtcDateTime(new Date().toISOString());
}

function fallbackEventEndUtc() {
  return toUtcDateTime(new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

function utf8ToBase64(value) {
  const input = String(value || "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bytes = [];

  if (typeof TextEncoder !== "undefined") {
    bytes = Array.from(new TextEncoder().encode(input));
  } else {
    bytes = Array.from(unescape(encodeURIComponent(input))).map((char) => char.charCodeAt(0));
  }

  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : NaN;
    const c = i + 2 < bytes.length ? bytes[i + 2] : NaN;

    const triple = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);

    output += chars[(triple >> 18) & 63];
    output += chars[(triple >> 12) & 63];
    output += Number.isNaN(b) ? "=" : chars[(triple >> 6) & 63];
    output += Number.isNaN(c) ? "=" : chars[triple & 63];
  }

  return output;
}

function encodePayload(value) {
  return utf8ToBase64(JSON.stringify(value));
}

export function supportsExpiry(qrType, content) {
  if (["PDF", "Image Gallery", "Rating", "Feedback"].includes(qrType)) {
    return true;
  }

  if (!looksLikeUrl(content)) {
    return false;
  }

  try {
    const parsed = new URL(content);
    const pathname = parsed.pathname.toLowerCase();
    return (
      pathname === "/rate" ||
      pathname === "/feedback" ||
      pathname.startsWith("/gallery/") ||
      pathname.startsWith("/pdf/")
    );
  } catch (_error) {
    return false;
  }
}

export function applyExpiryToContent(qrType, content, expiryInput) {
  const raw = String(content || "").trim();
  if (!raw || !looksLikeUrl(raw) || !supportsExpiry(qrType, raw)) {
    return raw;
  }

  const expiry = parseFlexibleExpiry(expiryInput) || addMonths(new Date(), 6);

  try {
    const parsed = new URL(raw);
    parsed.searchParams.set("exp", expiry.toISOString());
    return parsed.toString();
  } catch (_error) {
    return raw;
  }
}

export function getAvailableSocialPlatforms(socialLinks, index) {
  const current = socialLinks[index]?.platform;
  const used = new Set(
    socialLinks
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item) => item.platform)
      .filter((platform) => platform && platform !== "Custom"),
  );

  return SOCIAL_PLATFORM_OPTIONS.filter((platform) => {
    if (platform === "Custom") return true;
    if (platform === current) return true;
    return !used.has(platform);
  });
}

export function addSocialLinkRow(socialLinks) {
  const used = new Set(
    socialLinks.map((item) => item.platform).filter((platform) => platform && platform !== "Custom"),
  );
  const firstAvailable = SOCIAL_PLATFORM_OPTIONS.find(
    (platform) => platform === "Custom" || !used.has(platform),
  );
  return [...socialLinks, { platform: firstAvailable || "Custom", customPlatform: "", url: "" }];
}

export function hasRequiredFields(qrType, fields, ids = {}, modes = {}, socialLinks = []) {
  return validateQrFields(qrType, fields, {
    ...ids,
    ...modes,
    socialLinks,
    feedbackQuestions: fields.feedbackQuestions,
  });
}

export function getManagedTitleForQrType(qrType, fields) {
  const map = {
    URL: fields.url,
    Text: fields.text,
    Email: fields.subject || fields.email,
    Phone: fields.phone,
    SMS: fields.smsMessage || fields.smsPhone,
    WhatsApp: fields.whatsappMessage || fields.whatsappPhone,
    vCard: `${fields.firstName || ""} ${fields.lastName || ""}`.trim(),
    Location:
      String(fields.locationName || fields.locationAddress || "").trim() ||
      `${fields.latitude || ""}, ${fields.longitude || ""}`.trim() ||
      String(fields.mapsUrl || "").trim(),
    Youtube: fields.youtubeUrl,
    WIFI: fields.wifiSsid,
    Event: fields.eventTitle,
    PDF: fields.pdfUrl || "PDF Document",
    "Social Media": "Social media links",
    "App Store": fields.appStoreUrl,
    "Image Gallery": fields.galleryUrl || "Image Gallery",
    Rating: fields.ratingTitle,
    Feedback: fields.feedbackTitle,
  };

  return String(map[qrType] || qrType || "QR Code").trim() || String(qrType || "QR Code");
}

function getUsableHostedId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") return "";
  return raw;
}

export function buildQrContent(qrType, fields, options = {}) {
  const {
    appOrigin = "https://www.qrbulkgen.com",
    socialLinks = [],
    ids = {},
    modes = {},
  } = options;

  switch (qrType) {
    case "URL":
      return String(fields.url || "").trim();
    case "Text":
      return String(fields.text || "").trim();
    case "Email":
      return `mailto:${String(fields.email || "").trim()}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.body || "")}`;
    case "Phone":
      return `tel:${String(fields.phone || "").trim()}`;
    case "SMS":
      return `SMSTO:${String(fields.smsPhone || "").trim()}:${fields.smsMessage || ""}`;
    case "WhatsApp": {
      const phone = String(fields.whatsappPhone || "").replace(/[^\d]/g, "");
      const text = String(fields.whatsappMessage || "").trim();
      return phone
        ? `whatsapp://send?phone=${phone}${text ? `&text=${encodeURIComponent(text)}` : ""}`
        : "";
    }
    case "vCard":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${fields.lastName || ""};${fields.firstName || ""}`,
        `FN:${`${fields.firstName || ""} ${fields.lastName || ""}`.trim()}`,
        `ORG:${fields.organization || ""}`,
        `TITLE:${fields.jobTitle || ""}`,
        `TEL:${fields.vcardPhone || ""}`,
        `EMAIL:${fields.vcardEmail || ""}`,
        `URL:${fields.vcardUrl || ""}`,
        `ADR:;;${fields.address || ""}`,
        "END:VCARD",
      ].join("\n");
    case "Location": {
      const parsedCoordinates = parseLocationCoordinates(fields.mapsUrl);
      if (parsedCoordinates && (!fields.latitude || !fields.longitude)) {
        fields = {
          ...fields,
          latitude: parsedCoordinates.latitude,
          longitude: parsedCoordinates.longitude,
        };
      }
      return buildLocationUrl(fields);
    }
    case "Youtube":
      return String(fields.youtubeUrl || "").trim();
    case "WIFI":
      return `WIFI:T:${fields.wifiType || "WPA"};S:${fields.wifiSsid || ""};P:${fields.wifiPassword || ""};H:${fields.wifiHidden ? "true" : "false"};;`;
    case "Event":
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${fields.eventTitle || ""}`,
        `DTSTART:${toUtcDateTime(fields.eventStart) || fallbackEventStartUtc()}`,
        `DTEND:${toUtcDateTime(fields.eventEnd) || fallbackEventEndUtc()}`,
        `LOCATION:${fields.eventLocation || ""}`,
        `DESCRIPTION:${fields.eventDescription || ""}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n");
    case "PDF":
      return getUsableHostedId(ids.pdfLinkId)
        ? `${appOrigin}/pdf/${getUsableHostedId(ids.pdfLinkId)}`
        : String(fields.pdfUrl || "").trim();
    case "Social Media":
      return socialLinks
        .map((item) => {
          const platform = item.platform === "Custom" ? item.customPlatform : item.platform;
          const label = String(platform || "").trim();
          const url = String(item.url || "").trim();
          if (!label || !url) return "";
          return `${label}: ${url}`;
        })
        .filter(Boolean)
        .join("\n");
    case "App Store":
      return String(fields.appStoreUrl || "").trim();
    case "Image Gallery":
      return getUsableHostedId(ids.galleryLinkId)
        ? `${appOrigin}/gallery/${getUsableHostedId(ids.galleryLinkId)}`
        : String(fields.galleryUrl || "").trim();
    case "Rating": {
      const title = encodeURIComponent(fields.ratingTitle || "Rate your experience");
      const style = encodeURIComponent(fields.ratingStyle || "stars");
      const scale = encodeURIComponent((fields.ratingStyle || "stars") === "stars" ? "5" : fields.ratingScale || "5");
      return `${appOrigin}/rate?title=${title}&style=${style}&scale=${scale}`;
    }
    case "Feedback": {
      const questions = (fields.feedbackQuestions || []).map((q) => String(q || "").trim()).filter(Boolean);
      const payload = encodePayload({
        title: fields.feedbackTitle || "Share your feedback",
        questions,
      });
      return `${appOrigin}/feedback?f=${encodeURIComponent(payload)}`;
    }
    default:
      return "";
  }
}
