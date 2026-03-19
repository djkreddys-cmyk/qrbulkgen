import { notFound } from "next/navigation"

import ShortLinkRedirectClient from "./ShortLinkRedirectClient"
export const dynamic = "force-dynamic"

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

  return <ShortLinkRedirectClient slug={slug} />
}
