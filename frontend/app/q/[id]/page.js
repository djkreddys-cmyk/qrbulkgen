"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import PublicScanTracker from "../../../components/PublicScanTracker"
import { apiRequest } from "../../../lib/api"

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

function normalizeKind(qrType, content) {
  if (["URL", "Youtube", "App Store", "PDF", "Image Gallery", "Rating", "Feedback"].includes(qrType)) {
    return "url"
  }
  if (["Email", "Phone", "SMS", "WhatsApp"].includes(qrType)) {
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
  const raw = String(content || "").trim().replace(/^geo:/i, "")
  const [lat, lng] = raw.split(",")
  if (!lat || !lng) return ""
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
}

export default function ManagedQrPage() {
  const params = useParams()
  const routeParamId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const linkId = useMemo(() => {
    if (routeParamId) return routeParamId
    if (typeof window === "undefined") return ""
    const match = window.location.pathname.match(/\/q\/([0-9a-f-]+)/i)
    return match?.[1] || ""
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
    () => normalizeKind(link?.qrType || "", link?.content || ""),
    [link?.qrType, link?.content],
  )

  const openHref = useMemo(() => {
    if (!link?.content) return ""
    if (kind === "location") return buildLocationHref(link.content)
    if (kind === "url" || kind === "action") return String(link.content || "").trim()
    return ""
  }, [kind, link])

  useEffect(() => {
    if (!link || link.isExpired || !openHref || opened) return
    const timer = window.setTimeout(() => {
      window.location.href = openHref
      setOpened(true)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [link, openHref, opened])

  function copyContent() {
    if (!link?.content) return
    navigator.clipboard?.writeText(link.content).catch(() => {})
  }

  function downloadStructuredContent() {
    if (!link?.content) return
    if (link.qrType === "vCard") {
      downloadTextFile(link.content, "contact.vcf", "text/vcard")
      return
    }
    if (link.qrType === "Event") {
      downloadTextFile(link.content, "event.ics", "text/calendar")
      return
    }
    if (link.qrType === "WIFI") {
      downloadTextFile(link.content, "wifi.txt", "text/plain")
      return
    }
    downloadTextFile(link.content, "qr-content.txt", "text/plain")
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
                      {opened ? "If nothing opened automatically, use the button below." : "Opening your destination..."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={openHref}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                      >
                        Open destination
                      </a>
                      <button
                        type="button"
                        onClick={copyContent}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        Copy raw content
                      </button>
                    </div>
                    <p className="mt-4 break-all text-sm text-slate-500">{link.content}</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{link.content}</pre>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={copyContent}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                      >
                        Copy content
                      </button>
                      <button
                        type="button"
                        onClick={downloadStructuredContent}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        Download content
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
