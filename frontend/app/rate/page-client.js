"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

function renderStars(value, active) {
  return Array.from({ length: value }, (_, i) => (
    <span key={i} className={active ? "text-yellow-500" : "text-gray-400"}>
      ★
    </span>
  ))
}

export default function RateClientPage() {
  const searchParams = useSearchParams()
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const title = searchParams.get("title") || "Rate your experience"
  const style = searchParams.get("style") === "numbers" ? "numbers" : "stars"
  const scale = searchParams.get("scale") === "10" ? 10 : 5
  const nextUrl = searchParams.get("next") || ""

  const options = useMemo(() => Array.from({ length: scale }, (_, i) => i + 1), [scale])

  function submitRating() {
    setSubmitted(true)
    if (nextUrl) {
      setTimeout(() => {
        window.location.href = nextUrl
      }, 900)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-lg bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">{title}</h1>

        {!submitted ? (
          <>
            <p className="mt-2 text-gray-600">Select your rating:</p>
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
                  {style === "numbers" ? value : renderStars(value, rating === value)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={submitRating}
              disabled={!rating}
              className="mt-6 w-full bg-black text-white py-2 rounded disabled:opacity-60"
            >
              Submit Rating
            </button>
          </>
        ) : (
          <p className="mt-4 text-green-700">
            Thanks for your rating{rating ? `: ${rating}/${scale}` : ""}.
          </p>
        )}
      </section>
    </main>
  )
}
