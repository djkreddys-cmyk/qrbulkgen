"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import PublicScanTracker from "../../../components/PublicScanTracker"
import { apiRequest } from "../../../lib/api"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function ensureExternalUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (/^(https?:\/\/|mailto:|tel:|sms:|smsto:|upi:)/i.test(raw)) return raw
  if (/^www\./i.test(raw)) return `https://${raw}`
  return raw
}

function extractFirstUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const match = raw.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : ""
}

function buildSmsHref(value, fields = {}) {
  const raw = String(value || "").trim()
  if (/^sms:/i.test(raw)) return raw
  if (/^smsto:/i.test(raw)) {
    const payload = raw.replace(/^smsto:/i, "")
    const separatorIndex = payload.indexOf(":")
    const phone = separatorIndex >= 0 ? payload.slice(0, separatorIndex) : payload
    const body = separatorIndex >= 0 ? payload.slice(separatorIndex + 1) : ""
    return `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ""}`
  }
  const phone = String(fields.smsPhone || "").trim()
  const body = String(fields.smsMessage || "").trim()
  return phone ? `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ""}` : ""
}

function buildWhatsappHref(value, fields = {}) {
  const raw = String(value || "").trim()
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(raw)) return raw
  const phone = String(fields.whatsappPhone || "").replace(/[^\d]/g, "")
  const message = String(fields.whatsappMessage || "").trim()
  return phone
    ? `https://api.whatsapp.com/send?phone=${phone}${message ? `&text=${encodeURIComponent(message)}` : ""}`
    : raw
}

function buildEventCalendarHref(fields = {}) {
  const title = String(fields.eventTitle || "").trim()
  if (!title) return ""
  const start = String(fields.eventStart || "").trim()
  const end = String(fields.eventEnd || "").trim()
  const location = String(fields.eventLocation || "").trim()
  const details = String(fields.eventDescription || "").trim()

  const params = new URLSearchParams()
  params.set("action", "TEMPLATE")
  params.set("text", title)
  if (start && end) {
    const startUtc = start.includes("T") ? new Date(start).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z") : ""
    const endUtc = end.includes("T") ? new Date(end).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z") : ""
    if (startUtc && endUtc) {
      params.set("dates", `${startUtc}/${endUtc}`)
    }
  }
  if (location) params.set("location", location)
  if (details) params.set("details", details)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadTextFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function openStructuredContent(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.target = "_self"
  if (fileName) {
    link.download = fileName
  }
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function normalizeKind(qrType, content) {
  if (["URL", "Youtube", "App Store", "PDF", "Image Gallery", "Rating", "Feedback", "Social Media"].includes(qrType)) {
    return "url"
  }
  if (["Email", "Phone", "SMS", "WhatsApp", "Event"].includes(qrType)) {
    return "action"
  }
  if (qrType === "Location") {
    return "location"
  }
  if (qrType === "Social Media") {
    return "social"
  }
  if (["vCard", "Event", "WIFI", "Text"].includes(qrType)) {
    return "content"
  }
  return /^https?:\/\//i.test(String(content || "").trim()) ? "url" : "content"
}

function buildLocationHref(content) {
  const raw = String(content || "").trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.replace(/^geo:/i, "")
  const [lat, lng] = normalized.split(",")
  if (!lat || !lng) return ""
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
}

function resolveContent(link) {
  if (!link) return ""
  const targetPayload = link.targetPayload || {}
  const fields = targetPayload.fields || {}
  const socialLinks = Array.isArray(targetPayload.socialLinks) ? targetPayload.socialLinks : []
  const rawContent = String(link.content || "").trim()

  switch (link.qrType) {
    case "URL":
      return ensureExternalUrl(fields.url || rawContent)
    case "Youtube":
      return ensureExternalUrl(fields.youtubeUrl || rawContent)
    case "App Store":
      return ensureExternalUrl(fields.appStoreUrl || rawContent)
    case "PDF":
      return ensureExternalUrl(fields.pdfUrl || rawContent)
    case "Image Gallery":
      return ensureExternalUrl(fields.galleryUrl || rawContent)
    case "Email":
      return rawContent || `mailto:${String(fields.email || "").trim()}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.body || "")}`
    case "Phone":
      return rawContent || `tel:${String(fields.phone || "").trim()}`
    case "SMS":
      return buildSmsHref(rawContent, fields)
    case "WhatsApp":
      return buildWhatsappHref(rawContent, fields)
    case "Location":
      return fields.mapsUrl || rawContent
    case "Social Media": {
      const firstUrl = socialLinks.find((item) => String(item?.url || "").trim())?.url
      return ensureExternalUrl(firstUrl || extractFirstUrl(rawContent) || rawContent)
    }
    case "Event":
      return buildEventCalendarHref(fields) || rawContent
    default:
      return rawContent
  }
}

function withManagedLinkId(href, linkId) {
  const raw = String(href || "").trim()
  const managedId = String(linkId || "").trim()
  if (!raw || !managedId || !/^https?:\/\//i.test(raw)) return raw

  try {
    const parsed = new URL(raw)
    const isTrackedPath = ["/rate", "/feedback"].includes(parsed.pathname) || /^\/(pdf|gallery)\//.test(parsed.pathname)
    if (!isTrackedPath) return raw
    if (!parsed.searchParams.get("lid")) {
      parsed.searchParams.set("lid", managedId)
    }
    return parsed.toString()
  } catch {
    return raw
  }
}

export default function ManagedQrPage() {
  const params = useParams()
  const routeParamId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const linkId = useMemo(() => {
    if (routeParamId && UUID_PATTERN.test(String(routeParamId).trim())) return String(routeParamId).trim()
    if (typeof window === "undefined") return ""
    const match = window.location.pathname.match(/\/q\/([0-9a-f-]{36})/i)
    const fromPath = match?.[1] || ""
    return UUID_PATTERN.test(fromPath) ? fromPath : ""
  }, [routeParamId])
  const [link, setLink] = useState(null)
  const [error, setError] = useState("")
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (!linkId) return
    let mounted = true
    apiRequest(`/public/qr-links/${linkId}`)
      .then((data) => {
        if (!mounted) return
        setLink(data.link)
      })
      .catch((requestError) => {
        if (!mounted) return
        setError(requestError.message || "Unable to load QR destination")
      })
    return () => {
      mounted = false
    }
  }, [linkId])

  const kind = useMemo(
    () => normalizeKind(link?.qrType || "", resolveContent(link)),
    [link],
  )

  const resolvedContent = useMemo(() => resolveContent(link), [link])

  const openHref = useMemo(() => {
    if (!resolvedContent) return ""
    if (kind === "location") return buildLocationHref(resolvedContent)
    if (kind === "url" || kind === "action") return withManagedLinkId(String(resolvedContent || "").trim(), link?.id)
    return ""
  }, [kind, link, resolvedContent])

  const shouldDirectJump = Boolean(link && !link.isExpired && openHref && ["url", "action", "location"].includes(kind))

  useEffect(() => {
    if (!link || link.isExpired || !openHref || opened) return
    const timer = window.setTimeout(() => {
      if (shouldDirectJump) {
        window.location.replace(openHref)
      } else {
        window.location.href = openHref
      }
      setOpened(true)
    }, shouldDirectJump ? 80 : 350)
    return () => window.clearTimeout(timer)
  }, [link, openHref, opened, shouldDirectJump])

  function copyContent() {
    if (!link?.content) return
    navigator.clipboard?.writeText(resolvedContent || link.content).catch(() => {})
  }

  function downloadStructuredContent() {
    if (!resolvedContent) return
    if (link.qrType === "vCard") {
      downloadTextFile(resolvedContent, "contact.vcf", "text/vcard")
      return
    }
    if (link.qrType === "Event") {
      downloadTextFile(resolvedContent, "event.ics", "text/calendar")
      return
    }
    if (link.qrType === "WIFI") {
      downloadTextFile(resolvedContent, "wifi.txt", "text/plain")
      return
    }
    downloadTextFile(resolvedContent, "qr-content.txt", "text/plain")
  }

  function openStructuredAction() {
    if (!resolvedContent) return
    if (link.qrType === "vCard") {
      openStructuredContent(resolvedContent, "contact.vcf", "text/vcard")
      return
    }
    if (link.qrType === "WIFI") {
      openStructuredContent(resolvedContent, "wifi.txt", "text/plain")
      return
    }
    if (link.qrType === "Text") {
      copyContent()
      return
    }
    if (link.qrType === "Event") {
      downloadTextFile(resolvedContent, "event.ics", "text/calendar")
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">QR destination</h1>

        {!!error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}

        {link && (
          <>
            <PublicScanTracker
              title={link.title || link.qrType}
              targetKind={link.qrType}
              expired={link.isExpired}
              linkId={link.id}
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {link.qrType}
              </span>
              {link.expiresAt && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${link.isExpired ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                  {link.isExpired ? "Expired" : "Active until"} {new Date(link.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-slate-900">{link.title || `${link.qrType} QR`}</h2>

            {link.isExpired ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="font-semibold">QR expired</p>
                <p className="mt-2 text-sm">This QR is no longer available because its validity period has ended.</p>
              </div>
            ) : (
              <>
                {kind === "url" || kind === "action" || kind === "location" ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-600">
                      {opened
                        ? "If nothing opened automatically, use the button below."
                        : shouldDirectJump
                          ? "Redirecting to your destination..."
                          : "Opening your destination..."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={openHref}
                        target="_self"
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                      >
                        {link.qrType === "Event" ? "Open in Google Calendar" : "Open destination"}
                      </a>
                      <button
                        type="button"
                        onClick={copyContent}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        Copy raw content
                      </button>
                    </div>
                    <p className="mt-4 break-all text-sm text-slate-500">{resolvedContent || link.content}</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{resolvedContent || link.content}</pre>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {link.qrType === "vCard" && (
                        <button
                          type="button"
                          onClick={openStructuredAction}
                          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                        >
                          Open contact card
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={copyContent}
                        className={`rounded-xl px-4 py-3 text-sm font-medium ${link.qrType === "vCard" ? "border border-slate-300 text-slate-700" : "bg-slate-950 text-white"}`}
                      >
                        {link.qrType === "Text" ? "Copy text" : "Copy content"}
                      </button>
                      <button
                        type="button"
                        onClick={downloadStructuredContent}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        {link.qrType === "vCard"
                          ? "Save contact"
                          : link.qrType === "WIFI"
                            ? "Download WiFi details"
                            : link.qrType === "Event"
                              ? "Download event file"
                              : "Download content"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  )
}
