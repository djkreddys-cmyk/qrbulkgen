"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"

import PublicScanTracker from "../../components/PublicScanTracker"

function decodePayload(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))))
  } catch {
    return null
  }
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const withProtocol = /^(https?:\/\/|whatsapp:\/\/)/i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return ""
  }
}

export default function SocialLinksClientPage() {
  const searchParams = useSearchParams()
  const encoded = searchParams.get("s") || ""
  const payload = useMemo(() => decodePayload(encoded), [encoded])
  const expiryValue = searchParams.get("exp") || ""
  const linkId = searchParams.get("lid") || ""
  const isExpired = expiryValue ? new Date(expiryValue).getTime() < Date.now() : false

  const title = String(payload?.title || "").trim() || "Follow us"
  const links = Array.isArray(payload?.links)
    ? payload.links
        .map((item) => ({
          label: String(item?.label || "").trim(),
          platform: String(item?.platform || "").trim(),
          url: normalizeExternalUrl(item?.url),
          appUrl: normalizeExternalUrl(item?.appUrl),
        }))
        .filter((item) => item.label && item.url)
    : []

  function handleOpen(item) {
    if (typeof window === "undefined") return
    const appUrl = String(item?.appUrl || "").trim()
    const webUrl = String(item?.url || "").trim()
    if (!appUrl || appUrl === webUrl) {
      window.location.assign(webUrl)
      return
    }
    const fallback = window.setTimeout(() => {
      window.location.assign(webUrl)
    }, 700)
    window.location.assign(appUrl)
    window.setTimeout(() => window.clearTimeout(fallback), 1200)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Social Links</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">Scan once and open the profile you want.</p>
        <PublicScanTracker title={title} targetKind="social" expired={isExpired} linkId={linkId} />

        {isExpired ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">QR expired</p>
            <p className="mt-1 text-sm">This social links QR is no longer accepting scans.</p>
          </div>
        ) : links.length ? (
          <div className="mt-8 grid gap-3">
            {links.map((item) => (
              <button
                key={`${item.label}-${item.url}`}
                type="button"
                onClick={() => handleOpen(item)}
                className="rounded-2xl border border-slate-200 px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 break-all text-sm text-slate-500">{item.url}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            <p className="font-semibold text-slate-900">No links found</p>
            <p className="mt-1 text-sm">Add at least one valid social profile URL in the QR generator.</p>
          </div>
        )}
      </section>
    </main>
  )
}
