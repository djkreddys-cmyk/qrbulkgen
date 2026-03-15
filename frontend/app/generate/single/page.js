"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import Navbar from "../../../components/Navbar"
import { apiRequest } from "../../../lib/api"
import { getAuthToken } from "../../../lib/auth"
import {
  DOWNLOAD_RESOLUTIONS,
  QR_FIELD_DEFINITIONS,
  QR_TYPES,
  SOCIAL_PLATFORM_OPTIONS,
  validateQrFields,
} from "../../../../shared/qr-config"

function toUtcDateTime(value) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mi = String(d.getUTCMinutes()).padStart(2, "0")
  const ss = String(d.getUTCSeconds()).padStart(2, "0")
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`
}

function fallbackEventStartUtc() {
  return toUtcDateTime(new Date().toISOString())
}

function fallbackEventEndUtc() {
  const end = new Date(Date.now() + 60 * 60 * 1000)
  return toUtcDateTime(end.toISOString())
}

function encodePayload(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
}

function normalizeSiteOrigin(value, fallbackOrigin) {
  const raw = String(value || "").trim()
  if (!raw) return fallbackOrigin
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProtocol).origin
  } catch {
    return fallbackOrigin
  }
}

function addMonths(date, months) {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`
}

function getLuminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

async function extractBrandPalette(dataUrl) {
  if (!dataUrl || typeof window === "undefined") {
    return null
  }

  return await new Promise((resolve) => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = 48
        canvas.height = 48
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(image, 0, 0, 48, 48)
        const { data } = ctx.getImageData(0, 0, 48, 48)
        let primary = null
        let accent = null
        let primaryScore = -1
        let accentScore = -1

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          if (a < 140) continue

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const saturation = max === 0 ? 0 : (max - min) / max
          const luminance = getLuminance(r, g, b)
          if (luminance > 0.94 || saturation < 0.08) continue

          const primaryCandidateScore = saturation * (1.2 - luminance)
          const accentCandidateScore = saturation * (0.6 + (1 - Math.abs(luminance - 0.55)))

          if (primaryCandidateScore > primaryScore) {
            primaryScore = primaryCandidateScore
            primary = { r, g, b }
          }

          if (accentCandidateScore > accentScore) {
            accentScore = accentCandidateScore
            accent = { r, g, b }
          }
        }

        resolve({
          primary: primary ? rgbToHex(primary.r, primary.g, primary.b) : "#0f172a",
          accent: accent ? rgbToHex(accent.r, accent.g, accent.b) : "#1d4ed8",
        })
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = dataUrl
  })
}

function parseExpiryDate(value) {
  const raw = String(value || "").trim()
  if (!raw) return null

  if (raw.includes("T")) {
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dashMatch) {
    const day = Number(dashMatch[1])
    const month = Number(dashMatch[2])
    const year = Number(dashMatch[3])
    const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    const parsed = new Date(`${raw}T23:59:59.999Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function formatExpiryDateForInput(value) {
  const parsed = parseExpiryDate(value)
  if (!parsed) return ""
  const day = String(parsed.getUTCDate()).padStart(2, "0")
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0")
  const year = parsed.getUTCFullYear()
  return `${day}-${month}-${year}`
}

function toExpiryQueryValue(value) {
  const parsed = parseExpiryDate(value)
  return parsed ? parsed.toISOString() : ""
}

function getManagedTitleForQrType(type, fields) {
  const map = {
    URL: fields.url,
    Text: fields.text,
    Email: fields.subject || fields.email,
    Phone: fields.phone,
    SMS: fields.smsMessage || fields.smsPhone,
    WhatsApp: fields.whatsappMessage || fields.whatsappPhone,
    vCard: `${fields.firstName || ""} ${fields.lastName || ""}`.trim(),
    Location: `${fields.latitude || ""}, ${fields.longitude || ""}`.trim(),
    Youtube: fields.youtubeUrl,
    WIFI: fields.wifiSsid,
    Event: fields.eventTitle,
    PDF: fields.pdfUrl || "PDF Document",
    "Social Media": "Social media links",
    "App Store": fields.appStoreUrl,
    "Image Gallery": fields.galleryUrl || "Image Gallery",
    Rating: fields.ratingTitle,
    Feedback: fields.feedbackTitle,
  }

  return String(map[type] || type || "QR Code").trim() || String(type || "QR Code")
}

function buildQrContent(type, fields, appOrigin, ids, socialLinks, expiryDate) {
  switch (type) {
    case "URL":
      return fields.url.trim()
    case "Text":
      return fields.text.trim()
    case "Email":
      return `mailto:${fields.email.trim()}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.body || "")}`
    case "Phone":
      return `tel:${fields.phone.trim()}`
    case "SMS":
      return `SMSTO:${fields.smsPhone.trim()}:${fields.smsMessage || ""}`
    case "WhatsApp": {
      const phone = String(fields.whatsappPhone || "").replace(/[^\d]/g, "")
      const text = fields.whatsappMessage ? `?text=${encodeURIComponent(fields.whatsappMessage)}` : ""
      return `https://wa.me/${phone}${text}`
    }
    case "vCard":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${fields.lastName || ""};${fields.firstName || ""}`,
        `FN:${fields.firstName || ""} ${fields.lastName || ""}`.trim(),
        `ORG:${fields.organization || ""}`,
        `TITLE:${fields.jobTitle || ""}`,
        `TEL:${fields.vcardPhone || ""}`,
        `EMAIL:${fields.vcardEmail || ""}`,
        `URL:${fields.vcardUrl || ""}`,
        `ADR:;;${fields.address || ""}`,
        "END:VCARD",
      ].join("\n")
    case "Location":
      return `geo:${fields.latitude.trim()},${fields.longitude.trim()}`
    case "Youtube":
      return fields.youtubeUrl.trim()
    case "WIFI":
      return `WIFI:T:${fields.wifiType || "WPA"};S:${fields.wifiSsid || ""};P:${fields.wifiPassword || ""};H:${fields.wifiHidden ? "true" : "false"};;`
    case "Event":
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${fields.eventTitle || ""}`,
        `DTSTART:${toUtcDateTime(fields.eventStart) || fallbackEventStartUtc()}`,
        `DTEND:${toUtcDateTime(fields.eventEnd) || fallbackEventEndUtc()}`,
        `LOCATION:${fields.eventLocation || ""}`,
        `DESCRIPTION:${fields.eventDescription || ""}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n")
    case "PDF":
      return ids.pdfLinkId ? `${appOrigin}/pdf/${ids.pdfLinkId}` : fields.pdfUrl.trim()
    case "Social Media":
      return socialLinks
        .map((item) => {
          const platform = item.platform === "Custom" ? item.customPlatform : item.platform
          const label = String(platform || "").trim()
          const url = String(item.url || "").trim()
          if (!label || !url) return ""
          return `${label}: ${url}`
        })
        .filter(Boolean)
        .join("\n")
    case "App Store":
      return fields.appStoreUrl.trim()
    case "Image Gallery":
      return ids.galleryLinkId ? `${appOrigin}/gallery/${ids.galleryLinkId}` : fields.galleryUrl.trim()
    case "Rating": {
      const title = encodeURIComponent(fields.ratingTitle || "Rate your experience")
      const style = encodeURIComponent(fields.ratingStyle || "stars")
      const scale = encodeURIComponent((fields.ratingStyle || "stars") === "stars" ? "5" : fields.ratingScale || "5")
      return `${appOrigin}/rate?title=${title}&style=${style}&scale=${scale}`
    }
    case "Feedback": {
      const qs = (fields.feedbackQuestions || []).map((q) => q.trim()).filter(Boolean)
      return `${appOrigin}/feedback?f=${encodeURIComponent(encodePayload({ title: fields.feedbackTitle || "Share your feedback", questions: qs }))}`
    }
    default:
      return ""
  }
}

function hasRequiredFields(type, fields, ids, modes, socialLinks) {
  return validateQrFields(type, fields, {
    ...ids,
    ...modes,
    socialLinks,
    feedbackQuestions: fields.feedbackQuestions,
  })
}

function AnalysisPanel({ analysis }) {
  if (!analysis) return null

  const totalCount = analysis.job?.totalCount || 0
  const successCount = analysis.job?.successCount || 0
  const failureCount = analysis.job?.failureCount || 0
  const scanTrend = Array.isArray(analysis.scanTrend) ? analysis.scanTrend : []
  const maxScanCount = Math.max(...scanTrend.map((point) => point.count || 0), 1)

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis for this QR job</p>
      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Quick Insight</p>
        <p className="mt-2 text-sm font-medium text-slate-800">{analysis.insight}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">Generation Report</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Requested</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Success</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{successCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Failure</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{failureCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">Usage Report</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scans</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{analysis.engagement?.totalScans || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Submissions</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{analysis.engagement?.totalSubmissions || 0}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Scan Trend</p>
            {scanTrend.length ? (
              <div className="mt-3 space-y-2">
                <div className="flex h-14 items-end gap-2">
                  {scanTrend.map((point) => (
                    <div key={point.label} className="flex-1">
                      <div
                        className="w-full rounded-full bg-sky-500"
                        style={{ height: `${Math.max(((point.count || 0) / maxScanCount) * 56, point.count ? 8 : 4)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{scanTrend[0]?.label || ""}</span>
                  <span>{scanTrend[scanTrend.length - 1]?.label || ""}</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No scan activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function SingleGenerateContent({ embedded = false, brandMode = false }) {
  const previewRef = useRef(null)
  const qrCodeRef = useRef(null)

  const [qrType, setQrType] = useState("URL")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M")
  const [filenamePrefix, setFilenamePrefix] = useState("qr")
  const [dotStyle, setDotStyle] = useState("rounded")
  const [cornerSquareStyle, setCornerSquareStyle] = useState("extra-rounded")
  const [cornerDotStyle, setCornerDotStyle] = useState("dot")
  const [logoDataUrl, setLogoDataUrl] = useState("")
  const [brandAccentColor, setBrandAccentColor] = useState("#1d4ed8")
  const [brandStrength, setBrandStrength] = useState("balanced")
  const [downloadResolution, setDownloadResolution] = useState(1024)
  const [appOrigin, setAppOrigin] = useState("")
  const [expiryDate, setExpiryDate] = useState("")

  const [galleryMode, setGalleryMode] = useState("url")
  const [pdfMode, setPdfMode] = useState("url")
  const [galleryFiles, setGalleryFiles] = useState([])
  const [pdfFile, setPdfFile] = useState(null)
  const [galleryLinkId, setGalleryLinkId] = useState("")
  const [pdfLinkId, setPdfLinkId] = useState("")
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadMessage, setUploadMessage] = useState("")
  const [socialLinks, setSocialLinks] = useState([
    { platform: "Instagram", customPlatform: "", url: "" },
  ])
  const [editMessage, setEditMessage] = useState("")
  const [editingJobId, setEditingJobId] = useState("")
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const isEditing = Boolean(editingJobId)
  const lockContent = isEditing && qrType !== "Feedback"

  const [fields, setFields] = useState({
    url: "", text: "", email: "", subject: "", body: "", phone: "", smsPhone: "", smsMessage: "",
    whatsappPhone: "", whatsappMessage: "", firstName: "", lastName: "", organization: "", jobTitle: "",
    vcardPhone: "", vcardEmail: "", vcardUrl: "", address: "", latitude: "", longitude: "",
    youtubeUrl: "", wifiType: "WPA", wifiSsid: "", wifiPassword: "", wifiHidden: false,
    eventTitle: "", eventStart: "", eventEnd: "", eventLocation: "", eventDescription: "", bitcoinAddress: "",
    bitcoinAmount: "", bitcoinLabel: "", bitcoinMessage: "",
    pdfUrl: "", appStoreUrl: "", galleryUrl: "", ratingTitle: "Rate your experience",
    ratingStyle: "stars", ratingScale: "5", feedbackTitle: "Share your feedback",
    feedbackQuestions: ["How was your experience?"],
  })

  useEffect(() => {
    setAppOrigin(normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin))
  }, [])

  useEffect(() => {
    if (!brandMode || isEditing) return
    setQrType((prev) => (prev === "URL" ? "Feedback" : prev))
    setErrorCorrectionLevel("H")
    setDotStyle("classy-rounded")
    setCornerSquareStyle("extra-rounded")
    setCornerDotStyle("dot")
    setFilenamePrefix((prev) => (prev === "qr" ? "brand-qr" : prev))
    setForegroundColor("#0f172a")
    setBackgroundColor("#ffffff")
  }, [brandMode, isEditing])

  function applyBrandPreset() {
    if (!isEditing && !["Feedback", "Rating", "PDF", "Image Gallery", "URL"].includes(qrType)) {
      setQrType("Feedback")
    }
    setErrorCorrectionLevel("H")
    setDotStyle("classy-rounded")
    setCornerSquareStyle("extra-rounded")
    setCornerDotStyle("dot")
    setForegroundColor("#0f172a")
    setBackgroundColor("#ffffff")
    setBrandAccentColor("#1d4ed8")
    setFilenamePrefix("brand-qr")
  }

  useEffect(() => {
    if (!brandMode || !logoDataUrl) return
    let active = true

    extractBrandPalette(logoDataUrl).then((palette) => {
      if (!active || !palette) return
      setForegroundColor(palette.primary)
      setBrandAccentColor(palette.accent)
    })

    return () => {
      active = false
    }
  }, [brandMode, logoDataUrl])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editJob = params.get("editJob")
    if (!editJob) return

    async function loadEditPayload() {
      try {
        const token = getAuthToken()
        if (!token) return
        const data = await apiRequest(`/qr/jobs/${editJob}/edit-payload`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const job = data?.job
        if (!job || job.jobType !== "single") return
        const targetPayload = job.targetPayload || {}
        const nextType = targetPayload.qrType || job.qrType || "Text"
        setEditingJobId(job.id)
        setQrType(nextType)
        setFields((prev) => ({
          ...prev,
          ...prev,
          ...(targetPayload.fields || {}),
        }))
        setSocialLinks(
          Array.isArray(targetPayload.socialLinks) && targetPayload.socialLinks.length
            ? targetPayload.socialLinks
            : [{ platform: "Instagram", customPlatform: "", url: "" }],
        )
        setGalleryMode(targetPayload.galleryMode || "url")
        setPdfMode(targetPayload.pdfMode || "url")
        setGalleryLinkId(targetPayload.uploadIds?.galleryLinkId || "")
        setPdfLinkId(targetPayload.uploadIds?.pdfLinkId || "")
        setForegroundColor(job.foregroundColor || "#000000")
        setBackgroundColor(job.backgroundColor || "#ffffff")
        setErrorCorrectionLevel(job.errorCorrectionLevel || "M")
        setFilenamePrefix(job.filenamePrefix || "qr")
        setExpiryDate(formatExpiryDateForInput(targetPayload.expiresAt || job.expiresAt || ""))
        setEditMessage("Loaded settings from selected QR job. Update and save a fresh version anytime.")
        setAnalysisLoading(true)
        const analysisData = await apiRequest(`/qr/jobs/${editJob}/analysis`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setAnalysis(analysisData.analysis || null)
      } catch {
        setEditMessage("Unable to load that QR for editing.")
      } finally {
        setAnalysisLoading(false)
      }
    }

    loadEditPayload()
  }, [])

  const canGenerate = useMemo(
    () =>
      hasRequiredFields(
        qrType,
        fields,
        { galleryLinkId, pdfLinkId },
        { galleryMode, pdfMode },
        socialLinks,
      ),
    [qrType, fields, galleryLinkId, pdfLinkId, galleryMode, pdfMode, socialLinks],
  )
  const generatedContent = useMemo(
    () =>
      canGenerate && appOrigin
        ? buildQrContent(qrType, fields, appOrigin, { galleryLinkId, pdfLinkId }, socialLinks, expiryDate)
        : "",
    [canGenerate, appOrigin, qrType, fields, galleryLinkId, pdfLinkId, socialLinks, expiryDate],
  )

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  function renderLockedContentSummary() {
    const entries = (QR_FIELD_DEFINITIONS[qrType] || [])
      .filter((field) => field.key !== "feedbackQuestions" && field.key !== "socialLinks")
      .map((field) => [field.label, fields[field.key]])
      .filter(([, value]) => {
        if (typeof value === "boolean") return value
        return String(value || "").trim()
      })

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Content is locked for this QR</p>
        <p className="mt-1 text-sm text-slate-500">You can update expiry, styling, and save a fresh QR version. QR type and core content stay unchanged.</p>
        {!!entries.length && (
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            {entries.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[140px,1fr] gap-3">
                <span className="font-semibold text-slate-500">{label}</span>
                <span className="break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function updateFeedbackQuestion(index, value) {
    setFields((prev) => {
      const next = [...prev.feedbackQuestions]
      next[index] = value
      return { ...prev, feedbackQuestions: next }
    })
  }

  function addFeedbackQuestion() {
    setFields((prev) => ({
      ...prev,
      feedbackQuestions: [...prev.feedbackQuestions, ""],
    }))
  }

  function removeFeedbackQuestion(index) {
    setFields((prev) => ({
      ...prev,
      feedbackQuestions: prev.feedbackQuestions.filter((_, i) => i !== index),
    }))
  }

  function handleQrTypeChange(nextType) {
    setQrType(nextType)
    setUploadError("")
    setUploadMessage("")
    setGalleryLinkId("")
    setPdfLinkId("")
    if (previewRef.current) {
      previewRef.current.innerHTML = ""
    }
  }

  function updateSocialLink(index, key, value) {
    setSocialLinks((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, [key]: value }
      }),
    )
  }

  function getAvailableSocialPlatforms(index) {
    const current = socialLinks[index]?.platform
    const used = new Set(
      socialLinks
        .filter((_, i) => i !== index)
        .map((item) => item.platform)
        .filter((platform) => platform && platform !== "Custom"),
    )

    return SOCIAL_PLATFORM_OPTIONS.filter((platform) => {
      if (platform === "Custom") return true
      if (platform === current) return true
      return !used.has(platform)
    })
  }

  function addSocialLink() {
    setSocialLinks((prev) => {
      const used = new Set(prev.map((item) => item.platform).filter((platform) => platform && platform !== "Custom"))
      const firstAvailable = SOCIAL_PLATFORM_OPTIONS.find(
        (platform) => platform === "Custom" || !used.has(platform),
      )
      return [
        ...prev,
        { platform: firstAvailable || "Custom", customPlatform: "", url: "" },
      ]
    })
  }

  function removeSocialLink(index) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  function getAuthHeader() {
    const token = getAuthToken()
    if (!token) throw new Error("Please login first to upload files.")
    return { Authorization: `Bearer ${token}` }
  }

  async function uploadGallery() {
    setUploadError("")
    setUploadMessage("")
    if (!galleryFiles.length) return setUploadError("Select at least one image.")
    if (galleryFiles.length > 10) return setUploadError("Maximum 10 images allowed.")
    try {
      setUploadingGallery(true)
      const formData = new FormData()
      galleryFiles.forEach((f) => formData.append("images", f))
      formData.append("title", "Image Gallery")
      const data = await apiRequest("/public/upload/gallery", { method: "POST", headers: getAuthHeader(), body: formData })
      setGalleryLinkId(data?.link?.id || "")
      setUploadMessage("Gallery uploaded successfully.")
    } catch (error) {
      setUploadError(error.message || "Upload failed")
    } finally {
      setUploadingGallery(false)
    }
  }

  async function uploadPdf() {
    setUploadError("")
    setUploadMessage("")
    if (!pdfFile) return setUploadError("Select a PDF file.")
    try {
      setUploadingPdf(true)
      const formData = new FormData()
      formData.append("pdf", pdfFile)
      formData.append("title", pdfFile.name || "PDF Document")
      const data = await apiRequest("/public/upload/pdf", { method: "POST", headers: getAuthHeader(), body: formData })
      setPdfLinkId(data?.link?.id || "")
      setUploadMessage("PDF uploaded successfully.")
    } catch (error) {
      setUploadError(error.message || "Upload failed")
    } finally {
      setUploadingPdf(false)
    }
  }

  const brandImageSize = brandStrength === "subtle" ? 0.22 : brandStrength === "bold" ? 0.3 : 0.26
  const brandSilhouetteOpacity = brandStrength === "subtle" ? 0.08 : brandStrength === "bold" ? 0.16 : 0.12
  const selectableQrTypes = brandMode
    ? QR_TYPES.filter((type) => ["Feedback", "Rating", "PDF", "Image Gallery", "URL"].includes(type))
    : QR_TYPES

  useEffect(() => {
    if (!generatedContent || !previewRef.current) {
      if (previewRef.current) previewRef.current.innerHTML = ""
      return
    }
    const options = {
      width: 340,
      height: 340,
      type: "canvas",
      data: generatedContent,
      image: logoDataUrl || undefined,
      dotsOptions: { color: foregroundColor, type: dotStyle },
      backgroundOptions: { color: backgroundColor },
      cornersSquareOptions: { color: brandMode && logoDataUrl ? brandAccentColor : foregroundColor, type: cornerSquareStyle },
      cornersDotOptions: { color: brandMode && logoDataUrl ? brandAccentColor : foregroundColor, type: cornerDotStyle },
      qrOptions: { errorCorrectionLevel },
      imageOptions: { hideBackgroundDots: true, imageSize: brandMode ? brandImageSize : 0.35, margin: brandMode ? 2 : 4, crossOrigin: "anonymous" },
    }
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options)
      previewRef.current.innerHTML = ""
      qrCodeRef.current.append(previewRef.current)
      return
    }
    qrCodeRef.current.update(options)
  }, [generatedContent, logoDataUrl, foregroundColor, backgroundColor, dotStyle, cornerSquareStyle, cornerDotStyle, errorCorrectionLevel, brandMode, brandAccentColor, brandImageSize])

  async function handleDownload() {
    if (!generatedContent) return

    try {
      const token = getAuthToken()
      if (!token) {
        window.location.href = "/login"
        return
      }

      const requestPath = editingJobId ? `/qr/jobs/${editingJobId}/single` : "/qr/single"
      const requestMethod = editingJobId ? "PUT" : "POST"
      const data = await apiRequest(requestPath, {
        method: requestMethod,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: generatedContent,
          qrType,
          fields,
          socialLinks,
          galleryMode,
          pdfMode,
          galleryLinkId,
          pdfLinkId,
          managedTitle: getManagedTitleForQrType(qrType, fields),
          expiresAt: toExpiryQueryValue(expiryDate) || addMonths(new Date(), 6).toISOString(),
          filenamePrefix,
          foregroundColor,
          backgroundColor,
          size: Number(downloadResolution),
          margin: 2,
          format: "png",
          errorCorrectionLevel,
        }),
      })

      const dataUrl = data?.artifact?.dataUrl || ""
      if (!dataUrl) throw new Error("Unable to create QR download")

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = data?.artifact?.fileName || `${(filenamePrefix || "qr").replace(/[^a-zA-Z0-9-_]/g, "") || "qr"}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      if (editingJobId) {
        const analysisData = await apiRequest(`/qr/jobs/${editingJobId}/analysis`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setAnalysis(analysisData.analysis || null)
        setEditMessage("QR updated successfully. A fresh artifact has been saved for this job.")
      }
    } catch (downloadError) {
      setUploadError(downloadError.message || "Failed to create QR")
    }
  }

  const content = (
    <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Single QR Generator</h1>
        {!!editMessage && <p className="mt-3 text-sm text-blue-700">{editMessage}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <section className="border rounded-lg p-6 bg-white space-y-4">
            <select value={qrType} onChange={(e) => handleQrTypeChange(e.target.value)} className="w-full border p-2" disabled={isEditing}>
              {selectableQrTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {brandMode && (
              <p className="text-xs text-slate-500">
                Brand QR works best with tracked QR types like Feedback, Rating, PDF, and Image Gallery for denser visual patterns.
              </p>
            )}

            {lockContent ? renderLockedContentSummary() : null}
            {!lockContent && qrType === "URL" && <input className="w-full border p-2" placeholder="https://example.com" value={fields.url} onChange={(e) => setField("url", e.target.value)} />}
            {!lockContent && qrType === "Text" && <textarea className="w-full border p-2" rows={4} placeholder="Enter text" value={fields.text} onChange={(e) => setField("text", e.target.value)} />}
            {!lockContent && qrType === "Email" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Email" value={fields.email} onChange={(e) => setField("email", e.target.value)} />
                <input className="w-full border p-2" placeholder="Subject (optional)" value={fields.subject} onChange={(e) => setField("subject", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="Body (optional)" value={fields.body} onChange={(e) => setField("body", e.target.value)} />
              </div>
            )}
            {!lockContent && qrType === "Phone" && <input className="w-full border p-2" placeholder="Phone" value={fields.phone} onChange={(e) => setField("phone", e.target.value)} />}
            {!lockContent && qrType === "SMS" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="SMS Phone" value={fields.smsPhone} onChange={(e) => setField("smsPhone", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="SMS Message" value={fields.smsMessage} onChange={(e) => setField("smsMessage", e.target.value)} />
              </div>
            )}
            {!lockContent && qrType === "WhatsApp" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="WhatsApp Number" value={fields.whatsappPhone} onChange={(e) => setField("whatsappPhone", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="Message (optional)" value={fields.whatsappMessage} onChange={(e) => setField("whatsappMessage", e.target.value)} />
              </div>
            )}
            {!lockContent && qrType === "vCard" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="First name" value={fields.firstName} onChange={(e) => setField("firstName", e.target.value)} />
                <input className="w-full border p-2" placeholder="Last name" value={fields.lastName} onChange={(e) => setField("lastName", e.target.value)} />
                <input className="w-full border p-2" placeholder="Organization" value={fields.organization} onChange={(e) => setField("organization", e.target.value)} />
                <input className="w-full border p-2" placeholder="Job title" value={fields.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} />
                <input className="w-full border p-2" placeholder="Phone" value={fields.vcardPhone} onChange={(e) => setField("vcardPhone", e.target.value)} />
                <input className="w-full border p-2" placeholder="Email" value={fields.vcardEmail} onChange={(e) => setField("vcardEmail", e.target.value)} />
                <input className="w-full border p-2" placeholder="Website URL" value={fields.vcardUrl} onChange={(e) => setField("vcardUrl", e.target.value)} />
                <input className="w-full border p-2" placeholder="Address" value={fields.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
            )}
            {!lockContent && qrType === "Location" && (
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full border p-2" placeholder="Latitude" value={fields.latitude} onChange={(e) => setField("latitude", e.target.value)} />
                <input className="w-full border p-2" placeholder="Longitude" value={fields.longitude} onChange={(e) => setField("longitude", e.target.value)} />
              </div>
            )}
            {!lockContent && ["Youtube", "App Store"].includes(qrType) && (
              <input
                className="w-full border p-2"
                placeholder="Paste URL"
                value={qrType === "Youtube" ? fields.youtubeUrl : fields.appStoreUrl}
                onChange={(e) => {
                  if (qrType === "Youtube") setField("youtubeUrl", e.target.value)
                  if (qrType === "App Store") setField("appStoreUrl", e.target.value)
                }}
              />
            )}
            {!lockContent && qrType === "WIFI" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="SSID" value={fields.wifiSsid} onChange={(e) => setField("wifiSsid", e.target.value)} />
                <input className="w-full border p-2" placeholder="Password" value={fields.wifiPassword} onChange={(e) => setField("wifiPassword", e.target.value)} />
                <select className="w-full border p-2" value={fields.wifiType} onChange={(e) => setField("wifiType", e.target.value)}>
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open</option>
                </select>
              </div>
            )}
            {!lockContent && qrType === "Event" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Event title" value={fields.eventTitle} onChange={(e) => setField("eventTitle", e.target.value)} />
                <label className="block text-sm">Start</label>
                <input className="w-full border p-2" type="datetime-local" value={fields.eventStart} onChange={(e) => setField("eventStart", e.target.value)} />
                <label className="block text-sm">End</label>
                <input className="w-full border p-2" type="datetime-local" value={fields.eventEnd} onChange={(e) => setField("eventEnd", e.target.value)} />
                <input className="w-full border p-2" placeholder="Location" value={fields.eventLocation} onChange={(e) => setField("eventLocation", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="Description" value={fields.eventDescription} onChange={(e) => setField("eventDescription", e.target.value)} />
              </div>
            )}
            {!lockContent && qrType === "Social Media" && (
              <div className="space-y-3 border p-3 rounded">
                {socialLinks.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <select
                      className="border p-2 md:col-span-3"
                      value={item.platform}
                      onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                    >
                      {getAvailableSocialPlatforms(index).map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                    {item.platform === "Custom" && (
                      <input
                        className="border p-2 md:col-span-3"
                        placeholder="Platform name"
                        value={item.customPlatform}
                        onChange={(e) => updateSocialLink(index, "customPlatform", e.target.value)}
                      />
                    )}
                    <input
                      className={`border p-2 ${item.platform === "Custom" ? "md:col-span-4" : "md:col-span-7"}`}
                      placeholder="https://..."
                      value={item.url}
                      onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                    />
                    <button
                      type="button"
                      className="border px-2 py-2 md:col-span-2 whitespace-nowrap text-sm"
                      onClick={() => removeSocialLink(index)}
                      disabled={socialLinks.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="border px-3 py-2" onClick={addSocialLink}>
                  Add Social Link
                </button>
              </div>
            )}

            {!lockContent && qrType === "Rating" && (
              <div className="space-y-2 border p-3 rounded">
                <input
                  className="w-full border p-2"
                  placeholder="Rating page title"
                  value={fields.ratingTitle}
                  onChange={(e) => setField("ratingTitle", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full border p-2"
                    value={fields.ratingStyle}
                    onChange={(e) => setField("ratingStyle", e.target.value)}
                  >
                    <option value="stars">5 Star Rating</option>
                    <option value="numbers">Number Rating</option>
                  </select>
                  {fields.ratingStyle === "numbers" ? (
                    <select
                      className="w-full border p-2"
                      value={fields.ratingScale}
                      onChange={(e) => setField("ratingScale", e.target.value)}
                    >
                      <option value="5">1-5</option>
                      <option value="10">1-10</option>
                    </select>
                  ) : (
                    <input
                      className="w-full border p-2 bg-gray-50 text-gray-600"
                      value="1-5 (stars)"
                      readOnly
                    />
                  )}
                </div>
              </div>
            )}

            {qrType === "Feedback" && (
              <div className="space-y-2 border p-3 rounded">
                <input
                  className="w-full border p-2"
                  placeholder="Feedback form title"
                  value={fields.feedbackTitle}
                  onChange={(e) => setField("feedbackTitle", e.target.value)}
                  readOnly={isEditing}
                />
                {fields.feedbackQuestions.map((question, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="w-full border p-2"
                      placeholder={`Question ${index + 1}`}
                      value={question}
                      onChange={(e) => updateFeedbackQuestion(index, e.target.value)}
                    />
                    {fields.feedbackQuestions.length > 1 && !isEditing && (
                      <button
                        type="button"
                        onClick={() => removeFeedbackQuestion(index)}
                        className="border px-3"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addFeedbackQuestion} className="border px-3 py-2">
                  Add Question
                </button>
              </div>
            )}

            {!lockContent && qrType === "PDF" && (
              <div className="space-y-2 border p-3 rounded">
                <div className="flex gap-2">
                  <button type="button" className={`px-3 py-1 border ${pdfMode === "url" ? "bg-black text-white" : ""}`} onClick={() => setPdfMode("url")}>URL</button>
                  <button type="button" className={`px-3 py-1 border ${pdfMode === "upload" ? "bg-black text-white" : ""}`} onClick={() => setPdfMode("upload")}>Upload PDF</button>
                </div>
                {pdfMode === "url" ? (
                  <input className="w-full border p-2" placeholder="Paste PDF URL" value={fields.pdfUrl} onChange={(e) => setField("pdfUrl", e.target.value)} />
                ) : (
                  <div className="space-y-2">
                    <input type="file" accept="application/pdf,.pdf" className="w-full border p-2" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setPdfLinkId("") }} />
                    <button type="button" onClick={uploadPdf} disabled={uploadingPdf || !pdfFile} className="px-3 py-2 border bg-black text-white disabled:opacity-50">{uploadingPdf ? "Uploading..." : "Upload PDF"}</button>
                  </div>
                )}
              </div>
            )}

            {!lockContent && qrType === "Image Gallery" && (
              <div className="space-y-2 border p-3 rounded">
                <div className="flex gap-2">
                  <button type="button" className={`px-3 py-1 border ${galleryMode === "url" ? "bg-black text-white" : ""}`} onClick={() => setGalleryMode("url")}>URL</button>
                  <button type="button" className={`px-3 py-1 border ${galleryMode === "upload" ? "bg-black text-white" : ""}`} onClick={() => setGalleryMode("upload")}>Upload Images</button>
                </div>
                {galleryMode === "url" ? (
                  <input className="w-full border p-2" placeholder="Paste gallery URL" value={fields.galleryUrl} onChange={(e) => setField("galleryUrl", e.target.value)} />
                ) : (
                  <div className="space-y-2">
                    <input type="file" accept="image/*" multiple className="w-full border p-2" onChange={(e) => { setGalleryFiles(Array.from(e.target.files || []).slice(0, 10)); setGalleryLinkId("") }} />
                    <button type="button" onClick={uploadGallery} disabled={uploadingGallery || !galleryFiles.length} className="px-3 py-2 border bg-black text-white disabled:opacity-50">{uploadingGallery ? "Uploading..." : "Upload Gallery"}</button>
                  </div>
                )}
              </div>
            )}

            {(uploadError || uploadMessage) && (
              <div>
                {!!uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                {!!uploadMessage && <p className="text-sm text-green-700">{uploadMessage}</p>}
              </div>
            )}

            <div>
              <label className="block mb-1 text-sm">Last Scan Date / Expiry</label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full border p-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave this blank to default validity to 6 months from creation. Use DD-MM-YYYY only. The QR stays valid until the end of the selected day.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm">Foreground</label>
                <input type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="w-full border p-1 h-10" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Background</label>
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-full border p-1 h-10" />
              </div>
            </div>

            {brandMode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm">Brand Accent</label>
                  <input type="color" value={brandAccentColor} onChange={(e) => setBrandAccentColor(e.target.value)} className="w-full border p-1 h-10" />
                </div>
                <div>
                  <label className="block mb-1 text-sm">Logo Style Strength</label>
                  <select value={brandStrength} onChange={(e) => setBrandStrength(e.target.value)} className="w-full border p-2">
                    <option value="subtle">Subtle</option>
                    <option value="balanced">Balanced</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm">Dot Style</label>
                <select value={dotStyle} onChange={(e) => setDotStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option><option value="dots">Dots</option><option value="rounded">Rounded</option><option value="classy">Classy</option><option value="classy-rounded">Classy Rounded</option><option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Corner Square</label>
                <select value={cornerSquareStyle} onChange={(e) => setCornerSquareStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option><option value="dot">Dot</option><option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm">Corner Dot</label>
                <select value={cornerDotStyle} onChange={(e) => setCornerDotStyle(e.target.value)} className="w-full border p-2"><option value="square">Square</option><option value="dot">Dot</option></select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Error Correction</label>
                <select value={errorCorrectionLevel} onChange={(e) => setErrorCorrectionLevel(e.target.value)} className="w-full border p-2"><option value="L">L</option><option value="M">M</option><option value="Q">Q</option><option value="H">H</option></select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm">{brandMode ? "Brand Logo" : "Logo (optional)"}</label>
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setLogoDataUrl(String(reader.result || "")); reader.readAsDataURL(file) }} className="w-full border p-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Filename Prefix</label>
                <input value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)} className="w-full border p-2" />
              </div>
            </div>
          </section>

          <section className="border rounded-lg p-6 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Live Preview</h2>
                {brandMode && (
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Brand QR uses your uploaded logo as the visual anchor and applies a denser branded preset.
                    Feedback and other tracked flows usually produce richer dot patterns.
                  </p>
                )}
              </div>
              {brandMode && (
                <button
                  type="button"
                  onClick={applyBrandPreset}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Apply Brand Preset
                </button>
              )}
            </div>
            {!generatedContent && <p className="mt-4 text-gray-600">Fill required fields to generate QR instantly.</p>}
            <div className="mt-4 flex justify-center">
              <div className="relative flex items-center justify-center">
                {brandMode && logoDataUrl && (
                  <img
                    src={logoDataUrl}
                    alt="Brand silhouette"
                    className="pointer-events-none absolute h-[250px] w-[250px] object-contain blur-[1px]"
                    style={{ opacity: brandSilhouetteOpacity }}
                  />
                )}
                <div ref={previewRef} className="relative z-10 flex justify-center" />
              </div>
            </div>
            {brandMode && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Brand QR guidance</p>
                <p className="mt-2">Upload your logo, keep contrast high, and use this mode for a logo-led branded QR. It auto-picks colors from the logo, applies accent corners, and uses a softer silhouette preview while keeping the real QR structure scannable.</p>
              </div>
            )}
            <div className="mt-4">
              <label className="block mb-1">Download Resolution</label>
              <select value={downloadResolution} onChange={(e) => setDownloadResolution(Number(e.target.value))} className="w-full border p-2">
                {DOWNLOAD_RESOLUTIONS.map((res) => <option key={res} value={res}>{res} x {res}</option>)}
              </select>
            </div>
            {generatedContent && <button type="button" onClick={handleDownload} className="inline-block mt-4 px-4 py-2 bg-black text-white rounded">{editingJobId ? "Update QR" : "Download QR"}</button>}
          </section>
        </div>
        {analysisLoading && <p className="mt-6 text-sm text-slate-500">Loading analysis...</p>}
        {!analysisLoading && analysis && <AnalysisPanel analysis={analysis} />}
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

export default function SingleGeneratePage() {
  return <SingleGenerateContent />
}
