import Link from "next/link"

import { HeroCtaRow, MarketingShell } from "./MarketingLayout"
import StructuredData from "./StructuredData"

export default function SeoLandingPage({ page }) {
  return (
    <MarketingShell>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16">
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-amber-300/70 bg-amber-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
              {page.heroKicker}
            </p>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950">
              {page.heroTitle}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">{page.heroBody}</p>
            <HeroCtaRow />
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-950">Why teams choose this workflow</h2>
            <ul className="mt-6 space-y-4">
              {page.bullets.map((bullet) => (
                <li key={bullet} className="rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 rounded-[2rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold">{page.workflowTitle || "Use one product from setup to delivery."}</h2>
          </div>
          <p className="text-slate-300">
            {page.workflowBody ||
              "Generator, job queue, worker processing, downloads, and public destination experiences all stay connected so teams are not moving between disconnected tools."}
          </p>
          <div className="space-y-3 rounded-3xl bg-white/10 p-6 text-sm text-slate-200">
            <p>Internal links and rollout notes for this workflow:</p>
            {!!page.workflowPoints?.length && (
              <ul className="space-y-2 text-slate-100">
                {page.workflowPoints.map((point) => (
                  <li key={point} className="rounded-2xl bg-white/10 px-3 py-3">
                    {point}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-full bg-white/15 px-3 py-2 hover:bg-white/25">
                Pricing
              </Link>
              <Link href="/#insights" className="rounded-full bg-white/15 px-3 py-2 hover:bg-white/25">
                Insights
              </Link>
              <Link href="/generate" className="rounded-full bg-white/15 px-3 py-2 hover:bg-white/25">
                Generator
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Questions teams ask before rollout</h2>
          </div>
          <div className="grid gap-4">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-950">{faq.question}</h3>
                <p className="mt-2 leading-7 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
