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

export const QR_PLACEHOLDERS = {
  URL: "https://example.com",
  Text: "Write the text you want to encode",
  Email: "hello@example.com",
  Phone: "+919999999999",
  SMS: "+919999999999",
  WhatsApp: "+919999999999",
  vCard: "John Doe",
  Location: "17.385,78.4867",
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
    { key: "latitude", label: "Latitude", required: true },
    { key: "longitude", label: "Longitude", required: true },
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
  Location: ["latitude", "longitude"],
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
    url: "https://www.qrbulkgen.com/pdf/your-public-id",
    filename: "qr-pdf-1",
    expiresAt: "2026-04-30T23:59:59Z",
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
    url: "https://www.qrbulkgen.com/gallery/your-public-id",
    filename: "qr-gallery-1",
    expiresAt: "2026-04-30T23:59:59Z",
  },
  Rating: {
    title: "Rate your experience",
    style: "stars",
    scale: "5",
    filename: "qr-rating-1",
    expiresAt: "2026-04-30T23:59:59Z",
  },
  Feedback: {
    title: "Share your feedback",
    questions: "How was your experience?|Any suggestions?",
    filename: "qr-feedback-1",
    expiresAt: "2026-04-30T23:59:59Z",
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
  PDF: ["url", "filename"],
  "Social Media": ["content", "filename"],
  "App Store": ["url", "filename"],
  "Image Gallery": ["url", "filename"],
  Rating: ["title", "style", "scale", "filename"],
  Feedback: ["title", "questions", "filename"],
};

export const BULK_OPTIONAL_COLUMNS_BY_TYPE = Object.fromEntries(
  QR_TYPES.map((type) => [type, ["expiresAt"]]),
);

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
  return String(rule || "")
    .split("|")
    .some((key) => hasFilledValue(source[key], key));
}

export function validateQrFields(qrType, fields, context = {}) {
  const rules = QR_VALIDATION_RULES[qrType] || [];
  return rules.every((rule) => hasValueForValidationRule(rule, fields, context));
}
