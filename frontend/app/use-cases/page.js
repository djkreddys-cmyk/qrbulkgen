import Link from "next/link"

import { HeroCtaRow, MarketingShell } from "../../components/MarketingLayout"
import StructuredData from "../../components/StructuredData"
import { getLandingPage, siteUrl } from "../../lib/content"

const featuredSlugs = [
  "bulk-qr-codes",
  "barcode-generator",
  "label-generator",
  "qr-code-generator-for-labels",
  "create-qr-codes-from-csv",
]

const featuredPages = featuredSlugs
  .map((slug) => getLandingPage(slug))
  .filter(Boolean)

export const metadata = {
  title: "Use Cases | QRBulkGen",
  description:
    "See bulk QR, barcode, label, label QR, and CSV QR workflows together on one screen for packaging, inventory, and print-ready operations.",
  alternates: { canonical: `${siteUrl}/use-cases` },
  openGraph: {
    title: "Use Cases | QRBulkGen",
    description:
      "Explore bulk QR, barcode, label, label QR, and CSV QR workflows in one place.",
    url: `${siteUrl}/use-cases`,
    type: "website",
  },
}

export default function UseCasesPage() {
  return (
    <MarketingShell>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "QRBulkGen Use Cases",
          description:
            "Bulk QR, barcode, label, label QR, and CSV QR workflows gathered into one public page.",
          url: `${siteUrl}/use-cases`,
        }}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-16">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-sky-200 bg-sky-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-900">
              Use cases
            </p>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-slate-950">
              Bulk QR, barcode, label, and CSV workflows on one screen.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Explore the main public workflows teams look for most: bulk QR production, barcode generation,
              printable labels, label-ready QR codes, and CSV-based QR imports for inventory, packaging, events,
              and operations.
            </p>
            <HeroCtaRow />
          </div>

          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-950">Included on this page</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {featuredPages.map((page) => (
                <Link
                  key={page.slug}
                  href={page.href}
                  className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          {featuredPages.map((page) => (
            <article
              key={page.slug}
              className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{page.heroKicker}</p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">{page.heroTitle}</h2>
                  <p className="text-base leading-8 text-slate-600">{page.heroBody}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={page.href}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open Page
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                    >
                      Try Generator
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <h3 className="text-lg font-bold text-slate-950">Why it matters</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                      {page.bullets.map((bullet) => (
                        <li key={bullet} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-slate-950 p-6 text-slate-100">
                    <h3 className="text-lg font-bold">Workflow fit</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{page.workflowBody}</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {page.workflowPoints.map((point) => (
                        <li key={point} className="rounded-2xl bg-white/10 px-4 py-3">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  )
}
