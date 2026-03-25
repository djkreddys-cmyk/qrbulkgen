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
    fillColor = "#0f172a",
    backgroundColor = "#ffffff",
    label = value,
    textPosition = "bottom",
  } = options;

  const bars = buildBarcodePattern(value, wideBar, narrowBar);
  const totalBarsWidth = bars.reduce((sum, item) => sum + item, 0);
  const showLabel = String(label || "").trim().length > 0;
  const textBand = showLabel ? labelFontSize + 14 : 0;
  const width = quietZone * 2 + totalBarsWidth;
  const totalHeight = barHeight + textBand;
  const textY = textPosition === "top" ? labelFontSize + 4 : barHeight + labelFontSize + 2;
  const barsY = textPosition === "top" && showLabel ? textBand : 0;
  let x = quietZone;
  let paintBar = true;

  const rects = bars
    .map((barWidth) => {
      const currentX = x;
      x += barWidth;
      const shouldPaint = paintBar;
      paintBar = !paintBar;
      if (!shouldPaint) return "";
      return `<rect x="${currentX}" y="${barsY}" width="${barWidth}" height="${barHeight}" fill="${escapeXml(fillColor)}" />`;
    })
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="${escapeXml(value)}">
  <rect width="${width}" height="${totalHeight}" fill="${escapeXml(backgroundColor)}" />
  ${rects}
  ${showLabel ? `<text x="${width / 2}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="${labelFontSize}" letter-spacing="1.5" fill="${escapeXml(fillColor)}">${escapeXml(label)}</text>` : ""}
</svg>`;
}
