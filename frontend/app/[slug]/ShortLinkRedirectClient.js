"use client"

import { useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"

async function getPreciseLocationPayload() {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude).toFixed(6)
        const longitude = Number(position.coords.longitude).toFixed(6)
        resolve({
          source: "device",
          latitude,
          longitude,
          label: `${latitude}, ${longitude}`,
        })
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 60000,
      },
    )
  })
}

export default function ShortLinkRedirectClient({ slug, targetUrl }) {
  const [message, setMessage] = useState("Opening short link...")

  useEffect(() => {
    let cancelled = false

    async function continueToTarget() {
      if (!cancelled && targetUrl) {
        window.location.replace(targetUrl)
      }
    }

    async function resolveShortLink() {
      try {
        const preciseLocation = await getPreciseLocationPayload()
        const response = await fetch(`${API_BASE_URL}/public/short-links/${encodeURIComponent(slug)}/resolve`, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preciseLocation,
          }),
        })

        const data = await response.json().catch(() => null)
        const resolvedTargetUrl = data?.link?.targetUrl || targetUrl

        if (!response.ok || !resolvedTargetUrl) {
          await continueToTarget()
          return
        }

        if (!cancelled) {
          window.location.replace(resolvedTargetUrl)
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Opening short link...")
        }
        await continueToTarget()
      }
    }

    resolveShortLink()

    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <p className="mt-3 text-sm text-slate-500">
          If the redirect does not start automatically, continue to{" "}
          <a href={targetUrl} className="font-semibold text-sky-700 underline underline-offset-2">
            the destination
          </a>
          .
        </p>
      </div>
    </main>
  )
}
