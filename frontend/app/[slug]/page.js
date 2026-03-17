import { notFound, redirect } from "next/navigation"

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
  const slug = String(params?.slug || "").trim()
  if (!slug || RESERVED_SLUGS.has(slug)) {
    notFound()
  }

  const response = await fetch(`${API_BASE_URL}/public/short-links/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    notFound()
  }

  const data = await response.json()
  const targetUrl = data?.link?.targetUrl

  if (!targetUrl) {
    notFound()
  }

  redirect(targetUrl)
}
