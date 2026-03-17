"use client"

import { useMemo } from "react"

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

export default function ManagedQrClient({ link, kind, resolvedContent, openHref, error = "" }) {
  const heading = useMemo(() => link?.title || `${link?.qrType || "QR"} QR`, [link])

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

            <h2 className="mt-5 text-2xl font-semibold text-slate-900">{heading}</h2>

            {link.isExpired ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <p className="font-semibold">QR expired</p>
                <p className="mt-2 text-sm">This QR is no longer available because its validity period has ended.</p>
              </div>
            ) : kind === "url" || kind === "action" || kind === "location" ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">Opening your destination...</p>
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
      </section>
    </main>
  )
}
