"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { apiRequest } from "../../../lib/api"

export default function PdfPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [title, setTitle] = useState("PDF Document")
  const [pdfUrl, setPdfUrl] = useState("")
  const expiryValue = searchParams.get("exp") || ""
  const isExpired = expiryValue ? new Date(expiryValue).getTime() < Date.now() : false

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function run() {
      try {
        setLoading(true)
        setError("")
        const data = await apiRequest(`/public/links/${id}`)
        if (cancelled) return
        if (data?.link?.type !== "pdf") {
          setError("Invalid PDF link")
          return
        }
        setTitle(data.link.title || "PDF Document")
        setPdfUrl(data.link.payload?.url || "")
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Unable to load PDF")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      {loading && <p>Loading PDF...</p>}
      {!!error && <p className="text-red-600">{error}</p>}
      {!loading && !error && isExpired && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-semibold">QR expired</p>
          <p className="mt-1 text-sm">This PDF QR is no longer active.</p>
        </div>
      )}
      {!loading && !error && !isExpired && !pdfUrl && <p>PDF URL missing</p>}
      {!loading && !error && !isExpired && !!pdfUrl && (
        <iframe title={title} src={pdfUrl} className="w-full min-h-[80vh] border rounded" />
      )}
    </main>
  )
}
