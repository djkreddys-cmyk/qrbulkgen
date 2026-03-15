"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { apiRequest } from "../../../lib/api"

export default function GalleryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [title, setTitle] = useState("Image Gallery")
  const [images, setImages] = useState([])
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
        if (data?.link?.type !== "gallery") {
          setError("Invalid gallery link")
          return
        }
        setTitle(data.link.title || "Image Gallery")
        setImages(data.link.payload?.images || [])
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Unable to load gallery")
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
      {loading && <p>Loading gallery...</p>}
      {!!error && <p className="text-red-600">{error}</p>}
      {!loading && !error && isExpired && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-semibold">QR expired</p>
          <p className="mt-1 text-sm">This gallery QR is no longer active.</p>
        </div>
      )}
      {!loading && !error && !isExpired && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <a key={`${image.url}-${index}`} href={image.url} target="_blank" rel="noreferrer" className="border rounded overflow-hidden">
              <img src={image.url} alt={image.fileName || `Image ${index + 1}`} className="w-full h-56 object-cover" />
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
