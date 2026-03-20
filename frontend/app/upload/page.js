"use client"

import { useEffect, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import Navbar from "../../components/Navbar"
import { API_BASE_URL, apiRequest } from "../../lib/api"
import { getAuthToken } from "../../lib/auth"
import {
  BULK_OPTIONAL_COLUMNS_BY_TYPE,
  BULK_QR_TYPES,
  BULK_REQUIRED_COLUMNS_BY_TYPE,
  BULK_SAMPLE_ROWS_BY_TYPE,
  getDefaultTrackingMode,
  supportsTrackingModeSelection,
  TRACKING_MODE_OPTIONS,
} from "../../../shared/qr-config"

function withAuthHeader() {
  const token = getAuthToken()
  if (!token) {
    throw new Error("Please login first")
  }
  return { Authorization: `Bearer ${token}` }
}

function previewFromSampleType(qrType) {
  const row = BULK_SAMPLE_ROWS_BY_TYPE[qrType] || BULK_SAMPLE_ROWS_BY_TYPE.URL
  const firstKey = Object.keys(row)[0]
  return String(row[firstKey] || "https://example.com")
}

export function BulkGenerateContent({ embedded = false }) {
  const previewRef = useRef(null)
  const qrCodeRef = useRef(null)
  const csvInputRef = useRef(null)
  const size = 512
  const margin = 2

  const [file, setFile] = useState(null)
  const [qrType, setQrType] = useState("URL")
  const [format, setFormat] = useState("png")
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M")
  const [filenamePrefix, setFilenamePrefix] = useState("qr")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [dotStyle, setDotStyle] = useState("rounded")
  const [cornerSquareStyle, setCornerSquareStyle] = useState("extra-rounded")
  const [cornerDotStyle, setCornerDotStyle] = useState("dot")
  const [logoDataUrl, setLogoDataUrl] = useState("")
  const [previewContent, setPreviewContent] = useState(previewFromSampleType("URL"))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadStatus, setUploadStatus] = useState("")
  const [recentJobs, setRecentJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [activeBulkJobId, setActiveBulkJobId] = useState("")
  const [editingJobId, setEditingJobId] = useState("")
  const [jobAnalysis, setJobAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [expiryOverride, setExpiryOverride] = useState("")
  const [trackingMode, setTrackingMode] = useState(getDefaultTrackingMode("URL"))

  function formatExpiryDateForInput(value) {
    const raw = String(value || "").trim()
    if (!raw) return ""
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return raw
    const day = String(parsed.getUTCDate()).padStart(2, "0")
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0")
    const year = parsed.getUTCFullYear()
    return `${day}-${month}-${year}`
  }

  useEffect(() => {
    setPreviewContent(previewFromSampleType(qrType))
    if (!editingJobId) {
      setFile(null)
      setTrackingMode(getDefaultTrackingMode(qrType))
      setUploadStatus("")
    }
    setError("")
    setSuccess("")
    if (csvInputRef.current) {
      csvInputRef.current.value = ""
    }
  }, [qrType])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editJob = params.get("editJob")
    if (!editJob) return

    async function loadEditPayload() {
      try {
        const data = await apiRequest(`/qr/jobs/${editJob}/edit-payload`, {
          headers: withAuthHeader(),
        })
        const job = data?.job
        if (!job || job.jobType !== "bulk") return
        setEditingJobId(job.id)
        setQrType(job.qrType || "URL")
        setFormat(job.format || "png")
        setErrorCorrectionLevel(job.errorCorrectionLevel || "M")
        setFilenamePrefix(job.filenamePrefix || "qr")
        setForegroundColor(job.foregroundColor || "#000000")
        setBackgroundColor(job.backgroundColor || "#ffffff")
        setExpiryOverride(formatExpiryDateForInput(job.expiresAt || ""))
      setTrackingMode(job.trackingMode || getDefaultTrackingMode(job.qrType || "URL"))
      setSuccess("Loaded this bulk job for update. Change the settings and save a fresh run.")
      setUploadStatus("Using the existing CSV for this bulk job.")
      setAnalysisLoading(true)
        const analysisData = await apiRequest(`/qr/jobs/${editJob}/analysis`, {
          headers: withAuthHeader(),
        })
        setJobAnalysis(analysisData.analysis || null)
        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.delete("editJob")
          window.history.replaceState({}, "", currentUrl.toString())
        }
      } catch (requestError) {
        setError(requestError.message || "Unable to load that bulk job for editing.")
      } finally {
        setAnalysisLoading(false)
      }
    }

    loadEditPayload()
  }, [])

  function getBackendOrigin() {
    const apiBase = String(API_BASE_URL || "").trim()
    if (!apiBase) return ""
    return apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase
  }

  function toArtifactUrl(filePath) {
    if (!filePath) return ""
    if (/^(https?:\/\/|data:)/i.test(filePath)) return filePath
    return `${getBackendOrigin()}${filePath.startsWith("/") ? filePath : `/${filePath}`}`
  }

  function handleArtifactDownload(job) {
    const fileUrl = toArtifactUrl(job?.artifact?.filePath)
    if (!fileUrl) return

    const link = document.createElement("a")
    link.href = fileUrl
    link.download = job?.artifact?.fileName || `bulk-${job?.id || "job"}.zip`
    if (!fileUrl.startsWith("data:")) {
      link.target = "_blank"
      link.rel = "noreferrer"
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getBulkJobProgress(job) {
    const total = Number(job?.totalCount || 0)
    const success = Number(job?.successCount || 0)
    const failure = Number(job?.failureCount || 0)
    const processed = success + failure
    return {
      total,
      processed,
      percent: total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0,
    }
  }

  async function handleArtifactShare(job) {
    const fileUrl = toArtifactUrl(job?.artifact?.filePath)
    if (!fileUrl) {
      setError("ZIP file is not ready yet.")
      return
    }

    try {
      if (navigator?.share) {
        const response = await fetch(fileUrl)
        const blob = await response.blob()
        const file = new File([blob], job?.artifact?.fileName || `bulk-${job?.id || "job"}.zip`, {
          type: blob.type || "application/zip",
        })

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "Bulk QR ZIP",
            text: `Sharing bulk QR ZIP for job ${job?.id || ""}`.trim(),
            files: [file],
          })
        } else {
          await navigator.share({
            title: "Bulk QR ZIP",
            text: "Download the generated bulk QR ZIP",
            url: fileUrl,
          })
        }
        setSuccess("ZIP share sheet opened.")
        return
      }

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fileUrl)
        setSuccess("ZIP download link copied to clipboard.")
        return
      }

      setError("Sharing is not supported in this browser. Use Download ZIP instead.")
    } catch (shareError) {
      if (shareError?.name === "AbortError") return
      setError(shareError.message || "Failed to share ZIP file.")
    }
  }

  async function fetchBulkJobs() {
    try {
      setLoadingJobs(true)
      const data = await apiRequest("/qr/jobs?limit=10&jobType=bulk", {
        method: "GET",
        headers: withAuthHeader(),
      })
      setRecentJobs(Array.isArray(data?.jobs) ? data.jobs : [])
    } catch {
      setRecentJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    fetchBulkJobs()
    const timer = setInterval(fetchBulkJobs, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!previewRef.current || !previewContent.trim()) {
      if (previewRef.current) previewRef.current.innerHTML = ""
      return
    }

    const options = {
      width: 340,
      height: 340,
      type: "canvas",
      data: previewContent.trim(),
      image: logoDataUrl || undefined,
      dotsOptions: { color: foregroundColor, type: dotStyle },
      backgroundOptions: { color: backgroundColor },
      cornersSquareOptions: { color: foregroundColor, type: cornerSquareStyle },
      cornersDotOptions: { color: foregroundColor, type: cornerDotStyle },
      qrOptions: { errorCorrectionLevel },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.35,
        margin: 4,
        crossOrigin: "anonymous",
      },
    }

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options)
      previewRef.current.innerHTML = ""
      qrCodeRef.current.append(previewRef.current)
      return
    }

    qrCodeRef.current.update(options)
  }, [
    previewContent,
    foregroundColor,
    backgroundColor,
    errorCorrectionLevel,
    dotStyle,
    cornerSquareStyle,
    cornerDotStyle,
    logoDataUrl,
  ])

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""))
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!file && !editingJobId) {
      setError("Please select a CSV file.")
      return
    }
    try {
      setIsSubmitting(true)
      setUploadStatus(editingJobId ? "Uploading updated bulk settings..." : `Uploading ${file.name}...`)
      const formData = new FormData()
      if (file) {
        formData.append("file", file)
      }
      formData.append("qrType", qrType)
      formData.append("size", String(size))
      formData.append("margin", String(margin))
      formData.append("format", format === "jpg" ? "png" : format)
      formData.append("errorCorrectionLevel", errorCorrectionLevel)
      formData.append("filenamePrefix", filenamePrefix)
      formData.append("foregroundColor", foregroundColor)
      formData.append("backgroundColor", backgroundColor)
      formData.append("expiresAt", expiryOverride)
      formData.append("trackingMode", trackingMode)

      const data = await apiRequest(editingJobId ? `/qr/jobs/${editingJobId}/bulk` : "/qr/bulk/upload", {
        method: editingJobId ? "PUT" : "POST",
        headers: withAuthHeader(),
        body: formData,
      })

      const nextJobId = data?.job?.id || editingJobId || ""
      setActiveBulkJobId(nextJobId)
      setSuccess(editingJobId ? `Bulk job updated: ${nextJobId}` : `Bulk QR generation started: ${nextJobId || "created"}`)
      setUploadStatus(editingJobId ? "Bulk job updated and generation restarted." : "CSV uploaded and bulk QR generation started.")
      setFile(null)
      if (csvInputRef.current) {
        csvInputRef.current.value = ""
      }
      fetchBulkJobs()
      if (editingJobId) {
        const analysisData = await apiRequest(`/qr/jobs/${editingJobId}/analysis`, {
          headers: withAuthHeader(),
        })
        setJobAnalysis(analysisData.analysis || null)
      }
    } catch (submitError) {
      setError(submitError.message || `Failed to ${editingJobId ? "update" : "create"} bulk job`)
      setUploadStatus("Upload failed. You can select the CSV again and retry.")
      if (csvInputRef.current) {
        csvInputRef.current.value = ""
      }
      setFile(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCsvChange(event) {
    const nextFile = event.target.files?.[0] || null
    setFile(nextFile)
    setUploadStatus(nextFile ? `Selected CSV: ${nextFile.name}` : "")
  }

  function downloadSampleCsv() {
    const baseRow = BULK_SAMPLE_ROWS_BY_TYPE[qrType] || BULK_SAMPLE_ROWS_BY_TYPE.URL
    const row = { ...baseRow, filename: baseRow.filename || `qr-${qrType.toLowerCase().replace(/\s+/g, "-")}-1` }
    const headers = Object.keys(row)
    const values = headers.map((header) => {
      const value = String(row[header] ?? "")
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    const csv = `${headers.join(",")}\n${values.join(",")}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `bulk-sample-${qrType.toLowerCase().replace(/\s+/g, "-")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const activeBulkJob =
    recentJobs.find((job) => job.id === activeBulkJobId) ||
    recentJobs[0] ||
    null
  const activeBulkProgress = getBulkJobProgress(activeBulkJob)
  const isActiveBulkZipReady = Boolean(activeBulkJob?.artifact?.filePath)
  const isActiveBulkFinishedWithoutZip =
    Boolean(activeBulkJob) &&
    activeBulkProgress.total > 0 &&
    activeBulkProgress.processed >= activeBulkProgress.total &&
    !isActiveBulkZipReady
  const activeBulkPercent = Math.max(0, Math.min(activeBulkProgress.percent || 0, 100))
  const shouldShowActiveBulkError =
    Boolean(activeBulkJob?.errorMessage) &&
    (!activeBulkJob?.qrType || activeBulkJob.qrType === qrType)

  const content = (
    <main className="mx-auto max-w-[90rem] px-4 py-10 md:px-5">
        <h1 className="text-3xl font-bold">Bulk QR Generator</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <form id="bulk-qr-form" onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:max-h-[78vh] xl:overflow-y-auto xl:pr-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bulk Data</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{editingJobId ? "Update Bulk QR" : "Generate Bulk QR"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the bulk QR type, lock in the preview sample, and attach the CSV that drives the generated batch.
              </p>
            </div>

            <div>
              <label className="block mb-1 text-sm">QR Type</label>
              <select value={qrType} onChange={(e) => setQrType(e.target.value)} className="w-full border p-2" disabled={Boolean(editingJobId)}>
                {BULK_QR_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Selecting a QR type updates the sample columns and the live preview automatically.
              </p>
            </div>

            <div>
              <label className="block mb-1 text-sm">CSV File</label>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onClick={(e) => {
                  e.currentTarget.value = ""
                }}
                onChange={handleCsvChange}
                className="w-full border p-2"
                disabled={Boolean(editingJobId)}
              />
              {editingJobId && <p className="mt-2 text-xs text-slate-500">Updating keeps the existing CSV for this job.</p>}
              {!!uploadStatus && <p className="mt-2 text-xs font-medium text-slate-600">{uploadStatus}</p>}
              <button type="button" className="mt-2 border px-3 py-2" onClick={downloadSampleCsv}>Download Sample CSV</button>
              <p className="mt-2 text-xs text-gray-600">
                CSV must include a <code>filename</code> column. Each row uses that value as the downloaded QR file name.
              </p>
              {(qrType === "PDF" || qrType === "Image Gallery") && (
                <p className="mt-2 text-xs text-gray-600">
                  Use the <code>url</code> column with a public <code>http://</code> or <code>https://</code> link. Local drive paths are not supported for bulk PDF or Image Gallery jobs.
                </p>
              )}
              <div className="mt-3 p-3 border rounded bg-gray-50">
                <p className="text-xs font-semibold text-gray-800">Required CSV columns for {qrType}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(BULK_REQUIRED_COLUMNS_BY_TYPE[qrType] || ["content", "filename"]).map((column) => (
                    <span key={column} className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      {column}
                    </span>
                  ))}
                </div>
                {!!BULK_OPTIONAL_COLUMNS_BY_TYPE[qrType]?.length && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-gray-800">Optional validity column</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BULK_OPTIONAL_COLUMNS_BY_TYPE[qrType].map((column) => (
                        <span key={column} className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                          {column}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-700 mt-2">
                      Use <code>DD-MM-YYYY</code>. If you leave it blank, the QR defaults to 6 months from creation and stays valid until the end of the selected day.
                    </p>
                  </>
                )}
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-800">Example row preview</p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-2 bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span>Column</span>
                      <span>Example value</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {Object.entries(BULK_SAMPLE_ROWS_BY_TYPE[qrType] || BULK_SAMPLE_ROWS_BY_TYPE.URL).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-2 gap-3 px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-700">{key}</span>
                          <code className="break-all rounded bg-slate-50 px-2 py-1 text-slate-700">
                            {String(value || (key === "expiresAt" ? "31-12-2026" : ""))}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customization</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Style and validity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Adjust expiry, error correction, colors, corners, logo, and archive-ready ZIP naming before you queue the run.
              </p>
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm">Last Scan Date / Expiry Override</label>
                <input
                  value={expiryOverride}
                  onChange={(e) => setExpiryOverride(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="h-10 w-full border px-3"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Error Correction</label>
                <select value={errorCorrectionLevel} onChange={(e) => setErrorCorrectionLevel(e.target.value)} className="h-10 w-full border px-3">
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Foreground</label>
                <input type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="w-full border h-10 p-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Background</label>
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-full border h-10 p-1" />
              </div>
              <div>
                <label className="block mb-1 text-sm">ZIP Filename Prefix</label>
                <input value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)} className="w-full border p-2" />
              </div>
            </div>
            {supportsTrackingModeSelection(qrType) ? (
              <div>
                <label className="block mb-1 text-sm">Tracking Mode</label>
                <select value={trackingMode} onChange={(e) => setTrackingMode(e.target.value)} className="w-full border p-2">
                  {TRACKING_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Tracked analytics routes each row through QRBulkGen for reporting. Direct open writes the destination directly into each QR file.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Dot Style</label>
                <select value={dotStyle} onChange={(e) => setDotStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option>
                  <option value="dots">Dots</option>
                  <option value="rounded">Rounded</option>
                  <option value="classy">Classy</option>
                  <option value="classy-rounded">Classy Rounded</option>
                  <option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Corner Square</label>
                <select value={cornerSquareStyle} onChange={(e) => setCornerSquareStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option>
                  <option value="dot">Dot</option>
                  <option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Corner Dot</label>
                <select value={cornerDotStyle} onChange={(e) => setCornerDotStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option>
                  <option value="dot">Dot</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Logo (optional)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full border p-2" />
              </div>
            </div>

            {!!error && <p className="text-sm text-red-600">{error}</p>}
            {!!success && <p className="text-sm text-green-700">{success}</p>}

            <button form="bulk-qr-form" type="submit" disabled={isSubmitting} className="px-4 py-2 bg-black text-white rounded disabled:opacity-60">
              {isSubmitting ? (editingJobId ? "Updating..." : "Generating...") : (editingJobId ? "Update Bulk QR" : "Generate Bulk QR")}
            </button>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            {!previewContent.trim() && <p className="mt-4 text-gray-600">Add preview content to generate QR instantly.</p>}
            <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div ref={previewRef} className="flex justify-center" />
            </div>
            <div>
              <label className="block mb-1">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border p-2 mb-3">
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Live preview uses the selected QR type’s sample content so you can style the batch before upload.
            </p>
            {loadingJobs && !activeBulkJob ? (
              <p className="text-sm text-slate-500">Loading bulk generation status...</p>
            ) : null}
            {activeBulkJob ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                  <span>Bulk QR generation {activeBulkPercent}% complete</span>
                  <span>Processed {activeBulkProgress.processed} of {activeBulkProgress.total || 0}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${isActiveBulkZipReady ? "bg-emerald-500" : isActiveBulkFinishedWithoutZip ? "bg-rose-500" : "bg-sky-500"}`}
                    style={{ width: `${activeBulkPercent}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  Succeeded: {activeBulkJob?.successCount || 0} / Failed: {activeBulkJob?.failureCount || 0}
                </p>
                {shouldShowActiveBulkError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    {activeBulkJob.errorMessage}
                  </div>
                ) : null}
                {isActiveBulkFinishedWithoutZip && !shouldShowActiveBulkError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    Bulk QR generation finished with no ZIP available. Succeeded: {activeBulkJob?.successCount || 0} / Failed: {activeBulkJob?.failureCount || 0}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleArtifactDownload(activeBulkJob)}
                disabled={!isActiveBulkZipReady}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download ZIP
              </button>
              <button
                type="button"
                onClick={() => handleArtifactShare(activeBulkJob)}
                disabled={!isActiveBulkZipReady}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Share ZIP
              </button>
            </div>
          </section>
        </div>

        {analysisLoading && <p className="mt-6 text-sm text-slate-500">Loading analysis...</p>}
        {!analysisLoading && jobAnalysis && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis for this QR job</p>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Quick Insight</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{jobAnalysis.insight}</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Requested</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{jobAnalysis.job?.totalCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Success</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">{jobAnalysis.job?.successCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Failure</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">{jobAnalysis.job?.failureCount || 0}</p>
              </div>
            </div>
          </section>
        )}
      </main>
  )

  if (embedded) {
    return content
  }

  return (
    <div>
      <Navbar />
      {content}
    </div>
  )
}

export default function UploadPage() {
  return <BulkGenerateContent />
}
