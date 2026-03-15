"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiRequest } from "../../lib/api"
import PublicScanTracker from "../../components/PublicScanTracker"

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

export default function RateClientPage() {
  const searchParams = useSearchParams()
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submissionId, setSubmissionId] = useState("")

  const title = searchParams.get("title") || "Rate your experience"
  const style = searchParams.get("style") === "numbers" ? "numbers" : "stars"
  const scale = searchParams.get("scale") === "10" ? 10 : 5
  const expiryValue = searchParams.get("exp") || ""
  const isExpired = expiryValue ? new Date(expiryValue).getTime() < Date.now() : false

  const options = useMemo(() => Array.from({ length: scale }, (_, i) => i + 1), [scale])

  async function submitRating() {
    if (!rating) return
    try {
      setIsSubmitting(true)
      setError("")
      const data = await apiRequest("/public/rate-submit", {
        method: "POST",
        body: JSON.stringify({
          title,
          style,
          scale,
          rating,
          sourceUrl: typeof window !== "undefined" ? normalizeTrackingUrl(window.location.href) : "",
        }),
      })
      setSubmissionId(data?.submission?.id || "")
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message || "Failed to submit rating")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-lg bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <PublicScanTracker title={title} targetKind="rating" expired={isExpired} />

        {isExpired ? (
          <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">QR expired</p>
            <p className="mt-1 text-sm">This rating QR is no longer accepting scans.</p>
          </div>
        ) : !submitted ? (
          <>
            <p className="mt-2 text-gray-600">Select your rating:</p>
            {style === "stars" ? (
              <div className="mt-4 flex gap-2 text-4xl">
                {options.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={value <= rating ? "text-yellow-500" : "text-gray-300"}
                    aria-label={`Rate ${value} out of ${scale}`}
                  >
                    {"\u2605"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {options.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`border rounded p-2 text-center ${
                      rating === value ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={submitRating}
              disabled={!rating || isSubmitting}
              className="mt-6 w-full bg-black text-white py-2 rounded disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </button>
            {!!error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
          </>
        ) : (
          <div className="mt-6 border rounded p-4 bg-green-50 text-green-700">
            <p className="text-3xl">{"\u2713"}</p>
            <p className="mt-2 font-medium">Thanks for your feedback.</p>
            <p className="text-sm mt-1">Rating submitted: {rating}/{scale}</p>
            {!!submissionId && <p className="text-xs mt-1">Ref: {submissionId}</p>}
          </div>
        )}
      </section>
    </main>
  )
}
