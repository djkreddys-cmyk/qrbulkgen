"use client"

import { useEffect } from "react"

import { apiRequest } from "../lib/api"

function normalizeTrackingUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""

  try {
    const parsed = new URL(raw)
    parsed.searchParams.delete("exp")
    return parsed.toString()
  } catch {
    return raw
  }
}

export default function PublicScanTracker({ title = "", targetKind = "", expired = false, linkId = "" }) {
  useEffect(() => {
    const sourceUrl = normalizeTrackingUrl(window.location.href)
    if (!sourceUrl && !linkId) return

    apiRequest("/public/track-view", {
      method: "POST",
      body: JSON.stringify({
        sourceUrl,
        title,
        targetKind,
        expired,
        linkId,
      }),
    }).catch(() => {})
  }, [title, targetKind, expired, linkId])

  return null
}
