import Link from "next/link"

import { HeroCtaRow, MarketingShell } from "../components/MarketingLayout"
import StructuredData from "../components/StructuredData"
import { blogPosts, homepageStats, landingPages, pricingTiers, siteUrl } from "../lib/content"

export const metadata = {
  title: "QRBulkGen | Bulk and Single QR Code Generator for Teams",
  description:
    "Create single QR codes, run bulk CSV jobs, monitor worker status, and launch feedback-ready scan experiences from one platform.",
  alternates: {
    canonical: siteUrl,
  },
}

export default function Home() {
  return (
    <MarketingShell>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "QRBulkGen",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android",
          offers: pricingTiers.map((tier) => ({
            "@type": "Offer",
            name: tier.name,
            price: tier.price === "Free" ? "0" : tier.price.replace(/[^0-9.]/g, ""),
            priceCurrency: "USD",
          })),
        }}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 py-16">
        <section className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-7">
            <p className="inline-flex rounded-full border border-amber-300/70 bg-amber-100/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
              Conversion-focused landing page
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
              The QR workflow that moves from one polished asset to thousands of tracked outputs.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              QRBulkGen connects single QR creation, bulk CSV jobs, dashboard visibility, feedback
              experiences, and mobile monitoring so teams can launch without juggling disconnected tools.
            </p>
            <HeroCtaRow />
            <div className="grid gap-4 sm:grid-cols-2">
              {homepageStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-sm"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">What teams need</p>
              <h2 className="mt-3 text-3xl font-bold">One system from campaign setup to download.</h2>
              <p className="mt-4 leading-7 text-slate-300">
                Build branded single codes, queue CSV batches, track job states, and keep public scan
                experiences like rating, feedback, gallery, and PDF delivery inside one product.
              </p>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                "Single QR preview and instant file output",
                "Bulk CSV queueing with ZIP artifact delivery",
                "Dashboard and mobile visibility for job states",
                "Public scan pages for ratings, feedback, PDFs, and galleries",
              ].map((feature) => (
                <div key={feature} className="rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-[2rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Use cases</p>
            <h2 className="mt-3 text-3xl font-bold">
              Designed for operations, packaging, events, and campaign teams.
            </h2>
          </div>
          <p className="text-slate-300">
            The same engine powers quick single generation and repeatable bulk delivery. That means the
            product still works when volume, compliance, or team visibility starts to matter.
          </p>
          <div className="flex flex-wrap gap-3">
            {landingPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                {page.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pricing path</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Start free, then scale only when the workflow proves itself.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-[2rem] border p-7 shadow-sm ${
                  tier.featured
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200/80 bg-white/90 text-slate-950"
                }`}
              >
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.22em] ${
                    tier.featured ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {tier.name}
                </p>
                <p className="mt-4 text-4xl font-black">{tier.price}</p>
                <p className={`mt-2 ${tier.featured ? "text-slate-300" : "text-slate-600"}`}>
                  {tier.billing}
                </p>
                <p className={`mt-5 leading-7 ${tier.featured ? "text-slate-200" : "text-slate-600"}`}>
                  {tier.summary}
                </p>
                <ul className={`mt-6 space-y-3 ${tier.featured ? "text-slate-100" : "text-slate-700"}`}>
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  href={tier.ctaHref}
                  className={`mt-8 inline-flex rounded-full px-5 py-3 text-sm font-semibold ${
                    tier.featured ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                  }`}
                >
                  {tier.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Latest content</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              SEO pages and blog content that guide people into the product.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {blogPosts.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {post.category}
                </p>
                <h3 className="mt-4 text-2xl font-bold text-slate-950">{post.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{post.description}</p>
                <p className="mt-6 text-sm font-semibold text-slate-950">Read article</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
