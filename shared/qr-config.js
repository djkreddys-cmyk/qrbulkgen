export const QR_TYPES = [
  "App Store",
  "Email",
  "Event",
  "Feedback",
  "Image Gallery",
  "Location",
  "PDF",
  "Phone",
  "Rating",
  "SMS",
  "Social Media",
  "Text",
  "URL",
  "vCard",
  "WhatsApp",
  "WIFI",
  "Youtube",
];

export const BULK_QR_TYPES = QR_TYPES;

export const SOCIAL_PLATFORM_OPTIONS = [
  "Custom",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Pinterest",
  "Snapchat",
  "Telegram",
  "Twitter",
  "WhatsApp",
  "YouTube",
];

export const DOWNLOAD_RESOLUTIONS = [512, 768, 1024, 1536, 2048];

export const TRACKING_MODE_OPTIONS = [
  { value: "tracked", label: "Tracked analytics" },
  { value: "direct", label: "Direct open" },
];

export const TRACKED_ONLY_QR_TYPES = ["Rating", "Feedback", "PDF", "Image Gallery"];

export const HYBRID_TRACKING_QR_TYPES = [
  "URL",
  "WhatsApp",
  "Phone",
  "Email",
  "SMS",
  "Youtube",
  "App Store",
  "Location",
  "Text",
];

export const QR_PLACEHOLDERS = {
  URL: "https://example.com",
  Text: "Write the text you want to encode",
  Email: "hello@example.com",
  Phone: "+919999999999",
  SMS: "+919999999999",
  WhatsApp: "+919999999999",
  vCard: "John Doe",
  Location: "Search place or paste a map link",
  Youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  WIFI: "OfficeWiFi",
  Event: "Launch Event",
  PDF: "https://www.qrbulkgen.com/sample.pdf",
  "Social Media": "https://www.instagram.com/yourbrand",
  "App Store": "https://apps.apple.com/app/id123456789",
  "Image Gallery": "https://www.qrbulkgen.com/gallery/demo",
  Rating: "Rate your experience",
  Feedback: "Share your feedback",
};

export const INITIAL_QR_FIELDS = {
  url: "",
  text: "",
  email: "",
  subject: "",
  body: "",
  phone: "",
  smsPhone: "",
  smsMessage: "",
  whatsappPhone: "",
  whatsappMessage: "",
  firstName: "",
  lastName: "",
  organization: "",
  jobTitle: "",
  vcardPhone: "",
  vcardEmail: "",
  vcardUrl: "",
  address: "",
  locationName: "",
  locationAddress: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  youtubeUrl: "",
  wifiType: "WPA",
  wifiSsid: "",
  wifiPassword: "",
  wifiHidden: false,
  eventTitle: "",
  eventStart: "",
  eventEnd: "",
  eventLocation: "",
  eventDescription: "",
  pdfUrl: "",
  appStoreUrl: "",
  galleryUrl: "",
  ratingTitle: "Rate your experience",
  ratingStyle: "stars",
  ratingScale: "5",
  feedbackTitle: "Share your feedback",
  feedbackQuestions: ["How was your experience?"],
};

export const QR_FIELD_DEFINITIONS = {
  URL: [{ key: "url", label: "URL", required: true }],
  Text: [{ key: "text", label: "Text", required: true, multiline: true }],
  Email: [
    { key: "email", label: "Email", required: true },
    { key: "subject", label: "Subject", required: false },
    { key: "body", label: "Body", required: false, multiline: true },
  ],
  Phone: [{ key: "phone", label: "Phone", required: true }],
  SMS: [
    { key: "smsPhone", label: "Phone", required: true },
    { key: "smsMessage", label: "Message", required: true, multiline: true },
  ],
  WhatsApp: [
    { key: "whatsappPhone", label: "Phone", required: true },
    { key: "whatsappMessage", label: "Message", required: false, multiline: true },
  ],
  vCard: [
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name", required: false },
    { key: "organization", label: "Organization", required: false },
    { key: "jobTitle", label: "Job Title", required: false },
    { key: "vcardPhone", label: "Phone", required: false },
    { key: "vcardEmail", label: "Email", required: false },
    { key: "vcardUrl", label: "Website URL", required: false },
    { key: "address", label: "Address", required: false, multiline: true },
  ],
  Location: [
    { key: "locationName", label: "Place Name", required: false },
    { key: "locationAddress", label: "Address", required: false, multiline: true },
    { key: "mapsUrl", label: "Map Link", required: false },
    { key: "latitude", label: "Latitude", required: false },
    { key: "longitude", label: "Longitude", required: false },
  ],
  Youtube: [{ key: "youtubeUrl", label: "YouTube URL", required: true }],
  WIFI: [
    { key: "wifiSsid", label: "SSID", required: true },
    { key: "wifiPassword", label: "Password", required: false },
    { key: "wifiType", label: "Security Type", required: false },
  ],
  Event: [
    { key: "eventTitle", label: "Event Title", required: true },
    { key: "eventStart", label: "Start", required: false },
    { key: "eventEnd", label: "End", required: false },
    { key: "eventLocation", label: "Location", required: false },
    { key: "eventDescription", label: "Description", required: false, multiline: true },
  ],
  PDF: [{ key: "pdfUrl", label: "PDF URL", required: true }],
  "Social Media": [{ key: "socialLinks", label: "Social Links", required: true }],
  "App Store": [{ key: "appStoreUrl", label: "App Store URL", required: true }],
  "Image Gallery": [{ key: "galleryUrl", label: "Gallery URL", required: true }],
  Rating: [
    { key: "ratingTitle", label: "Rating Title", required: false },
    { key: "ratingStyle", label: "Rating Style", required: false },
    { key: "ratingScale", label: "Rating Scale", required: false },
  ],
  Feedback: [
    { key: "feedbackTitle", label: "Feedback Title", required: false },
    { key: "feedbackQuestions", label: "Feedback Questions", required: true },
  ],
};

export const QR_VALIDATION_RULES = {
  URL: ["url"],
  Text: ["text"],
  Email: ["email"],
  Phone: ["phone"],
  SMS: ["smsPhone", "smsMessage"],
  WhatsApp: ["whatsappPhone"],
  vCard: ["firstName"],
  Location: ["@location"],
  Youtube: ["youtubeUrl"],
  WIFI: ["wifiSsid"],
  Event: ["eventTitle"],
  PDF: ["pdfUrl|pdfLinkId"],
  "Social Media": ["socialLinks"],
  "App Store": ["appStoreUrl"],
  "Image Gallery": ["galleryUrl|galleryLinkId"],
  Rating: [],
  Feedback: ["feedbackQuestions"],
};

export const BULK_SAMPLE_ROWS_BY_TYPE = {
  URL: { content: "https://example.com", filename: "qr-url-1", expiresAt: "" },
  Text: { content: "Hello from bulk QR", filename: "qr-text-1", expiresAt: "" },
  Email: {
    email: "hello@example.com",
    subject: "Hello",
    body: "Message body",
    filename: "qr-email-1",
    expiresAt: "",
  },
  Phone: { phone: "+919876543210", filename: "qr-phone-1", expiresAt: "" },
  SMS: {
    phone: "+919876543210",
    message: "Your SMS text",
    filename: "qr-sms-1",
    expiresAt: "",
  },
  WhatsApp: {
    phone: "919876543210",
    message: "Hello on WhatsApp",
    filename: "qr-whatsapp-1",
    expiresAt: "",
  },
  vCard: {
    firstName: "John",
    lastName: "Doe",
    organization: "QRBulkGen",
    jobTitle: "Manager",
    phone: "+919876543210",
    email: "john@example.com",
    url: "https://example.com",
    address: "Bengaluru",
    filename: "qr-vcard-1",
    expiresAt: "",
  },
  Location: {
    latitude: "12.9716",
    longitude: "77.5946",
    filename: "qr-location-1",
    expiresAt: "",
  },
  Youtube: {
    url: "https://youtube.com/watch?v=abc123",
    filename: "qr-youtube-1",
    expiresAt: "",
  },
  WIFI: {
    ssid: "MyWifi",
    password: "secret123",
    wifiType: "WPA",
    hidden: "false",
    filename: "qr-wifi-1",
    expiresAt: "",
  },
  Event: {
    title: "Launch Event",
    start: "2026-03-20T10:00:00Z",
    end: "2026-03-20T12:00:00Z",
    location: "Bengaluru",
    description: "Product launch",
    filename: "qr-event-1",
    expiresAt: "",
  },
  PDF: {
    fileKey: "brochure-01.pdf",
    url: "",
    filename: "qr-pdf-1",
    expiresAt: "30-04-2026",
  },
  "Social Media": {
    content: "Instagram: https://instagram.com/yourbrand\nTwitter: https://x.com/yourbrand",
    filename: "qr-social-1",
    expiresAt: "",
  },
  "App Store": {
    url: "https://apps.apple.com/app/id000000",
    filename: "qr-appstore-1",
    expiresAt: "",
  },
  "Image Gallery": {
    galleryKey: "gallery-a",
    url: "",
    filename: "qr-gallery-1",
    expiresAt: "30-04-2026",
  },
  Rating: {
    title: "Rate your experience",
    style: "stars",
    scale: "5",
    filename: "qr-rating-1",
    expiresAt: "30-04-2026",
  },
  Feedback: {
    title: "Share your feedback",
    questions: "How was your experience?|Any suggestions?",
    filename: "qr-feedback-1",
    expiresAt: "30-04-2026",
  },
};

export const BULK_REQUIRED_COLUMNS_BY_TYPE = {
  URL: ["content", "filename"],
  Text: ["content", "filename"],
  Email: ["email", "subject", "body", "filename"],
  Phone: ["phone", "filename"],
  SMS: ["phone", "message", "filename"],
  WhatsApp: ["phone", "message", "filename"],
  vCard: [
    "firstName",
    "lastName",
    "organization",
    "jobTitle",
    "phone",
    "email",
    "url",
    "address",
    "filename",
  ],
  Location: ["latitude", "longitude", "filename"],
  Youtube: ["url", "filename"],
  WIFI: ["ssid", "password", "wifiType", "hidden", "filename"],
  Event: ["title", "start", "end", "location", "description", "filename"],
  PDF: ["filename"],
  "Social Media": ["content", "filename"],
  "App Store": ["url", "filename"],
  "Image Gallery": ["filename"],
  Rating: ["title", "style", "scale", "filename"],
  Feedback: ["title", "questions", "filename"],
};

export const BULK_OPTIONAL_COLUMNS_BY_TYPE = Object.fromEntries(
  QR_TYPES.map((type) => [type, ["expiresAt"]]),
);

export function supportsTrackingModeSelection(qrType) {
  return HYBRID_TRACKING_QR_TYPES.includes(String(qrType || "").trim());
}

export function getDefaultTrackingMode(qrType) {
  const type = String(qrType || "").trim();
  if (TRACKED_ONLY_QR_TYPES.includes(type)) return "tracked";
  if (type === "Text") return "direct";
  if (supportsTrackingModeSelection(type)) return "direct";
  return "tracked";
}

export function normalizeTrackingMode(qrType, requestedMode) {
  const type = String(qrType || "").trim();
  const mode = String(requestedMode || "").trim().toLowerCase();
  if (TRACKED_ONLY_QR_TYPES.includes(type)) return "tracked";
  if (!supportsTrackingModeSelection(type)) return "tracked";
  return mode === "tracked" ? "tracked" : "direct";
}

function hasFilledValue(value, key) {
  if (Array.isArray(value)) {
    if (key === "socialLinks") {
      return value.some((item) => {
        const platform =
          String(item?.platform || "").trim() === "Custom"
            ? String(item?.customPlatform || "").trim()
            : String(item?.platform || "").trim();
        const url = String(item?.url || "").trim();
        return platform && url;
      });
    }

    return value.some((entry) => String(entry || "").trim());
  }

  if (typeof value === "boolean") {
    return value;
  }

  return !!String(value || "").trim();
}

export function hasValueForValidationRule(rule, fields, context = {}) {
  const source = { ...(fields || {}), ...(context || {}) };
  if (rule === "@location") {
    const hasCoordinates =
      hasFilledValue(source.latitude, "latitude") && hasFilledValue(source.longitude, "longitude");
    return (
      hasCoordinates ||
      hasFilledValue(source.locationName, "locationName") ||
      hasFilledValue(source.locationAddress, "locationAddress") ||
      hasFilledValue(source.mapsUrl, "mapsUrl")
    );
  }
  return String(rule || "")
    .split("|")
    .some((key) => hasFilledValue(source[key], key));
}

export function validateQrFields(qrType, fields, context = {}) {
  const rules = QR_VALIDATION_RULES[qrType] || [];
  return rules.every((rule) => hasValueForValidationRule(rule, fields, context));
}

function decodeBase64Utf8(value) {
  try {
    if (typeof atob === "function") {
      return decodeURIComponent(
        Array.from(atob(value))
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      );
    }
  } catch (_error) {
    return "";
  }

  return "";
}

export function parseScannedQrDraft(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return { qrType: "Text", fields: { ...INITIAL_QR_FIELDS } };
  }

  const fields = { ...INITIAL_QR_FIELDS };

  if (/^mailto:/i.test(value)) {
    const parsed = value.replace(/^mailto:/i, "");
    const [emailPart, queryString = ""] = parsed.split("?");
    const params = new URLSearchParams(queryString);
    fields.email = decodeURIComponent(emailPart || "");
    fields.subject = params.get("subject") || "";
    fields.body = params.get("body") || "";
    return { qrType: "Email", fields };
  }

  if (/^tel:/i.test(value)) {
    fields.phone = value.replace(/^tel:/i, "");
    return { qrType: "Phone", fields };
  }

  if (/^SMSTO:/i.test(value)) {
    const payload = value.replace(/^SMSTO:/i, "");
    const separatorIndex = payload.indexOf(":");
    fields.smsPhone = separatorIndex >= 0 ? payload.slice(0, separatorIndex) : payload;
    fields.smsMessage = separatorIndex >= 0 ? payload.slice(separatorIndex + 1) : "";
    return { qrType: "SMS", fields };
  }

  if (/^WIFI:/i.test(value)) {
    const getPart = (key) => {
      const match = value.match(new RegExp(`${key}:([^;]*)`));
      return match ? match[1] : "";
    };
    fields.wifiType = getPart("T") || "WPA";
    fields.wifiSsid = getPart("S");
    fields.wifiPassword = getPart("P");
    fields.wifiHidden = getPart("H").toLowerCase() === "true";
    return { qrType: "WIFI", fields };
  }

  if (/^geo:/i.test(value)) {
    const payload = value.replace(/^geo:/i, "");
    const [latitude = "", longitude = ""] = payload.split(",");
    fields.latitude = latitude.trim();
    fields.longitude = longitude.trim();
    fields.mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${fields.latitude},${fields.longitude}`)}`;
    return { qrType: "Location", fields };
  }

  if (/^BEGIN:VCARD/i.test(value)) {
    const lines = value.split(/\r?\n/);
    const read = (prefix) => {
      const line = lines.find((entry) => entry.startsWith(prefix));
      return line ? line.slice(prefix.length) : "";
    };
    fields.firstName = read("FN:").split(" ")[0] || "";
    fields.lastName = read("FN:").split(" ").slice(1).join(" ");
    fields.organization = read("ORG:");
    fields.jobTitle = read("TITLE:");
    fields.vcardPhone = read("TEL:");
    fields.vcardEmail = read("EMAIL:");
    fields.vcardUrl = read("URL:");
    fields.address = read("ADR:;;");
    return { qrType: "vCard", fields };
  }

  if (/^(whatsapp:\/\/send\?|https:\/\/(wa\.me|api\.whatsapp\.com)\/)/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol.toLowerCase() === "whatsapp:") {
        fields.whatsappPhone = parsed.searchParams.get("phone") || "";
        fields.whatsappMessage = parsed.searchParams.get("text") || "";
      } else if (parsed.hostname.toLowerCase().includes("api.whatsapp.com")) {
        fields.whatsappPhone = parsed.searchParams.get("phone") || "";
        fields.whatsappMessage = parsed.searchParams.get("text") || "";
      } else {
        fields.whatsappPhone = parsed.pathname.replace(/\//g, "");
        fields.whatsappMessage = parsed.searchParams.get("text") || "";
      }
      return { qrType: "WhatsApp", fields };
    } catch (_error) {
      return { qrType: "URL", fields: { ...fields, url: value } };
    }
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      if (host.includes("youtube.com") || host.includes("youtu.be")) {
        fields.youtubeUrl = value;
        return { qrType: "Youtube", fields };
      }

      if (host.includes("apps.apple.com")) {
        fields.appStoreUrl = value;
        return { qrType: "App Store", fields };
      }

      if (pathname === "/rate") {
        fields.ratingTitle = parsed.searchParams.get("title") || fields.ratingTitle;
        fields.ratingStyle = parsed.searchParams.get("style") || fields.ratingStyle;
        fields.ratingScale = parsed.searchParams.get("scale") || fields.ratingScale;
        return { qrType: "Rating", fields };
      }

      if (pathname === "/feedback") {
        const payload = parsed.searchParams.get("f");
        if (payload) {
          const decoded = decodeBase64Utf8(payload);
          if (decoded) {
            try {
              const parsedPayload = JSON.parse(decoded);
              fields.feedbackTitle = parsedPayload.title || fields.feedbackTitle;
              fields.feedbackQuestions =
                Array.isArray(parsedPayload.questions) && parsedPayload.questions.length
                  ? parsedPayload.questions
                  : fields.feedbackQuestions;
            } catch (_error) {
              // Ignore malformed feedback payloads and keep defaults.
            }
          }
        }

        return { qrType: "Feedback", fields };
      }

      if (pathname.startsWith("/pdf/")) {
        fields.pdfUrl = value;
        return { qrType: "PDF", fields };
      }

      if (pathname.startsWith("/gallery/")) {
        fields.galleryUrl = value;
        return { qrType: "Image Gallery", fields };
      }

      fields.url = value;
      return { qrType: "URL", fields };
    } catch (_error) {
      fields.url = value;
      return { qrType: "URL", fields };
    }
  }

  fields.text = value;
  return { qrType: "Text", fields };
}
