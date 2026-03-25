"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import { buildBarcodeSvg } from "../lib/barcode"
import { downloadCsv, parseCsv } from "../lib/csv"

export default function LabelGenerateContent({ mode = "single" }) {
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
  const [bulkRows, setBulkRows] = useState([])
  const [bulkError, setBulkError] = useState("")

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
      ["title", "subtitle", "sku", "price", "barcodeValue", "qrValue"],
      [
        {
          title: "Premium Coffee Beans",
          subtitle: "250g Pack",
          sku: "SKU-COF-250",
          price: "$12.99",
          barcodeValue: "890123456789",
          qrValue: "https://qrbulkgen.com/products/premium-coffee-beans",
        },
      ],
    )
  }

  const labelLayout =
    labelSize === "2x1"
      ? {
          widthClass: "max-w-[26rem]",
          gridClass: "grid-cols-1",
          qrBoxClass: "min-h-[170px]",
          titleClass: "text-xl",
          metaColsClass: "grid-cols-2",
          qrPanelClass: "",
        }
      : labelSize === "3x2"
        ? {
            widthClass: "max-w-[32rem]",
            gridClass: "grid-cols-1",
            qrBoxClass: "min-h-[168px]",
            titleClass: "text-2xl",
            metaColsClass: "grid-cols-2",
            qrPanelClass: "",
          }
        : {
            widthClass: "max-w-[38rem]",
            gridClass: "md:grid-cols-[1.55fr_1fr]",
            qrBoxClass: "min-h-[210px]",
            titleClass: "text-[1.85rem]",
            metaColsClass: "grid-cols-2",
            qrPanelClass: "md:min-w-[240px]",
          }

  if (mode === "bulk") {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk Label Upload</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CSV upload</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Upload label rows</h2>
              <p className="mt-1 text-sm text-slate-500">
                Import labels in bulk with columns for title, SKU, price, barcode value, and QR destination.
              </p>
            </div>

            <input type="file" accept=".csv" onChange={handleBulkCsvChange} className="w-full border p-2" />
            <button type="button" onClick={downloadSampleCsv} className="rounded-xl border px-4 py-3 text-sm font-semibold text-slate-900">
              Download Sample CSV
            </button>
            {!!bulkError && <p className="text-sm text-rose-600">{bulkError}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview rows</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bulk label preview</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {bulkRows.length} rows
              </span>
            </div>

            {!bulkRows.length ? (
              <p className="mt-6 text-sm text-slate-500">Upload a CSV to preview label rows here.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {bulkRows.slice(0, 4).map((row, index) => (
                  <div key={`${row.sku || row.title || "label"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{row.title || `Label ${index + 1}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.subtitle || row.sku || "No subtitle"}</p>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid gap-3 sm:grid-cols-[1.45fr_0.85fr]">
                        <div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">SKU: {row.sku || "-"}</div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">Price: {row.price || "-"}</div>
                          </div>
                          <div
                            className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white p-3"
                            dangerouslySetInnerHTML={{ __html: buildBarcodeSvg(row.barcodeValue || row.sku || `ITEM-${index + 1}`) }}
                          />
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                          QR: {row.qrValue || "Add QR value"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

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
              className={`mx-auto overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-sm ${labelLayout.widthClass}`}
              style={{ backgroundColor, borderTop: `8px solid ${accentColor}` }}
            >
              <div className={`grid gap-0 ${labelLayout.gridClass}`}>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product Label</p>
                  <h3 className={`mt-3 font-black leading-tight text-slate-950 ${labelLayout.titleClass}`}>
                    {title || "Label Title"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{subtitle || "Supporting subtitle"}</p>

                  <div className={`mt-5 grid gap-3 ${labelLayout.metaColsClass}`}>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">SKU</p>
                      <p className="mt-1 font-semibold text-slate-900">{sku || "-"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</p>
                      <p className="mt-1 font-semibold text-slate-900">{price || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-5 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  </div>
                </div>

                <div className={`border-t border-slate-200 bg-slate-50 p-6 ${labelLayout.gridClass === "grid-cols-1" ? "" : "md:border-l md:border-t-0"} ${labelLayout.qrPanelClass}`}>
                  <div className={`grid gap-4 ${labelLayout.gridClass === "grid-cols-1" ? "sm:grid-cols-[0.95fr_1.05fr] sm:items-center" : "grid-cols-1"}`}>
                    <div className="rounded-3xl bg-white p-4 shadow-sm">
                      <div
                        className={`flex w-full items-center justify-center rounded-2xl bg-slate-50 p-3 ${labelLayout.qrBoxClass}`}
                        ref={qrPreviewRef}
                      />
                    </div>
                    <div>
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Scannable Product Link
                      </div>
                      <p className="mt-3 px-2 text-center text-xs leading-5 text-slate-500">
                        Scan for product info, support, warranty, menu, or campaign destination.
                      </p>
                      <p className="mt-3 break-all text-center text-xs font-semibold text-slate-700">
                        {barcodeValue || "Barcode value"}
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
