"use client"

import { useEffect, useMemo, useState } from "react"
import { BARCODE_FORMATS, buildBarcodeSvg, getBarcodeFormat, isMatrixBarcode } from "../lib/barcode"
import { downloadCsv, parseCsv } from "../lib/csv"
import { buildA4PrintLayout, buildRollPrintLayout } from "../lib/print-layout"

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

function normalizeBoolean(value, fallback = true) {
  const source = String(value ?? "").trim().toLowerCase()
  if (!source) {
    return fallback
  }
  return ["true", "yes", "1", "on"].includes(source)
}

function toDownloadName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "barcode"
}

function getBarcodeRequirements(barcodeType) {
  if (barcodeType === "EAN-13") {
    return {
      hint: "EAN-13 requires exactly 13 numeric digits.",
      sample: "8901234567890",
      valid: (value) => /^\d{13}$/.test(String(value || "").trim()),
    }
  }

  if (barcodeType === "UPC-A") {
    return {
      hint: "UPC-A requires exactly 12 numeric digits.",
      sample: "123456789012",
      valid: (value) => /^\d{12}$/.test(String(value || "").trim()),
    }
  }

  if (barcodeType === "ITF-14") {
    return {
      hint: "ITF-14 requires exactly 14 numeric digits.",
      sample: "12345678901231",
      valid: (value) => /^\d{14}$/.test(String(value || "").trim()),
    }
  }

  if (barcodeType === "GS1-128") {
    return {
      hint: "GS1-128 needs GS1 application identifiers, for example (01) followed by a GTIN.",
      sample: "(01)12345678901231",
      valid: (value) => /^\(01\)\d{14}$/.test(String(value || "").trim()),
    }
  }

  if (barcodeType === "GS1 DataBar") {
    return {
      hint: "GS1 DataBar should begin with the (01) application identifier and a 14-digit GTIN.",
      sample: "(01)12345678901231",
      valid: (value) => /^\(01\)\d{14}$/.test(String(value || "").trim()),
    }
  }

  return {
    hint: "",
    sample: "",
    valid: () => true,
  }
}

function renderBarcode(row, defaults = {}) {
  return buildBarcodeSvg(row.value || defaults.value || "ITEM-001", {
    barcodeType: row.barcodeType || defaults.barcodeType || "Code 128",
    barHeight: Number(row.height || defaults.height || 110),
    labelFontSize: Number(row.labelFontSize || defaults.labelFontSize || 16),
    quietZone: Number(row.margin || defaults.margin || 18),
    widthPreset: row.width || defaults.widthPreset || "medium",
    fillColor: row.lineColor || defaults.lineColor || "#0f172a",
    backgroundColor: row.backgroundColor || defaults.backgroundColor || "#ffffff",
    textPosition: row.textPosition || defaults.textPosition || "bottom",
    label: normalizeBoolean(row.showText, defaults.showText) ? row.label || row.value || defaults.label || defaults.value : "",
  })
}

export default function BarcodeGenerateContent({ mode = "single" }) {
  const linearFormats = BARCODE_FORMATS.filter((format) => format.family === "linear")
  const standardLinearFormats = linearFormats.filter((format) => format.group === "standard")
  const advancedLinearFormats = linearFormats.filter((format) => format.group === "advanced")
  const matrixFormats = BARCODE_FORMATS.filter((format) => format.family === "matrix")

  const [barcodeFamily, setBarcodeFamily] = useState("linear")
  const [barcodeType, setBarcodeType] = useState("Code 128")
  const [value, setValue] = useState("QRBULKGEN-001")
  const [widthPreset, setWidthPreset] = useState("medium")
  const [height, setHeight] = useState(116)
  const [margin, setMargin] = useState(18)
  const [lineColor, setLineColor] = useState("#0f172a")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [showText, setShowText] = useState(true)
  const [textPosition, setTextPosition] = useState("bottom")
  const [printFormat, setPrintFormat] = useState("a4")
  const [copies, setCopies] = useState(1)
  const [a4Preset, setA4Preset] = useState("48x25")
  const [a4Columns, setA4Columns] = useState(4)
  const [a4Rows, setA4Rows] = useState(8)
  const [horizontalGap, setHorizontalGap] = useState(6)
  const [verticalGap, setVerticalGap] = useState(6)
  const [topMargin, setTopMargin] = useState(10)
  const [leftMargin, setLeftMargin] = useState(10)
  const [pagePadding, setPagePadding] = useState(12)
  const [rollWidth, setRollWidth] = useState("50")
  const [rollLabelHeight, setRollLabelHeight] = useState("30")
  const [rollGap, setRollGap] = useState(4)
  const [rollTopOffset, setRollTopOffset] = useState(6)
  const [rollLeftMargin, setRollLeftMargin] = useState(6)
  const [rollAlignment, setRollAlignment] = useState("center")
  const [rollPrinterType, setRollPrinterType] = useState("thermal")
  const [bulkRows, setBulkRows] = useState([])
  const [bulkError, setBulkError] = useState("")
  const activeFormat = getBarcodeFormat(barcodeType)
  const matrixMode = isMatrixBarcode(barcodeType)
  const barcodeRequirements = getBarcodeRequirements(barcodeType)
  const hasFormatError = !barcodeRequirements.valid(value)
  const a4PresetOptions = [
    { value: "38x21", label: "38 x 21 mm", columns: 5, rows: 13 },
    { value: "48x25", label: "48 x 25 mm", columns: 4, rows: 8 },
    { value: "64x34", label: "64 x 34 mm", columns: 3, rows: 8 },
    { value: "99x38", label: "99 x 38 mm", columns: 2, rows: 7 },
    { value: "custom", label: "Custom", columns: a4Columns, rows: a4Rows },
  ]

  useEffect(() => {
    setBarcodeFamily(matrixMode ? "matrix" : "linear")
  }, [matrixMode])

  useEffect(() => {
    if (!barcodeRequirements.sample || barcodeRequirements.valid(value)) {
      return
    }

    setValue(barcodeRequirements.sample)
  }, [barcodeRequirements, value])

  useEffect(() => {
    const preset = a4PresetOptions.find((option) => option.value === a4Preset)
    if (!preset || preset.value === "custom") {
      return
    }
    setA4Columns(preset.columns)
    setA4Rows(preset.rows)
  }, [a4Preset])

  const barcodeSvg = useMemo(
    () =>
      buildBarcodeSvg(value, {
        barcodeType,
        quietZone: margin,
        barHeight: height,
        labelFontSize: widthPreset === "compact" ? 12 : widthPreset === "wide" ? 18 : 15,
        widthPreset,
        fillColor: lineColor,
        backgroundColor,
        label: showText && !matrixMode ? value : "",
        textPosition,
      }),
    [backgroundColor, barcodeType, height, lineColor, margin, matrixMode, showText, textPosition, value, widthPreset],
  )

  const printItems = useMemo(
    () => [
      {
        value,
        barcodeType,
        width: widthPreset,
        height,
        margin,
        lineColor,
        backgroundColor,
        showText,
        textPosition,
        copies,
      },
    ],
    [backgroundColor, barcodeType, copies, height, lineColor, margin, showText, textPosition, value, widthPreset],
  )

  const a4Layout = useMemo(
    () =>
      buildA4PrintLayout(printItems, {
        columns: a4Columns,
        rows: a4Rows,
        fallbackCopies: 1,
      }),
    [a4Columns, a4Rows, printItems],
  )

  const rollLayout = useMemo(
    () =>
      buildRollPrintLayout(printItems, {
        labelHeight: rollLabelHeight,
        gap: rollGap,
        fallbackCopies: 1,
      }),
    [printItems, rollGap, rollLabelHeight],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    function handleAfterPrint() {
      document.body.classList.remove("barcode-print-mode")
    }

    window.addEventListener("afterprint", handleAfterPrint)
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint)
      document.body.classList.remove("barcode-print-mode")
    }
  }, [])

  function openPrintDialog() {
    if (typeof window === "undefined") return
    document.body.classList.add("barcode-print-mode")
    window.setTimeout(() => {
      window.print()
    }, 50)
  }

  function handlePrintBarcode() {
    openPrintDialog()
  }

  function handleExportPdf() {
    openPrintDialog()
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
      "barcode-bulk-sample.csv",
      ["value", "productName", "sku", "label", "barcodeType", "width", "height", "showText", "filename"],
      [
        {
          value: "890123456789",
          productName: "Premium Coffee Beans",
          sku: "SKU-COF-250",
          label: "890123456789",
          barcodeType: "EAN-13",
          width: "wide",
          height: "124",
          showText: "yes",
          filename: "coffee-beans-ean13",
        },
        {
          value: "QRBULKGEN-001",
          productName: "Warehouse Asset",
          sku: "AST-001",
          label: "AST-001",
          barcodeType: "Code 128",
          width: "medium",
          height: "110",
          showText: "yes",
          filename: "asset-001",
        },
        {
          value: "https://qrbulkgen.com/products/premium-coffee-beans",
          productName: "Warranty label",
          sku: "DM-001",
          label: "",
          barcodeType: "Data Matrix",
          width: "medium",
          height: "128",
          showText: "no",
          filename: "warranty-datamatrix",
        },
      ],
    )
  }

  if (mode === "bulk") {
    return (
      <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk Barcode Upload</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CSV upload</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Upload barcode rows</h2>
              <p className="mt-1 text-sm text-slate-500">
                Import spreadsheet rows for barcodes with value, SKU, type, size, and output file names.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input type="file" accept=".csv" onChange={handleBulkCsvChange} className="w-full border p-2" />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={downloadSampleCsv} className="rounded-xl border px-4 py-3 text-sm font-semibold text-slate-900">
                  Download Sample CSV
                </button>
                <button type="button" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                  Generate Bulk Barcodes
                </button>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Expected columns</p>
                <p className="mt-1">`value`, `productName`, `sku`, `label`, `barcodeType`, `width`, `height`, `showText`, `filename`</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Best use cases</p>
                <p className="mt-1">Inventory tags, retail product lists, asset sheets, warehouse bins, and packaging prep.</p>
              </div>
            </div>

            {!!bulkError && <p className="text-sm text-rose-600">{bulkError}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview rows</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bulk barcode preview</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">{bulkRows.length} rows</span>
                <span className="rounded-full bg-emerald-100 px-3 py-2 font-semibold text-emerald-800">
                  {bulkRows.filter((row) => row.value).length} valid
                </span>
              </div>
            </div>

            {!bulkRows.length ? (
              <p className="mt-6 text-sm text-slate-500">Upload a CSV to preview barcode rows here.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {bulkRows.slice(0, 5).map((row, index) => (
                  <div key={`${row.filename || row.value || "row"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.productName || row.label || row.value || `Row ${index + 1}`}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[row.barcodeType || barcodeType, row.sku || "No SKU", `${row.filename || "barcode-file"}.svg`].join(" | ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {row.width || "medium"} / {row.height || "110"}px
                      </span>
                    </div>
                    <div
                      className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white p-3"
                      dangerouslySetInnerHTML={{
                        __html: renderBarcode(row, {
                          height,
                          margin,
                          lineColor,
                          backgroundColor,
                          showText,
                          value,
                          barcodeType,
                          widthPreset,
                          textPosition,
                        }),
                      }}
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

  function renderBarcodePrintCard(item, key, variant = "full") {
    const itemMatrixMode = isMatrixBarcode(item.barcodeType || barcodeType)
    const itemSvg = renderBarcode(item, {
      height,
      margin,
      lineColor,
      backgroundColor,
      showText,
      value,
      barcodeType,
      widthPreset,
      textPosition,
    })
    const compact = variant === "sheet"

    return (
      <div
        key={key}
        className={`border border-slate-200 bg-white ${compact ? "min-h-[7rem] rounded-2xl p-3" : "rounded-3xl p-4 shadow-sm"}`}
      >
        <div
          className={`overflow-auto border border-slate-200 bg-white ${compact ? "rounded-xl p-2" : "rounded-2xl p-4 shadow-inner"} ${itemMatrixMode ? "flex justify-center" : ""}`}
          dangerouslySetInnerHTML={{ __html: itemSvg }}
        />
      </div>
    )
  }

  return (
    <main className="barcode-print-page mx-auto max-w-[90rem] px-4 py-10 md:px-5">
      <h1 className="text-3xl font-bold">Barcode Generator</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="barcode-print-controls space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Barcode setup</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Create a production-ready code</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a linear barcode format or switch to Data Matrix for a compact 2D label path.
            </p>
          </div>

          <div className="inline-flex overflow-hidden rounded-2xl border border-slate-900 shadow-sm">
                <button
              type="button"
              onClick={() => {
                setBarcodeFamily("linear")
                setBarcodeType(standardLinearFormats[0]?.value || "Code 128")
              }}
              className={`px-4 py-2.5 text-sm font-semibold transition ${barcodeFamily === "linear" ? "bg-slate-950 text-white" : "bg-white text-slate-900 hover:bg-slate-50"}`}
            >
              Linear Barcode
            </button>
            <button
              type="button"
              onClick={() => {
                setBarcodeFamily("matrix")
                setBarcodeType(matrixFormats[0]?.value || "Data Matrix")
              }}
              className={`border-l border-slate-900 px-4 py-2.5 text-sm font-semibold transition ${barcodeFamily === "matrix" ? "bg-slate-950 text-white" : "bg-white text-slate-900 hover:bg-slate-50"}`}
            >
              Data Matrix
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm">Barcode Type</label>
            <select value={barcodeType} onChange={(e) => setBarcodeType(e.target.value)} className="w-full rounded-xl border p-2.5">
              {barcodeFamily === "matrix" ? (
                matrixFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.value}
                  </option>
                ))
              ) : (
                <>
                  <optgroup label="Standard">
                    {standardLinearFormats.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.value}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Advanced">
                    {advancedLinearFormats.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.value}
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">{matrixMode ? "Data Matrix Value" : "Barcode Value"}</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border p-2.5" />
            {barcodeRequirements.hint ? (
              <p className={`mt-2 text-xs ${hasFormatError ? "text-amber-700" : "text-slate-500"}`}>
                {barcodeRequirements.hint}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Print Format</label>
              <div className="inline-flex overflow-hidden rounded-2xl border border-slate-900 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPrintFormat("a4")}
                  className={`px-4 py-2.5 text-sm font-semibold transition ${printFormat === "a4" ? "bg-slate-950 text-white" : "bg-white text-slate-900 hover:bg-slate-50"}`}
                >
                  A4 Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat("roll")}
                  className={`border-l border-slate-900 px-4 py-2.5 text-sm font-semibold transition ${printFormat === "roll" ? "bg-slate-950 text-white" : "bg-white text-slate-900 hover:bg-slate-50"}`}
                >
                  Roll Printing
                </button>
              </div>
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
              <label className="mb-1 block text-sm">{matrixMode ? "Module Size" : "Width"}</label>
              <select value={widthPreset} onChange={(e) => setWidthPreset(e.target.value)} className="w-full rounded-xl border p-2.5">
                <option value="compact">Compact</option>
                <option value="medium">Medium</option>
                <option value="wide">Wide</option>
              </select>
            </div>
            {!matrixMode ? (
              <div>
                <label className="mb-1 block text-sm">Text Position</label>
                <select value={textPosition} onChange={(e) => setTextPosition(e.target.value)} className="w-full rounded-xl border p-2.5">
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Separate 2D path</p>
                <p className="mt-1">Data Matrix stays outside the linear dropdown and uses the dedicated 2D renderer path.</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              <label className="mb-1 block text-sm">Margin</label>
              <input
                type="range"
                min="8"
                max="30"
                step="2"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-slate-500">{margin}px</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {!matrixMode ? (
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <span className="mb-2 block font-semibold text-slate-900">Show Text</span>
                <select value={showText ? "yes" : "no"} onChange={(e) => setShowText(e.target.value === "yes")} className="w-full rounded-xl border p-2.5">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <span className="mb-2 block font-semibold text-slate-900">Output</span>
                <p className="text-slate-700">Data Matrix renders as a compact square symbol for labels and small surfaces.</p>
              </div>
            )}
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <span className="mb-2 block font-semibold text-slate-900">Line Color</span>
              <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="h-11 w-full rounded-xl border p-1" />
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <span className="mb-2 block font-semibold text-slate-900">Background</span>
              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-11 w-full rounded-xl border p-1" />
            </label>
          </div>

          {printFormat === "a4" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">A4 Print Settings</p>
                <p className="mt-1 text-sm text-slate-600">Arrange repeated barcodes on a full A4 sheet for office printing.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm">Paper Size</label>
                  <input value="A4" readOnly className="w-full rounded-xl border bg-white p-2.5 text-slate-600" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Label Preset</label>
                  <select value={a4Preset} onChange={(e) => setA4Preset(e.target.value)} className="w-full rounded-xl border p-2.5">
                    {a4PresetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm">Columns</label>
                  <input type="number" min="1" max="6" value={a4Columns} onChange={(e) => setA4Columns(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Rows</label>
                  <input type="number" min="1" max="20" value={a4Rows} onChange={(e) => setA4Rows(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-xl border p-2.5" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm">Horizontal Gap</label>
                  <input type="number" min="0" max="20" value={horizontalGap} onChange={(e) => setHorizontalGap(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Vertical Gap</label>
                  <input type="number" min="0" max="20" value={verticalGap} onChange={(e) => setVerticalGap(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm">Top Margin</label>
                  <input type="number" min="0" max="30" value={topMargin} onChange={(e) => setTopMargin(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Left Margin</label>
                  <input type="number" min="0" max="30" value={leftMargin} onChange={(e) => setLeftMargin(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Page Padding</label>
                  <input type="number" min="0" max="30" value={pagePadding} onChange={(e) => setPagePadding(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roll Print Settings</p>
                <p className="mt-1 text-sm text-slate-600">Set continuous-feed barcode sticker output for roll and thermal printers.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm">Printer Type</label>
                  <select value={rollPrinterType} onChange={(e) => setRollPrinterType(e.target.value)} className="w-full rounded-xl border p-2.5">
                    <option value="thermal">Thermal</option>
                    <option value="sticker-roll">Sticker Roll</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm">Roll Width (mm)</label>
                  <select value={rollWidth} onChange={(e) => setRollWidth(e.target.value)} className="w-full rounded-xl border p-2.5">
                    <option value="40">40</option>
                    <option value="50">50</option>
                    <option value="75">75</option>
                    <option value="100">100</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm">Label Height (mm)</label>
                  <input type="number" min="20" max="200" value={rollLabelHeight} onChange={(e) => setRollLabelHeight(e.target.value)} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Gap Between Labels (mm)</label>
                  <input type="number" min="0" max="20" value={rollGap} onChange={(e) => setRollGap(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm">Top Offset</label>
                  <input type="number" min="0" max="20" value={rollTopOffset} onChange={(e) => setRollTopOffset(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Left Margin</label>
                  <input type="number" min="0" max="20" value={rollLeftMargin} onChange={(e) => setRollLeftMargin(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border p-2.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Alignment</label>
                  <select value={rollAlignment} onChange={(e) => setRollAlignment(e.target.value)} className="w-full rounded-xl border p-2.5">
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="barcode-print-preview-panel space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{activeFormat.value} preview</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrintBarcode}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                Print Barcode
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => downloadFile(barcodeSvg, `${toDownloadName(value)}.svg`, "image/svg+xml")}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Download SVG
              </button>
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900">
                Use in Label
              </button>
            </div>
          </div>

          <div className="barcode-print-target-wrap rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="barcode-print-target space-y-5 rounded-3xl">
              {printFormat === "a4" ? (
                <>
                  <div className="barcode-print-screen-chrome rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">A4 Sheet Preview</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">{a4Layout.columns} x {a4Layout.rows} layout</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">{a4Layout.labelsPerPage} labels / page</span>
                        <span className="rounded-full bg-sky-100 px-3 py-2 font-semibold text-sky-800">{a4Layout.totalPages} page{a4Layout.totalPages === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>

                  {a4Layout.pages.map((page, pageIndex) => (
                    <div
                      key={`barcode-a4-page-${pageIndex}`}
                      className={`barcode-print-page-block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${pageIndex < a4Layout.pages.length - 1 ? "print-page-break" : ""}`}
                    >
                      <div
                        className="rounded-[2rem] border border-slate-300 bg-white shadow-inner"
                        style={{ padding: `${pagePadding}px` }}
                      >
                        <div
                          className="grid"
                          style={{
                            gridTemplateColumns: `repeat(${a4Layout.columns}, minmax(0, 1fr))`,
                            gap: `${verticalGap}px ${horizontalGap}px`,
                            paddingTop: `${topMargin}px`,
                            paddingLeft: `${leftMargin}px`,
                          }}
                        >
                          {page.map((item, index) => renderBarcodePrintCard(item, item.__printKey || `barcode-a4-${pageIndex}-${index}`, "sheet"))}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="barcode-print-screen-chrome flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roll Preview</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">{rollPrinterType === "thermal" ? "Thermal Roll" : "Sticker Roll"}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">{rollLayout.totalItems} stickers</span>
                      <span className="rounded-full bg-amber-100 px-3 py-2 font-semibold text-amber-800">~{rollLayout.estimatedLength} mm</span>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-center">
                    <div
                      className="rounded-[2rem] border border-slate-300 bg-slate-50 p-4 shadow-inner"
                      style={{
                        width: rollWidth === "custom" ? "22rem" : `${Math.max(12, Number(rollWidth) / 4)}rem`,
                        paddingTop: `${rollTopOffset}px`,
                        paddingLeft: `${rollLeftMargin}px`,
                      }}
                    >
                      <div className={`grid gap-3 ${rollAlignment === "center" ? "justify-items-center" : "justify-items-start"}`}>
                        {rollLayout.items.map((item, index) => (
                          <div key={item.__printKey || `barcode-roll-${index}`} className="w-full">
                            {renderBarcodePrintCard(item, item.__printKey || `barcode-roll-card-${index}`)}
                            <div className="mt-2 border-t border-dashed border-slate-300 pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Cut line
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>
      </div>
    </main>
  )
}
