import { Suspense } from "react"

import RateClientPage from "./page-client"

function RateLoadingState() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-lg bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">Rate your experience</h1>
        <p className="mt-4 text-gray-600">Loading rating form...</p>
      </section>
    </main>
  )
}

export default function RatePage() {
  return (
    <Suspense fallback={<RateLoadingState />}>
      <RateClientPage />
    </Suspense>
  )
}
