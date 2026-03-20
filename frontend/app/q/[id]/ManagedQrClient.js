"use client"

import { useEffect, useMemo } from "react"

import PublicScanTracker from "../../../components/PublicScanTracker"

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

function openStructuredContent(content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.target = "_self"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function shareStructuredContent(content, fileName, mimeType, fallbackText = "") {
  const blob = new Blob([content], { type: mimeType })
  const file = new File([blob], fileName, { type: mimeType })

  if (!navigator?.share) {
    return false
  }

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: fileName,
      files: [file],
    })
    return true
  }

  await navigator.share({
    title: fileName,
    text: fallbackText || content,
  })
  return true
}

export default function ManagedQrClient({ link, kind, resolvedContent, openHref, error = "" }) {
  const heading = useMemo(() => link?.title || `${link?.qrType || "QR"} QR`, [link])
  const socialDestinations = useMemo(() => {
    if (link?.qrType !== "Social Media") return []

    const payloadLinks = Array.isArray(link?.targetPayload?.socialLinks)
      ? link.targetPayload.socialLinks
          .map((item) => {
            const label = String(
              item?.platform === "Custom" ? item?.customPlatform || "" : item?.platform || "",
            ).trim()
            const href = String(item?.url || "").trim()
            return label && href ? { label, href } : null
          })
          .filter(Boolean)
      : []

    if (payloadLinks.length) return payloadLinks

    return String(resolvedContent || link?.content || "")
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(/^\s*([^:]+):\s*(https?:\/\/\S+)\s*$/i)
        if (!match) return null
        return { label: match[1].trim(), href: match[2].trim() }
      })
      .filter(Boolean)
  }, [link, resolvedContent])

  useEffect(() => {
    if (link?.isExpired) return
    if (link?.qrType !== "WhatsApp") return
    if (!openHref) return

    const timer = window.setTimeout(() => {
      window.location.href = openHref
    }, 150)

    return () => window.clearTimeout(timer)
  }, [link, openHref])

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
    if (link.qrType === "WIFI") {
      copyContent()
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

  async function shareStructuredAction() {
    if (!resolvedContent || link.qrType !== "vCard") return

    try {
      const shared = await shareStructuredContent(resolvedContent, "contact.vcf", "text/vcard", resolvedContent)
      if (!shared) {
        copyContent()
      }
    } catch {
      copyContent()
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

            <h2 className="mt-5 text-2xl font-semibold text-slate-900">{heading}</h2>

            {link.isExpired ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="font-semibold">QR expired</p>
                <p className="mt-2 text-sm">This QR is no longer available because its validity period has ended.</p>
              </div>
            ) : kind === "url" || kind === "action" || kind === "location" ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  {link.qrType === "WhatsApp" ? "Opening WhatsApp..." : "Opening your destination..."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={openHref}
                    target="_self"
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                  >
                    {link.qrType === "Event"
                      ? "Open in Google Calendar"
                      : link.qrType === "WhatsApp"
                        ? "Open WhatsApp"
                        : "Open destination"}
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
                {link.qrType === "Social Media" && socialDestinations.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Choose a platform to open.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {socialDestinations.map((item) => (
                        <a
                          key={`${item.label}-${item.href}`}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-sky-300 hover:text-sky-700"
                        >
                          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {item.label}
                          </span>
                          <span className="mt-2 block break-all text-slate-700">{item.href}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-sm text-slate-700">{resolvedContent || link.content}</pre>
                )}
                {link.qrType === "WIFI" ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Auto-connect works only when a device scans a raw WiFi QR directly in the camera or OS scanner. This managed page can show or copy the WiFi details, but it cannot join the network automatically.
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  {link.qrType === "WIFI" && (
                    <button
                      type="button"
                      onClick={openStructuredAction}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                    >
                      Copy WiFi details
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={link.qrType === "vCard" ? shareStructuredAction : copyContent}
                    className={`rounded-xl px-4 py-3 text-sm font-medium ${link.qrType === "vCard" || link.qrType === "Social Media" || link.qrType === "WIFI" ? "border border-slate-300 text-slate-700" : "bg-slate-950 text-white"}`}
                  >
                    {link.qrType === "vCard"
                      ? "Share contact"
                      : link.qrType === "Text"
                        ? "Copy text"
                        : link.qrType === "WIFI"
                          ? "Copy raw content"
                          : "Copy content"}
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
      </section>
    </main>
  )
}
