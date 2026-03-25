"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import { buildBarcodeSvg } from "../lib/barcode"
import { downloadCsv, parseCsv } from "../lib/csv"

const templateOptions = {
  product: {
    label: "Product Label",
    intro: "Good for retail products, packaging, and branded inserts.",
    kicker: "Product Label",
  },
  inventory: {
    label: "Inventory Label",
    intro: "Best for shelves, bins, warehouse rows, and stock movement.",
    kicker: "Inventory Label",
  },
  price: {
    label: "Price Tag",
    intro: "Designed for store displays and compact item pricing.",
    kicker: "Price Tag",
  },
  asset: {
    label: "Asset Tag",
    intro: "Works well for internal devices, tools, and equipment tracking.",
    kicker: "Asset Tag",
  },
  shipping: {
    label: "Shipping Label",
    intro: "Useful for outbound packages and operational routing labels.",
    kicker: "Shipping Label",
  },
}

function previewCardLabel(contentType) {
  if (contentType === "qr") return "QR label"
  if (contentType === "barcode") return "Barcode label"
  return "QR + barcode label"
}

function getDisplayValue(value, maxLength = 42) {
  const source = String(value || "").trim()
  if (!source) {
    return "No destination set"
  }
  if (source.length <= maxLength) {
    return source
  }
  return `${source.slice(0, maxLength - 3)}...`
}

export default function LabelGenerateContent({ mode = "single" }) {
  const qrPreviewRef = useRef(null)
  const qrCodeRef = useRef(null)
  const printRootRef = useRef(null)

  const [template, setTemplate] = useState("product")
  const [contentType, setContentType] = useState("both")
  const [labelSize, setLabelSize] = useState("4x3")
  const [title, setTitle] = useState("Premium Coffee Beans")
  const [subtitle, setSubtitle] = useState("250g Pack")
  const [sku, setSku] = useState("SKU-COF-250")
  const [price, setPrice] = useState("$12.99")
  const [batch, setBatch] = useState("BATCH-2026-04")
  const [expiry, setExpiry] = useState("2026-12-31")
  const [description, setDescription] = useState("Fresh roast. Scan for product details, brewing guide, and support.")
  const [barcodeType, setBarcodeType] = useState("Code 128")
  const [barcodeValue, setBarcodeValue] = useState("890123456789")
  const [qrValue, setQrValue] = useState("https://qrbulkgen.com/products/premium-coffee-beans")
  const [accentColor, setAccentColor] = useState("#0f172a")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [showLogo, setShowLogo] = useState(false)
  const [showTitle, setShowTitle] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [copies, setCopies] = useState(1)
  const [bulkRows, setBulkRows] = useState([])
  const [bulkError, setBulkError] = useState("")

  const activeTemplate = templateOptions[template] || templateOptions.product
  const showQr = contentType === "qr" || contentType === "both"
  const showBarcode = contentType === "barcode" || contentType === "both"

  const barcodeSvg = useMemo(
    () =>
      buildBarcodeSvg(barcodeValue, {
        label: showBarcode ? barcodeValue : "",
        fillColor: accentColor,
        backgroundColor,
        barHeight: labelSize === "2x1" ? 58 : labelSize === "3x2" ? 70 : 84,
        quietZone: labelSize === "2x1" ? 10 : 14,
        labelFontSize: labelSize === "2x1" ? 10 : 12,
      }),
    [accentColor, backgroundColor, barcodeValue, labelSize, showBarcode],
  )

  useEffect(() => {
    if (!qrPreviewRef.current || !showQr || !qrValue.trim()) {
      if (qrPreviewRef.current) qrPreviewRef.current.innerHTML = ""
      return
    }

    const qrSize = labelSize === "2x1" ? 92 : labelSize === "3x2" ? 118 : 148
    const options = {
      width: qrSize,
      height: qrSize,
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
  }, [accentColor, backgroundColor, labelSize, qrValue, showQr])

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    function handleAfterPrint() {
      document.body.classList.remove("label-print-mode")
    }

    window.addEventListener("afterprint", handleAfterPrint)
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint)
      document.body.classList.remove("label-print-mode")
    }
  }, [])

  function handlePrintLabel() {
    if (typeof window === "undefined") return
    document.body.classList.add("label-print-mode")
    window.setTimeout(() => {
      window.print()
    }, 50)
  }

  function handleBulkCsvChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result || ""))
        setBulkRows(parsed)
        setBulkError("")
      } catch {
        setBulkRows([])
        setBulkError("Unable to read this CSV file.")
      }
    }
    reader.readAsText(file)
  }

  function downloadSampleCsv() {
    downloadCsv(
      "label-bulk-sample.csv",
      [
        "productName",
        "subtitle",
        "sku",
        "price",
        "batch",
        "expiry",
        "description",
        "qrValue",
        "barcodeValue",
        "barcodeType",
      ],
      [
        {
          productName: "Premium Coffee Beans",
          subtitle: "250g Pack",
          sku: "SKU-COF-250",
          price: "$12.99",
          batch: "BATCH-2026-04",
          expiry: "2026-12-31",
          description: "Fresh roast. Scan for product details and brewing guide.",
          qrValue: "https://qrbulkgen.com/products/premium-coffee-beans",
          barcodeValue: "890123456789",
          barcodeType: "EAN-13",
        },
      ],
    )
  }

  const labelLayout =
    labelSize === "2x1"
      ? {
          widthClass: "max-w-[26rem]",
          shellClass: "grid-cols-1",
          infoColsClass: "grid-cols-2",
          textClass: "text-lg",
          qrSectionClass: "grid-cols-[92px_1fr]",
        }
      : labelSize === "3x2"
        ? {
            widthClass: "max-w-[34rem]",
            shellClass: "grid-cols-1",
            infoColsClass: "grid-cols-2",
            textClass: "text-[1.65rem]",
            qrSectionClass: "grid-cols-[118px_1fr]",
          }
        : {
            widthClass: "w-full max-w-[48rem]",
            shellClass: "md:grid-cols-[1.5fr_0.82fr]",
            infoColsClass: "grid-cols-2",
            textClass: "text-[1.95rem]",
            qrSectionClass: "grid-cols-1",
          }

  if (mode === "bulk") {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk Label Printing</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CSV upload</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Upload label rows</h2>
              <p className="mt-1 text-sm text-slate-500">
                Import product names, SKU, price, batch, expiry, barcode values, and QR destinations for print-ready labels.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Template</label>
                <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-xl border p-2.5">
                  {Object.entries(templateOptions).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Label Size</label>
                <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)} className="w-full rounded-xl border p-2.5">
                  <option value="2x1">2 x 1 inch</option>
                  <option value="3x2">3 x 2 inch</option>
                  <option value="4x3">4 x 3 inch</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm">Content Type</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-xl border p-2.5">
                <option value="qr">QR</option>
                <option value="barcode">Barcode</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input type="file" accept=".csv" onChange={handleBulkCsvChange} className="w-full border p-2" />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={downloadSampleCsv} className="rounded-xl border px-4 py-3 text-sm font-semibold text-slate-900">
                  Download Sample CSV
                </button>
                <button type="button" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                  Generate Labels
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900">
                  Export PDF
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Expected columns</p>
              <p className="mt-2">
                `productName`, `subtitle`, `sku`, `price`, `batch`, `expiry`, `description`, `qrValue`, `barcodeValue`, `barcodeType`
              </p>
            </div>

            {!!bulkError && <p className="text-sm text-rose-600">{bulkError}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview rows</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bulk label preview</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">{bulkRows.length} rows</span>
                <span className="rounded-full bg-emerald-100 px-3 py-2 font-semibold text-emerald-800">
                  {bulkRows.filter((row) => row.productName || row.sku).length} ready
                </span>
              </div>
            </div>

            {!bulkRows.length ? (
              <p className="mt-6 text-sm text-slate-500">Upload a CSV to preview label rows here.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {bulkRows.slice(0, 4).map((row, index) => {
                  const rowTitle = row.productName || row.title || `Label ${index + 1}`
                  const rowBarcode = row.barcodeValue || row.sku || `ITEM-${index + 1}`
                  const rowContentType = contentType
                  return (
                    <div key={`${row.sku || rowTitle}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{rowTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[row.barcodeType || barcodeType, row.sku || "No SKU", templateOptions[template].label].join(" • ")}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {previewCardLabel(rowContentType)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
                          <div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">SKU: {row.sku || "-"}</div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">Price: {row.price || "-"}</div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">Batch: {row.batch || "-"}</div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">Expiry: {row.expiry || "-"}</div>
                            </div>
                            {rowContentType !== "qr" ? (
                              <div
                                className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white p-3"
                                dangerouslySetInnerHTML={{
                                  __html: buildBarcodeSvg(rowBarcode, {
                                    label: rowBarcode,
                                    fillColor: accentColor,
                                    backgroundColor,
                                    barHeight: 66,
                                  }),
                                }}
                              />
                            ) : null}
                          </div>
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                            {rowContentType !== "barcode" ? `QR: ${row.qrValue || "Add QR value"}` : "Barcode only label"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="label-print-page mx-auto max-w-[90rem] px-4 py-10 md:px-5">
      <h1 className="text-3xl font-bold">Label Printing</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <section className="label-print-controls space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Label setup</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Build a print-ready label</h2>
            <p className="mt-1 text-sm text-slate-500">
              Combine product text, QR, barcode, and operational details into one printable layout.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Template</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-xl border p-2.5">
                {Object.entries(templateOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Label Size</label>
              <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)} className="w-full rounded-xl border p-2.5">
                <option value="2x1">2 x 1 inch</option>
                <option value="3x2">3 x 2 inch</option>
                <option value="4x3">4 x 3 inch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Content Type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-xl border p-2.5">
              <option value="qr">QR</option>
              <option value="barcode">Barcode</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Product Name</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Subtitle</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Price</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Batch</label>
              <input value={batch} onChange={(e) => setBatch(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Expiry</label>
              <input value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border p-2.5" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">QR Value</label>
              <input value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Barcode Value</label>
              <input value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} className="w-full rounded-xl border p-2.5" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Barcode Type</label>
              <select value={barcodeType} onChange={(e) => setBarcodeType(e.target.value)} className="w-full rounded-xl border p-2.5">
                <option>Code 128</option>
                <option>Code 39</option>
                <option>EAN-13</option>
                <option>UPC-A</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Copies</label>
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border p-2.5"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Accent</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-11 w-full rounded-xl border p-1" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Background</label>
              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-11 w-full rounded-xl border p-1" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
              Show logo placeholder
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />
              Show product name
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} />
              Show SKU
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              Show price
            </label>
          </div>
        </section>

        <section className="label-print-preview-panel space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{activeTemplate.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeTemplate.intro}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrintLabel}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                Print Label
              </button>
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900">
                Export PDF
              </button>
            </div>
          </div>

          <div className="label-print-target-wrap rounded-3xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <div
              ref={printRootRef}
              className={`label-print-target overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-sm ${labelLayout.widthClass}`}
              style={{ backgroundColor, borderTop: `8px solid ${accentColor}` }}
            >
              <div className={`grid gap-0 ${labelLayout.shellClass}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{activeTemplate.kicker}</p>
                      {showTitle ? (
                        <h3 className={`mt-3 font-black leading-tight text-slate-950 ${labelLayout.textClass}`}>
                          {title || "Label Title"}
                        </h3>
                      ) : null}
                      <p className="mt-2 text-sm text-slate-600">{subtitle || "Supporting subtitle"}</p>
                    </div>
                    {showLogo ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Logo
                      </div>
                    ) : null}
                  </div>

                  <div className={`mt-5 grid gap-3 ${labelLayout.infoColsClass}`}>
                    {showSku ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">SKU</p>
                        <p className="mt-1 font-semibold text-slate-900">{sku || "-"}</p>
                      </div>
                    ) : null}
                    {showPrice ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</p>
                        <p className="mt-1 font-semibold text-slate-900">{price || "-"}</p>
                      </div>
                    ) : null}
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Batch</p>
                      <p className="mt-1 font-semibold text-slate-900">{batch || "-"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Expiry</p>
                      <p className="mt-1 font-semibold text-slate-900">{expiry || "-"}</p>
                    </div>
                  </div>

                  {showBarcode ? (
                    <div className="mt-5 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                    </div>
                  ) : null}

                  <p className="mt-4 text-sm leading-6 text-slate-600">{description || "Short description"}</p>
                </div>

                <div className={`border-t border-slate-200 bg-slate-50 p-6 ${labelLayout.shellClass === "grid-cols-1" ? "" : "md:border-l md:border-t-0"}`}>
                  <div className={`grid gap-4 ${labelLayout.qrSectionClass}`}>
                    {showQr ? (
                      <div className="rounded-3xl bg-white p-4 shadow-sm">
                        <div
                          className="flex min-h-[120px] w-full items-center justify-center rounded-2xl bg-slate-50 p-3"
                          ref={qrPreviewRef}
                        />
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Barcode-only label
                      </div>
                    )}

                    <div>
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {previewCardLabel(contentType)}
                      </div>
                      <p className="mt-3 px-2 text-center text-xs leading-5 text-slate-500">
                        Scan for product info, support, menu, setup instructions, or campaign destination.
                      </p>
                      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Destination</p>
                        <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-700">
                          {showQr ? getDisplayValue(qrValue, labelSize === "4x3" ? 52 : 34) : getDisplayValue(barcodeValue, 28)}
                        </p>
                      </div>
                      <p className="mt-3 text-center text-xs text-slate-500">
                        {copies} {copies === 1 ? "copy" : "copies"} ready for print
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
