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
