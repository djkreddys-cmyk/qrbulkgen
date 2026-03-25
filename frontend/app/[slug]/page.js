import { notFound } from "next/navigation"

import ShortLinkRedirectClient from "./ShortLinkRedirectClient"
export const dynamic = "force-dynamic"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"

const RESERVED_SLUGS = new Set([
  "api",
  "barcode-generator",
  "blog",
  "bulk-barcode-generator",
  "bulk-qr-codes",
  "bulk-qr-codes-for-inventory",
  "create-qr-codes-from-csv",
  "dashboard",
  "feedback",
  "forgot-password",
  "gallery",
  "generate",
  "login",
  "pdf",
  "print-multiple-qr-codes-on-one-page",
  "private-qr-code-generator",
  "pricing",
  "product-label-generator",
  "q",
  "qr-code-generator-for-labels",
  "qr-codes-for-classrooms",
  "qr-codes-for-events",
  "qr-codes-for-inventory-packaging",
  "qr-codes-for-marketing",
  "qr-codes-for-product-packaging",
  "qr-codes-for-restaurant-tables",
  "rate",
  "register",
  "reset-password",
  "short-links",
  "single-qr-codes",
  "upload",
  "use-cases",
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
