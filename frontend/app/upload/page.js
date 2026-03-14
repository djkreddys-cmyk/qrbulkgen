"use client"

import { useEffect, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import Navbar from "../../components/Navbar"
import { apiRequest } from "../../lib/api"
import { getAuthToken } from "../../lib/auth"

const DOWNLOAD_RESOLUTIONS = [512, 768, 1024, 1536, 2048]
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
  Bitcoin: {
    address: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
    amount: "0.001",
    label: "Payment",
    message: "Order123",
  },
  PDF: { url: "https://example.com/file.pdf" },
  "Social Media": {
    content: "Instagram: https://instagram.com/yourbrand\nTwitter: https://x.com/yourbrand",
  },
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

function previewFromSampleType(qrType) {
  const row = SAMPLE_ROWS_BY_TYPE[qrType] || SAMPLE_ROWS_BY_TYPE.URL
  const firstKey = Object.keys(row)[0]
  return String(row[firstKey] || "https://example.com")
}

export default function UploadPage() {
  const previewRef = useRef(null)
  const qrCodeRef = useRef(null)

  const [file, setFile] = useState(null)
  const [qrType, setQrType] = useState("URL")
  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [format, setFormat] = useState("png")
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M")
  const [filenamePrefix, setFilenamePrefix] = useState("qr")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [downloadResolution, setDownloadResolution] = useState(1024)
  const [previewContent, setPreviewContent] = useState(previewFromSampleType("URL"))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    setPreviewContent(previewFromSampleType(qrType))
  }, [qrType])

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
      dotsOptions: { color: foregroundColor, type: "rounded" },
      backgroundOptions: { color: backgroundColor },
      cornersSquareOptions: { color: foregroundColor, type: "extra-rounded" },
      cornersDotOptions: { color: foregroundColor, type: "dot" },
      qrOptions: { errorCorrectionLevel },
    }

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options)
      previewRef.current.innerHTML = ""
      qrCodeRef.current.append(previewRef.current)
      return
    }

    qrCodeRef.current.update(options)
  }, [previewContent, foregroundColor, backgroundColor, errorCorrectionLevel])

  function handleDownloadPreview() {
    if (!qrCodeRef.current || !previewContent.trim()) return
    qrCodeRef.current.update({
      width: downloadResolution,
      height: downloadResolution,
    })
    const name = (filenamePrefix || "bulk-preview").replace(/[^a-zA-Z0-9-_]/g, "") || "bulk-preview"
    qrCodeRef.current.download({ name, extension: "png" })
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
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border p-2" />
              <button type="button" className="mt-2 border px-3 py-2" onClick={downloadSampleCsv}>Download Sample CSV</button>
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

            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-black text-white rounded disabled:opacity-60">
              {isSubmitting ? "Queuing..." : "Queue Bulk Job"}
            </button>
          </form>

          <section className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            {!previewContent.trim() && <p className="mt-4 text-gray-600">Add preview content to generate QR instantly.</p>}
            <div ref={previewRef} className="mt-4 flex justify-center" />
            <div className="mt-4">
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
      </main>
    </div>
  )
}
