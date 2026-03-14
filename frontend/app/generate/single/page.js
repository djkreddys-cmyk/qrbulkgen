"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"
import Navbar from "../../../components/Navbar"
import { apiRequest } from "../../../lib/api"
import { getAuthToken } from "../../../lib/auth"

const QR_TYPES = [
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

const SOCIAL_PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "Twitter",
  "LinkedIn",
  "YouTube",
  "WhatsApp",
  "Telegram",
  "Snapchat",
  "Pinterest",
  "Custom",
]

const DOWNLOAD_RESOLUTIONS = [512, 768, 1024, 1536, 2048]

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

function buildQrContent(type, fields, appOrigin, ids, socialLinks) {
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
    case "Bitcoin":
      {
        const amount = fields.bitcoinAmount ? `?amount=${fields.bitcoinAmount}` : ""
        const label = fields.bitcoinLabel
          ? `${amount ? "&" : "?"}label=${encodeURIComponent(fields.bitcoinLabel)}`
          : ""
        const message = fields.bitcoinMessage
          ? `${amount || label ? "&" : "?"}message=${encodeURIComponent(fields.bitcoinMessage)}`
          : ""
        return `bitcoin:${fields.bitcoinAddress.trim()}${amount}${label}${message}`
      }
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
  if (type === "PDF") return modes.pdfMode === "url" ? !!fields.pdfUrl.trim() : !!ids.pdfLinkId
  if (type === "Image Gallery") return modes.galleryMode === "url" ? !!fields.galleryUrl.trim() : !!ids.galleryLinkId
  if (type === "WhatsApp") return !!String(fields.whatsappPhone || "").replace(/[^\d]/g, "")
  const map = {
    URL: fields.url.trim(),
    Text: fields.text.trim(),
    Email: fields.email.trim(),
    Phone: fields.phone.trim(),
    SMS: fields.smsPhone.trim(),
    Youtube: fields.youtubeUrl.trim(),
    WIFI: fields.wifiSsid.trim(),
    Event: fields.eventTitle.trim(),
    Bitcoin: fields.bitcoinAddress.trim(),
    "App Store": fields.appStoreUrl.trim(),
    vCard: fields.firstName.trim(),
  }
  if (type === "Social Media") {
    return socialLinks.some((item) => {
      const platform = item.platform === "Custom" ? item.customPlatform : item.platform
      return String(platform || "").trim() && String(item.url || "").trim()
    })
  }
  if (type === "Rating") return true
  if (type === "Feedback") return (fields.feedbackQuestions || []).some((q) => q.trim())
  if (type === "Location") return !!fields.latitude.trim() && !!fields.longitude.trim()
  return !!map[type]
}

export default function SingleGeneratePage() {
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
  const [downloadResolution, setDownloadResolution] = useState(1024)
  const [appOrigin, setAppOrigin] = useState("")

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
        ? buildQrContent(qrType, fields, appOrigin, { galleryLinkId, pdfLinkId }, socialLinks)
        : "",
    [canGenerate, appOrigin, qrType, fields, galleryLinkId, pdfLinkId, socialLinks],
  )

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }))
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
      cornersSquareOptions: { color: foregroundColor, type: cornerSquareStyle },
      cornersDotOptions: { color: foregroundColor, type: cornerDotStyle },
      qrOptions: { errorCorrectionLevel },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: 4, crossOrigin: "anonymous" },
    }
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options)
      previewRef.current.innerHTML = ""
      qrCodeRef.current.append(previewRef.current)
      return
    }
    qrCodeRef.current.update(options)
  }, [generatedContent, logoDataUrl, foregroundColor, backgroundColor, dotStyle, cornerSquareStyle, cornerDotStyle, errorCorrectionLevel])

  function handleDownload() {
    if (!qrCodeRef.current || !generatedContent) return
    const name = (filenamePrefix || "qr").replace(/[^a-zA-Z0-9-_]/g, "") || "qr"
    qrCodeRef.current.update({ width: Number(downloadResolution), height: Number(downloadResolution) })
    qrCodeRef.current.download({ name, extension: "png" })
    qrCodeRef.current.update({ width: 340, height: 340 })
  }

  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Single QR Generator</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <section className="border rounded-lg p-6 bg-white space-y-4">
            <select value={qrType} onChange={(e) => handleQrTypeChange(e.target.value)} className="w-full border p-2">
              {QR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>

            {qrType === "URL" && <input className="w-full border p-2" placeholder="https://example.com" value={fields.url} onChange={(e) => setField("url", e.target.value)} />}
            {qrType === "Text" && <textarea className="w-full border p-2" rows={4} placeholder="Enter text" value={fields.text} onChange={(e) => setField("text", e.target.value)} />}
            {qrType === "Email" && <input className="w-full border p-2" placeholder="Email" value={fields.email} onChange={(e) => setField("email", e.target.value)} />}
            {qrType === "Phone" && <input className="w-full border p-2" placeholder="Phone" value={fields.phone} onChange={(e) => setField("phone", e.target.value)} />}
            {qrType === "SMS" && <input className="w-full border p-2" placeholder="SMS Phone" value={fields.smsPhone} onChange={(e) => setField("smsPhone", e.target.value)} />}
            {qrType === "WhatsApp" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="WhatsApp Number" value={fields.whatsappPhone} onChange={(e) => setField("whatsappPhone", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="Message (optional)" value={fields.whatsappMessage} onChange={(e) => setField("whatsappMessage", e.target.value)} />
              </div>
            )}
            {qrType === "vCard" && (
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
            {qrType === "Location" && (
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full border p-2" placeholder="Latitude" value={fields.latitude} onChange={(e) => setField("latitude", e.target.value)} />
                <input className="w-full border p-2" placeholder="Longitude" value={fields.longitude} onChange={(e) => setField("longitude", e.target.value)} />
              </div>
            )}
            {["Youtube", "App Store"].includes(qrType) && (
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
            {qrType === "WIFI" && (
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
            {qrType === "Event" && (
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
            {qrType === "Bitcoin" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Bitcoin wallet address" value={fields.bitcoinAddress} onChange={(e) => setField("bitcoinAddress", e.target.value)} />
                <input className="w-full border p-2" placeholder="Amount (optional)" value={fields.bitcoinAmount} onChange={(e) => setField("bitcoinAmount", e.target.value)} />
                <input className="w-full border p-2" placeholder="Label (optional)" value={fields.bitcoinLabel} onChange={(e) => setField("bitcoinLabel", e.target.value)} />
                <input className="w-full border p-2" placeholder="Message (optional)" value={fields.bitcoinMessage} onChange={(e) => setField("bitcoinMessage", e.target.value)} />
              </div>
            )}

            {qrType === "Social Media" && (
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

            {qrType === "Rating" && (
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

            {qrType === "PDF" && (
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

            {qrType === "Image Gallery" && (
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
                <label className="block mb-1 text-sm">Logo (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setLogoDataUrl(String(reader.result || "")); reader.readAsDataURL(file) }} className="w-full border p-2" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Filename Prefix</label>
                <input value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)} className="w-full border p-2" />
              </div>
            </div>
          </section>

          <section className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            {!generatedContent && <p className="mt-4 text-gray-600">Fill required fields to generate QR instantly.</p>}
            <div ref={previewRef} className="mt-4 flex justify-center" />
            <div className="mt-4">
              <label className="block mb-1">Download Resolution</label>
              <select value={downloadResolution} onChange={(e) => setDownloadResolution(Number(e.target.value))} className="w-full border p-2">
                {DOWNLOAD_RESOLUTIONS.map((res) => <option key={res} value={res}>{res} x {res}</option>)}
              </select>
            </div>
            {generatedContent && <button type="button" onClick={handleDownload} className="inline-block mt-4 px-4 py-2 bg-black text-white rounded">Download QR</button>}
          </section>
        </div>
      </main>
    </div>
  )
}
