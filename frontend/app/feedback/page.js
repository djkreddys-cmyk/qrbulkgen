"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

function decodePayload(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))))
  } catch {
    return null
  }
}

export default function FeedbackPage() {
  const searchParams = useSearchParams()
  const encoded = searchParams.get("f") || ""
  const payload = useMemo(() => decodePayload(encoded), [encoded])

  const questions = payload?.questions?.length
    ? payload.questions
    : ["How was your overall experience?"]
  const title = payload?.title || "Share your feedback"

  const [answers, setAnswers] = useState(() => questions.map(() => ""))
  const [submitted, setSubmitted] = useState(false)

  function updateAnswer(index, value) {
    setAnswers((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-2xl bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">{title}</h1>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <div key={`${index}-${question}`}>
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
            <button type="submit" className="w-full bg-black text-white py-2 rounded">
              Submit Feedback
            </button>
          </form>
        ) : (
          <p className="mt-4 text-green-700">Thanks for your feedback.</p>
        )}
      </section>
    </main>
  )
}
