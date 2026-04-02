import { Suspense } from "react"

import SocialLinksClientPage from "./page-client"

function SocialLinksLoadingState() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Social Links</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Follow us</h1>
        <p className="mt-2 text-sm text-slate-600">Loading social links...</p>
      </section>
    </main>
  )
}

export default function SocialLinksPage() {
  return (
    <Suspense fallback={<SocialLinksLoadingState />}>
      <SocialLinksClientPage />
    </Suspense>
  )
}
