"use client"

import { useEffect, useMemo, useState } from "react"
import Navbar from "../../components/Navbar"
import { apiRequest, API_BASE_URL } from "../../lib/api"
import { getAuthToken } from "../../lib/auth"

const STATUS_POLL_INTERVAL_MS = 3000
const BULK_QR_TYPES = [
  "URL",
  "Text",
  "Email",
  "Phone",
  "SMS",
  "WhatsApp",
  "vCard",
  "Location",
  "Youtube",
  "WIFI",
  "Event",
  "Bitcoin",
  "PDF",
  "Social Media",
  "App Store",
  "Image Gallery",
  "Rating",
  "Feedback",
]

const SAMPLE_ROWS_BY_TYPE = {
  URL: { content: "https://example.com" },
  Text: { content: "Hello from bulk QR" },
  Email: { email: "hello@example.com", subject: "Hello", body: "Message body" },
  Phone: { phone: "+919876543210" },
  SMS: { phone: "+919876543210", message: "Your SMS text" },
  WhatsApp: { phone: "919876543210", message: "Hello on WhatsApp" },
  vCard: {
    firstName: "John",
    lastName: "Doe",
    organization: "QRBulkGen",
    jobTitle: "Manager",
    phone: "+919876543210",
    email: "john@example.com",
    url: "https://example.com",
    address: "Bengaluru",
  },
  Location: { latitude: "12.9716", longitude: "77.5946" },
  Youtube: { url: "https://youtube.com/watch?v=abc123" },
  WIFI: { ssid: "MyWifi", password: "secret123", wifiType: "WPA", hidden: "false" },
  Event: {
    title: "Launch Event",
    start: "2026-03-20T10:00:00Z",
    end: "2026-03-20T12:00:00Z",
    location: "Bengaluru",
    description: "Product launch",
  },
  Bitcoin: { address: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT", amount: "0.001", label: "Payment", message: "Order123" },
  PDF: { url: "https://example.com/file.pdf" },
  "Social Media": { content: "Instagram: https://instagram.com/yourbrand\nTwitter: https://x.com/yourbrand" },
  "App Store": { url: "https://apps.apple.com/app/id000000" },
  "Image Gallery": { url: "https://example.com/gallery" },
  Rating: { title: "Rate your experience", style: "stars", scale: "5" },
  Feedback: { title: "Share your feedback", questions: "How was your experience?|Any suggestions?" },
}

function withAuthHeader() {
  const token = getAuthToken()
  if (!token) {
    throw new Error("Please login first")
  }
  return { Authorization: `Bearer ${token}` }
}

function toAbsoluteDownloadUrl(filePath) {
  if (!filePath) return ""
  if (/^https?:\/\//i.test(filePath)) return filePath
  const origin = API_BASE_URL.replace(/\/api\/?$/, "")
  return `${origin}${filePath}`
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [qrType, setQrType] = useState("URL")
  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [format, setFormat] = useState("png")
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M")
  const [filenamePrefix, setFilenamePrefix] = useState("qr")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [jobs, setJobs] = useState([])
  const [summary, setSummary] = useState(null)

  const activeJobs = useMemo(
    () => jobs.filter((job) => ["queued", "processing"].includes(job.status)),
    [jobs],
  )

  async function loadJobsAndSummary() {
    try {
      const headers = withAuthHeader()
      const [jobsData, summaryData] = await Promise.all([
        apiRequest("/qr/jobs?limit=20", { headers }),
        apiRequest("/qr/jobs/summary", { headers }),
      ])
      setJobs(jobsData.jobs || [])
      setSummary(summaryData.summary || null)
    } catch (loadError) {
      setError(loadError.message || "Failed to load bulk jobs")
    }
  }

  useEffect(() => {
    loadJobsAndSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeJobs.length) return undefined
    const interval = setInterval(() => {
      loadJobsAndSummary()
    }, STATUS_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobs.length])

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!file) {
      setError("Please select a CSV file.")
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("qrType", qrType)
      formData.append("size", String(size))
      formData.append("margin", String(margin))
      formData.append("format", format)
      formData.append("errorCorrectionLevel", errorCorrectionLevel)
      formData.append("filenamePrefix", filenamePrefix)
      formData.append("foregroundColor", foregroundColor)
      formData.append("backgroundColor", backgroundColor)

      const data = await apiRequest("/qr/bulk/upload", {
        method: "POST",
        headers: withAuthHeader(),
        body: formData,
      })

      setSuccess(`Bulk job queued: ${data?.job?.id || "created"}`)
      setFile(null)
      await loadJobsAndSummary()
    } catch (submitError) {
      setError(submitError.message || "Failed to create bulk job")
    } finally {
      setIsSubmitting(false)
    }
  }

  function downloadSampleCsv() {
    const row = SAMPLE_ROWS_BY_TYPE[qrType] || SAMPLE_ROWS_BY_TYPE.URL
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

  return (
    <div>
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Bulk QR Generator</h1>
        <p className="text-gray-600">Upload CSV with a required `content` column to generate QR codes in batch.</p>

        {summary && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border rounded p-4"><p className="text-sm text-gray-600">Total Jobs</p><p className="text-2xl font-bold">{summary.totalJobs}</p></div>
            <div className="border rounded p-4"><p className="text-sm text-gray-600">Requested</p><p className="text-2xl font-bold">{summary.totalRequested}</p></div>
            <div className="border rounded p-4"><p className="text-sm text-gray-600">Success</p><p className="text-2xl font-bold text-green-700">{summary.totalSuccess}</p></div>
            <div className="border rounded p-4"><p className="text-sm text-gray-600">Failure</p><p className="text-2xl font-bold text-red-700">{summary.totalFailure}</p></div>
          </section>
        )}

        <section className="border rounded p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Create Bulk Job</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">QR Type</label>
              <select
                value={qrType}
                onChange={(e) => setQrType(e.target.value)}
                className="w-full border p-2"
              >
                {BULK_QR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border p-2"
              />
              <p className="text-xs text-gray-600 mt-1">
                Download sample CSV for selected type and upload after filling your data.
              </p>
              <button
                type="button"
                className="mt-2 border px-3 py-2"
                onClick={downloadSampleCsv}
              >
                Download Sample CSV
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block mb-1 text-sm">Size</label>
                <input type="number" min={128} max={2048} value={size} onChange={(e) => setSize(Number(e.target.value || 512))} className="w-full border p-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Margin</label>
                <input type="number" min={0} max={16} value={margin} onChange={(e) => setMargin(Number(e.target.value || 2))} className="w-full border p-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border p-2">
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Error Correction</label>
                <select value={errorCorrectionLevel} onChange={(e) => setErrorCorrectionLevel(e.target.value)} className="w-full border p-2">
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block mb-1 text-sm">Foreground</label>
                <input type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="w-full border h-10 p-1" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Background</label>
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-full border h-10 p-1" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Filename Prefix</label>
                <input value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)} className="w-full border p-2" />
              </div>
            </div>

            {!!error && <p className="text-sm text-red-600">{error}</p>}
            {!!success && <p className="text-sm text-green-700">{success}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
            >
              {isSubmitting ? "Queuing..." : "Queue Bulk Job"}
            </button>
          </form>
        </section>

        <section className="border rounded p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Recent Bulk Jobs</h2>
          {!jobs.length && <p className="text-gray-600">No jobs yet.</p>}
          {!!jobs.length && (
            <div className="space-y-3">
              {jobs.map((job) => (
                <article key={job.id} className="border rounded p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-mono text-sm">{job.id}</p>
                    <span className="text-sm uppercase">{job.status}</span>
                  </div>
                  <p className="text-sm mt-1">File: {job.sourceFileName || "-"}</p>
                  <p className="text-sm">Type: {job.qrType || "-"}</p>
                  <p className="text-sm">Rows: {job.totalCount} | Success: {job.successCount} | Failure: {job.failureCount}</p>
                  {job.errorMessage && <p className="text-sm text-red-600 mt-1">{job.errorMessage}</p>}
                  {job.artifact?.filePath && (
                    <a
                      className="inline-block mt-2 underline"
                      href={toAbsoluteDownloadUrl(job.artifact.filePath)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download ZIP
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
