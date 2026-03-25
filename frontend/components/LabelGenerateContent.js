"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildBarcodePattern(value) {
  const source = String(value || "").trim() || "ITEM-001"
  const bits = []

  for (const char of source) {
    const code = char.charCodeAt(0).toString(2).padStart(8, "0")
    for (const bit of code) {
      bits.push(bit === "1" ? 3 : 2)
      bits.push(1)
    }
    bits.push(2)
  }

  return [6, 2, ...bits, 6]
}

function buildBarcodeSvg(value) {
  const bars = buildBarcodePattern(value)
  const quietZone = 12
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
      return `<rect x="${currentX}" y="0" width="${barWidth}" height="72" fill="#0f172a" />`
    })
    .filter(Boolean)
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="96" viewBox="0 0 ${width} 96" role="img" aria-label="${escapeXml(value)}">
  <rect width="${width}" height="96" fill="#ffffff" />
  ${rects}
  <text x="${width / 2}" y="90" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="1.5" fill="#0f172a">${escapeXml(value)}</text>
</svg>`
}

export default function LabelGenerateContent() {
  const qrPreviewRef = useRef(null)
  const qrCodeRef = useRef(null)

  const [title, setTitle] = useState("Premium Coffee Beans")
  const [subtitle, setSubtitle] = useState("250g Pack")
  const [sku, setSku] = useState("SKU-COF-250")
  const [price, setPrice] = useState("$12.99")
  const [barcodeValue, setBarcodeValue] = useState("890123456789")
  const [qrValue, setQrValue] = useState("https://qrbulkgen.com/products/premium-coffee-beans")
  const [accentColor, setAccentColor] = useState("#0f172a")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [labelSize, setLabelSize] = useState("4x3")

  const barcodeSvg = useMemo(() => buildBarcodeSvg(barcodeValue), [barcodeValue])

  useEffect(() => {
    if (!qrPreviewRef.current || !qrValue.trim()) {
      if (qrPreviewRef.current) qrPreviewRef.current.innerHTML = ""
      return
    }

    const options = {
      width: 160,
      height: 160,
      type: "canvas",
      data: qrValue.trim(),
      dotsOptions: { color: accentColor, type: "rounded" },
      backgroundOptions: { color: backgroundColor },
      cornersSquareOptions: { color: accentColor, type: "extra-rounded" },
      cornersDotOptions: { color: accentColor, type: "dot" },
      qrOptions: { errorCorrectionLevel: "M" },
    }

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options)
      qrPreviewRef.current.innerHTML = ""
      qrCodeRef.current.append(qrPreviewRef.current)
      return
    }

    qrCodeRef.current.update(options)
  }, [accentColor, backgroundColor, qrValue])

  function handlePrintLabel() {
    if (typeof window === "undefined") return
    window.print()
  }

  const labelWidthClass = labelSize === "2x1" ? "max-w-[24rem]" : labelSize === "3x2" ? "max-w-[30rem]" : "max-w-[36rem]"

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
      <h1 className="text-3xl font-bold">Label Generator</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Label content</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Build a printable label</h2>
            <p className="mt-1 text-sm text-slate-500">
              Combine product text, SKU, price, barcode, and QR content into one label layout for packaging and inventory workflows.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm">Label Size</label>
            <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)} className="w-full border p-2">
              <option value="2x1">2 x 1 inch</option>
              <option value="3x2">3 x 2 inch</option>
              <option value="4x3">4 x 3 inch</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm">Subtitle</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full border p-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full border p-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Price</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border p-2" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Barcode Value</label>
            <input value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} className="w-full border p-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm">QR Value</label>
            <input value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full border p-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">Accent</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-full border p-1" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Background</label>
              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 w-full border p-1" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Printable label layout</h2>
            </div>
            <button
              type="button"
              onClick={handlePrintLabel}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              Print Label
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div
              className={`mx-auto rounded-[1.75rem] border border-slate-200 p-6 shadow-sm ${labelWidthClass}`}
              style={{ backgroundColor, borderTop: `8px solid ${accentColor}` }}
            >
              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product Label</p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">{title || "Label Title"}</h3>
                  <p className="mt-2 text-sm text-slate-600">{subtitle || "Supporting subtitle"}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">SKU</p>
                      <p className="mt-1 font-semibold text-slate-900">{sku || "-"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</p>
                      <p className="mt-1 font-semibold text-slate-900">{price || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-5 overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
                    <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between rounded-3xl bg-slate-50 p-5">
                  <div
                    className="flex min-h-[188px] w-full items-center justify-center rounded-2xl bg-white p-3"
                    ref={qrPreviewRef}
                  />
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Scan for product info, support, warranty, menu, or campaign destination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
