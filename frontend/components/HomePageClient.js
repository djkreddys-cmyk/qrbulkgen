"use client"

import Link from "next/link"
import { useState } from "react"

import { blogPosts, homepageStats, landingPages, pricingTiers } from "../lib/content"

export default function HomePageClient() {
  const [activeMobileFeature, setActiveMobileFeature] = useState("shared-dashboard")
  const [activeFeatureCard, setActiveFeatureCard] = useState("analysis")
  const [activeStatCard, setActiveStatCard] = useState("types")
  const [activeBlogPost, setActiveBlogPost] = useState(blogPosts[0]?.slug || "")

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
      label: "Short URL Workspace",
      value: "Links + Reports",
      detail: "Create branded Short URLs, monitor visitors, export location-aware reports, and review trend analysis.",
    },
    {
      label: "Mobile Companion",
      value: "Live",
      detail: "Dashboard, scanner, single generation, Short URL visibility, bulk monitoring, and password recovery on phone.",
    },
  ]

  const qrTypeGroups = [
    {
      title: "Direct utility types",
      body: "URL, Text, Email, Phone, SMS, WhatsApp",
    },
    {
      title: "Structured business payloads",
      body: "vCard, Location, YouTube, WiFi, Event",
    },
    {
      title: "Tracked public experiences",
      body: "PDF, Image Gallery, Rating, Feedback",
    },
    {
      title: "Campaign and destination flows",
      body: "Social Media, App Store, marketing-ready landing flows",
    },
  ]

  const bestFeatures = [
    {
      id: "analysis",
      title: "Analysis-ready dashboard",
      body: "Your best assets are not just generated. They are tracked with QR summaries, Short URL trends, visitor breakdowns, and engagement snapshots.",
      stat: "100%",
      statLabel: "QR + Short URL analysis",
    },
    {
      id: "mobile",
      title: "Mobile app for real operations",
      body: "Open the same account on mobile and web, monitor bulk jobs, scan QR codes, review Short URLs, generate single QR assets, and recover passwords without friction.",
      stat: "1 app",
      statLabel: "shared history across devices",
    },
    {
      id: "types",
      title: "QR codes and Short URLs in one system",
      body: "From contact cards and WiFi to public rating, feedback, PDF, gallery experiences, and tracked Short URLs, teams can stay in one platform instead of combining tools.",
      stat: "18+ + URLs",
      statLabel: "production-ready flows",
    },
  ]

  const featurePanels = {
    analysis: {
      title: "Job reports that feel like operating metrics, not raw logs.",
      body:
        "Teams can inspect generation success, failure counts, rating breakdowns, feedback summaries, per-job analysis, Short URL visitor reports, and QR-type performance from the same dashboard style.",
      bullets: [
        "Per-job analysis under each created QR",
        "Short URL trend, export, and visitor reporting",
        "QR type performance and scan tracking",
        "Rating and feedback reports with engagement summaries",
      ],
    },
    mobile: {
      title: "Mobile is not an afterthought; it is part of the workflow.",
      body:
        "Scanner, single generation, bulk job visibility, ZIP sharing, and password recovery all stay tied to the same backend account so teams can work away from desktop.",
      bullets: [
        "Shared account across web and mobile",
        "Bulk monitoring and artifact sharing from phone",
        "Deep-link-ready reset and scanner handoff flow",
      ],
    },
    types: {
      title: "A single workspace that covers QR, Short URL, marketing, operations, and service flows.",
      body:
        "The same product supports direct QR payloads, trackable landing experiences, customer-response flows, branded Short URLs, and download-ready assets with one consistent operating layer.",
      bullets: [
        "Structured forms by QR type",
        "Short URL creation with analytics",
        "Logo, styling, expiry, and public-flow support",
        "Bulk CSV workflows with guided sample templates",
      ],
    },
  }

  const mobileFeatureDetails = [
    {
      id: "shared-dashboard",
      label: "Shared dashboard and job list",
      title: "Track the same QR and Short URL history on phone and web.",
      body:
        "Teams can sign into the same account on mobile and desktop and see the same generated QR jobs, Short URL analytics panels, and monitoring states without manually syncing anything.",
      bullets: [
        "Same account history across web and mobile",
        "Recent QR and Short URL counts visible on both screens",
        "Per-job analysis for generation and engagement",
      ],
    },
    {
      id: "scanner",
      label: "Scanner with deep link handoff",
      title: "Scan first, then jump straight into the right mobile flow.",
      body:
        "The scanner is built to recognize QR content quickly, open supported links, and pass content into the single generator when you want to recreate or restyle an asset.",
      bullets: [
        "Fast scanner entry point inside the app",
        "Auto-open links where supported",
        "Use scanned content directly in Single QR",
      ],
    },
    {
      id: "single-mobile",
      label: "Single QR creation on mobile",
      title: "Generate production-ready QR assets even when you are away from desktop.",
      body:
        "The mobile single generator supports multiple QR types, previews, sharing, expiry controls, and app-linked public destinations so the phone workflow remains useful, not just a demo.",
      bullets: [
        "Preview and share from mobile",
        "Structured QR-type-specific forms",
        "Expiry/date restrictions where applicable",
      ],
    },
    {
      id: "bulk-mobile",
      label: "Bulk monitoring and ZIP share",
      title: "Watch queued jobs and move completed ZIPs from the phone.",
      body:
        "Bulk status visibility is built for operators who need to confirm counts, inspect results, and share artifacts while they are away from the main dashboard.",
      bullets: [
        "Bulk history and status tracking",
        "Completed ZIP download/share state",
        "Per-job analysis and scan insight from mobile",
      ],
    },
  ]

  const activeFeatureContent = featurePanels[activeFeatureCard]
  const activeStatContent = homepageStats.find((stat) => stat.id === activeStatCard) || homepageStats[0]
  const activeMobileFeatureContent =
    mobileFeatureDetails.find((feature) => feature.id === activeMobileFeature) || mobileFeatureDetails[0]
  const featuredBlogPost = blogPosts.find((post) => post.slug === activeBlogPost) || blogPosts[0]

  return (
    <main className="mx-auto flex max-w-[84rem] flex-col gap-16 px-4 py-12 md:px-6 md:py-16 xl:px-8">
      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] xl:items-center">
        <div className="space-y-7 xl:pr-6">
          <p className="inline-flex rounded-full border border-sky-300/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-900 shadow-sm">
            Blog, guides, QR codes, and Short URLs
          </p>
          <h1 className="max-w-3xl text-[clamp(3.2rem,7vw,6.2rem)] font-black leading-[0.92] tracking-tight text-slate-950">
            Learn, create, and track QR codes and Short URLs from one product.
          </h1>
          <p className="max-w-[58rem] text-[1.05rem] leading-8 text-slate-600 md:text-lg">
            QRBulkGen now leads with practical content for bulk QR generation, Short URL tracking,
            marketing campaigns, events, packaging, rating flows, and feedback capture. Once visitors
            understand the use case, they can move straight into the generator, dashboard, and mobile workflow.
          </p>
        </div>

        <div className="space-y-5 xl:pl-2">
          <div className="rounded-[2.2rem] border border-white/70 bg-white/80 p-7 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur md:p-8">
            <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
              {operatingModes.map((mode) => (
                <div
                  key={mode.label}
                  className="flex h-full min-h-[212px] flex-col rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,255,0.92))] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {mode.label}
                      </p>
                      <p className="mt-3 text-[2.1rem] font-black leading-none text-slate-950 md:text-[2.5rem]">
                        {mode.value}
                      </p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/login"
              className="flex min-h-[132px] items-center justify-center rounded-[1.8rem] bg-slate-950 px-6 py-6 text-center text-xl font-bold text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Open Generator
            </Link>
            <Link
              href="/login"
              className="flex min-h-[132px] items-center justify-center rounded-[1.8rem] border border-slate-300 bg-white/90 px-6 py-6 text-center text-xl font-bold text-slate-950 shadow-sm transition hover:-translate-y-1 hover:border-slate-950"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 px-7 py-8 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Featured guide</p>
              <h2 className="mt-4 max-w-[13ch] text-[2.4rem] font-black leading-[1.02] tracking-tight">
                {featuredBlogPost.title}
              </h2>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{featuredBlogPost.category}</span>
                <span>{featuredBlogPost.date}</span>
                <span>{featuredBlogPost.readTime}</span>
              </div>
              <p className="mt-5 leading-8 text-slate-200">{featuredBlogPost.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/blog/${featuredBlogPost.slug}`}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Read Featured Article
                </Link>
                {featuredBlogPost.relatedLandingHref ? (
                  <Link
                    href={featuredBlogPost.relatedLandingHref}
                    className="rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Open Related Page
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  {featuredBlogPost.sections[0]?.heading || "Guide summary"}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {featuredBlogPost.sections[0]?.paragraphs?.[0] || "Read the guide to see the full workflow."}
                </p>
              </div>
              {featuredBlogPost.sections[1] ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                    {featuredBlogPost.sections[1].heading}
                  </p>
                  {featuredBlogPost.sections[1].paragraphs?.[0] ? (
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      {featuredBlogPost.sections[1].paragraphs[0]}
                    </p>
                  ) : null}
                  {!!featuredBlogPost.sections[1].bullets?.length && (
                    <ul className="mt-4 grid gap-2">
                      {featuredBlogPost.sections[1].bullets.slice(0, 4).map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm font-medium text-slate-200"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Blog topics</p>
              <h2 className="mt-3 text-[2.2rem] font-black tracking-tight text-slate-950">
                Home page content now follows your real QR and Short URL use cases.
              </h2>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-slate-950">
              View all articles
            </Link>
          </div>
          <div className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2">
            {blogPosts.slice(0, 6).map((post) => (
              <button
                key={post.slug}
                type="button"
                onClick={() => setActiveBlogPost(post.slug)}
                className={`flex h-full flex-col rounded-[1.5rem] border px-5 py-5 text-left transition ${
                  activeBlogPost === post.slug
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                    : "border-slate-200 bg-slate-50 text-slate-950 hover:-translate-y-1 hover:bg-white"
                }`}
              >
                <div className={`flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] ${activeBlogPost === post.slug ? "text-slate-300" : "text-slate-500"}`}>
                  <span>{post.category}</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold leading-tight">{post.title}</h3>
                <p className={`mt-3 text-sm leading-7 ${activeBlogPost === post.slug ? "text-slate-200" : "text-slate-600"}`}>
                  {post.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-stretch">
        <div className="grid auto-rows-fr gap-4 md:grid-cols-3">
          {homepageStats.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={() => setActiveStatCard(stat.id)}
              className={`flex h-full min-h-[176px] flex-col rounded-[1.75rem] border px-5 py-5 text-left shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur transition ${
                activeStatCard === stat.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-white/90 bg-white/85 text-slate-950 hover:-translate-y-1"
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.22em] ${
                  activeStatCard === stat.id ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {stat.label}
              </p>
              <p
                className={`mt-4 text-[2rem] font-black leading-[1.08] md:text-[2.2rem] ${
                  activeStatCard === stat.id ? "text-white" : "text-slate-950"
                }`}
              >
                {stat.value}
              </p>
            </button>
          ))}
        </div>
        <div className="rounded-[1.9rem] border border-white/85 bg-white/85 px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            {activeStatContent.label}
          </p>
          <h2 className="mt-3 max-w-[13ch] text-[1.9rem] font-black leading-[1.04] tracking-tight text-slate-950 md:text-[2.2rem]">
            {activeStatContent.title}
          </h2>
          <p className="mt-4 leading-8 text-slate-600">{activeStatContent.body}</p>
          <ul className="mt-6 grid gap-3">
            {activeStatContent.bullets.map((bullet) => (
              <li
                key={bullet}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 rounded-[2.2rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-3">
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

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Analysis reports</p>
          <h2 className="mt-3 text-[2.5rem] font-black tracking-tight text-slate-950">
            Reporting that explains performance, not just output volume.
          </h2>
          <p className="mt-5 leading-8 text-slate-600">
            QRBulkGen analysis reports are built for teams that need to understand what happened after
            generation. That includes scan counts, unique and repeated users, date-range trends, rating
            response charts, feedback summaries, export-ready Excel files, and Short URL visitor reports
            with location details.
          </p>
          <div className="mt-6 grid gap-3">
            {[
              "QR job analysis with overall history and latest-version reporting",
              "Unique scans, repeated users, and trend filters like Overall, 7 days, 15 days, and Last month",
              "Rating and feedback reports with response breakdowns and engagement context",
              "Short URL analysis with visits, visitor trends, export filters, and location-aware downloads",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
          <div className="flex h-full flex-col rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">QR reports</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Job-by-job analysis for single and bulk QR workflows.
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Teams can review output success, scan history, repeated-user behavior, rating charts,
              feedback summaries, expiry state, and downloadable reports from one dashboard layout.
            </p>
          </div>
          <div className="flex h-full flex-col rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Short URL reports</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Visitor reporting with trend filters and location-rich exports.
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Short URL analysis includes total, unique, and repeated visits, date-range trend views,
              downloadable Excel reports, and visitor location fields like city, region, country,
              latitude, and longitude where available.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-stretch">
        <div className="grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bestFeatures.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveFeatureCard(feature.id)}
              className={`flex h-full min-h-[265px] flex-col justify-between rounded-[2rem] border p-7 text-left shadow-sm transition ${
                activeFeatureCard === feature.id
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
                  : "border-white/80 bg-white/85 text-slate-950 hover:-translate-y-1"
              }`}
            >
              <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${activeFeatureCard === feature.id ? "text-slate-300" : "text-slate-500"}`}>
                Feature focus
              </p>
              <h2 className="mt-4 max-w-[11ch] text-[2rem] font-black leading-[1.02] tracking-tight">
                {feature.title}
              </h2>
              <p
                className={`mt-8 text-[2.9rem] font-black leading-none ${
                  activeFeatureCard === feature.id ? "text-white" : "text-slate-950"
                }`}
              >
                {feature.stat}
              </p>
              <p className={`mt-2 text-sm ${activeFeatureCard === feature.id ? "text-slate-300" : "text-slate-500"}`}>
                {feature.statLabel}
              </p>
            </button>
          ))}
        </div>
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Why teams keep using it</p>
          <h3 className="mt-4 max-w-[14ch] text-[2.6rem] font-black leading-[1.02] tracking-tight text-slate-950">
            {activeFeatureContent.title}
          </h3>
          <p className="mt-5 leading-8 text-slate-600">{activeFeatureContent.body}</p>
          <ul className="mt-6 grid gap-3">
            {activeFeatureContent.bullets.map((bullet) => (
              <li
                key={bullet}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">QR types</p>
          <h2 className="mt-3 text-[2.8rem] font-black tracking-tight text-slate-950">
            One aligned workspace for the QR formats your teams actually use.
          </h2>
          <p className="mt-5 leading-8 text-slate-600">
            Create operational codes, marketing codes, scan-and-respond experiences, and public pages
            from the same interface. The layout, styling model, and reporting stay consistent while the payload changes.
          </p>
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
          {qrTypeGroups.map((group) => (
            <div
              key={group.title}
              className="flex h-full flex-col rounded-[1.75rem] border border-white/80 bg-white/85 px-6 py-6 shadow-sm backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{group.title}</p>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-800">{group.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pricing path</p>
          <h2 className="mt-3 text-[2.7rem] font-black tracking-tight text-slate-950">
            Start free, then scale only when the workflow proves itself.
          </h2>
        </div>
        <div className="grid auto-rows-fr gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={`flex h-full flex-col rounded-[2rem] border p-7 shadow-sm ${
                tier.featured
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
                  : "border-white/80 bg-white/85 text-slate-950 backdrop-blur"
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
              <p className={`mt-2 ${tier.featured ? "text-slate-300" : "text-slate-600"}`}>{tier.billing}</p>
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
                className={`mt-auto inline-flex rounded-full px-5 py-3 text-sm font-semibold ${
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
            Articles that explain how to use QRBulkGen for real work, not just demos.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            These guides cover bulk production, single generation, Short URL tracking, packaging,
            campaigns, events, ratings, and feedback so visitors can enter the product with the right context.
          </p>
        </div>
        <div className="grid auto-rows-fr gap-6 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex h-full flex-col rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{post.category}</span>
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
              <h3 className="mt-4 text-[1.7rem] font-bold leading-tight text-slate-950">{post.title}</h3>
              <p className="mt-4 leading-7 text-slate-600">{post.description}</p>
              <p className="mt-6 text-sm font-semibold text-slate-950">Read article</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white/85 px-8 py-8 shadow-sm backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Mobile app</p>
            <h2 className="mt-3 max-w-[12ch] text-[2.35rem] font-black tracking-tight text-slate-950">
              Keep operators moving even when they leave the desktop dashboard.
            </h2>
            <p className="mt-4 max-w-2xl leading-8 text-slate-600">
              The phone app mirrors the same account, jobs, and analysis so teams can scan, monitor,
              share, and recover access away from the main studio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open App Flow
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
              >
                View Plans
              </Link>
            </div>
          </div>
          <div className="space-y-4 rounded-[1.75rem] border border-slate-200/80 bg-slate-50 px-6 py-6">
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
              {mobileFeatureDetails.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMobileFeature(item.id)}
                  className={`flex h-full items-center rounded-[1.35rem] px-4 py-4 text-left text-sm font-semibold transition ${
                    activeMobileFeature === item.id
                      ? "bg-slate-950 text-white shadow-lg"
                      : "border border-slate-300 bg-white text-slate-900 hover:border-slate-950"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {activeMobileFeatureContent.label}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {activeMobileFeatureContent.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                {activeMobileFeatureContent.body}
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-1">
                {activeMobileFeatureContent.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
