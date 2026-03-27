"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

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

export default function PublicPageTracker({ targetKind = "marketing-page" }) {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const sourceUrl = normalizeTrackingUrl(window.location.href)
    if (!sourceUrl) {
      return
    }

    apiRequest("/public/track-view", {
      method: "POST",
      body: JSON.stringify({
        sourceUrl,
        title: document.title || "",
        targetKind,
      }),
    }).catch(() => {})
  }, [pathname, targetKind])

  return null
}
