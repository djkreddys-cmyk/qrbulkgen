"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiRequest } from "../../lib/api"
import PublicScanTracker from "../../components/PublicScanTracker"

function decodePayload(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))))
  } catch {
    return null
  }
}

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

export default function FeedbackClientPage() {
  const searchParams = useSearchParams()
  const encoded = searchParams.get("f") || ""
  const payload = useMemo(() => decodePayload(encoded), [encoded])
  const expiryValue = searchParams.get("exp") || ""
  const isExpired = expiryValue ? new Date(expiryValue).getTime() < Date.now() : false

  const questions = payload?.questions?.length
    ? payload.questions
    : ["How was your overall experience?"]
  const title = payload?.title || "Share your feedback"

  const [answers, setAnswers] = useState(() => questions.map(() => ""))
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submissionId, setSubmissionId] = useState("")

  function updateAnswer(index, value) {
    setAnswers((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setError("")
      const data = await apiRequest("/public/feedback-submit", {
        method: "POST",
        body: JSON.stringify({
          title,
          questions,
          answers,
          sourceUrl: typeof window !== "undefined" ? normalizeTrackingUrl(window.location.href) : "",
        }),
      })
      setSubmissionId(data?.submission?.id || "")
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message || "Failed to submit feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-2xl bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <PublicScanTracker title={title} targetKind="feedback" expired={isExpired} />

        {isExpired ? (
          <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">QR expired</p>
            <p className="mt-1 text-sm">This feedback QR is no longer accepting scans.</p>
          </div>
        ) : !submitted ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <div key={index}>
                <label className="block mb-1 font-medium">{question}</label>
                <textarea
                  rows={3}
                  value={answers[index]}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                  className="w-full border p-2"
                  placeholder="Your answer..."
                />
              </div>
            ))}
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
            {!!error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        ) : (
          <div className="mt-4 text-green-700">
            <p>Thanks for your feedback.</p>
            {!!submissionId && <p className="text-xs mt-1">Ref: {submissionId}</p>}
          </div>
        )}
      </section>
    </main>
  )
}
