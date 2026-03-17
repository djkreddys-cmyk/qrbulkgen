import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import ManagedQrClient from "./ManagedQrClient"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const dynamic = "force-dynamic"

function buildLocationHref(content) {
  const raw = String(content || "").trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.replace(/^geo:/i, "")
  const [lat, lng] = normalized.split(",")
  if (!lat || !lng) return ""
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
}

function normalizeKind(qrType, content) {
  if (["URL", "Youtube", "App Store", "PDF", "Image Gallery", "Rating", "Feedback"].includes(qrType)) {
    return "url"
  }
  if (["Email", "Phone", "SMS", "WhatsApp", "Event"].includes(qrType)) {
    return "action"
  }
  if (qrType === "Location") {
    return "location"
  }
  if (["vCard", "WIFI", "Text", "Social Media"].includes(qrType)) {
    return "content"
  }
  return /^https?:\/\//i.test(String(content || "").trim()) ? "url" : "content"
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

async function fetchManagedLink(linkId) {
  const response = await fetch(`${API_BASE_URL}/public/qr-links/${linkId}`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to load QR destination")
  }
  return data?.link || null
}

async function trackManagedView(requestHeaders, link) {
  try {
    const forwardedFor = requestHeaders.get("x-forwarded-for") || ""
    const userAgent = requestHeaders.get("user-agent") || ""
    const referer = requestHeaders.get("referer") || ""

    await fetch(`${API_BASE_URL}/public/track-view`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {}),
        ...(referer ? { referer } : {}),
      },
      body: JSON.stringify({
        sourceUrl: String(link.resolvedTarget || link.content || "").trim(),
        title: link.title || link.qrType || "",
        targetKind: link.qrType || "",
        expired: Boolean(link.isExpired),
        linkId: link.id,
      }),
    }).catch(() => {})
  } catch {
    // ignore tracking failures on redirect path
  }
}

export default async function ManagedQrPage({ params }) {
  const resolvedParams = await params
  const linkId = String(resolvedParams?.id || "").trim()

  if (!UUID_PATTERN.test(linkId)) {
    notFound()
  }

  const link = await fetchManagedLink(linkId)
  if (!link) {
    notFound()
  }

  const resolvedContent = String(link.resolvedTarget || link.content || "").trim()
  const kind = normalizeKind(link.qrType || "", resolvedContent)
  const openHref =
    kind === "location"
      ? buildLocationHref(resolvedContent)
      : kind === "url" || kind === "action"
        ? withManagedLinkId(resolvedContent, link.id)
        : ""

  const shouldDirectJump = Boolean(link && !link.isExpired && openHref && ["url", "action", "location"].includes(kind))

  if (shouldDirectJump) {
    await trackManagedView(await headers(), link)
    redirect(openHref)
  }

  return (
    <ManagedQrClient
      link={link}
      kind={kind}
      resolvedContent={resolvedContent}
      openHref={openHref}
    />
  )
}
