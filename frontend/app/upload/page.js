"use client"

import { useEffect, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import Navbar from "../../components/Navbar"
import { API_BASE_URL, apiRequest } from "../../lib/api"
import { getAuthToken } from "../../lib/auth"

const DOWNLOAD_RESOLUTIONS = [512, 768, 1024, 1536, 2048]
const BULK_QR_TYPES = [
  "App Store",
  "Email",
  "Event",
  "Rating",
  "Feedback",
  "Image Gallery",
  "Location",
  "PDF",
  "Phone",
  "SMS",
  "Social Media",
  "Text",
  "URL",
  "vCard",
  "WhatsApp",
  "WIFI",
  "Youtube",
]

const SAMPLE_ROWS_BY_TYPE = {
  URL: { content: "https://example.com", filename: "qr-url-1", expiresAt: "" },
  Text: { content: "Hello from bulk QR", filename: "qr-text-1", expiresAt: "" },
  Email: { email: "hello@example.com", subject: "Hello", body: "Message body", filename: "qr-email-1", expiresAt: "" },
  Phone: { phone: "+919876543210", filename: "qr-phone-1", expiresAt: "" },
  SMS: { phone: "+919876543210", message: "Your SMS text", filename: "qr-sms-1", expiresAt: "" },
  WhatsApp: { phone: "919876543210", message: "Hello on WhatsApp", filename: "qr-whatsapp-1", expiresAt: "" },
  vCard: {
    firstName: "John",
    lastName: "Doe",
    organization: "QRBulkGen",
    jobTitle: "Manager",
    phone: "+919876543210",
    email: "john@example.com",
    url: "https://example.com",
    address: "Bengaluru",
    filename: "qr-vcard-1",
    expiresAt: "",
  },
  Location: { latitude: "12.9716", longitude: "77.5946", filename: "qr-location-1", expiresAt: "" },
  Youtube: { url: "https://youtube.com/watch?v=abc123", filename: "qr-youtube-1", expiresAt: "" },
  WIFI: { ssid: "MyWifi", password: "secret123", wifiType: "WPA", hidden: "false", filename: "qr-wifi-1", expiresAt: "" },
  Event: {
    title: "Launch Event",
    start: "2026-03-20T10:00:00Z",
    end: "2026-03-20T12:00:00Z",
    location: "Bengaluru",
    description: "Product launch",
    filename: "qr-event-1",
    expiresAt: "",
  },
  PDF: { url: "https://www.qrbulkgen.com/pdf/your-public-id", filename: "qr-pdf-1", expiresAt: "2026-04-30T23:59:59Z" },
  "Social Media": {
    content: "Instagram: https://instagram.com/yourbrand\nTwitter: https://x.com/yourbrand",
    filename: "qr-social-1",
    expiresAt: "",
  },
  "App Store": { url: "https://apps.apple.com/app/id000000", filename: "qr-appstore-1", expiresAt: "" },
  "Image Gallery": { url: "https://www.qrbulkgen.com/gallery/your-public-id", filename: "qr-gallery-1", expiresAt: "2026-04-30T23:59:59Z" },
  Rating: { title: "Rate your experience", style: "stars", scale: "5", filename: "qr-rating-1", expiresAt: "2026-04-30T23:59:59Z" },
  Feedback: { title: "Share your feedback", questions: "How was your experience?|Any suggestions?", filename: "qr-feedback-1", expiresAt: "2026-04-30T23:59:59Z" },
}

const REQUIRED_COLUMNS_BY_TYPE = {
  URL: ["content", "filename"],
  Text: ["content", "filename"],
  Email: ["email", "subject", "body", "filename"],
  Phone: ["phone", "filename"],
  SMS: ["phone", "message", "filename"],
  WhatsApp: ["phone", "message", "filename"],
  vCard: ["firstName", "lastName", "organization", "jobTitle", "phone", "email", "url", "address", "filename"],
  Location: ["latitude", "longitude", "filename"],
  Youtube: ["url", "filename"],
  WIFI: ["ssid", "password", "wifiType", "hidden", "filename"],
  Event: ["title", "start", "end", "location", "description", "filename"],
  PDF: ["url", "filename"],
  "Social Media": ["content", "filename"],
  "App Store": ["url", "filename"],
  "Image Gallery": ["url", "filename"],
  Rating: ["title", "style", "scale", "filename"],
  Feedback: ["title", "questions", "filename"],
}

const OPTIONAL_COLUMNS_BY_TYPE = {
  PDF: ["expiresAt"],
  "Image Gallery": ["expiresAt"],
  Rating: ["expiresAt"],
  Feedback: ["expiresAt"],
}

function withAuthHeader() {
  const token = getAuthToken()
  if (!token) {
    throw new Error("Please login first")
  }
  return { Authorization: `Bearer ${token}` }
}

function previewFromSampleType(qrType) {
  const row = SAMPLE_ROWS_BY_TYPE[qrType] || SAMPLE_ROWS_BY_TYPE.URL
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
  const [downloadResolution, setDownloadResolution] = useState(1024)
  const [previewContent, setPreviewContent] = useState(previewFromSampleType("URL"))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [recentJobs, setRecentJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  useEffect(() => {
    setPreviewContent(previewFromSampleType(qrType))
    setFile(null)
    setError("")
    setSuccess("")
    if (csvInputRef.current) {
      csvInputRef.current.value = ""
    }
  }, [qrType])

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

  async function fetchRecentJobs() {
    try {
      setLoadingJobs(true)
      const data = await apiRequest("/qr/jobs?limit=10", {
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

  function handleDownloadPreview() {
    if (!qrCodeRef.current || !previewContent.trim()) return
    qrCodeRef.current.update({
      width: downloadResolution,
      height: downloadResolution,
    })
    const name = (filenamePrefix || "bulk-preview").replace(/[^a-zA-Z0-9-_]/g, "") || "bulk-preview"
    const downloadExtension = format === "jpg" ? "jpeg" : format
    qrCodeRef.current.download({ name, extension: downloadExtension })
    qrCodeRef.current.update({ width: 340, height: 340 })
  }

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
      formData.append("format", format === "jpg" ? "png" : format)
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
      fetchBulkJobs()
    } catch (submitError) {
      setError(submitError.message || "Failed to create bulk job")
    } finally {
      setIsSubmitting(false)
    }
  }

  function downloadSampleCsv() {
    const baseRow = SAMPLE_ROWS_BY_TYPE[qrType] || SAMPLE_ROWS_BY_TYPE.URL
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

  const content = (
    <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Bulk QR Generator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-white space-y-4">
            <h2 className="text-xl font-semibold">Create Bulk Job</h2>

            <div>
              <label className="block mb-1 text-sm">QR Type</label>
              <select value={qrType} onChange={(e) => setQrType(e.target.value)} className="w-full border p-2">
                {BULK_QR_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm">Preview Content</label>
              <textarea
                rows={3}
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="w-full border p-2"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">CSV File</label>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border p-2"
              />
              <button type="button" className="mt-2 border px-3 py-2" onClick={downloadSampleCsv}>Download Sample CSV</button>
              <p className="mt-2 text-xs text-gray-600">
                CSV must include a <code>filename</code> column. Each row uses that value as the downloaded QR file name.
              </p>
              <div className="mt-3 p-3 border rounded bg-gray-50">
                <p className="text-xs font-semibold text-gray-800">Required CSV columns for {qrType}</p>
                <p className="text-xs text-gray-700 mt-1">
                  {(REQUIRED_COLUMNS_BY_TYPE[qrType] || ["content", "filename"]).join(", ")}
                </p>
                {!!OPTIONAL_COLUMNS_BY_TYPE[qrType]?.length && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-gray-800">Optional validity column</p>
                    <p className="text-xs text-gray-700 mt-1">
                      {OPTIONAL_COLUMNS_BY_TYPE[qrType].join(", ")}. You can use <code>MM/DD/YYYY</code>, <code>DD/MM/YYYY</code>, or ISO format.
                      If time is not given, the QR stays valid until the end of that day. If left blank, validity defaults to 6 months from creation.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Error Correction</label>
                <select value={errorCorrectionLevel} onChange={(e) => setErrorCorrectionLevel(e.target.value)} className="w-full border p-2">
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

            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-black text-white rounded disabled:opacity-60">
              {isSubmitting ? "Queuing..." : "Queue Bulk Job"}
            </button>
          </form>

          <section className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            {!previewContent.trim() && <p className="mt-4 text-gray-600">Add preview content to generate QR instantly.</p>}
            <div ref={previewRef} className="mt-4 flex justify-center" />
            <div className="mt-4">
              <label className="block mb-1">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border p-2 mb-3">
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="svg">SVG</option>
              </select>
              <label className="block mb-1">Download Resolution</label>
              <select value={downloadResolution} onChange={(e) => setDownloadResolution(Number(e.target.value))} className="w-full border p-2">
                {DOWNLOAD_RESOLUTIONS.map((res) => (
                  <option key={res} value={res}>{res} x {res}</option>
                ))}
              </select>
            </div>
            {!!previewContent.trim() && (
              <button type="button" onClick={handleDownloadPreview} className="inline-block mt-4 px-4 py-2 bg-black text-white rounded">
                Download QR
              </button>
            )}
          </section>
        </div>

        <section className="border rounded-lg p-6 bg-white mt-8">
          <h2 className="text-xl font-semibold">Recent Bulk Jobs</h2>
          {loadingJobs && <p className="text-sm text-gray-600 mt-3">Loading jobs...</p>}
          {!loadingJobs && recentJobs.length === 0 && (
            <p className="text-sm text-gray-600 mt-3">No jobs yet.</p>
          )}
          {recentJobs.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Job</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Count</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => {
                    const fileUrl = toArtifactUrl(job?.artifact?.filePath)
                    return (
                      <tr key={job.id} className="border-b">
                        <td className="py-2 pr-3">{job.id}</td>
                        <td className="py-2 pr-3">{job.qrType}</td>
                        <td className="py-2 pr-3">{job.status}</td>
                        <td className="py-2 pr-3">
                          {job.successCount}/{job.totalCount}
                        </td>
                        <td className="py-2 pr-3">
                          {job.status === "completed" && fileUrl ? (
                            <button
                              type="button"
                              onClick={() => handleArtifactDownload(job)}
                              className="inline-block px-3 py-1 bg-black text-white rounded"
                            >
                              Download ZIP
                            </button>
                          ) : (
                            <span className="text-gray-500">Not ready</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
