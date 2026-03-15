import Link from "next/link"

import HomeRedirectGuard from "../components/HomeRedirectGuard"
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
  const operatingModes = [
    {
      label: "Single QR Studio",
      value: "Instant",
      detail: "Live preview, styling controls, logo support, expiry dates, and direct download.",
    },
    {
      label: "Bulk QR Pipeline",
      value: "CSV + ZIP",
      detail: "Upload spreadsheets, queue jobs, process in the worker, and fetch artifacts later.",
    },
    {
      label: "Analytics Layer",
      value: "Tracked",
      detail: "Job health, scan tracking, rating distributions, feedback summaries, and QR-type reports.",
    },
    {
      label: "Mobile Companion",
      value: "Live",
      detail: "Dashboard, scanner, single generation, bulk monitoring, and password recovery on phone.",
    },
  ]

  const qrTypeGroups = [
    "URL, Text, Email, Phone, SMS, WhatsApp",
    "vCard, Location, YouTube, WiFi, Event, Bitcoin",
    "PDF, Image Gallery, Rating, Feedback",
    "Social Media, App Store, Marketing-ready landing flows",
  ]

  const bestFeatures = [
    {
      title: "Analysis-ready dashboard",
      body: "Your best assets are not just generated. They are tracked with job summaries, scan trends, QR type reports, and engagement snapshots.",
      accent: "from-blue-100 via-white to-slate-100",
    },
    {
      title: "Mobile app for real operations",
      body: "Open the same account on mobile and web, monitor bulk jobs, scan QR codes, generate single QR assets, and recover passwords without friction.",
      accent: "from-emerald-100 via-white to-teal-100",
    },
    {
      title: "18+ QR workflows in one system",
      body: "From contact cards and WiFi to public rating, feedback, PDF, and gallery experiences, teams can stay in one platform instead of combining tools.",
      accent: "from-amber-100 via-white to-rose-100",
    },
  ]

  return (
    <MarketingShell>
      <HomeRedirectGuard />
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
            <p className="inline-flex rounded-full border border-sky-300/70 bg-sky-100/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-900">
              Web + mobile QR operating system
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
              Build branded QR journeys, bulk delivery, and scan analysis in one polished product.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              QRBulkGen gives teams one place for single QR creation, bulk CSV operations, tracked public
              scan experiences, mobile visibility, and dashboard reporting. No more one tool for design,
              one for feedback, and another for monitoring.
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
            <div className="grid gap-4 md:grid-cols-2">
              {operatingModes.map((mode) => (
                <div
                  key={mode.label}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {mode.label}
                      </p>
                      <p className="mt-3 text-3xl font-black text-slate-950">{mode.value}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Active
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{mode.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-[2rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Best features</p>
            <h2 className="mt-3 text-3xl font-bold">
              The strongest parts of the product are the ones teams actually reuse.
            </h2>
          </div>
          <p className="text-slate-300">
            We built the public site around the same strengths that show up inside the dashboard:
            visibility, repeatability, and real scan outcomes. That means the promise on the homepage
            matches the working product behind login.
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

        <section className="grid gap-6 lg:grid-cols-3">
          {bestFeatures.map((feature) => (
            <article
              key={feature.title}
              className={`rounded-[2rem] border border-slate-200/80 bg-gradient-to-br ${feature.accent} p-7 shadow-sm`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Feature focus</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{feature.title}</h2>
              <p className="mt-4 leading-7 text-slate-700">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">QR types</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              One generator, the QR types your teams actually need.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Create operational codes, marketing codes, scan-and-respond experiences, and public pages
              from the same interface. The styling model stays consistent while the payload changes.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {qrTypeGroups.map((group) => (
              <div
                key={group}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 px-6 py-6 shadow-sm"
              >
                <p className="text-sm font-semibold leading-7 text-slate-800">{group}</p>
              </div>
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

        <section id="insights" className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Insights and launch content</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Product thinking, launch guidance, and QR strategy now live right on the homepage.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Instead of hiding product education on a separate blog index, the strongest articles are now
              surfaced where visitors first decide whether QRBulkGen fits their workflow.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{post.category}</span>
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-950">{post.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{post.description}</p>
                <p className="mt-6 text-sm font-semibold text-slate-950">Read article</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 px-8 py-10 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Mobile app</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Use the same account on web and mobile without losing job history.
              </h2>
              <p className="mt-5 leading-8 text-slate-600">
                Teams can scan existing QR codes, watch bulk jobs, open per-job analysis, recover passwords,
                and generate single QR assets from the phone while the web app remains the full studio.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Shared dashboard and job list",
                "Scanner with deep link handoff",
                "Single QR creation on mobile",
                "Bulk monitoring and ZIP share",
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-sm font-semibold text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  )
}
