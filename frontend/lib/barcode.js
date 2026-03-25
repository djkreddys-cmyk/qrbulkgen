import bwipjs from "bwip-js"

export const BARCODE_FORMATS = [
  { value: "Code 128", family: "linear", group: "standard", bcid: "code128", description: "Flexible for inventory, labels, and warehouse SKUs." },
  { value: "Code 39", family: "linear", group: "standard", bcid: "code39", description: "Simple alphanumeric barcode often used for internal asset tags." },
  { value: "EAN-13", family: "linear", group: "standard", bcid: "ean13", description: "Retail product barcode for globally traded consumer goods." },
  { value: "UPC-A", family: "linear", group: "standard", bcid: "upca", description: "Retail product barcode commonly used in the United States." },
  { value: "Data Matrix", family: "matrix", group: "standard", bcid: "datamatrix", description: "Compact 2D code for dense payloads, labels, and small surfaces." },
  { value: "PDF417", family: "linear", group: "advanced", bcid: "pdf417", description: "Dense stacked barcode for IDs, transport, and document-style payloads." },
  { value: "ITF-14", family: "linear", group: "advanced", bcid: "itf14", description: "Outer carton and logistics barcode for packaged goods." },
  { value: "GS1-128", family: "linear", group: "advanced", bcid: "gs1-128", description: "Structured supply-chain barcode for logistics and traceability." },
  { value: "GS1 DataBar", family: "linear", group: "advanced", bcid: "databaromni", description: "Retail and supply-chain barcode for item identification." },
]

function toHexColor(value, fallback) {
  const normalized = String(value || "").trim().replace(/^#/, "")
  return normalized || fallback
}

export function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function getBarcodeFormat(barcodeType = "Code 128") {
  return BARCODE_FORMATS.find((format) => format.value === barcodeType) || BARCODE_FORMATS[0]
}

export function isMatrixBarcode(barcodeType = "Code 128") {
  return getBarcodeFormat(barcodeType).family === "matrix"
}

function getScale(widthPreset = "medium", matrix = false) {
  if (matrix) {
    if (widthPreset === "compact") return 4
    if (widthPreset === "wide") return 7
    return 5
  }

  if (widthPreset === "compact") return 2
  if (widthPreset === "wide") return 4
  return 3
}

function buildFallbackSvg(message, options = {}) {
  const backgroundColor = toHexColor(options.backgroundColor, "ffffff")
  const fillColor = toHexColor(options.fillColor, "0f172a")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220" role="img" aria-label="${escapeXml(message)}">
  <rect width="640" height="220" rx="24" fill="#${backgroundColor}" stroke="#e2e8f0" />
  <text x="320" y="98" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#${fillColor}">
    Barcode preview unavailable
  </text>
  <text x="320" y="132" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#64748b">
    ${escapeXml(message)}
  </text>
</svg>`
}

export function buildBarcodeSvg(value, options = {}) {
  const format = getBarcodeFormat(options.barcodeType)
  const showText = options.label !== ""
  const text = String(value || "").trim()

  if (!text) {
    return buildFallbackSvg("Enter a value to generate a preview.", options)
  }

  try {
    const bwipOptions = {
      bcid: format.bcid,
      text,
      scale: getScale(options.widthPreset, format.family === "matrix"),
      includetext: format.family === "matrix" ? false : showText,
      alttext: format.family === "matrix" ? undefined : options.label || text,
      textxalign: "center",
      textyalign: options.textPosition === "top" ? "above" : "below",
      textsize: Math.max(8, Number(options.labelFontSize || 14)),
      paddingwidth: Math.max(0, Math.round(Number(options.quietZone || 12) / 2)),
      paddingheight: Math.max(0, Math.round(Number(options.quietZone || 12) / 3)),
      barcolor: toHexColor(options.fillColor, "0f172a"),
      textcolor: toHexColor(options.fillColor, "0f172a"),
      backgroundcolor: toHexColor(options.backgroundColor, "ffffff"),
    }

    if (format.family === "matrix") {
      bwipOptions.width = Math.max(10, Number(options.barHeight || 96) / 8)
    } else {
      bwipOptions.height = Math.max(10, Number(options.barHeight || 96) / 10)
    }

    return bwipjs.toSVG(bwipOptions)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "This value is not valid for the selected format."
    return buildFallbackSvg(errorMessage, options)
  }
}
