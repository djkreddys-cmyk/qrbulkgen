"use client"

import { useMemo, useState } from "react"
import { buildBarcodeSvg } from "../lib/barcode"
import { downloadCsv, parseCsv } from "../lib/csv"

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

export default function BarcodeGenerateContent({ mode = "single" }) {
  const [barcodeType, setBarcodeType] = useState("Code 128")
  const [value, setValue] = useState("QRBULKGEN-001")
  const [label, setLabel] = useState("QRBULKGEN-001")
  const [filename, setFilename] = useState("barcode")
  const [height, setHeight] = useState(132)
  const [bulkRows, setBulkRows] = useState([])
  const [bulkError, setBulkError] = useState("")

  const barcodeSvg = useMemo(
    () =>
      buildBarcodeSvg(value, {
        quietZone: 18,
        barHeight: height,
        labelFontSize: 18,
        wideBar: 4,
        narrowBar: 2,
      }).replace(value, label || value),
    [height, label, value],
  )

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
      "barcode-bulk-sample.csv",
      ["value", "label", "filename"],
      [
        { value: "QRBULKGEN-001", label: "QRBULKGEN-001", filename: "barcode-001" },
        { value: "QRBULKGEN-002", label: "QRBULKGEN-002", filename: "barcode-002" },
      ],
    )
  }

  if (mode === "bulk") {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk Barcode Upload</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CSV upload</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Upload barcode rows</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add a CSV with `value`, `label`, and `filename` so teams can prepare many barcode assets in one pass.
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
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bulk barcode preview</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {bulkRows.length} rows
              </span>
            </div>

            {!bulkRows.length ? (
              <p className="mt-6 text-sm text-slate-500">Upload a CSV to preview barcode rows here.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {bulkRows.slice(0, 5).map((row, index) => (
                  <div key={`${row.filename || row.value || "row"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{row.label || row.value || `Row ${index + 1}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.filename || "barcode-file"}.svg</p>
                    <div
                      className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white p-3"
                      dangerouslySetInnerHTML={{ __html: buildBarcodeSvg(row.value || "", { quietZone: 18, barHeight: 80, labelFontSize: 14 }) }}
                    />
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
