export const QR_TYPES = [
  "URL",
  "Text",
  "Email",
  "Phone",
  "SMS",
  "WhatsApp",
  "vCard",
  "Location",
  "Youtube",
  "WIFI",
  "Event",
  "Bitcoin",
  "PDF",
  "Social Media",
  "App Store",
  "Image Gallery",
  "Rating",
  "Feedback",
];

export const QR_PLACEHOLDERS = {
  URL: "https://example.com",
  Text: "Write the text you want to encode",
  Email: "mailto:hello@example.com",
  Phone: "tel:+919999999999",
  SMS: "sms:+919999999999?body=Hello",
  WhatsApp: "https://wa.me/919999999999",
  vCard: "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEMAIL:john@example.com\nEND:VCARD",
  Location: "geo:17.385,78.4867",
  Youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  WIFI: "WIFI:T:WPA;S:OfficeWiFi;P:password123;;",
  Event: "BEGIN:VEVENT\nSUMMARY:Launch Event\nDTSTART:20260320T120000Z\nDTEND:20260320T140000Z\nEND:VEVENT",
  Bitcoin: "bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT?amount=0.001",
  PDF: "https://www.qrbulkgen.com/sample.pdf",
  "Social Media": "https://www.instagram.com/yourbrand",
  "App Store": "https://apps.apple.com/app/id123456789",
  "Image Gallery": "https://www.qrbulkgen.com/gallery/demo",
  Rating: "https://www.qrbulkgen.com/rating/demo",
  Feedback: "https://www.qrbulkgen.com/feedback/demo",
};

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

export function parseFlexibleExpiry(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.includes("T")) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    let month;
    let day;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      month = first;
      day = second;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const parsed = new Date(`${raw}T23:59:59.999Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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
    return pathname === "/rate" || pathname === "/feedback" || pathname.startsWith("/gallery/") || pathname.startsWith("/pdf/");
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
