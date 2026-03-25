"use client"

import { useMemo, useState } from "react"

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildBarcodePattern(value) {
  const source = String(value || "").trim() || "QRBULKGEN123"
  const bits = []

  for (const char of source) {
    const code = char.charCodeAt(0).toString(2).padStart(8, "0")
    for (const bit of code) {
      bits.push(bit === "1" ? 4 : 2)
      bits.push(1)
    }
    bits.push(3)
    bits.push(2)
  }

  return [8, 2, ...bits, 8]
}

function buildBarcodeSvg({ value, label, height = 132 }) {
  const bars = buildBarcodePattern(value)
  const quietZone = 18
  const totalBarsWidth = bars.reduce((sum, item) => sum + item, 0)
  const width = quietZone * 2 + totalBarsWidth
  let x = quietZone
  let paintBar = true

  const rects = bars
    .map((barWidth) => {
      const currentX = x
      x += barWidth
      const shouldPaint = paintBar
      paintBar = !paintBar
      if (!shouldPaint) return ""
      return `<rect x="${currentX}" y="12" width="${barWidth}" height="${height}" rx="0.8" fill="#0f172a" />`
    })
    .filter(Boolean)
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 54}" viewBox="0 0 ${width} ${height + 54}" role="img" aria-label="${escapeXml(label || value)}">
  <rect width="${width}" height="${height + 54}" fill="#ffffff" />
  ${rects}
  <text x="${width / 2}" y="${height + 36}" text-anchor="middle" font-family="monospace" font-size="18" letter-spacing="2" fill="#0f172a">${escapeXml(label || value)}</text>
</svg>`
}

function downloadFile(contents, filename, mimeType) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function BarcodeGenerateContent() {
  const [barcodeType, setBarcodeType] = useState("Code 128")
  const [value, setValue] = useState("QRBULKGEN-001")
  const [label, setLabel] = useState("QRBULKGEN-001")
  const [filename, setFilename] = useState("barcode")
  const [height, setHeight] = useState(132)

  const barcodeSvg = useMemo(
    () =>
      buildBarcodeSvg({
        value,
        label,
        height,
      }),
    [height, label, value],
  )

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
      <h1 className="text-3xl font-bold">Barcode Generator</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Barcode setup</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Create a barcode screen</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure the barcode value, visible label, height, and file name for operational labeling workflows.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm">Barcode Type</label>
            <select value={barcodeType} onChange={(e) => setBarcodeType(e.target.value)} className="w-full border p-2">
              <option>Code 128</option>
              <option>Code 39</option>
              <option>EAN-13</option>
              <option>UPC-A</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Barcode Value</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} className="w-full border p-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm">Display Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border p-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">Height</label>
              <input
                type="range"
                min="80"
                max="180"
                step="4"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-slate-500">{height}px</p>
            </div>
            <div>
              <label className="mb-1 block text-sm">Filename</label>
              <input value={filename} onChange={(e) => setFilename(e.target.value)} className="w-full border p-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Screen added inside Generate</p>
            <p className="mt-1">
              This gives your app a dedicated barcode workflow tab. We can connect it to backend barcode standards next if you want downloadable production formats by type.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{barcodeType} preview</h2>
            </div>
            <button
              type="button"
              onClick={() => downloadFile(barcodeSvg, `${filename || "barcode"}.svg`, "image/svg+xml")}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              Download Barcode SVG
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div
              className="overflow-auto rounded-2xl bg-white p-6 shadow-inner"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
