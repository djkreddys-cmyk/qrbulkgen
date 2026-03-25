export function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildBarcodePattern(value, wideBar = 3, narrowBar = 2) {
  const source = String(value || "").trim() || "ITEM-001";
  const bits = [];

  for (const char of source) {
    const code = char.charCodeAt(0).toString(2).padStart(8, "0");
    for (const bit of code) {
      bits.push(bit === "1" ? wideBar : narrowBar);
      bits.push(1);
    }
    bits.push(2);
  }

  return [6, 2, ...bits, 6];
}

export function buildBarcodeSvg(value, options = {}) {
  const {
    quietZone = 12,
    barHeight = 72,
    labelFontSize = 12,
    wideBar = 3,
    narrowBar = 2,
  } = options;

  const bars = buildBarcodePattern(value, wideBar, narrowBar);
  const totalBarsWidth = bars.reduce((sum, item) => sum + item, 0);
  const width = quietZone * 2 + totalBarsWidth;
  let x = quietZone;
  let paintBar = true;

  const rects = bars
    .map((barWidth) => {
      const currentX = x;
      x += barWidth;
      const shouldPaint = paintBar;
      paintBar = !paintBar;
      if (!shouldPaint) return "";
      return `<rect x="${currentX}" y="0" width="${barWidth}" height="${barHeight}" fill="#0f172a" />`;
    })
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barHeight + 24}" viewBox="0 0 ${width} ${barHeight + 24}" role="img" aria-label="${escapeXml(value)}">
  <rect width="${width}" height="${barHeight + 24}" fill="#ffffff" />
  ${rects}
  <text x="${width / 2}" y="${barHeight + 18}" text-anchor="middle" font-family="monospace" font-size="${labelFontSize}" letter-spacing="1.5" fill="#0f172a">${escapeXml(value)}</text>
</svg>`;
}
