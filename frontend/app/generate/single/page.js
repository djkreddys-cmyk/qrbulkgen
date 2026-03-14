"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import QRCodeStyling from "qr-code-styling"

import Navbar from "../../../components/Navbar"
import { apiRequest } from "../../../lib/api"
import { loadAuthSession } from "../../../lib/auth"

const QR_TYPES = [
  "URL",
  "Text",
  "Email",
  "Phone",
  "SMS",
  "vCard",
  "Location",
  "Facebook",
  "Twitter",
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

function buildQrContent(type, fields) {
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
    case "Facebook":
      return fields.facebookUrl.trim()
    case "Twitter":
      return fields.twitterUrl.trim()
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
        `DTSTART:${toUtcDateTime(fields.eventStart)}`,
        `DTEND:${toUtcDateTime(fields.eventEnd)}`,
        `LOCATION:${fields.eventLocation || ""}`,
        `DESCRIPTION:${fields.eventDescription || ""}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n")
    case "Bitcoin": {
      const amount = fields.bitcoinAmount ? `?amount=${fields.bitcoinAmount}` : ""
      const label = fields.bitcoinLabel ? `${amount ? "&" : "?"}label=${encodeURIComponent(fields.bitcoinLabel)}` : ""
      const message = fields.bitcoinMessage
        ? `${amount || label ? "&" : "?"}message=${encodeURIComponent(fields.bitcoinMessage)}`
        : ""
      return `bitcoin:${fields.bitcoinAddress.trim()}${amount}${label}${message}`
    }
    case "PDF":
      return fields.pdfUrl.trim()
    case "Social Media":
      return [
        `Instagram: ${fields.instagramUrl || ""}`,
        `LinkedIn: ${fields.linkedinUrl || ""}`,
        `Facebook: ${fields.socialFacebookUrl || ""}`,
        `Twitter: ${fields.socialTwitterUrl || ""}`,
        `Youtube: ${fields.socialYoutubeUrl || ""}`,
      ].join("\n")
    case "App Store":
      return fields.appStoreUrl.trim()
    case "Image Gallery":
      return fields.galleryUrl.trim()
    case "Rating":
      return fields.ratingUrl.trim()
    case "Feedback":
      return fields.feedbackUrl.trim()
    default:
      return ""
  }
}

function hasRequiredFields(type, fields) {
  switch (type) {
    case "URL":
      return !!fields.url.trim()
    case "Text":
      return !!fields.text.trim()
    case "Email":
      return !!fields.email.trim()
    case "Phone":
      return !!fields.phone.trim()
    case "SMS":
      return !!fields.smsPhone.trim()
    case "vCard":
      return !!fields.firstName.trim()
    case "Location":
      return !!fields.latitude.trim() && !!fields.longitude.trim()
    case "Facebook":
      return !!fields.facebookUrl.trim()
    case "Twitter":
      return !!fields.twitterUrl.trim()
    case "Youtube":
      return !!fields.youtubeUrl.trim()
    case "WIFI":
      return !!fields.wifiSsid.trim()
    case "Event":
      return !!fields.eventTitle.trim() && !!fields.eventStart.trim() && !!fields.eventEnd.trim()
    case "Bitcoin":
      return !!fields.bitcoinAddress.trim()
    case "PDF":
      return !!fields.pdfUrl.trim()
    case "Social Media":
      return (
        !!fields.instagramUrl.trim() ||
        !!fields.linkedinUrl.trim() ||
        !!fields.socialFacebookUrl.trim() ||
        !!fields.socialTwitterUrl.trim() ||
        !!fields.socialYoutubeUrl.trim()
      )
    case "App Store":
      return !!fields.appStoreUrl.trim()
    case "Image Gallery":
      return !!fields.galleryUrl.trim()
    case "Rating":
      return !!fields.ratingUrl.trim()
    case "Feedback":
      return !!fields.feedbackUrl.trim()
    default:
      return false
  }
}

export default function SingleGeneratePage() {
  const router = useRouter()
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
  const [generatedContent, setGeneratedContent] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fields, setFields] = useState({
    url: "",
    text: "",
    email: "",
    subject: "",
    body: "",
    phone: "",
    smsPhone: "",
    smsMessage: "",
    firstName: "",
    lastName: "",
    organization: "",
    jobTitle: "",
    vcardPhone: "",
    vcardEmail: "",
    vcardUrl: "",
    address: "",
    latitude: "",
    longitude: "",
    facebookUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
    wifiType: "WPA",
    wifiSsid: "",
    wifiPassword: "",
    wifiHidden: false,
    eventTitle: "",
    eventStart: "",
    eventEnd: "",
    eventLocation: "",
    eventDescription: "",
    bitcoinAddress: "",
    bitcoinAmount: "",
    bitcoinLabel: "",
    bitcoinMessage: "",
    pdfUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    socialFacebookUrl: "",
    socialTwitterUrl: "",
    socialYoutubeUrl: "",
    appStoreUrl: "",
    galleryUrl: "",
    ratingUrl: "",
    feedbackUrl: "",
  })

  const canGenerate = useMemo(() => hasRequiredFields(qrType, fields), [qrType, fields])

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""))
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    const session = loadAuthSession()
    if (!session?.token) {
      router.push("/login")
      return
    }

    try {
      const content = buildQrContent(qrType, fields)

      if (!content) {
        throw new Error("Please fill required fields for selected QR type")
      }

      await apiRequest("/qr/single", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          content,
          foregroundColor,
          backgroundColor,
          errorCorrectionLevel,
          filenamePrefix,
        }),
      })

      setGeneratedContent(content)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!generatedContent || !previewRef.current) {
      return
    }

    const options = {
      width: 340,
      height: 340,
      type: "canvas",
      data: generatedContent,
      image: logoDataUrl || undefined,
      dotsOptions: {
        color: foregroundColor,
        type: dotStyle,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      cornersSquareOptions: {
        color: foregroundColor,
        type: cornerSquareStyle,
      },
      cornersDotOptions: {
        color: foregroundColor,
        type: cornerDotStyle,
      },
      qrOptions: {
        errorCorrectionLevel,
      },
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
    generatedContent,
    logoDataUrl,
    foregroundColor,
    backgroundColor,
    dotStyle,
    cornerSquareStyle,
    cornerDotStyle,
    errorCorrectionLevel,
  ])

  function handleDownload() {
    if (!qrCodeRef.current) return
    const name = (filenamePrefix || "qr").replace(/[^a-zA-Z0-9-_]/g, "") || "qr"
    qrCodeRef.current.download({ name, extension: "png" })
  }

  return (
    <div>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Single QR Generator</h1>
        <p className="mt-2 text-gray-600">
          Generate dynamic QR codes with custom content types, dot styles, and logo embedding.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <form onSubmit={handleGenerate} className="border rounded-lg p-6 bg-white space-y-4">
            <div>
              <label className="block mb-1">QR Type</label>
              <select
                value={qrType}
                onChange={(event) => setQrType(event.target.value)}
                className="w-full border p-2"
              >
                {QR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {qrType === "URL" && (
              <input className="w-full border p-2" placeholder="https://example.com" value={fields.url} onChange={(e) => setField("url", e.target.value)} />
            )}
            {qrType === "Text" && (
              <textarea className="w-full border p-2" rows={4} placeholder="Enter text" value={fields.text} onChange={(e) => setField("text", e.target.value)} />
            )}
            {qrType === "Email" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Email address" value={fields.email} onChange={(e) => setField("email", e.target.value)} />
                <input className="w-full border p-2" placeholder="Subject (optional)" value={fields.subject} onChange={(e) => setField("subject", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="Message (optional)" value={fields.body} onChange={(e) => setField("body", e.target.value)} />
              </div>
            )}
            {qrType === "Phone" && (
              <input className="w-full border p-2" placeholder="+91..." value={fields.phone} onChange={(e) => setField("phone", e.target.value)} />
            )}
            {qrType === "SMS" && (
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Phone number" value={fields.smsPhone} onChange={(e) => setField("smsPhone", e.target.value)} />
                <textarea className="w-full border p-2" rows={3} placeholder="SMS message" value={fields.smsMessage} onChange={(e) => setField("smsMessage", e.target.value)} />
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
            {["Facebook", "Twitter", "Youtube", "PDF", "App Store", "Image Gallery", "Rating", "Feedback"].includes(qrType) && (
              <input
                className="w-full border p-2"
                placeholder="Paste URL"
                value={
                  qrType === "Facebook"
                    ? fields.facebookUrl
                    : qrType === "Twitter"
                      ? fields.twitterUrl
                      : qrType === "Youtube"
                        ? fields.youtubeUrl
                        : qrType === "PDF"
                          ? fields.pdfUrl
                          : qrType === "App Store"
                            ? fields.appStoreUrl
                            : qrType === "Image Gallery"
                              ? fields.galleryUrl
                              : qrType === "Rating"
                                ? fields.ratingUrl
                                : fields.feedbackUrl
                }
                onChange={(e) => {
                  if (qrType === "Facebook") setField("facebookUrl", e.target.value)
                  if (qrType === "Twitter") setField("twitterUrl", e.target.value)
                  if (qrType === "Youtube") setField("youtubeUrl", e.target.value)
                  if (qrType === "PDF") setField("pdfUrl", e.target.value)
                  if (qrType === "App Store") setField("appStoreUrl", e.target.value)
                  if (qrType === "Image Gallery") setField("galleryUrl", e.target.value)
                  if (qrType === "Rating") setField("ratingUrl", e.target.value)
                  if (qrType === "Feedback") setField("feedbackUrl", e.target.value)
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
              <div className="space-y-2">
                <input className="w-full border p-2" placeholder="Instagram URL" value={fields.instagramUrl} onChange={(e) => setField("instagramUrl", e.target.value)} />
                <input className="w-full border p-2" placeholder="LinkedIn URL" value={fields.linkedinUrl} onChange={(e) => setField("linkedinUrl", e.target.value)} />
                <input className="w-full border p-2" placeholder="Facebook URL" value={fields.socialFacebookUrl} onChange={(e) => setField("socialFacebookUrl", e.target.value)} />
                <input className="w-full border p-2" placeholder="Twitter URL" value={fields.socialTwitterUrl} onChange={(e) => setField("socialTwitterUrl", e.target.value)} />
                <input className="w-full border p-2" placeholder="Youtube URL" value={fields.socialYoutubeUrl} onChange={(e) => setField("socialYoutubeUrl", e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Foreground</label>
                <input type="color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} className="w-full border p-1 h-10" />
              </div>
              <div>
                <label className="block mb-1">Background</label>
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-full border p-1 h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Dot Style</label>
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
                <label className="block mb-1">Corner Square</label>
                <select value={cornerSquareStyle} onChange={(e) => setCornerSquareStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option>
                  <option value="dot">Dot</option>
                  <option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Corner Dot</label>
                <select value={cornerDotStyle} onChange={(e) => setCornerDotStyle(e.target.value)} className="w-full border p-2">
                  <option value="square">Square</option>
                  <option value="dot">Dot</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Error Correction</label>
                <select
                  value={errorCorrectionLevel}
                  onChange={(event) => setErrorCorrectionLevel(event.target.value)}
                  className="w-full border p-2"
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Logo (optional)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full border p-2" />
              </div>
              <div>
                <label className="block mb-1">Filename Prefix</label>
                <input value={filenamePrefix} onChange={(e) => setFilenamePrefix(e.target.value)} className="w-full border p-2" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isSubmitting || !canGenerate} className="w-full bg-black text-white py-2 disabled:opacity-60">
              {isSubmitting ? "Generating..." : "Generate QR"}
            </button>
          </form>

          <section className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold">Preview</h2>
            {!generatedContent && <p className="mt-4 text-gray-600">Generate a QR code to preview and download.</p>}

            <div ref={previewRef} className="mt-4 flex justify-center" />

            {generatedContent && (
              <button type="button" onClick={handleDownload} className="inline-block mt-4 px-4 py-2 bg-black text-white rounded">
                Download QR
              </button>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
