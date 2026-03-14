import { Suspense } from "react"

import FeedbackClientPage from "./page-client"

function FeedbackLoadingState() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-2xl bg-white border rounded-lg p-8">
        <h1 className="text-2xl font-bold">Share your feedback</h1>
        <p className="mt-4 text-gray-600">Loading form...</p>
      </section>
    </main>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackLoadingState />}>
      <FeedbackClientPage />
    </Suspense>
  )
}
