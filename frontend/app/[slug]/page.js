import { notFound } from "next/navigation"

import ShortLinkRedirectClient from "./ShortLinkRedirectClient"
export const dynamic = "force-dynamic"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"

const RESERVED_SLUGS = new Set([
  "api",
  "blog",
  "bulk-qr-codes",
  "dashboard",
  "feedback",
  "forgot-password",
  "gallery",
  "generate",
  "login",
  "pdf",
  "pricing",
  "q",
  "qr-codes-for-events",
  "qr-codes-for-inventory-packaging",
  "qr-codes-for-marketing",
  "rate",
  "register",
  "reset-password",
  "short-links",
  "single-qr-codes",
  "upload",
])

export default async function ShortLinkRedirectPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params
  const slug = String(resolvedParams?.slug || "").trim()
  if (!slug || RESERVED_SLUGS.has(slug)) {
    notFound()
  }

  const response = await fetch(`${API_BASE_URL}/public/short-links/${encodeURIComponent(slug)}/meta`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    notFound()
  }

  if (response.status === 410) {
    notFound()
  }

  const data = await response.json().catch(() => null)
  const targetUrl = data?.link?.targetUrl

  if (!response.ok || !targetUrl) {
    notFound()
  }

  return <ShortLinkRedirectClient slug={slug} targetUrl={targetUrl} />
}
